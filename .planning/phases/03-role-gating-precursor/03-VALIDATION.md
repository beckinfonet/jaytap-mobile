---
phase: 3
slug: role-gating-precursor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `03-RESEARCH.md` §7 (Validation Architecture). The planner must refine this file as tasks are authored; the plan-checker enforces Nyquist Dim 8 against it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (already configured — confirmed in research §6) |
| **Config file** | `jest.config.js` (repo root) |
| **Quick run command** | `npx jest --testPathPattern=useRole --runInBand` |
| **Full suite command** | `npx jest --runInBand` |
| **Estimated runtime** | ~5–15 seconds (pure-helper + module tests, no RN renderer) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the changed test file
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green AND the 4-part grep invariant from CONTEXT D-14 must pass (see §Manual-Only Verifications)
- **Max feedback latency:** ~15 seconds per wave

---

## Per-Task Verification Map

*To be filled by planner during Step 8. Every task with `type: execute` on a `.ts/.tsx` file that contains a gated decision (hook, helper, component, call-site) MUST have an automated verify entry referencing a unit test or a grep invariant. Gaps here BLOCK Nyquist Dim 8.*

Seed entries (planner to refine with concrete Task IDs once PLAN files are authored):

| Task area | Wave | Requirement | Test Type | Automated Command | File Exists |
|-----------|------|-------------|-----------|-------------------|-------------|
| `useRole()` priority ladder | 1 | GATE-01 | unit | `npx jest useRole.test` | ❌ W0 (test stub) |
| `canFromUser(user, action)` matrix | 1 | GATE-01, GATE-04 | unit | `npx jest permissions.test` | ❌ W0 (test stub) |
| Allowlist lowercase normalization | 1 | GATE-05 | unit (inside useRole.test) | `npx jest useRole.test -t "allowlist is case-insensitive"` | ❌ W0 |
| `<Gated>` render path | 1 | GATE-02, GATE-03 | unit (logic-only — no RN renderer needed per research §3.2) | `npx jest Gated.test` | ❌ W0 |
| `PropertyService.patchPlatformVerifications` guard | 2 | GATE-04 | unit (mocked axios + AuthService) | `npx jest PropertyService.test -t "permission"` | ❌ W0 |
| Matterport/panoramic visibility at CreateListingScreen | 2 | GATE-02 | grep invariant | `grep -E "isAdmin" src/screens/CreateListingScreen.tsx \| wc -l` must be 0 | ✅ (source) |
| PropertyDetailsScreen:178 migration | 3 | GATE-03 | grep invariant | `grep -n "userType === 'admin'" src/screens/PropertyDetailsScreen.tsx` must be empty | ✅ (source) |
| ProfileScreen:33 migration | 3 | GATE-03 | grep invariant | `grep -n "userType === 'admin'" src/screens/ProfileScreen.tsx` must be empty | ✅ (source) |
| 4-part grep invariant (D-14) | 4 | GATE-03 | CI gate | `./scripts/check-role-grep.sh` (or inline shell — planner chooses) | ❌ W0 |
| Allowlist TODO(M2) comment | 1 | GATE-05 | grep | `grep -F "TODO(M2): replace allowlist" src/constants/adminAllowlist.ts` must match | ❌ W0 |

*Status column: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — applied per-task during execution.*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useRole.test.ts` — stubs for GATE-01 (priority ladder, allowlist case-insensitivity)
- [ ] `src/services/__tests__/permissions.test.ts` — stubs for `canFromUser` action matrix
- [ ] `src/services/__tests__/PropertyService.test.ts` — stub for permission-denied path on `patchPlatformVerifications`
- [ ] `src/components/__tests__/Gated.test.tsx` (logic-only) — stubs for GATE-02, GATE-03

**No framework install required.** Jest is already configured (`jest.config.js`, `jest@^29.6.3`, `@types/jest` in tsconfig). `@testing-library/react-native` is NOT needed — all gated tests target pure functions or mocked modules per research §3.2.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Non-admin user cannot see Matterport tour URL section in CreateListingScreen | GATE-02 | Behavior change — CONTEXT D-08 HIDES the section. Must be confirmed by device QA that no input or label is rendered, and that existing tour URL on an edited listing is preserved on save (D-09). | Log in as non-admin → open CreateListingScreen in "edit" mode on a listing with a pre-existing `tours` URL → confirm section is absent → tap Save → reload → confirm `tours` value unchanged on the persisted listing. |
| Non-admin user cannot see panoramic photo URL input in CreateListingScreen | GATE-02 | Same as above (D-08/D-09). Panoramic input is nested inside a "Links" section that also holds `videoUrl`/`instagramUrl` — verify ONLY the panoramic input is hidden, not the whole section (research §2.2). | Log in as non-admin → open CreateListingScreen in edit mode on a listing with a pre-existing `panoramicPhotosUrl` → confirm panoramic input is absent but videoUrl/instagramUrl inputs are present → save → reload → confirm `panoramicPhotosUrl` preserved. |
| Admin sees verification-related admin UI on PropertyDetailsScreen | GATE-03 | Line 178 was previously inline `userType === 'admin'`. Device QA confirms the migrated `<Gated>` / `useRole()` call produces the same visual result. | Log in as admin → open any PropertyDetailsScreen → confirm admin-only affordance (per line 178 context) is visible → log in as non-admin → same screen → confirm affordance is absent. |
| Admin `manageListings` section on ProfileScreen | GATE-03 | Line 33 is being migrated behind the new `manageListings` action. Device QA confirms visibility parity. | Log in as admin → ProfileScreen → confirm manage-listings entry is visible → non-admin → absent. |
| Backend enforcement confirmation (or accepted risk) | GATE-04 | CONTEXT D-21..D-23 — backend coordination runs parallel; not unit-testable from the client. | Coordinate with Railway team; record result in PROJECT.md Key Decisions (confirmed) OR record "accepted known risk for M1" entry per D-22. Must be captured before `/gsd-verify-work`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (or Wave 0 test-stub dependencies)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all ❌ W0 entries in Per-Task Verification Map
- [ ] No watch-mode flags in test commands (`--watch` forbidden for CI sampling)
- [ ] Feedback latency < 30 seconds
- [ ] `nyquist_compliant: true` set in frontmatter (flip after planner + checker sign-off)
- [ ] 4-part grep invariant (D-14) captured as a CI-runnable command before phase exit

**Approval:** pending

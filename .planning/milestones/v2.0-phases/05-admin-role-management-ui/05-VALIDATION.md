---
phase: 5
slug: admin-role-management-ui
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
updated: 2026-05-03
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 05-RESEARCH.md §"Validation Architecture" (lines 893-1021).
> Per-task map filled by planner on 2026-05-03; nyquist coverage confirmed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (RN client) + supertest+jest (backend) |
| **Config file** | RN: `package.json` jest block; Backend: `jest.config.cjs` |
| **Quick run command** | `npm test -- --testPathPattern="<plan-area>"` (per plan wave) |
| **Full suite command** | RN: `npm test`; Backend: `nvm use 24 && npm test` (jose@6 ESM requires Node ≥22.12) |
| **Estimated runtime** | RN ~30-45s; Backend ~20-30s; full pair ~60-75s |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="<modified-area>"` (e.g. `useRole.test.ts` after the `manageRoles` rename)
- **After every plan wave:** Run full suite for the affected repo
- **Before `/gsd-verify-work 5`:** Both repos green; manual physical-device matrix walked APPROVED on iPhone 15 Pro Max
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 01 | 1 | ADMIN-05 | T-05-01-AUDIT-ORPHAN-CRASH | RoleChangeLog model schema valid; `role_change_log` collection name; 5 fields enforced via Mongoose | unit (model load) | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && node -e "require('./src/models/RoleChangeLog')"` exits 0 | NEW: src/models/RoleChangeLog.js | ⬜ pending |
| 05-01-T2 | 01 | 1 | ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-07 | T-05-01-PRIVILEGE-ESCALATION, T-05-01-LAST-ADMIN-LOCKOUT, T-05-01-SELF-MUTATION, T-05-01-ACTOR-SPOOFING, T-05-01-PROMOTION-FORCES-RELOGIN, T-05-01-REGEX-DOS, T-05-01-RACE-CONCURRENT-DEMOTE | Router-level admin gate + 2 endpoints (GET search + PATCH role); race-safe atomic with rollback close; envelope codes (SELF_MUTATION/LAST_ADMIN_LOCKOUT/ROLE_ALREADY_CHANGED/USER_NOT_FOUND); anti-spoofing actorUid grep gate; User schema field `uid` not `firebaseUid` | grep gates (file-level invariants) | `grep -nE "actorUid: req\.(body\|headers)" src/routes/adminRoutes.js` returns 0 + `grep -c "actorUid: req.firebaseUid" src/routes/adminRoutes.js` ≥1 + `grep -nE "User\.findOne\(\s*\{\s*firebaseUid:" src/routes/adminRoutes.js` returns 0 | NEW: src/routes/adminRoutes.js | ⬜ pending |
| 05-01-T3 | 01 | 1 | ADMIN-07 | T-05-01-PRIVILEGE-ESCALATION | Admin router mounted at `/api/admin` | grep | `grep -c "app.use('/api/admin'" index.js` = 1 | MODIFY: index.js | ⬜ pending |
| 05-02-T1 | 02 | 1 | ADMIN-06 | T-05-02-RENAME-INCOMPLETE | useRole.ts Action union has `manageRoles`; canFromUser admin-only fall-through preserved; useRole.test.ts has new top-level describe block + 4 tests covering admin/moderator/user/guest | jest unit | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/hooks/__tests__/useRole.test.ts` PASS + `grep -rn "promoteToModerator" src App.tsx` returns 0 matches | MODIFY: src/hooks/useRole.ts + src/hooks/__tests__/useRole.test.ts | ⬜ pending |
| 05-02-T2 | 02 | 1 | ADMIN-01, ADMIN-02 | T-05-02-PRIVILEGE-ESCALATION | UserService.searchUsers + setUserRole gate via canFromUser('manageRoles') before HTTP; `apiClient.get('/admin/users')` and `apiClient.patch('/admin/users/${uid}/role')` paths correct | tsc + grep | `npx tsc --noEmit` ≤2 errors + `grep -c "canFromUser(userData, 'manageRoles')" src/services/UserService.ts` ≥2 + `grep -q "/admin/users" src/services/UserService.ts` | NEW: src/services/UserService.ts | ⬜ pending |
| 05-02-T3 | 02 | 1 | ADMIN-01, ADMIN-02, ADMIN-06 | T-05-02-LOCALE-DRIFT, T-05-02-CANCEL-DUPLICATE | 23 admin.roles.* keys × EN+RU in single coordinated commit; common.cancel reused (no duplicate); strict NAME parity holds | i18n parity gate | `bash scripts/check-i18n-parity.sh` exit 0 + `[ "$(grep -c 'admin.roles.' src/locales/en.ts)" = "$(grep -c 'admin.roles.' src/locales/ru.ts)" ]` AND ≥23 + `grep -c "admin.roles.cancel" src/locales/en.ts src/locales/ru.ts` returns 0:0 | MODIFY: src/locales/en.ts + src/locales/ru.ts | ⬜ pending |
| 05-03-T1 | 03 | 2 | ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-07 | All Plan 01 threats with positive test coverage | 12+ supertest cases covering auth gating × search × promotion-no-bump × demotion-bumps × race rollback × self-mutation 403 × audit row write × anti-spoofing × envelope codes × invalid userType 400 | supertest | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test -- --testPathPattern=adminRoutes.test.js` exits 0 with "X passed" where X ≥ 12 | NEW: src/__tests__/adminRoutes.test.js | ⬜ pending |
| 05-03-T2 | 03 | 2 | (regression gate) | (full suite) | Phase 4 baseline 106/106 + Phase 5 ≥12 = ≥118/118 | full suite | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` exits 0 with ≥118 passed | (none — verifies Phase 1-5 cumulative) | ⬜ pending |
| 05-04-T1 | 04 | 2 | ADMIN-02, ADMIN-04 | T-05-04-MODAL-LEAK-ON-USER-CHANGE | RoleChangeModal forks RejectListingModal with 8 edits (Pattern 5); 3 chips with current-role de-emphasis + (current) suffix; pendingRole survives Pitfall 7 cancel; inline error row maps backend codes to localized strings; submit disabled until pendingRole !== null && != currentRole; `<Gated>` does NOT appear in modal | grep + tsc | `grep -c "<Gated" src/components/RoleChangeModal.tsx` = 0 + `grep -c "apiClient\|UserService\|AuthService" src/components/RoleChangeModal.tsx` = 0 + `grep -q "isDark ? '#121212' : '#FFFFFF'"` PASS + `npx tsc --noEmit` ≤2 errors | NEW: src/components/RoleChangeModal.tsx | ⬜ pending |
| 05-04-T2 | 04 | 2 | ADMIN-01, ADMIN-02, ADMIN-04 | T-05-04-SELF-MUTATION-CLIENT, T-05-04-SEARCH-RACE-STALE-RESULT, T-05-04-LAST-ADMIN-LOCKOUT-DISMISSED | RoleManagementScreen forks ModerationQueueScreen; 300ms debounce + Pitfall 5 stale-response guard; pre-search hint, refine hint, no-results, self-row "(you)" badge as View not TouchableOpacity; sibling-mounted RoleChangeModal; LAST_ADMIN_LOCKOUT routes to native Alert.alert (not inline error) | grep + tsc + i18n | `grep -c "<Gated" src/screens/RoleManagementScreen.tsx` = 0 + `grep -c "requestIdRef"` ≥1 + `grep -c "SEARCH_DEBOUNCE_MS"` ≥1 + `grep -c "<RoleChangeModal"` ≥1 + `grep -c "LAST_ADMIN_LOCKOUT"` ≥1 + `npx tsc --noEmit` ≤2 errors + `bash scripts/check-i18n-parity.sh` exit 0 | NEW: src/screens/RoleManagementScreen.tsx | ⬜ pending |
| 05-05-T1 | 05 | 3 | ADMIN-02, ADMIN-06 | T-05-05-OVERLAY-MOUNT-WITHOUT-USER, T-05-05-BACK-HANDLER-LEAK, T-05-05-LOC-DRIFT | App.tsx 7 sibling edits (import + state + OVERLAY_FLAGS + canManageRoles derive + back-handler + dispatcher callback + ProfileScreen prop + mount); LOC drift 1191 → 1221-1231 acceptable per PATTERN D | grep + tsc + LOC | All 7 grep gates from Plan 05 Task 1 verify line + `npx tsc --noEmit` ≤2 errors + `wc -l App.tsx` between 1210 and 1240 | MODIFY: App.tsx | ⬜ pending |
| 05-05-T2 | 05 | 3 | ADMIN-06 | T-05-05-ENTRY-POINT-LEAK | ProfileScreen 5 sibling edits (icon import + interface prop + destructure + canManageRoles derive + JSX row); row gated by `canManageRoles && onOpenRoleManagement` double-condition; admin.roles.entryPoint locale key consumed | grep + tsc + i18n | `grep -c "canManageRoles && onOpenRoleManagement" src/screens/ProfileScreen.tsx` ≥1 + `grep -c "admin.roles.entryPoint"` ≥1 + `grep -c "canManageRoles" src/screens/ProfileScreen.tsx` ≥2 + `npx tsc --noEmit` ≤2 errors + `bash scripts/check-i18n-parity.sh` exit 0 | MODIFY: src/screens/ProfileScreen.tsx | ⬜ pending |
| 05-05-T3 | 05 | 3 | ADMIN-02, ADMIN-06 | T-05-05-ROLE-CHANGE-PROPAGATION-DELAY | Manual physical-device QA matrix on iPhone 15 Pro Max — 11 rows minimum (admin sees row, moderator hidden, search debounce, self-row badge, refine hint, modal de-emphasis, confirm copy, cancel preserves chip, success toast + pill update, EN+RU + dark/light, LAST_ADMIN_LOCKOUT modal alert) + curl test SELF_MUTATION 403 | manual checkpoint | (human verifies; signal "approved") | (none) | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] **Backend test scaffolding** — Plan 03 Task 1 creates `src/__tests__/adminRoutes.test.js` reusing `fixtures/jwks-tokens` (NOT scaffolded as a separate Wave 0 task because Phase 5's test density warrants the test file landing alongside the production code in Plan 03)
- [x] **RN test scaffolding** — Plan 02 Task 1 extends existing `useRole.test.ts` (rename + add new describe block); no separate UserService unit test in scope (covered indirectly via the existing RN test framework + tsc gate); RoleChangeModal does not get a dedicated test file (mirrors Phase 4 RejectListingModal precedent — visual + interaction is covered by manual matrix Row 6-8)
- [x] **i18n key inventory** — Plan 02 Task 3 ships 23 keys × 2 locales; PATTERNS §11 + UI-SPEC §"Copywriting Contract" enumerate values verbatim
- [x] **No new framework installs required** — RESEARCH §"Standard Stack" confirmed zero new deps in either repo

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Plan |
|----------|-------------|------------|-------------------|------|
| ROLE-11 60s propagation: admin demotes target → target's next protected request within 60s receives 403 role-revoked → AuthContext.refreshRole() runs → `auth.accessChanged` toast surfaces → role-gated entry-points hide | ADMIN-02 (cross-cuts ROADMAP success criterion #2) | Requires two physical devices and AppState foreground/background timing | Device A (admin) demotes target; on Device B (target, signed in as the demoted user) trigger any protected API call within 60s; observe 403 silent-refresh → toast → entry-point hide | Plan 05 Task 3 OR deferred to Phase 6 REL-03 |
| Last-admin lockout 2-device race | ADMIN-03 | Race condition needs two simultaneous demote attempts on the same target | Two admin sessions A and B both demoting the only-other admin within ~500ms; one succeeds, the other receives 409 LAST_ADMIN_LOCKOUT (modal alert with "Promote another user to admin first") | Plan 03 Task 1 (race-rollback supertest) covers this contract; manual two-device walk deferred to Phase 6 REL-03 |
| Self-mutation defense-in-depth | ADMIN-04 | The "(you)" disabled badge is the affordance; manual confirms tap is non-functional. Backend 403 SELF_MUTATION is the safety net | In RoleManagementScreen, locate own row → confirm "(you)" / «(вы)» badge present, row not tappable, no chevron; ALSO curl `PATCH /api/admin/users/<my_uid>/role` directly with admin Bearer → expect 403 SELF_MUTATION | Plan 05 Task 3 |
| EN+RU + dark/light parity for RoleManagementScreen + RoleChangeModal + LAST_ADMIN_LOCKOUT modal + all toasts | ADMIN-01, ADMIN-02, ADMIN-03 | Visual parity is not unit-testable; check-i18n-parity covers key existence but not rendered cell width/wrap | iPhone 15 Pro Max; 4 cells per surface (EN+light, EN+dark, RU+light, RU+dark); confirm no clipped text, no missing copy, color-coded chip pills render correctly in both themes. Moto G XT2513V deferred to Phase 6 REL-03. | Plan 05 Task 3 |
| Profile entry-point gating | ADMIN-06 | `<Gated>` predicate is unit-testable but cell visibility under all 4 roles needs visual confirmation | Sign in as user → entry-point hidden; moderator → hidden; admin → visible; guest → ProfileScreen itself blocks (existing gate) | Plan 05 Task 3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (planner filled Per-Task Verification Map above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (12 of 13 tasks have automated grep/jest/supertest gates; only Plan 05 Task 3 is human-verify)
- [x] Wave 0 covers all MISSING references — Plan 02 + Plan 03 land scaffolding alongside production code
- [x] No watch-mode flags (`--watch` forbidden — feedback must terminate)
- [x] Feedback latency < 75s (full RN+backend suite)
- [x] `nyquist_compliant: true` set in frontmatter — planner confirms coverage; checker can flip to red if any task lacks the cited gate

**Approval:** PLANNER SIGNED 2026-05-03 — ready for `/gsd-execute-phase 5`.

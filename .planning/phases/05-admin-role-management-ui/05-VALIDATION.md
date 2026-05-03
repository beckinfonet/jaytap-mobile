---
phase: 5
slug: admin-role-management-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 05-RESEARCH.md §"Validation Architecture" (lines 893-1021).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (RN client) + supertest+jest (backend, see backend `package.json` scripts) |
| **Config file** | RN: `package.json` jest block; Backend: `jest.config.js` |
| **Quick run command** | `npm test -- --testPathPattern="<plan-area>"` (per plan wave) |
| **Full suite command** | RN: `npm test`; Backend: `nvm use 24 && npm test` (jose@6 ESM requires Node ≥22.12) |
| **Estimated runtime** | RN ~30-45s; Backend ~20-30s; full pair ~60-75s |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="<modified-area>"` (e.g. `useRole.test.ts` after the `manageRoles` rename)
- **After every plan wave:** Run full suite for the affected repo
- **Before `/gsd-verify-work 5`:** Both repos green; manual physical-device matrix walked APPROVED for the screen × role × locale × theme cells
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD by planner — see 05-RESEARCH.md §"Validation Architecture" §"Test Inventory" for the full requirements-to-test crosswalk |  |  |  |  |  |  |  |  | ⬜ pending |

**Required test surfaces (research §"Validation Architecture" — planner MUST allocate tasks for each):**

1. **Backend contract tests** (`adminRoutes.test.js` — supertest):
   - `GET /api/admin/users` requires admin (401 no token, 403 user/moderator, 200 admin)
   - `GET /api/admin/users?query=` returns substring matches up to limit=50; regex metacharacters escaped (test inputs like `^.*$`, `(`, `\`)
   - `PATCH /api/admin/users/:uid/role` requires admin (401/403/200)
   - `PATCH` rejects self-mutation with 403 `{code: 'SELF_MUTATION'}` (actor.uid === target.uid path)
   - `PATCH` rejects last-admin demotion with 409 `{code: 'LAST_ADMIN_LOCKOUT'}` (single-admin-in-collection scenario)
   - `PATCH` race rollback returns 409 `{code: 'LAST_ADMIN_LOCKOUT'}` when post-write count drops to 0 (simulated by removing the other admin between pre-flight and write)
   - `PATCH` bumps `roleRevokedAt` on demotion only (admin→moderator/user, moderator→user); no bump on promotion or same-tier no-op
   - `PATCH` writes a `roleChangeLog` row with `{actorUid, targetUid, fromRole, toRole, at}` on every successful mutation
   - `PATCH` audit-insert failure does NOT 500 (orphan-tolerant try/catch)
   - `actorUid: req.firebaseUid` anti-spoofing — body `actorUid` is ignored (Phase 3 grep gate carries over)

2. **RN client unit tests:**
   - `useRole.test.ts` — new row: `can('manageRoles')` → admin: true, moderator: false, user: false, guest: false (Phase 4 D-16 fall-through pattern)
   - `UserService.test.ts` (or matching naming convention to `PropertyService.test.ts` — confirm during pattern mapping) — `searchUsers(query)` calls correct URL with query; `setUserRole(uid, userType)` sends correct PATCH body; both surface envelope `{code, message}` errors
   - `RoleChangeModal.test.tsx` (if RejectListingModal has a test analog — confirm during pattern mapping) — chip selection state, two-tap confirm flow, EN+RU label parity smoke

3. **i18n parity gate:**
   - `scripts/check-i18n-parity.sh` exits 0 after every commit that touches `src/locales/en.ts` or `src/locales/ru.ts`
   - All 23 `admin.roles.*` keys (D-12 inventory + obvious base strings) present on both locales

4. **Anti-spoofing grep gate (Phase 3 → Phase 5):**
   - `grep -rn "actorUid: req\.body" src/routes/adminRoutes.js` returns zero matches
   - `grep -rn "actorUid: req\.firebaseUid" src/routes/adminRoutes.js` returns the audit-insert line(s)

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **Backend test scaffolding** — `tests/routes/adminRoutes.test.js` stub if no admin route tests exist; reuse `tests/routes/moderationRoutes.test.js` fixtures (admin/moderator/user JWTs from JWKS test harness)
- [ ] **RN test scaffolding** — `__tests__/UserService.test.ts` stub matching the `PropertyService.test.ts` shape (confirm during pattern mapping); `__tests__/useRole.manageRoles.test.ts` row-extension stub
- [ ] **i18n key inventory file** — capture the 23-key D-12 list as a one-off planner artifact OR inline in the relevant plan; check-i18n-parity.sh covers the diff gate
- [ ] **No new framework installs required** — jest + supertest already present in both repos (research §"Implementation Patterns To Reuse" Q1 confirmed zero new deps)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ROLE-11 60s propagation: admin demotes target → target's next protected request within 60s receives 403 role-revoked → AuthContext.refreshRole() runs → `auth.accessChanged` toast surfaces → role-gated entry-points hide | ADMIN-02 (cross-cuts ROADMAP success criterion #2) | Requires two physical devices and AppState foreground/background timing | Device A (admin) demotes target; on Device B (target, signed in as the demoted user) trigger any protected API call within 60s; observe 403 silent-refresh → toast → entry-point hide |
| Last-admin lockout 2-device race | ADMIN-03 | Race condition needs two simultaneous demote attempts on the same target | Two admin sessions A and B both demoting the only-other admin within ~500ms; one succeeds, the other receives 409 LAST_ADMIN_LOCKOUT (modal alert with "Promote another user to admin first") |
| Self-mutation defense-in-depth | ADMIN-04 | The "(you)" disabled badge is the affordance; manual confirms tap is non-functional. Backend 403 SELF_MUTATION is the safety net if a future route exposes the mutation differently | In RoleManagementScreen, locate own row → confirm "(you)" / «(вы)» badge present, row not tappable, no chevron |
| EN+RU + dark/light parity for RoleManagementScreen + RoleChangeModal + LAST_ADMIN_LOCKOUT modal + all toasts | ADMIN-01, ADMIN-02, ADMIN-03 | Visual parity is not unit-testable; check-i18n-parity covers key existence but not rendered cell width/wrap | iPhone 15 Pro Max + Moto G XT2513V; 4 cells per surface (EN+light, EN+dark, RU+light, RU+dark); confirm no clipped text, no missing copy, color-coded chip pills render correctly in both themes |
| Profile entry-point gating | ADMIN-06 | `<Gated>` predicate is unit-testable but cell visibility under all 4 roles needs visual confirmation | Sign in as user → entry-point hidden; moderator → hidden; admin → visible; guest → ProfileScreen itself blocks (existing gate) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner fills Per-Task Verification Map)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (research §"Validation Architecture" target)
- [ ] Wave 0 covers all MISSING references (test scaffolding stubbed before Wave 1 starts)
- [ ] No watch-mode flags (`--watch` forbidden — feedback must terminate)
- [ ] Feedback latency < 75s (full suite both repos)
- [ ] `nyquist_compliant: true` set in frontmatter once planner has filled the Per-Task Verification Map and the checker confirms coverage

**Approval:** pending

---
phase: 05
slug: admin-role-management-ui
type: security-audit
status: verified
audited_at: 2026-05-05
audited_by: gsd-security-auditor
asvs_level: 1
block_on: critical+high
threats_total: 27
threats_closed: 27
threats_open: 0
plans_audited: [01, 02, 03, 04, 05]
created: 2026-05-05
---

# Phase 5 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries (aggregate across 5 plans)

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| RN client → `/api/admin/*` | Untrusted Bearer + body crosses here; `verifyFirebaseToken` validates JWKS + `roleRevokedAt`; `requireMinRole('admin')` enforces role | Firebase ID token, target uid, role-change body |
| Admin actor → target user | Self-mutation must be rejected even when actor IS admin; uid comparison is the cheap O(1) gate | actor firebaseUid vs target uid |
| `/api/admin/users/:uid/role` → User collection | Race window between pre-flight admin count and atomic update; closed by post-write rollback | userType + roleRevokedAt |
| `/api/admin/users` (regex query) → `User.find` | Untrusted query string crosses here; regex metacharacters MUST be escaped before `$regex` composition | search query string |
| `RoleManagementScreen` / `RoleChangeModal` → `UserService` | UI components trust UserService to enforce belt-and-suspenders gate before HTTP | manageRoles capability claim |
| `UserService` → `apiClient` | apiClient handles auth interceptors transparently; UserService inherits | Bearer token, request envelope |
| `canFromUser` → `useRole.Action` union | Type-system + runtime switch; `manageRoles` lands in admin-only block | Action capability literal |
| User input → `searchUsers` debounce | 300ms debounce + stale-response guard prevents wrong-results race | search query, requestId counter |
| `RoleChangeModal` → parent `onSubmit` | Parent owns HTTP; modal trusts parent's gate (Pattern I) | pendingRole selection |
| Backend envelope code → localized error string | `error.response.data.code` mapped to one of 5 locale keys | error code, locale state |
| Profile entry-point gate | `canManageRoles` decides whether the row renders + whether the prop is passed; double-gated client-side; backend `requireMinRole('admin')` is the actual boundary | user role, capability claim |
| App.tsx `OVERLAY_FLAGS` | `!!user && isRoleManagementOpen` — admin gating is at the entry-point, not at the overlay flag | session presence + overlay flag |
| Demoted user's session | ROLE-11: target's next protected request within ~60s sees 403 role-revoked → silent logout + banner; inherits Phase 1 apiClient interceptor chain | roleRevokedAt timestamp comparison |

State-B audit run from artifacts. All 27 threats declared in the 5 plans'
`<threat_model>` blocks have been verified against shipped implementation.
Two are `disposition=accept` (audit-orphan-crash + LOC-drift); both have
their accept-rationale artifacts in place. Twenty-five are `disposition=mitigate`;
all twenty-five have their declared mitigation artifact present in code.

No implementation files were modified during the audit.

## Summary

| Metric | Value |
|--------|-------|
| Threats verified | 27 / 27 |
| Threats closed (mitigate) | 25 |
| Threats closed-by-acceptance | 2 |
| Threats open | 0 |
| Unregistered flags from SUMMARYs | 0 |
| ASVS level | 1 (baseline) |
| Block-on policy | critical + high |

## Threat Verification — Plan 01 (Backend `adminRoutes.js`)

Backend repo: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-01-PRIVILEGE-ESCALATION | EoP | mitigate | CLOSED | `src/routes/adminRoutes.js:22` — `router.use(verifyFirebaseToken, requireMinRole('admin'))` mounted before any handler |
| T-05-01-LAST-ADMIN-LOCKOUT | DoS | mitigate | CLOSED | Two-phase compare-and-swap: `adminRoutes.js:127-130` pre-flight `countDocuments({userType:'admin', _id:{$ne:target._id}})` + `adminRoutes.js:161-179` post-write rollback close on `finalAdminCount < 1` |
| T-05-01-SELF-MUTATION | EoP | mitigate | CLOSED | `adminRoutes.js:87-92` — first-line check `req.firebaseUid === targetUid` returns 403 `SELF_MUTATION` |
| T-05-01-ACTOR-SPOOFING | Spoof/Repud | mitigate | CLOSED | `adminRoutes.js:186` audit row uses `actorUid: req.firebaseUid` (token sub); SUMMARY grep gates: 0 occurrences of `actorUid: req.body/headers`, 5 of `req.firebaseUid` |
| T-05-01-PROMOTION-FORCES-RELOGIN | DoS/UX | mitigate | CLOSED | `adminRoutes.js:119-122` `isDemotion` boolean gates `roleRevokedAt` bump; `adminRoutes.js:142` conditional `if (isDemotion) $set.roleRevokedAt = new Date()` |
| T-05-01-REGEX-DOS | DoS | mitigate | CLOSED | `adminRoutes.js:26-28` inline `escapeRegex(s)` sanitizer; applied at `adminRoutes.js:48` before `$regex` composition |
| T-05-01-AUDIT-ORPHAN-CRASH | Tamper/Repud | accept | CLOSED-BY-ACCEPTANCE | `adminRoutes.js:184-202` — `RoleChangeLog.create` wrapped in own try/catch; on failure logs `evt: 'role_change_audit_orphan'` and falls through to step 10 (200 OK). Accept-rationale (Pattern E orphan-tolerant audit) declared in PLAN.md threat register |
| T-05-01-RACE-CONCURRENT-DEMOTE | Tamper | mitigate | CLOSED | `adminRoutes.js:144-148` — `findOneAndUpdate({uid: targetUid, userType: fromRole}, ...)`; `adminRoutes.js:150-155` null result returns 409 `ROLE_ALREADY_CHANGED`; Plan 03 supertest `Promise.all` race test exercises this path (`adminRoutes.test.js:236`) |

## Threat Verification — Plan 02 (RN client `UserService` + `useRole`)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-02-PRIVILEGE-ESCALATION | EoP | mitigate | CLOSED | `src/services/UserService.ts:43,72` — `canFromUser(userData, 'manageRoles')` pre-HTTP guard in both `searchUsers` and `setUserRole`; throws `PermissionDeniedError` |
| T-05-02-LOCALE-DRIFT | Tamper/Repud | mitigate | CLOSED | `bash scripts/check-i18n-parity.sh` exits 0 (re-run during this audit, output: `OK #1: en.ts and ru.ts key sets are identical`) |
| T-05-02-CANCEL-DUPLICATE | Tamper | mitigate | CLOSED | `grep -n admin.roles.cancel src/locales/{en,ru}.ts` returns 0 hits in both files; `RoleChangeModal.tsx:188` consumes `t('common.cancel')` |
| T-05-02-RENAME-INCOMPLETE | Tamper | mitigate | CLOSED | `grep -rn promoteToModerator src App.tsx` returns 0 matches (re-run during audit); `useRole.ts:21` declares `'manageRoles'` in Action union |

## Threat Verification — Plan 03 (Backend supertest pass)

Backend repo: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-03-COVERAGE-GAP | Tamper | mitigate | CLOSED | `src/__tests__/adminRoutes.test.js` declares 17 `test(...)` blocks across 7 `describe` blocks covering ADMIN-01..05+07 (≥12 target met); SUMMARY reports 17/17 PASS, full backend suite 123/123 |
| T-05-03-RACE-TEST-FLAKE | Tamper | mitigate | CLOSED | `adminRoutes.test.js:236` `Promise.all` test asserts safety properties: `arrayContaining([409])` + `not.toEqual([200,200])` + `adminsAfter ≥ 1` + `code === 'LAST_ADMIN_LOCKOUT'` |
| T-05-03-PRIVILEGE-ESCALATION-ASSERTION-MISSING | EoP | mitigate | CLOSED | `adminRoutes.test.js:73` `describe('ADMIN-07 + auth gating')` block contains 4 cases: no-token / moderator-GET / plain-user-GET / moderator-PATCH |
| T-05-03-ANTI-SPOOFING-ASSERTION-MISSING | Spoof | mitigate | CLOSED | `adminRoutes.test.js:290` — `actorUid CANNOT be spoofed via request body (anti-spoofing carry-forward)` test case |
| T-05-03-PROMOTION-REVOKEDAT-REGRESSION | Tamper | mitigate | CLOSED | `adminRoutes.test.js:152-165` promotion test asserts `after.roleRevokedAt === beforeRevokedAt` (unchanged) |

## Threat Verification — Plan 04 (RN UI components)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-04-SELF-MUTATION-CLIENT | EoP | mitigate | CLOSED | `src/screens/RoleManagementScreen.tsx:195` — `RowWrapper = self ? View : TouchableOpacity`; `:209` opacity 0.6 on self-row; `:226-231` self pill renders `t('admin.roles.selfBadge')` instead of role pill |
| T-05-04-SEARCH-RACE-STALE-RESULT | Tamper | mitigate | CLOSED | `RoleManagementScreen.tsx:62` `requestIdRef = useRef(0)`; `:85` `myId = ++requestIdRef.current`; `:90,93` guards `if (myId !== requestIdRef.current ...) return` before `setItems` (Pitfall 5). Bonus: WR-04 `isMountedRef` unmount guard adds defense-in-depth |
| T-05-04-LAST-ADMIN-LOCKOUT-DISMISSED | DoS/UX | mitigate | CLOSED | `RoleManagementScreen.tsx:156-164` — on `code === 'LAST_ADMIN_LOCKOUT'` calls native `Alert.alert(t('admin.roles.error.lastAdminLockout.title'), ...)` (blocking modal); does NOT route through `setModalErrorCode` |
| T-05-04-PROMOTION-FORCES-RELOGIN | DoS/UX | mitigate | CLOSED | `RoleManagementScreen.tsx:140` — `setItems((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...updated } : u)))` updates row pill in place from response payload |
| T-05-04-MODAL-LEAK-ON-USER-CHANGE | Tamper | mitigate | CLOSED | `src/components/RoleChangeModal.tsx:69-71` — `useEffect(() => { setPendingRole(null); }, [user?.uid])` resets on target change; `:139` `setPendingRole(selected ? null : role)` clears on chip-deselection within session |

## Threat Verification — Plan 05 (App.tsx wireup + ProfileScreen entry)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-05-ROLE-CHANGE-PROPAGATION-DELAY | Tamper/EoP | mitigate | CLOSED | Backend mitigation already verified (Plan 01): `roleRevokedAt` bumped on demotion at `adminRoutes.js:142`. Phase 1 ROLE-11 apiClient interceptor chain is the inheritance contract; matrix Row 13 (60s second-device walk) is DEFERRED to Phase 6 REL-03 per phase exit policy — known validation gap, not a missing mitigation |
| T-05-05-ENTRY-POINT-LEAK | EoP | mitigate | CLOSED | Double gate verified: `App.tsx:141` `canManageRoles = canFromUser(user, 'manageRoles')`; `App.tsx:755` `onOpenRoleManagement={canManageRoles ? onProfileOpenRoleManagement : undefined}`; `src/screens/ProfileScreen.tsx:309` `{canManageRoles && onOpenRoleManagement && (...)}` |
| T-05-05-OVERLAY-MOUNT-WITHOUT-USER | Tamper | mitigate | CLOSED | `App.tsx:130` OVERLAY_FLAGS entry `!!user && isRoleManagementOpen`; `App.tsx:1085` mount-block guard `{!!user && isRoleManagementOpen && (<RoleManagementScreen ... />)}` (2 occurrences as declared) |
| T-05-05-BACK-HANDLER-LEAK | Tamper/DoS | mitigate | CLOSED | `App.tsx:336-340` back-handler branch `if (isRoleManagementOpen) { setIsRoleManagementOpen(false); return true; }`; `App.tsx:404` `isRoleManagementOpen` in deps array. Full Android back-button matrix DEFERRED to Phase 6 REL-03 — known validation gap, not a missing mitigation |
| T-05-05-LOC-DRIFT | Tamper/Maint | accept | CLOSED-BY-ACCEPTANCE | App.tsx final LOC = 1215 (verified `wc -l`); +24 from baseline 1191; within 30-40 budget. Accept-rationale documented in 05-05-SUMMARY.md `## App.tsx LOC drift accounting` table; M3 cleanup will extract overlay-host components |

## Accepted Risks Log

Both `disposition=accept` threats have their accept-rationale artifacts in
place per the plan's stated criteria. They remain CLOSED-by-acceptance.

| Threat ID | Accept Rationale | Re-evaluate When |
|-----------|------------------|------------------|
| T-05-01-AUDIT-ORPHAN-CRASH | Pattern E orphan-tolerant: role mutation is load-bearing, audit row is forward-fit observability per Phase 3 D-10 + Phase 4 D-18 precedent. `evt: 'role_change_audit_orphan'` log line provides observability into orphans even when the row write fails | Audit-row drop rate >0.1% in production, OR if RoleChangeLog becomes legally mandated |
| T-05-05-LOC-DRIFT | Signal-not-block per PATTERN D + Phase 4 precedent. App.tsx 1191→1215 (+24, within 30-40 budget). M3 cleanup phase will extract `<OverlayHost>` components for both ModerationQueue + RoleManagement together | M3 cleanup phase, OR if App.tsx exceeds 1300 LOC before then |

## Unregistered Flags (from SUMMARYs)

None. The 5 SUMMARY files contain only `## Threat model verification`
self-reports referencing the same threat IDs already in the register; no
`## Threat Flags` section was emitted by the executor (no new attack
surface detected during implementation).

## Known Validation Gaps (NOT open threats)

Per SUMMARY 05-05 manual QA matrix, three rows are explicitly deferred to
Phase 6 REL-03 (Moto G XT2513V cross-cutting matrix). These are
validation-test gaps, NOT missing mitigations — the underlying mitigation
ARTIFACT in code is verified above.

| Matrix Row | Coverage | Why Deferred | Linked Threat (mitigation already verified) |
|------------|----------|--------------|---------------------------------------------|
| Row 9  | Demotion roleRevokedAt timestamp visible to second device | Phase 6 REL-03 | T-05-05-ROLE-CHANGE-PROPAGATION-DELAY (mitigation present at `adminRoutes.js:142`) |
| Row 10 | Moderator sees Manage Roles row HIDDEN | Phase 6 REL-03 (need second account sign-in) | T-05-05-ENTRY-POINT-LEAK (double-gate present at `ProfileScreen.tsx:309` + `App.tsx:755`) |
| Row 13 | 60s propagation second-device walk | Phase 6 REL-03 | T-05-05-ROLE-CHANGE-PROPAGATION-DELAY (Phase 1 ROLE-11 chain inheritance) |

These are tracked in the SUMMARY's deferred matrix table; phase 5 is not
blocked on them per SUMMARY 05-05 self-check.

## Audit Methodology

- Loaded all 5 PLAN.md `<threat_model>` blocks (lines 505-527, 486-503, 538-555, 800-818, 458-476)
- Loaded all 5 SUMMARY.md self-reports (no `## Threat Flags` sections present)
- Verified each `mitigate` threat by direct grep / Read of cited file:line in actual implementation (NOT trusting SUMMARY ✓ marks per project memory `gsd-verifier-misses-regressions.md`)
- Verified each `accept` threat by confirming the accept-rationale artifact is present (try/catch presence; LOC measured via `wc -l`)
- Re-ran live grep gates: `promoteToModerator` rename (0 matches) + `admin.roles.cancel` duplicate (0 matches in both locales) + `bash scripts/check-i18n-parity.sh` (exit 0)
- Read backend `adminRoutes.js` end-to-end (213 lines) to verify all 8 Plan 01 mitigation patterns appear in the code, not just in the SUMMARY's self-grep table
- Read `RoleChangeModal.tsx` and `RoleManagementScreen.tsx` end-to-end to verify the 5 Plan 04 UI mitigations
- Spot-checked App.tsx OVERLAY_FLAGS array, back-handler block (lines 336-340), deps array (line 404), entry-point gate (line 755), and overlay mount block (line 1085)
- Implementation files were read-only throughout the audit

## Outcome

**SECURED** — phase 5 is clear of open threats per the declared register.
Paired-gates (verify + code-review + security) requirement from project
memory `gsd-verifier-misses-regressions.md` is satisfied:
- `/gsd-verify-work 5` (goal-backward verifier) — out of this audit's scope
- `/gsd-code-review 5` — completed (REVIEW.md: 0 critical, 4 warnings now fixed per REVIEW-FIX.md, 5 info)
- `/gsd-secure-phase 5` — this audit, 27/27 threats CLOSED

ROADMAP row may now move from `[ ]` to `[x]`. Outstanding items (RU walk,
self-row matrix Row 4, Pitfall 7 chip-deselect Row 8, lockout matrix Row
11, Phase 6 REL-03 Android walk) are hardening-class — not security
blockers — and are tracked in 05-05-SUMMARY.md `## Outstanding work`.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-05 | 27 | 27 | 0 | gsd-security-auditor (State-B run from artifacts) |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-05

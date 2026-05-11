---
phase: 4
slug: m2-carry-forward-bug-fixes
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-06
approved: 2026-05-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `04-RESEARCH.md` § Validation Architecture (sampling envelopes A/B/C).

---

## Test Infrastructure

| Property | RN client | Backend (JayTap-services) |
|----------|-----------|---------------------------|
| **Framework** | jest 29.6.3 | jest 29.7.0 |
| **Config file** | `jest.config.js` | `jest.config.cjs` |
| **Quick run command** | `npm test` (root) | `nvm use 24 && npm test` |
| **Full suite command** | `npm test -- --watchAll=false` | `nvm use 24 && npm test` |
| **Estimated runtime** | ~30s (RN baseline 386 tests, 4 pre-existing failures) | ~25s (backend 258 tests post-Phase 3) |
| **Setup file** | none (per-test mocks) | `src/__tests__/setup.js` (mongodb-memory-server bootstrap) |

---

## Sampling Rate

- **After every task commit:** Run only the affected test file (e.g., `npx jest --testPathPattern=useModActionGuard`).
- **After every plan wave:** Full suite both repos.
  - Backend: `nvm use 24 && npm test` (sentinels chain + jest)
  - RN client: `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green in both repos; all 3 backend sentinels exit 0.
- **Max feedback latency:** ~30s (single test file); ~60s (full suite per repo).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-be-01 | backend chain | 1 | CARRY-02 | T-spoof-uid | uid sourced exclusively from `req.firebaseUid` (JWKS sub); body/headers ignored | sentinel | `bash scripts/check-no-landlord-uid-spoofing.sh` | ❌ W0 — `scripts/check-no-landlord-uid-spoofing.sh` | ⬜ pending |
| 4-be-02 | backend chain | 1 | CARRY-02 | T-spoof-uid | Body-spoof attempt creates row with `req.firebaseUid`, not body uid | supertest | `nvm use 24 && npx jest --testPathPattern=landlordApplicationRoutes` | ❌ W0 — `src/__tests__/landlordApplicationRoutes.test.js` | ⬜ pending |
| 4-be-03 | backend chain | 1 | CARRY-02 | — | Diagnostic `console.log` block removed from `landlordApplicationRoutes.js:111-123` | grep | `grep -n "evt: 'landlord_application_submit'" src/routes/landlordApplicationRoutes.js` (expects no match) | ✓ existing | ⬜ pending |
| 4-be-04 | backend chain | 2 | CARRY-02 | — | Migration `--dry-run` writes nothing to DB | spawn integration | `nvm use 24 && npx jest --testPathPattern=migrate-landlord-app-uid-mismatch` | ❌ W0 — script + test | ⬜ pending |
| 4-be-05 | backend chain | 2 | CARRY-02 | — | Migration hit-skip branch: row uid resolves → no audit row, status unchanged | spawn integration | same | ❌ W0 (same file) | ⬜ pending |
| 4-be-06 | backend chain | 2 | CARRY-02 | — | Migration phone-match-flip: row.uid → newUid + audit row `action: 'uid-repair'` | spawn integration | same | ❌ W0 (same file) | ⬜ pending |
| 4-be-07 | backend chain | 2 | CARRY-02 | — | Migration orphan-mark: row.status → 'orphaned' + audit row `action: 'uid-orphan-mark'` | spawn integration | same | ❌ W0 (same file) | ⬜ pending |
| 4-be-08 | backend chain | 2 | CARRY-02 | — | Migration ambiguous-phone (2+ matches): row.status → 'orphaned'; reason captures ambiguity | spawn integration | same | ❌ W0 (same file) | ⬜ pending |
| 4-be-09 | backend chain | 2 | CARRY-02 | — | Migration idempotency: 2nd run = 0 audit-row inserts; status table unchanged | spawn integration | same | ❌ W0 (same file) | ⬜ pending |
| 4-be-10 | backend chain | 3 | MD-03 | — | DELETE `/listings/:id/media` with malformed ObjectId → 400 (not 500) with `code: 'INVALID_ID'` | supertest | `nvm use 24 && npx jest --testPathPattern=moderationRoutes` (extend) | ✓ existing — extend | ⬜ pending |
| 4-be-11 | backend chain | 3 | MD-04 | T-multer-regress | Sentinel still exits 0 after regex tighten | bash | `bash scripts/check-property-routes-media-stripped.sh; echo $?` (expect 0) | ✓ existing | ⬜ pending |
| 4-be-12 | backend chain | 3 | MD-02 | — | Disambiguated comment block at `moderationRoutes.js:21-28` distinguishes legacy `upload` from `mediaUpload` | grep | `grep -nE "10MB|25MB" src/routes/moderationRoutes.js` (expects both) | ✓ existing | ⬜ pending |
| 4-fe-01 | RN chain | 4 | CARRY-01 | — | All 10 parent handlers route 403 to `is403PermissionError` matcher | grep gate | `grep -cE "is403PermissionError\(err\)" src/screens/ModerationQueueScreen.tsx src/screens/PropertyDetailsScreen.tsx src/screens/RoleManagementScreen.tsx` (expects 10) | n/a (grep) | ⬜ pending |
| 4-fe-02 | RN chain | 4 | CARRY-01 | — | Hook helper functions (matcher + onPermissionDenied) behave correctly | unit | `npx jest --testPathPattern=useModActionGuard` | ❌ W0 — `src/hooks/__tests__/useModActionGuard.test.ts` | ⬜ pending |
| 4-fe-03 | RN chain | 4 | CARRY-01 | — | Canonical RTL: PropertyDetailsScreen.handleRejectSubmit closes modal + calls refreshRole on mocked 403 | RTL smoke | `npx jest --testPathPattern=PropertyDetailsScreen` | ❌ W0 — new test file | ⬜ pending |
| 4-fe-04 | RN chain | 4 | CARRY-01 | — | TypeScript narrowness preserved | tsc | `npx tsc --noEmit` (RN client; expects 0 new errors over 17 baseline) | ✓ existing | ⬜ pending |
| 4-fe-05 | RN chain | 5 | MD-01 | — | EN+RU parity after split-key swap | bash | `bash scripts/check-i18n-parity.sh; echo $?` (expect 0) | ✓ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Sampling Envelopes

### Envelope A — 403 catch path on each of the 10 handlers (CARRY-01)

The "signal" is "did the 403 land at the matcher and route to onPermissionDenied?"

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Static — grep gate | every commit on RN chain | counts `is403PermissionError(err)` across 3 files; expects 10 |
| Static — TS check | every RN commit | tsc --noEmit; expects ≤17 errors (baseline) |
| Dynamic — RTL smoke (canonical surface) | every commit on RN chain | exercises 1 of 10 handlers end-to-end with mocked axios 403 |
| Dynamic — manual iPhone walk | once per phase (Phase 5 REL-03) | exercises ≥3 handlers (recommend approve + reject + role-change) |

The grep gate is cheap + high-frequency — catches "forgot to wire one of the 10." RTL catches "wired but hook closure shape wrong." Manual walk catches "everything passes but UX feels wrong."

### Envelope B — migration's three branches + idempotency (CARRY-02)

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Unit — `classifyRow()` pure-function | every backend commit on chain | branches: hit-skip / phone-match-flip / orphan-mark / ambiguous |
| Integration — `--dry-run` mode | every backend commit | DB writes = 0 |
| Integration — hit-skip | same | row uid unchanged; no audit row |
| Integration — phone-match-flip | same | row.uid → newUid; audit row `action: 'uid-repair'` |
| Integration — orphan-mark | same | row.status → 'orphaned'; audit row `action: 'uid-orphan-mark'` |
| Integration — ambiguous-phone (2+ matches) | same | row.status → 'orphaned'; audit row reason captures ambiguity |
| Integration — idempotency | same | 2nd run = 0 audit-row inserts; status unchanged |
| Operator — `--dry-run` against live Atlas | once before live run | summary counts make sense |
| Operator — `--verify=PASS` against live Atlas | once | exit 0; counts match dry-run forecast |

### Envelope C — sentinel exit-code semantics (CARRY-02 D-07 + MD-04 D-16)

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Pre-merge — D-07 sentinel | every backend commit | exit 0 against post-fix tree |
| Pre-merge — D-07 against synthetic regression | once during plan validation | exit 1 if `uid: req.body` re-introduced |
| Pre-merge — MD-04 tightened sentinel | every backend commit | exit 0 against post-fix tree |
| Pre-merge — MD-04 against synthetic regression | once during plan validation | exit 1 if `require('multer')` re-introduced |
| Pre-merge — npm test chain | every backend commit | all 3 sentinels green BEFORE jest invoked |

---

## Wave 0 Requirements

Files MUST be created in Wave 0 of the phase (before any executable test sampling can happen):

**Backend:**
- [ ] `scripts/check-no-landlord-uid-spoofing.sh` — sentinel script (CARRY-02 D-07)
- [ ] `src/__tests__/landlordApplicationRoutes.test.js` — supertest cases (CARRY-02 D-08); does NOT exist today
- [ ] `src/scripts/migrate-landlord-app-uid-mismatch.js` — repair migration (CARRY-02 D-09 + D-11)
- [ ] `src/__tests__/migrate-landlord-app-uid-mismatch.test.js` — migration test
- [ ] Schema edits: `src/models/LandlordApplication.js` (status enum +`'orphaned'`); `src/models/LandlordApplicationAuditLog.js` (action enum +`'uid-repair'`+`'uid-orphan-mark'`)
- [ ] `package.json` — extend `npm test` chain to call new sentinel
- [ ] `scripts/check-property-routes-media-stripped.sh:8` — regex tighten (D-16)
- [ ] `src/routes/moderationRoutes.js:21-28` (D-14 comment) + DELETE handler (D-15 isValidObjectId pre-check)

**RN client:**
- [ ] `src/hooks/useModActionGuard.ts` — hook + helper (CARRY-01 D-02)
- [ ] `src/hooks/__tests__/useModActionGuard.test.ts` — unit tests for matcher + hook
- [ ] `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` (or extend existing) — RTL canonical surface
- [ ] 10 parent-handler call sites edited across `ModerationQueueScreen.tsx` + `PropertyDetailsScreen.tsx` + `RoleManagementScreen.tsx`
- [ ] `src/locales/en.ts:744` + `src/locales/ru.ts:738` — i18n key swap (MD-01); add `'tooManyFiles'` key in both if planner picks split shape

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demote-mid-action UX feels right (popup vanish + banner appearance latency) | CARRY-01 ROADMAP SC#1 | Visual feedback timing not assertable in jest | iPhone 15 Pro Max: account-A demotes account-B mid-Approve; observe popup close + banner within ~1s; tap banner; verify recovery (no app restart). Captured in `04-HUMAN-UAT.md` |
| Re-submit landlord app uid matches Firebase token sub | CARRY-02 ROADMAP SC#3 | Cross-device + Mongo introspection | iPhone 15 Pro Max: signup as new user → submit landlord app → query Mongo `LandlordApplication.findOne({phone: <user.phone>}).uid` matches `Firebase.user.localId`. Captured in `04-HUMAN-UAT.md` |
| Operator-supervised migration on live Atlas | CARRY-02 D-11 | Single-shot operator action | `--dry-run` first → review summary → `--verify=PASS` → confirm exit 0 + counts match forecast |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (15 items above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

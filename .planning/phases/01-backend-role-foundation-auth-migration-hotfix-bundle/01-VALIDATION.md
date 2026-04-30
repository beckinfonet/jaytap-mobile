---
phase: 1
slug: backend-role-foundation-auth-migration-hotfix-bundle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x + supertest (backend) — to be installed in Wave 0 (CONVENTIONS.md notes "effectively zero tests" today). RN client retains manual physical-device QA bar per project conventions. |
| **Config file** | `JayTap-services/jest.config.cjs` — Wave 0 creates |
| **Quick run command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm run test:quick` |
| **Full suite command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm test` |
| **Estimated runtime** | ~30 seconds (small unit + supertest matrix) |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Filled in by planner — each plan task gets a row tying it to a REQ-ID, threat reference, and an automated or manual verification command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-XX-XX | XX | N | REQ-XX | T-1-XX / — | TBD by planner | unit | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `JayTap-services/jest.config.cjs` — Jest config (Node, supertest)
- [ ] `JayTap-services/package.json` — add `jest`, `supertest`, `test`, `test:quick` npm scripts
- [ ] `JayTap-services/src/__tests__/fixtures/jwks-tokens.js` — golden token fixtures (valid / expired / tampered × user / moderator / admin = 9-case matrix per PITFALLS.md Pitfall 2)
- [ ] `JayTap-services/src/__tests__/setup.js` — shared mongoose memory-server bootstrap

*If planner determines this exceeds Phase 1 scope, the alternative (per Claude's Discretion in CONTEXT.md) is a curl-based runbook against a deployed instance and fully manual QA. Planner picks one path and documents it here.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HF-01 schema patch roundtrip | HF-01 | Ships as standalone hotfix BEFORE Phase 1 (per D-02), exercised through the live RN form | Create a Hospitality listing with 3 rooms, maxGuests 6, 4 amenities → save → re-fetch → confirm all 3 fields persisted |
| HF-02 secret rotation | HF-02 | Out-of-band ops task (Atlas console + AWS IAM console + Railway) | Atlas pwd rotated; AWS keys rotated + old revoked; Railway env vars set; backend boots; old creds rejected |
| Migration script run | ROLE-02 | One-shot Mongo write against production | `npm run migrate:roles-m2 -- --dry-run` → review counts → `npm run migrate:roles-m2` → `db.users.countDocuments({userType: {$nin: ['user', 'moderator', 'admin']}})` returns 0 |
| Foreground role-refresh banner | ROLE-10 | Cross-device async UI behavior best verified by hand | Demote signed-in user via Atlas console → next protected request returns 403 within 60s → banner appears EN+RU → tap → role refreshes |
| Bilingual locale parity | ROLE-09, ROLE-10 | Visual review against EN+RU strings | Switch app language → confirm banner + hard-logout toast render in both locales |
| Hard logout on refresh-token expiry | ROLE-09 | Requires expired refresh token (24h+ wait) | Force refresh-token expiry → next protected request → bilingual toast + return to login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify OR Wave 0 dependencies OR are listed in Manual-Only above with justification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces during plan generation)
- [ ] Wave 0 covers all MISSING references (jest install, supertest, golden token fixtures)
- [ ] No watch-mode flags in any verify command
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once planner fills the per-task map

**Approval:** pending

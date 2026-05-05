---
phase: 4
slug: archive-lifecycle-owner-mod-admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (RN client + backend supertest harness from Phase 3) |
| **Config file** | `JayTap-services/jest.config.js` (backend) — RN client tests deferred to manual physical-device QA per CLAUDE.md |
| **Quick run command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test -- --testPathPattern="property|moderation"` |
| **Full suite command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test && bash /Users/beckmaldinVL/development/mobileApps/JayTap/scripts/check-i18n-parity.sh` |
| **Estimated runtime** | ~30 seconds (backend supertest) + ~5 seconds (i18n parity) |

---

## Sampling Rate

- **After every task commit:** Run quick command for affected file (route file → supertest for that route; locale change → `check-i18n-parity.sh`)
- **After every plan wave:** Run full suite (backend supertest + i18n parity script)
- **Before `/gsd-verify-work`:** Full suite green + manual physical-device smoke (iOS + Android) for owner-archive, mod-archive, restore, hard-delete flows
- **Max feedback latency:** 30 seconds (backend supertest); manual UI smoke is synchronous

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-XX | 01 (backend schema + audit) | 1 | ARCH-01..05 | T-04-AUDIT | `actorUid` derived from `req.firebaseUid` (NEVER body); anti-pattern grep returns 0 | grep gate + unit | `grep -nE "actorUid:\s*req\.(body\|headers)" src/routes/{property,moderation}Routes.js` returns 0 | ❌ W0 | ⬜ pending |
| 04-02-XX | 02 (owner archive/restore routes) | 2 | ARCH-01, ARCH-04 | T-04-RACE | Concurrent owner-archive + mod-archive: only one wins, other gets 409 | integration (supertest) | `npm test -- archive-owner.test.js` | ❌ W0 | ⬜ pending |
| 04-03-XX | 03 (mod/admin archive/restore routes) | 2 | ARCH-02, ARCH-04 | T-04-AUTHZ | Plain user gets 403 on `/api/moderation/properties/:id/archive`; mod with invalid reasonCode gets 400 | integration (supertest) | `npm test -- archive-mod.test.js` | ❌ W0 | ⬜ pending |
| 04-04-XX | 04 (hard-delete admin gate) | 2 | ARCH-05 | T-04-AUTHZ | Mod gets 403 on `DELETE /api/properties/:id`; admin gets 200 + audit row with `before` snapshot | integration (supertest) | `npm test -- hard-delete.test.js` | ❌ W0 | ⬜ pending |
| 04-05-XX | 05 (useRole + PropertyService rewrite) | 3 | ARCH-05 | T-04-AUTHZ | `canFromUser('hardDeleteListing', {role:'mod'})` returns false; `canFromUser('archiveAnyListing', {role:'guest'})` returns false | unit (jest) | `npm test -- useRole.test.ts` | ❌ W0 | ⬜ pending |
| 04-06-XX | 06 (ArchiveListingModal fork) | 3 | ARCH-02 | — | Component renders 4 chips, accepts optional note, calls onSubmit with `(reasonCode, reasonNote)` | manual (component QA in dev build) | physical-device smoke | n/a | ⬜ pending |
| 04-07-XX | 07 (PropertyDetailsScreen footer + Renter rewire) | 4 | ARCH-01..05 | — | Owner sees Archive button on own listing; mod sees Archive+Hard-Delete on any; archived listing shows Restore button only | manual (physical-device iOS+Android) | manual smoke | n/a | ⬜ pending |
| 04-08-XX | 08 (locale rewrite + parity) | 4 | — | — | `check-i18n-parity.sh` exits 0; new keys exist in both en.ts + ru.ts | shell script | `bash scripts/check-i18n-parity.sh` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `JayTap-services/test/integration/archive-owner.test.js` — supertest cases for `POST /api/properties/:id/archive` + `/unarchive` (happy path, 403 not-owner, 409 already-archived, 409 race)
- [ ] `JayTap-services/test/integration/archive-mod.test.js` — supertest cases for `POST /api/moderation/properties/:id/archive` + `/restore` (happy, 400 invalid reasonCode, 403 plain user, 409 already-archived/already-restored, audit row written)
- [ ] `JayTap-services/test/integration/hard-delete.test.js` — supertest cases for `DELETE /api/properties/:id` (admin happy + audit row with `before` snapshot, 403 mod, 403 owner)
- [ ] `JayTap-services/test/helpers/seedFirebaseUser.js` — shared fixture that mints a Firebase token for role={guest|user|moderator|admin} (likely already exists from Phase 3 — confirm)
- [ ] `src/hooks/__tests__/useRole.test.ts` — jest unit cases for new Action members `archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing` (confirm jest config in RN client; if absent, install or defer to manual QA)
- [ ] Anti-pattern grep gate baked into pre-commit or CI: `actorUid:\s*req\.(body|headers)` returns 0 in `src/routes/*.js`

*Wave 0 commit lands BEFORE Wave 2 backend implementation; supertest cases start RED, go GREEN as routes ship.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner archive flow on iOS + Android | ARCH-01 | RN UI; no jest config in client per CLAUDE.md | (1) Sign in as owner, (2) tap Archive on own pending listing in RenterListings tab, (3) confirm Alert.alert appears with archive copy, (4) confirm listing moves to Archived tab, (5) confirm card shows Restore button only (no Edit, no Delete) |
| Mod archive modal 4-chip + optional note | ARCH-02 | RN UI | (1) Sign in as mod, (2) open any pending PropertyDetailsScreen, (3) tap Archive in mod footer, (4) confirm 4 chips render with i18n labels, (5) submit with each reasonCode + with/without note, (6) confirm listing transitions to archived |
| Restore from owner side (self-archived) | ARCH-04 | RN UI | (1) As owner, archive own listing, (2) navigate to Archived tab, (3) tap Restore, (4) confirm dialog says "back to moderation queue" copy (D-12), (5) confirm listing returns to Pending status with FIFO re-stamp |
| Restore from mod side (any archived) | ARCH-04 | RN UI | (1) As mod, archive a listing not owned by you, (2) re-open via direct deep-link to PropertyDetailsScreen, (3) tap Restore in mod footer, (4) confirm transition to pending |
| Owner cannot restore mod-archived listing | ARCH-04 (foot-gun prevention) | RN UI gating | (1) As mod, archive an owner's listing, (2) sign out, sign in as that owner, (3) navigate to Archived tab, (4) confirm Restore button is hidden (D-13: `archivedByUid !== ownerUid` → no affordance) |
| Hard-delete admin-only gate | ARCH-05 | RN UI gating | (1) Sign in as admin, open PropertyDetailsScreen, confirm Hard Delete button visible; (2) sign in as mod, same screen, confirm Hard Delete hidden; (3) sign in as owner, confirm hidden; (4) admin tap → confirm reused DeletePropertyModal with audit warning copy |
| Archived listings hidden from public lanes | ARCH-03 | RN UI filter | (1) Archive a listing, (2) navigate Home / Favorites / RenterListings public lanes, (3) confirm listing absent from each |
| Archived listings visible to owner Archived tab | ARCH-03 | RN UI filter | (1) Archive own listing, (2) navigate RenterListings → Archived tab, (3) confirm listing present and read-only-with-restore |
| EN+RU locale parity for new keys | locked carry-forward | UI string content | Run `bash scripts/check-i18n-parity.sh` post-commit; confirm exit 0; spot-check rendered RU strings in app set to RU locale |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (supertest, grep gate, jest unit, parity script) or `<manual>` (physical-device smoke) — none silent
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (the manual-heavy Wave 4 is bracketed by parity script + supertest re-run)
- [ ] Wave 0 covers all MISSING references (3 supertest files + helper + useRole jest)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for backend; manual UI is synchronous
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

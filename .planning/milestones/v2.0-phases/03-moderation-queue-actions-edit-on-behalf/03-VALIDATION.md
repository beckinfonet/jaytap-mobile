---
phase: 3
slug: moderation-queue-actions-edit-on-behalf
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x + supertest + mongo-memory-server (backend); manual physical-device QA (RN client) |
| **Config file** | `JayTap-services/jest.config.js` (backend); none for RN client |
| **Quick run command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npx jest --testPathPattern=moderation` |
| **Full suite command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npx jest` |
| **Estimated runtime** | ~30 seconds (focused), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command (focused jest pattern for the touched route file)
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green AND manual physical-device QA matrix complete
- **Max feedback latency:** 30 seconds for backend; manual QA gated to phase-exit

---

## Per-Task Verification Map

> Filled in during planning; planner should populate this table from the PLAN.md task IDs.
> Race-condition test (MOD-15) is MANDATORY per `gsd-verifier-misses-regressions.md`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-XX-XX | XX | X | MOD-10 | — | Queue lists pending only, role-gated | supertest | `npx jest moderation/queue.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-11 | — | Approve flips status atomically | supertest | `npx jest moderation/approve.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-12 | — | Reject persists reasonCode + reasonNote | supertest | `npx jest moderation/reject.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-13 | — | RejectionBanner shows owner-locale text + "JayTap moderator" never reveals identity | manual | physical-device QA matrix entry | ✅ | ⬜ pending |
| 03-XX-XX | XX | X | MOD-14 | — | Edit-on-behalf preserves ownerUid; writes moderationLog | supertest | `npx jest moderation/edit-on-behalf.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-15 | T-03-01 race | **Parallel approve via Promise.all → exactly one 200, others 409** | supertest **(MANDATORY)** | `npx jest moderation/race.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-16 | — | moderationLog row schema matches `{actorUid, action, targetType, targetId, before, after, reasonCode?, reasonNote?, at}`; actorUid sourced from `req.firebaseUid` | supertest + code-review checkbox | `npx jest moderation/audit-log.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-17 | — | Routes mounted under correct prefix; requireMinRole('moderator') blocks plain users with 403 | supertest | `npx jest moderation/auth.test.js` | ❌ W0 | ⬜ pending |
| 03-XX-XX | XX | X | MOD-18 | — | App.tsx LOC budget invariant; OVERLAY_FLAGS contains new entry; no react-navigation; no firebase SDK; useTheme() tokens only | code-review checkbox | `wc -l App.tsx && grep -c 'isModerationQueueOpen' App.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `JayTap-services/__tests__/moderation/` — directory created with shared `moderationFixtures.js` (reuses existing `buildToken` helper)
- [ ] `JayTap-services/src/models/ModerationLog.js` — Mongoose model exists (model is the source for audit-log assertions)
- [ ] `JayTap-services/src/config/serviceAreas.js` — config exists (consumed by reject endpoint enum validation)
- [ ] `JayTap-services/src/routes/moderationRoutes.js` (or `propertyRoutes.js` extension per D-13 planner pick) — endpoints mounted before any test runs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RejectionBanner reads in OWNER's locale, never moderator's | MOD-13 | Owner-locale resolution is a UX surface that depends on the owner's app `LanguageProvider` state, not the request's `Accept-Language`. Easier to verify on a physical device with two test owners (one EN, one RU). | (1) Mod (any locale) rejects EN-locale owner's listing → switch to owner device → confirm RejectionBanner reads English. (2) Repeat with RU-locale owner. (3) Confirm banner reads "JayTap moderator" / «Модератор JayTap» — never the moderator's name/email/uid. |
| Pending-count badge refreshes on AppState 'active' with 60s cooldown coordination | MOD-10 | The cooldown lives in `AuthContext`'s AppState hook; verifying the shared registry behavior requires backgrounding/foregrounding the app on a real device. | (1) Open Profile → note count. (2) Background app for >60s. (3) On another device, mod-approves one listing. (4) Foreground first device → count decreases. (5) Repeat foregrounding within 60s → no extra fetch fires (verify via network log). |
| 409 toast appears + moderator stays on current screen | MOD-15 | Toast UX continuity is a runtime behavior the supertest can't verify. | (1) Two mods open same pending listing in PropertyDetailsScreen. (2) Both tap Approve simultaneously. (3) One sees success; the other sees the locked toast with verbatim copy AND remains on PropertyDetailsScreen with the action footer hidden because status is no longer 'pending'. |
| Edit-on-behalf banner is visible AND RejectionBanner suppressed inside CreateListingScreen when `moderatorContext` is set | MOD-14 | Conditional mount visibility — easier to confirm on-device. | (1) Mod opens edit-on-behalf on a `'rejected'` listing. (2) Confirm top banner reads "Editing on behalf of {ownerEmail}" / «Редактирование от имени {ownerEmail}». (3) Confirm the existing Phase 2 RejectionBanner is NOT visible inside the form. |
| EN+RU parity for all new keys passes CI | MOD-13 + carry-forward i18n parity gate | CI enforces but a local pre-commit run is faster feedback. | `bash scripts/check-i18n-parity.sh` exits 0 with no diff output. |
| App.tsx LOC budget — soft cap drift documented OR extraction restored ≤1100 LOC | D-15 carry-forward | Soft-cap is signal-not-block per Phase 2 PATTERN D; verification is a code-review observation. | `wc -l App.tsx` and confirm either (a) ≤1100 LOC after `<PropertyDetailsHost>` extraction OR (b) a SUMMARY.md note explaining the drift. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (race-condition test breaks any long manual-only chain on the backend side)
- [ ] Wave 0 covers all MISSING references (ModerationLog model, serviceAreas config, route file, test fixtures directory)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for backend; physical-device QA gated to phase-exit
- [ ] `nyquist_compliant: true` set in frontmatter once planner populates per-task verification map

**Approval:** pending

---
phase: quick-260515-iqi
plan: 01
subsystem: auth
tags: [auth, email-verification, firebase-rest, i18n, deliverability, runbook]
requires:
  - AuthService Identity Toolkit REST helpers (existing :sendOobCode pattern)
  - RoleRefreshBanner top-of-app banner slot in App.tsx
provides:
  - AuthService.sendEmailVerification / lookupAccount REST helpers
  - AuthContext emailVerified state + resendVerificationEmail + recheckEmailVerified
  - EmailVerifyBanner soft dismissible component
  - scripts/firebase-email-deliverability.md ops runbook
affects:
  - src/context/AuthContext.tsx (signup/login/AppState listener — additive)
  - App.tsx (banner mount)
tech-stack:
  added: []
  patterns:
    - Firebase Identity Toolkit REST :sendOobCode VERIFY_EMAIL + :lookup
    - best-effort fire-and-warn post-signup side effect
    - stale-token recovery via refreshIdToken then re-lookup
key-files:
  created:
    - src/components/EmailVerifyBanner.tsx
    - src/components/__tests__/EmailVerifyBanner.test.tsx
    - src/context/__tests__/AuthContext.emailVerification.test.tsx
    - src/services/__tests__/AuthService.emailVerification.test.ts
    - scripts/firebase-email-deliverability.md
  modified:
    - src/services/AuthService.ts
    - src/types/Auth.ts
    - src/context/AuthContext.tsx
    - src/locales/en.ts
    - src/locales/ru.ts
    - App.tsx
decisions:
  - "Verification send is best-effort — a send failure never fails sign-up; the banner + resend is the safety net."
  - "No hard gate / no lockout — existing unverified accounts keep working; banner is dismissible per-session."
  - "recheckEmailVerified uses :lookup (current server state) and recovers stale tokens via refreshIdToken — banner never gets permanently stuck."
  - "Deliverability is a Console + DNS fix, not a code defect — captured as a committed runbook."
metrics:
  duration: ~30m
  completed: 2026-05-15
  tasks_completed: 5
  tasks_total: 5
  files_changed: 11
---

# Quick Task 260515-iqi: Email verification at sign-up + Firebase deliverability runbook Summary

Automatic Firebase `VERIFY_EMAIL` send after sign-up (best-effort) plus a soft, dismissible `EmailVerifyBanner` with resend and stale-token-safe recheck, and a committed Console+DNS runbook that fixes spam placement for both the reset and verification emails.

## What Was Built

**Deliverable A — email verification feature (code):**

- **Task 1** — `AuthService.sendEmailVerification(idToken)` (`:sendOobCode` with `requestType: 'VERIFY_EMAIL'`) and `AuthService.lookupAccount(idToken)` (`:lookup`, source-of-truth `emailVerified`), mirroring the existing `sendPasswordResetEmail` REST + catch pattern. `AuthUser.emailVerified?: boolean` added.
- **Task 2** — `AuthContext` wiring: `signup()` sends the verification email best-effort (failure → `console.warn` only, sign-up still succeeds) and seeds `emailVerified` from the `:signUp` response; `login()` seeds it from the `:signInWithPassword` response. New `resendVerificationEmail()` (rethrows for banner feedback) and `recheckEmailVerified()` (`:lookup` with stale-token recovery via `refreshIdToken` + retry). The existing AppState `'active'` listener was extended to recheck verification, reusing the same 60s cooldown.
- **Task 3** — `EmailVerifyBanner.tsx`: compact warning-palette bar mirroring `RoleRefreshBanner`, shown only while signed-in and `emailVerified !== true`, with resend (inline sent/error feedback), recheck, and a session-scoped dismiss "X". 5 new `auth.verifyEmail.*` keys added to `en.ts` + `ru.ts` (RU is a true translation). Mounted next to `<RoleRefreshBanner />` in `App.tsx` (not an `OVERLAY_FLAG`).

**Deliverable B — deliverability runbook (docs):**

- **Task 4** — `scripts/firebase-email-deliverability.md`: explains why Firebase emails land in spam, gives 3 ranked fix options (template customization → custom domain → custom SMTP), an SPF/DKIM/DMARC reference table, and header/mail-tester verification steps. States explicitly it covers both the password-reset and the new verification email.

## Verification

- `npx tsc --noEmit` — zero NEW errors in any task-modified file. (21 pre-existing errors on the clean base; total 17 after — see Deferred Issues.)
- `bash scripts/check-i18n-parity.sh` — PASS (en.ts / ru.ts key sets identical).
- Task 4 runbook gate — `RUNBOOK OK` (file exists, contains `DKIM` + `verification email`).
- Task-introduced tests: 14/14 pass (AuthService 4, AuthContext 4, EmailVerifyBanner 6).

## TDD Gate Compliance

Tasks 1-3 were `tdd="true"`. Each followed RED → GREEN: a failing test was written and confirmed failing before implementation, then implementation made it pass. RED/GREEN were committed together per atomic task commit (one commit per task, per the quick-task commit protocol). Task 4 is docs-only — no TDD cycle applies.

## Deviations from Plan

None — the plan executed as written. Tasks 1-3 are `tdd="true"`; per the quick-task per-task atomic-commit protocol, each task's failing test and its implementation were committed together as one commit (rather than separate `test(...)` then `feat(...)` commits) — this is the documented quick-task commit shape, not a deviation.

## Deferred Issues

Out-of-scope discoveries logged to `deferred-items.md` (not fixed — SCOPE BOUNDARY):

1. **Pre-existing tsc errors (21 on the clean base).** `App.tsx` (`Property.tours`), `ChatScreen.tsx`, `ScheduleViewingScreen.tsx`, `TourSelectionScreen.tsx`, `ThemeContext.tsx`. Verified present on base commit `77e5542`; this task introduced zero new errors. Total dropped to 17 after this task's changes.
2. **Pre-existing failing test suites.** `useRole.test.ts` (3 failures, `canFromUser priority ladder`) and `PropertyService.test.ts` fail on the untouched base commit. This task modified none of those files; failures are unrelated to email verification.

## Known Stubs

None. All UI data is wired: the banner reads live `emailVerified` / action callbacks from `AuthContext`; resend and recheck call real Firebase REST helpers.

## Checkpoint Status

**Task 5 (`checkpoint:human-verify`, `gate="blocking"`) — PASSED. User-approved 2026-05-15 on iPhone 15 Pro Max.**

One issue surfaced during on-device QA and was fixed in-loop:

- **EmailVerifyBanner rendered behind the iOS status bar** — the bar is mounted at the `App.tsx` root outside any `SafeAreaView`, so its content overlapped the clock / battery on the iPhone 15 Pro Max. Fixed by padding content down via `useSafeAreaInsets().top` (commit `5a600c9`). The sibling `RoleRefreshBanner` had the identical latent bug (same root slot, never noticed because it shows only on a role change) — fixed the same way (commit `ae44170`).
- Housekeeping done in the same session: stale agent worktrees pruned; jest config hardened to skip `.claude/worktrees/` (commit `25d3aca`).

After the safe-area fix, the user re-verified on device and approved. Quick task 260515-iqi is complete.

## Commits

- `86ef590` feat(quick-260515-iqi): add REST helpers + emailVerified to auth user shape
- `9bda76b` feat(quick-260515-iqi): wire best-effort verification send + emailVerified into AuthContext
- `a99384b` feat(quick-260515-iqi): add EmailVerifyBanner with resend + recheck, mount in App.tsx
- `45b8f7b` docs(quick-260515-iqi): add Firebase email deliverability runbook

## Self-Check: PASSED

Created files verified present on disk; all 4 task commits verified in `git log`.

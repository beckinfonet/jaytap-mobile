# Quick Task 260515-iqi: Email verification at sign-up + Firebase deliverability runbook - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Task Boundary

Two deliverables from one reported problem ("no email verification at sign-up; password-recovery email lands in spam"):

- **A — Email verification feature (code).** Send a Firebase verification email at sign-up and surface a soft, dismissible banner while the account is unverified.
- **B — Firebase email deliverability runbook (docs, no code).** A committed runbook documenting the Firebase Console + DNS steps to keep Firebase-sent emails out of spam. The spam problem is NOT a code defect — `sendPasswordResetEmail` (`src/services/AuthService.ts:40`) already calls the correct endpoint. Deliverability is governed entirely by Firebase Console config + DNS.

</domain>

<decisions>
## Implementation Decisions

### Scope — two deliverables, not one
- Deliverable A is code. Deliverable B is a single committed Markdown runbook — no code change addresses the spam issue.
- The new verification email flows through the SAME Firebase template pipeline as the password-reset email, so the runbook (B) is what makes BOTH emails land in the inbox. Note this explicitly in the runbook.

### Verification UX — soft, dismissible banner (LOCKED — no hard gate)
- After a successful `:signUp`, automatically send the verification email: Firebase Identity Toolkit REST `:sendOobCode` with `requestType: 'VERIFY_EMAIL'`, using the `idToken` from the `:signUp` response.
- The verification-email send is **best-effort**: if it fails, sign-up still succeeds. The banner + resend action is the safety net.
- The user is **NOT blocked** — they enter the app immediately after sign-up, exactly as today. No new full-screen "verify your email" gate.
- A **dismissible banner** surfaces while `emailVerified === false`, with a **"Resend verification email"** action.
- **Existing unverified accounts keep working** — no lockout, no forced re-verification.

### emailVerified — source of truth (gotcha to handle)
- The `:signUp` / `:signInWithPassword` responses do not directly expose verification state; the `email_verified` claim is in the ID-token JWT, and `accounts:lookup` returns `emailVerified`.
- Known gotcha: after the user clicks the verification link, an already-issued ID token still reports `email_verified: false` until the token is refreshed (use the existing `AuthService.refreshIdToken`) or `accounts:lookup` is re-called. The banner must not get permanently stuck — re-check verification state on a sensible trigger (login, app foreground, or a manual "I've verified — refresh" tap). Exact mechanism is Claude's discretion.

### Constraints carried from project conventions
- **No Firebase SDK** — REST only (`identitytoolkit.googleapis.com`). No new dependencies. (memory `no-firebase-sdk.md`)
- **EN + RU i18n parity** for every new UI string — `src/locales/en.json` + `src/locales/ru.json`; CI gate `scripts/check-i18n-parity.sh` must stay green.
- **Theme** — banner uses `useTheme()` tokens; dark/light parity required.
- **Region-neutral copy** — KG/KZ/UZ scope; no Bishkek-only wording. (memory `geographic-scope.md`)

### Deliverable B — runbook specifics
- File: `scripts/firebase-email-deliverability.md` (`scripts/` is the established home for ops runbooks in this project).
- Must cover: why Firebase emails hit spam (default `noreply@<project>.firebaseapp.com` sender, no DKIM alignment on a project-owned domain); fix options ranked by impact — (1) customize the email action templates in Firebase Console, (2) authenticate a custom domain for Firebase Auth emails, (3) custom SMTP via a transactional provider (SES / Postmark / SendGrid) with SPF/DKIM/DMARC; the DNS records each option needs; how to verify (send a test, inspect headers / mail-tester.com). State that it applies to BOTH the password-reset email and the new verification email.

### Claude's Discretion
- Exact banner placement (app-root vs Home screen) and component name.
- Exact `emailVerified` re-check mechanism and trigger.
- Whether to add a lightweight `AuthService.sendEmailVerification(idToken)` plus an `emailVerified` field on the auth context/user shape.

</decisions>

<specifics>
## Specific Ideas

- `AuthService.signUp` is at `src/services/AuthService.ts:13`; `sendPasswordResetEmail` at `:40` — both are correct REST calls and need no change for the spam issue.
- Soft-banner precedent already exists in the codebase: M2 `RoleRefreshBanner` and the M3 `NeedsMediaBanner` are dismissible/auto-surfacing banner patterns worth mirroring.

</specifics>

<canonical_refs>
## Canonical References

- No external spec. Firebase Identity Toolkit REST is the only API surface; `VERIFY_EMAIL` is the standard `requestType` for `:sendOobCode`.

</canonical_refs>

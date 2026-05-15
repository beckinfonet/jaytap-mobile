---
phase: quick-260515-iqi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/AuthService.ts
  - src/types/Auth.ts
  - src/context/AuthContext.tsx
  - src/components/EmailVerifyBanner.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - App.tsx
  - scripts/firebase-email-deliverability.md
autonomous: false
requirements: [IQI-A-email-verification, IQI-B-deliverability-runbook]

must_haves:
  truths:
    - "After a successful sign-up, a Firebase VERIFY_EMAIL message is sent automatically (best-effort)."
    - "A soft, dismissible banner appears while the signed-in user's email is unverified."
    - "The banner offers a 'Resend verification email' action."
    - "The banner offers a way to re-check verification state so it does not get permanently stuck after the user verifies."
    - "Sign-up still succeeds even if the verification-email send fails."
    - "Existing unverified accounts keep working — no lockout, no full-screen gate."
    - "A committed runbook at scripts/firebase-email-deliverability.md documents how to keep Firebase emails out of spam for BOTH password-reset and verification emails."
  artifacts:
    - path: "src/services/AuthService.ts"
      provides: "sendEmailVerification(idToken) + lookupAccount(idToken) REST helpers"
      contains: "VERIFY_EMAIL"
    - path: "src/components/EmailVerifyBanner.tsx"
      provides: "Soft dismissible unverified-email banner with resend + recheck actions"
      min_lines: 40
    - path: "src/context/AuthContext.tsx"
      provides: "emailVerified state on the auth user shape + resend/recheck wiring"
      contains: "emailVerified"
    - path: "scripts/firebase-email-deliverability.md"
      provides: "Firebase email deliverability runbook (docs, no code)"
      contains: "DKIM"
  key_links:
    - from: "src/context/AuthContext.tsx signup()"
      to: "AuthService.sendEmailVerification"
      via: "best-effort call after :signUp using the fresh idToken"
      pattern: "sendEmailVerification"
    - from: "App.tsx top-level banner slot"
      to: "src/components/EmailVerifyBanner.tsx"
      via: "mounted alongside RoleRefreshBanner"
      pattern: "EmailVerifyBanner"
---

<objective>
Two deliverables from one user report ("no email verification at sign-up; password-recovery email lands in spam"):

- **A (code):** Send a Firebase verification email automatically after sign-up, and surface a soft, dismissible banner with a resend action while the account is unverified. No hard gate.
- **B (docs):** A single committed Markdown runbook documenting the Firebase Console + DNS steps that keep Firebase-sent emails out of spam.

Purpose: Close the verification gap with a non-blocking UX, and give the maintainer an actionable, repeatable fix for the deliverability problem (which is a Firebase/DNS config issue, NOT a code defect).

Output: New REST helpers + auth-context state + a banner component + EN/RU strings + the App.tsx mount, plus `scripts/firebase-email-deliverability.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260515-iqi-add-email-verification-at-sign-up-soft-b/260515-iqi-CONTEXT.md

# Source files this plan modifies — read before editing
@src/services/AuthService.ts
@src/types/Auth.ts
@src/context/AuthContext.tsx

# Banner pattern to mirror (top-of-app dismissible banner)
@src/components/RoleRefreshBanner.tsx

<interfaces>
<!-- Contracts the executor needs. Extracted from the codebase — no exploration required. -->

From src/types/Auth.ts:
```typescript
export interface AuthUser {
  localId: string;
  email: string;
  refreshToken?: string;
  backendProfile?: BackendProfile;
  // emailVerified is added by Task 1.
}
```

AuthService (src/services/AuthService.ts) — existing constants and shape:
- `AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts'`
- `API_KEY` is a module constant already in the file.
- Existing REST helpers use `axios.post(`${AUTH_URL}:<verb>?key=${API_KEY}`, body)` and the catch shape:
  `throw error.response ? error.response.data.error : error;`
- `sendPasswordResetEmail` already calls `:sendOobCode` with `requestType: 'PASSWORD_RESET'` — mirror it.
- `refreshIdToken(refreshToken)` already exists for refreshing the ID token.

AuthContext (src/context/AuthContext.tsx):
- `signup(email, password)` calls `AuthService.signUp`, builds `userData: AuthUser`, then `AuthService.saveToken` + `setUser`.
- `login()` builds `userData` similarly.
- The context value object is returned at the bottom — new fields must be added there AND to `AuthContextType`.

App.tsx:
- Line ~747: `<RoleRefreshBanner />` is mounted in a top-level slot ABOVE `hideMainStackUnderOverlay`. This is the slot for the new banner. DO NOT add it to `OVERLAY_FLAGS`.

i18n:
- Locale files are `src/locales/en.ts` and `src/locales/ru.ts` (TypeScript objects, NOT `.json` — CONTEXT.md said `.json`; the real files are `.ts`).
- `ru.ts` is typed `Record<TranslationKeys, string>`, so every EN key MUST have an RU twin or `tsc` fails.
- Components consume strings via `useLanguage()` -> `t('namespace.key')` (see NeedsMediaBanner) OR `t(language, 'key')` (see RoleRefreshBanner). Mirror RoleRefreshBanner's `t(language, ...)` form.
- CI gate: `scripts/check-i18n-parity.sh` must stay green.

Theme:
- `useTheme()` exposes `colors.warning` / `colors.onWarning` / `colors.accent` / `colors.onAccent` / `colors.text` / `colors.textSecondary`. No hardcoded hex/rgba — dark/light parity required.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add REST helpers + emailVerified to the auth user shape</name>
  <files>src/services/AuthService.ts, src/types/Auth.ts</files>
  <behavior>
    - sendEmailVerification(idToken): POSTs to `:sendOobCode` with `{ requestType: 'VERIFY_EMAIL', idToken }`, returns response data, throws using the existing catch shape.
    - lookupAccount(idToken): POSTs to `:lookup` with `{ idToken }`, returns response data (the `users[0]` entry exposes `emailVerified: boolean`).
    - AuthUser carries an optional `emailVerified?: boolean` field.
  </behavior>
  <action>
    In `src/services/AuthService.ts`, add two new helpers to the `AuthService` object, mirroring the existing `sendPasswordResetEmail` style (same `axios.post` to `${AUTH_URL}:<verb>?key=${API_KEY}` pattern, same `catch` shape `throw error.response ? error.response.data.error : error;`):
    1. `sendEmailVerification(idToken: string)` — POST to `:sendOobCode` with body `{ requestType: 'VERIFY_EMAIL', idToken }`. This is the standard Identity Toolkit verb for verification email (per CONTEXT.md decisions — uses the SAME `:sendOobCode` endpoint as password reset, just a different `requestType`).
    2. `lookupAccount(idToken: string)` — POST to `:lookup` with body `{ idToken }`. The response `users[0].emailVerified` is the source-of-truth verification flag. Add a short doc comment noting the gotcha from CONTEXT.md: an already-issued ID token reports `email_verified: false` until refreshed; `:lookup` reflects current server state, so it is the reliable recheck.
    In `src/types/Auth.ts`, add `emailVerified?: boolean;` to the `AuthUser` interface with a one-line comment: hydrated from `:signUp`/`:lookup`; absent means treated as unverified-unknown.
    No new npm dependencies. REST only — `identitytoolkit.googleapis.com`.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>tsc passes; `AuthService.sendEmailVerification` and `AuthService.lookupAccount` exist and use the established REST + catch pattern; `AuthUser` has `emailVerified?: boolean`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire best-effort verification send + emailVerified state into AuthContext</name>
  <files>src/context/AuthContext.tsx</files>
  <behavior>
    - After a successful `signup()`, `AuthService.sendEmailVerification(data.idToken)` is called; a failure is caught and swallowed (sign-up still succeeds).
    - The auth context exposes `emailVerified` (boolean | undefined) on the user and a `resendVerificationEmail()` action plus a `recheckEmailVerified()` action.
    - On sign-up, `emailVerified` is seeded from the `:signUp` response (`data.emailVerified`, typically false for a brand-new account).
    - On login and on app foreground, verification state is re-derived so the banner does not get permanently stuck after the user verifies.
  </behavior>
  <action>
    In `src/context/AuthContext.tsx`:
    1. In `signup()`, after `AuthService.saveToken(...)` + `setUser(...)`, add a best-effort verification send: call `AuthService.sendEmailVerification(data.idToken)` inside a `try/catch` that only `console.warn`s on failure — sign-up MUST still succeed if the send fails (CONTEXT.md: best-effort; the banner + resend is the safety net). Seed `userData.emailVerified` from `data.emailVerified` (Firebase returns this on `:signUp`; default to `false` if absent).
    2. In `login()`, seed `userData.emailVerified` from the `:signInWithPassword` response if present; otherwise leave undefined (Task's recheck will resolve it).
    3. Add `emailVerified` (read off `user`), `resendVerificationEmail`, and `recheckEmailVerified` to `AuthContextType` and to the returned context value object.
       - `resendVerificationEmail`: a `useCallback` that reads the current id token via `AuthService.getToken()` and calls `AuthService.sendEmailVerification(token)`; surface failures to the caller (the banner shows feedback).
       - `recheckEmailVerified`: a `useCallback` that reads the current id token, calls `AuthService.lookupAccount(token)`, reads `users[0].emailVerified`, and `setUser(prev => prev ? { ...prev, emailVerified: <value> } : null)`. If the token is stale, first attempt `AuthService.refreshIdToken(user.refreshToken)` then re-lookup — this is the documented fix for the stale-token gotcha in CONTEXT.md. Wrap in try/catch; non-fatal.
    4. Re-derive verification state on app foreground: extend the EXISTING AppState `'active'` listener `useEffect` (the one near the `lastRefreshAt` cooldown) to also fire `recheckEmailVerified()` — reuse the same 60s cooldown gate; do not add a second AppState listener. Only call it when `user?.localId` is set and `user.emailVerified !== true` (skip churn once verified).
    Keep all changes additive — do not alter the existing `refreshRole` / role-banner / logout behavior.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>tsc passes; `signup()` sends the verification email best-effort; context exposes `emailVerified`, `resendVerificationEmail`, `recheckEmailVerified`; app-foreground recheck reuses the existing AppState listener + cooldown; existing role/logout behavior untouched.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Build the EmailVerifyBanner, add EN/RU strings, mount in App.tsx</name>
  <files>src/components/EmailVerifyBanner.tsx, src/locales/en.ts, src/locales/ru.ts, App.tsx</files>
  <behavior>
    - The banner renders only when a user is signed in AND `emailVerified !== true`.
    - It is dismissible (local `useState` dismissed flag) — once dismissed it stays hidden for the session.
    - It offers a "Resend verification email" action and an "I've verified — refresh" recheck action.
    - Tapping resend calls `resendVerificationEmail()` and shows lightweight bilingual feedback (sent / failed).
    - Tapping recheck calls `recheckEmailVerified()`; if it resolves to verified, the banner disappears via the `emailVerified` guard.
    - All copy is region-neutral (KG/KZ/UZ scope) and theme-tokenized; dark/light parity, no hardcoded colors.
  </behavior>
  <action>
    Create `src/components/EmailVerifyBanner.tsx`, mirroring `RoleRefreshBanner.tsx` (top-of-app banner; `useTheme()` + `useLanguage()`; `t(language, 'key')` string form; `colors.warning`/`colors.onWarning` palette; `accessibilityRole="button"`):
    - Read `{ user, emailVerified, resendVerificationEmail, recheckEmailVerified }` from `useAuth()`.
    - Local `useState` for `dismissed` (boolean) and a transient `status` ('idle' | 'sending' | 'sent' | 'error').
    - Render `null` when `!user || emailVerified === true || dismissed`.
    - Layout: a soft warning-colored bar with a short message, a "Resend" touchable, a "Refresh / I've verified" touchable, and a dismiss "X" (reuse `common.dismiss` for its accessibility label). Keep it compact — single bar, like RoleRefreshBanner. No icons strictly required; use text actions.
    - Resend handler: set status 'sending', `await resendVerificationEmail()`, set 'sent' on success / 'error' on failure; show the corresponding bilingual string inline.
    - Recheck handler: `await recheckEmailVerified()` — the `emailVerified` guard hides the banner if it resolves verified.
    Add NEW keys to BOTH `src/locales/en.ts` and `src/locales/ru.ts` (keep RU as a true translation, not an EN copy; region-neutral):
    - `auth.verifyEmail.banner` — e.g. "Verify your email to secure your account."
    - `auth.verifyEmail.resend` — e.g. "Resend verification email"
    - `auth.verifyEmail.recheck` — e.g. "I've verified — refresh"
    - `auth.verifyEmail.sent` — e.g. "Verification email sent."
    - `auth.verifyEmail.error` — e.g. "Could not send. Try again."
    Mount `<EmailVerifyBanner />` in `App.tsx` directly adjacent to the existing `<RoleRefreshBanner />` (~line 747) in the same top-level slot above `hideMainStackUnderOverlay`. Do NOT add it to `OVERLAY_FLAGS`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && bash scripts/check-i18n-parity.sh</automated>
  </verify>
  <done>tsc passes; i18n parity script passes; `EmailVerifyBanner.tsx` exists mirroring the RoleRefreshBanner pattern with resend + recheck + dismiss; 5 new `auth.verifyEmail.*` keys present in both en.ts and ru.ts; banner mounted next to RoleRefreshBanner in App.tsx.</done>
</task>

<task type="auto">
  <name>Task 4: Write the Firebase email deliverability runbook (docs, no code)</name>
  <files>scripts/firebase-email-deliverability.md</files>
  <action>
    Create `scripts/firebase-email-deliverability.md` — a committed ops runbook (`scripts/` is the established home for ops runbooks: `archive-ios.sh`, `check-*.sh` live there).
    No code. The runbook is the ENTIRE fix for the spam problem — `AuthService.sendPasswordResetEmail` and the new `sendEmailVerification` already call the correct endpoints; deliverability is governed by Firebase Console config + DNS.
    Structure the document with these sections:
    1. **Scope** — State explicitly that this applies to BOTH the password-reset email AND the new sign-up verification email: both flow through the same Firebase email-template pipeline (`:sendOobCode`), so fixing deliverability here fixes both.
    2. **Why Firebase emails land in spam** — Default sender is `noreply@<project>.firebaseapp.com`; the message is sent from Google's infrastructure with no DKIM alignment on a project-owned domain and no SPF/DMARC for the JayTap domain, so receivers down-rank it.
    3. **Fix options, ranked by impact:**
       - Option 1 (quick win): Customize the email action templates in Firebase Console (Authentication -> Templates) — set a recognizable sender name, sender display, reply-to, and localized subject/body. Reduces spam-flagging from generic content.
       - Option 2 (recommended): Authenticate a custom domain for Firebase Auth emails so the From address is a JayTap-owned domain with proper alignment. List the DNS records this needs (the domain-verification TXT record + the SPF/DKIM records Firebase provides for the custom sender domain).
       - Option 3 (strongest, most setup): Configure custom SMTP in Firebase Console via a transactional provider (Amazon SES / Postmark / SendGrid). List the DNS records required: SPF (TXT), DKIM (CNAME/TXT records the provider issues), and a DMARC policy record (TXT at `_dmarc.<domain>`).
    4. **DNS records reference** — A small table summarizing SPF / DKIM / DMARC: record type, host, purpose. Keep it generic enough to apply to whichever provider is chosen.
    5. **How to verify the fix** — Send a test password-reset AND a test verification email to a real inbox; inspect raw message headers for `SPF=pass`, `DKIM=pass`, `DMARC=pass`; run the message through mail-tester.com and target a 9+/10 score; confirm the message lands in Inbox (not Spam/Promotions) on Gmail and at least one other provider.
    6. **Notes** — Region-neutral copy (KG/KZ/UZ launch markets); no Firebase SDK is or should be involved — this is console + DNS only.
    Write region-neutral, no Bishkek-only wording. Keep it concise and actionable — a maintainer should be able to execute it without further research.
  </action>
  <verify>
    <automated>test -f scripts/firebase-email-deliverability.md && grep -q "DKIM" scripts/firebase-email-deliverability.md && grep -q "verification email" scripts/firebase-email-deliverability.md && echo "RUNBOOK OK"</automated>
  </verify>
  <done>`scripts/firebase-email-deliverability.md` exists, covers why-spam + 3 ranked fix options + DNS (SPF/DKIM/DMARC) reference + verification steps, and states it applies to both the reset and verification emails.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Deliverable A: automatic verification email on sign-up + a soft dismissible EmailVerifyBanner with resend and recheck actions. Deliverable B: the deliverability runbook at scripts/firebase-email-deliverability.md.</what-built>
  <how-to-verify>
    On a physical device (iPhone 15 Pro Max and/or Moto G XT2513V), build and run the app, then:
    1. Sign up with a fresh email you control. Confirm sign-up succeeds and you land in the app immediately (no full-screen gate).
    2. Confirm a Firebase verification email arrives in that inbox (check Spam too — Spam landing is expected until Deliverable B is executed; that is fine for this verification).
    3. Confirm the soft EmailVerifyBanner appears at the top of the app while unverified.
    4. Tap "Resend verification email" — confirm a second email arrives and the banner shows sent feedback.
    5. Tap the dismiss "X" — confirm the banner hides for the session.
    6. Click the verification link in the email, then reopen/foreground the app (or sign out and back in) and confirm the banner clears (recheck path).
    7. Toggle dark/light mode — confirm the banner reads correctly in both.
    8. Switch language EN <-> RU — confirm banner copy is translated, not English fallback.
    9. Sign in with an EXISTING unverified account — confirm it still works and is not locked out.
    10. Open scripts/firebase-email-deliverability.md and confirm it is actionable for fixing email deliverability.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues found.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (strict union enforces EN/RU key parity).
- `bash scripts/check-i18n-parity.sh` passes.
- `scripts/firebase-email-deliverability.md` exists and is committed.
- On-device checkpoint approved on at least one physical device.
</verification>

<success_criteria>
- A Firebase VERIFY_EMAIL message is sent automatically after sign-up, best-effort (sign-up never blocked by a send failure).
- A soft, dismissible banner surfaces while `emailVerified !== true`, with working resend and recheck actions; it clears once the user verifies (no permanent stuck state).
- No full-screen gate, no lockout — existing unverified accounts keep working.
- 5 new `auth.verifyEmail.*` strings exist in both en.ts and ru.ts; i18n parity gate green.
- No new npm dependencies; REST-only Firebase Identity Toolkit usage.
- `scripts/firebase-email-deliverability.md` documents the spam fix for BOTH the reset and verification emails.
</success_criteria>

<output>
After completion, create `.planning/quick/260515-iqi-add-email-verification-at-sign-up-soft-b/260515-iqi-SUMMARY.md`
</output>

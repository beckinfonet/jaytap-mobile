# Firebase Email Deliverability Runbook

Ops runbook — quick task 260515-iqi. **No code.** This document is the entire
fix for the "Firebase emails land in spam" problem. The app code is already
correct; deliverability is governed by Firebase Console configuration + DNS.

---

## 1. Scope

This runbook applies to **both** Firebase-sent transactional emails in JayTap:

- The **password-reset email** — `AuthService.sendPasswordResetEmail`
  (`:sendOobCode` with `requestType: 'PASSWORD_RESET'`).
- The **sign-up verification email** — `AuthService.sendEmailVerification`
  (`:sendOobCode` with `requestType: 'VERIFY_EMAIL'`), added in quick task
  260515-iqi.

Both messages flow through the **same** Firebase Authentication email-template
pipeline (`:sendOobCode`). Fixing deliverability here fixes both at once — there
is no per-email configuration to do twice.

This is a Firebase Console + DNS task. **No Firebase SDK is or should be
involved** — the JayTap client uses Identity Toolkit REST only, and that is
correct. Do not add `firebase` or `@react-native-firebase/*` packages.

---

## 2. Why Firebase emails land in spam

Out of the box, Firebase Authentication sends action emails from
`noreply@<project-id>.firebaseapp.com`:

- The message is sent from **Google's shared infrastructure**, not a
  JayTap-owned domain.
- There is **no DKIM signature aligned to a JayTap domain** — the cryptographic
  "this domain authorized this message" proof is missing for any domain JayTap
  controls.
- There is **no SPF or DMARC record** published for a JayTap sending domain, so
  receivers cannot confirm the sender is authorized.
- The default template content is generic. Generic subject/body + an unaligned
  sender is a classic spam-filter down-rank signal.

Receiving providers (Gmail, Outlook, Mail.ru, Yandex, etc.) therefore route the
message to Spam or Promotions instead of the Inbox.

---

## 3. Fix options, ranked by impact

### Option 1 — Quick win: customize the email action templates

In **Firebase Console → Authentication → Templates**:

- Edit both the **Email address verification** and **Password reset** templates.
- Set a recognizable **sender name** (e.g. "JayTap") and **sender display**.
- Set a **reply-to** address that JayTap actually monitors.
- Write a clear, localized **subject and body** — avoid generic, link-only text.

Effect: reduces content-based spam flagging. It does **not** fix sender
authentication, so on its own it only partially improves placement. Do this
first regardless — it is a console-only change with no DNS dependency.

### Option 2 — Recommended: authenticate a custom domain for Firebase Auth emails

Configure Firebase Authentication to send from a **JayTap-owned domain** so the
`From` address has proper SPF/DKIM alignment.

In **Firebase Console → Authentication → Settings → Authorized domains /
custom email domain** (and the project's hosting/domain settings), add the
custom sender domain. Firebase issues the DNS records to publish:

- A **domain-verification TXT record** to prove domain ownership.
- The **SPF and DKIM records** Firebase provides for the custom sender domain.

Publish those records at the JayTap domain's DNS host, then complete
verification in the Console. Effect: emails now come from a JayTap domain that
passes SPF and DKIM — a large, durable deliverability improvement.

### Option 3 — Strongest: configure custom SMTP via a transactional provider

In **Firebase Console → Authentication → Templates → SMTP settings**, route
Firebase action emails through a dedicated transactional email provider
(**Amazon SES**, **Postmark**, or **SendGrid**).

This gives full control over the sending domain, reputation, and authentication.
Each provider issues DNS records to publish at the JayTap domain:

- **SPF** — a `TXT` record authorizing the provider's mail servers.
- **DKIM** — the `CNAME` or `TXT` records the provider issues for message
  signing.
- **DMARC** — a `TXT` record at `_dmarc.<domain>` declaring the policy for
  unauthenticated mail.

Effect: best inbox placement and the most observability (the provider dashboard
reports bounces, complaints, opens). Highest setup and ongoing cost.

---

## 4. DNS records reference

Generic summary of the three records that govern sender authentication. Exact
values come from whichever option/provider is chosen above.

| Record type | Host                  | Purpose                                                                     |
| ----------- | --------------------- | --------------------------------------------------------------------------- |
| SPF (TXT)   | `<domain>` (root)     | Lists the mail servers authorized to send for the domain.                   |
| DKIM        | provider-issued host  | Publishes the public key used to cryptographically sign outgoing messages.  |
| DMARC (TXT) | `_dmarc.<domain>`     | Declares how receivers should treat mail that fails SPF/DKIM alignment.     |

Notes:

- DKIM is sometimes a `CNAME` (SES, SendGrid delegate-style) and sometimes a
  `TXT` (raw public key) — follow the exact records the chosen provider issues.
- Start DMARC at `p=none` (monitor only) and tighten to `p=quarantine` then
  `p=reject` once SPF/DKIM are confirmed passing for all legitimate mail.

---

## 5. How to verify the fix

After applying an option and publishing DNS:

1. Trigger a **test password-reset email** and a **test verification email** to
   a real inbox you control (sign up with a fresh address; tap the
   EmailVerifyBanner "Resend" action).
2. Open the raw message and inspect the **Authentication-Results** headers —
   confirm `spf=pass`, `dkim=pass`, and `dmarc=pass`.
3. Send a test message through **mail-tester.com** and target a **9+/10** score;
   fix any issues it flags.
4. Confirm the message lands in the **Inbox** (not Spam / Promotions) on Gmail
   **and** at least one other provider (Outlook, Mail.ru, or Yandex — relevant
   to the launch markets).
5. Repeat for both email types — they share the pipeline, so a pass on one is a
   strong signal for the other, but verify both at least once.

---

## 6. Notes

- Copy is **region-neutral**: JayTap launches in Bishkek (KG) with planned
  expansion to Almaty (KZ) and Tashkent (UZ). Pick a sending domain and provider
  region appropriate for KG/KZ/UZ recipients; do not hard-code Bishkek-only
  assumptions.
- This is a **Console + DNS** task end to end. No application code change fixes
  the spam problem — the REST calls in `AuthService` already hit the correct
  endpoints.
- Re-verify after any DNS provider migration or domain change — SPF/DKIM/DMARC
  records do not survive a registrar/DNS-host move automatically.

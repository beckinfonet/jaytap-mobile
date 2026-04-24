# Phase 3 — Backend Enforcement Coordination

**Opened:** 2026-04-23 (Phase 3 Wave 4)
**Contact:** Railway backend owner (out-of-band — project owner to route)
**Status:** OPEN

## Context

Phase 3 (Role Gating Precursor) ships client-side gating on admin-only fields in v1.0.4. Per GATE-05 + CONTEXT D-21, we must either CONFIRM or ACCEPT-AS-KNOWN-RISK that the Railway backend independently enforces admin-only writes. Without server enforcement, the client gate is cosmetic only (PITFALLS §Pitfall 5, CONCERNS.md "Firebase uid used as sole auth").

Per D-23 the phase implementation does NOT block on this response — the coordination runs in parallel. Two exit paths per D-22:

- **Path A (confirmed):** Railway confirms enforcement. Record verbatim response here and close GATE-05 as "confirmed" in `03-VERIFICATION.md`. No PROJECT.md change.
- **Path B (unconfirmed at M1 ship):** Add an accepted-risk row to `.planning/PROJECT.md` Key Decisions. Record the same here and in `03-VERIFICATION.md`.

## Question sent

> Hi — for JayTap v1.0.4 we're adding client-side gating on admin-only fields. Can you confirm whether the Railway backend **independently verifies** that the authenticated user (`x-firebase-uid` header) is an admin server-side before accepting these requests? Without server enforcement, the client gate is cosmetic only.
>
> Two specific endpoints:
> 1. `PATCH /properties/:id/verifications` — sets `platformVerifications.{ownershipDocuments, ownerIdentityVerified, stateIssuedDocumentsVerified}`. Current code: `src/services/PropertyService.ts:190-213`. Sends `x-firebase-uid` + `firebaseUid` in body.
> 2. `PUT /properties/:id` — any write that includes `tours`, `matterportUrl` (deprecated field), or `panoramicPhotosUrl` in the payload. Current code: `src/services/PropertyService.ts:117-187`.
>
> Specifically: if a user whose backend `userType !== 'admin'` sends one of these requests, does the backend reject (what status code?), or accept?
>
> Context: this is M1 precursor work. M2 will ship Firebase custom claims + server-side token verification (`firebase-admin` SDK) — but for M1 we'd like to know whether we're shipping a cosmetic gate or a real-enough one.

**Channel:** TBD — project owner to route via Railway team Slack / email.
**Sent on:** PENDING (to be filled when outreach lands).

## Response received

*(To be filled — paste verbatim response + timestamp + respondent name/handle. If no response by M1 submission day, note "no response at ship" and take Path B.)*

## Outcome

- [ ] **Path A — confirmed:** Record verbatim confirmation below + mirror into `03-VERIFICATION.md`.
- [ ] **Path B — accepted risk at ship:** Add row to `.planning/PROJECT.md` Key Decisions; mirror into `03-VERIFICATION.md`.

## Per-endpoint status

- [ ] `PATCH /properties/:id/verifications` — status: [confirmed / accepted risk] — [rationale / link to response]
- [ ] `PUT /properties/:id` (tours + panoramicPhotosUrl + matterportUrl fields) — status: [confirmed / accepted risk] — [rationale / link to response]

## Notes

Per D-23: Phase 3 implementation (hook + migrations + service guard + tests) ships regardless of the response on this coordination. What this file governs is whether PROJECT.md gets a new Key Decisions row (Path B) or not (Path A). The phase's code is already complete at the time this coordination artifact opens.

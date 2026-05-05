---
phase: 06-hardening-manual-physical-device-qa-release
plan: 06
type: summary
status: complete
status_qualifier: approved_with_user_signed_deferrals
completed_at: 2026-05-05T20:35:00Z
requirements_addressed: [REL-03]
artifacts_committed:
  - .planning/phases/06-hardening-manual-physical-device-qa-release/06-QA-MATRIX.md
walk_disposition: APPROVED
walker: beckprograms@gmail.com
walked_against_sha: 95b13c1
backend_walked_against_sha: 2fb5639
paired_gates_clear: true
---

# Plan 06-06 — Manual Physical-Device QA Matrix (REL-03)

## Walk summary

| Field | Value |
|-------|-------|
| Walker | beckprograms@gmail.com |
| Walk start | 2026-05-05T20:00:00Z |
| Walk end | 2026-05-05T20:30:00Z |
| Total cells | 82 |
| ✅ PASS | 74 |
| ❌ FAIL | 0 |
| ⚠ PARTIAL (user-approved) | 3 |
| 🅓 DEFERRED-USER-APPROVED | 5 |
| Devices | iPhone 15 Pro Max + Moto G XT2513V |
| Client SHA walked | 95b13c1 (Plan 06-05 atomic v2.0.0 bump) |
| Backend SHA walked | 2fb5639 (Plan 06-04 Railway deploy) |
| **Disposition** | **APPROVED** |

## Per-matrix breakdown

| Matrix | Cells | PASS | PARTIAL | DEFERRED | FAIL |
|--------|-------|------|---------|----------|------|
| 1 — Role Transitions | 7 | 4 | 2 (1.5/1.6) | 1 (1.7) | 0 |
| 2 — Moderation Queue + Race | 10 | 7 | 0 | 3 (2.4/2.5/2.6) | 0 |
| 3 — Archive Flows | 24 | 24 | 0 | 0 | 0 |
| 4 — Owner Rejection Banner | 8 | 8 | 0 | 0 | 0 |
| 5 — HF Bundle | 9 | 7 | 1 (5.3) | 1 (5.6) | 0 |
| 6 — EN+RU Parity | 16 | 16 | 0 | 0 | 0 |
| 7 — Dark/Light Parity | 8 | 8 | 0 | 0 | 0 |
| **Total** | **82** | **74** | **3** | **5** | **0** |

## Hotfix bundle empirical verification (HF-01..HF-04)

All four hotfix-bundle fixes have at least one empirical PASS:

| Fix | Cell(s) | Evidence |
|-----|---------|----------|
| HF-01 (Hospitality field persistence) | 5.1 iOS + Android | rooms=10, maxGuests=20, all 12 amenities persist on re-fetch — both devices |
| HF-02 (Backend secrets dead) | 5.2 iOS + Android | Sign in with current Mongo creds → /api/auth/me 200 — both devices |
| HF-03 (firebaseUid mismatch) | 5.3 (PARTIAL) + 5.4 PASS | curl invalid-token → 401 confirmed; no-auth → 401 confirmed; full mismatch path deferred (needs token capture) |
| HF-04 (socket handshake JWKS) | 5.5 iOS + Android | Real-time chat thread message flow both directions — both devices (binding empirical proof; regression would break chat) |

## Phase 3+4 paired-gates prerequisite

`status: clear` — user confirmed 2026-05-05 that `/gsd-verify-work 3+4` and `/gsd-code-review 3+4` ran clean. Per memory `gsd-verifier-misses-regressions.md`, paired-gates discipline satisfied as prerequisite to Plan 06-06 walk.

## PARTIAL cells (user-approved sign-off)

### Cells 1.5 + 1.6 — admin → user demote (ROLE-11)

**Backend status:** PASS — ROLE-11 invariant holds. Demoted user's NEXT protected request returns 403; verifyFirebaseToken middleware correctly rejects tokens with `iat < roleRevokedAt`.

**Frontend status:** STUCK — when an admin demotes a user who has a moderator action popup OPEN at the time, the popup's submit handler doesn't catch the resulting 403/PermissionDeniedError. Loading spinner stays on; popup hangs. RoleRefreshBanner does not surface; force re-login does not trigger.

**Security impact:** None — demoted user CANNOT complete the action (backend returns 403). User can force-quit the app + re-login to recover. The `isAdmin` / `can('manageListings')` route guards in subsequent navigation also block re-entry.

**User sign-off:** "Defer the UX fix to M3 backlog; mark 1.5/1.6 PARTIAL with explicit sign-off" (chosen during walk, 2026-05-05).

**Follow-up (M3 backlog):** Add 403/PermissionDeniedError handling to mod-action submit handlers across:
- ModerationQueueScreen approve/reject popup
- RejectListingModal
- ArchiveListingModal
- PropertyDetailsScreen mod-action footer
- DeleteListingModal

Each must catch the error, reset loading state, surface the RoleRefreshBanner, force re-login. Regression test: re-walk cells 1.5/1.6 after fix.

### Cell 5.3 — HF-03 firebaseUid mismatch curl

**Auth gate status:** PASS — invalid-token rejection confirmed (HTTP 401 `{"code":"invalid-token"}` via curl 2026-05-05).

**Mismatch path status:** DEFERRED — full firebaseUid mismatch test (valid attacker token + body firebaseUid != verified sub → 403) requires capturing a valid Firebase ID token from a signed-in session.

**User sign-off:** Bundled with race-cell deferral (T-06-33 mitigation rationale applies — token capture overhead disproportionate to release-blocker status).

**Follow-up (M3 backlog):** Capture token via Charles Proxy or app debug log + replay test as a one-shot QA step.

## DEFERRED-USER-APPROVED cells (T-06-33 option (b))

### Cells 1.7 + 2.4 + 2.5 + 2.6 — race-condition cells

**Cells:**
- 1.7 — concurrent demote race (both admins demote same target)
- 2.4 — Approve vs Reject same listing
- 2.5 — Approve vs Edit-on-behalf same listing
- 2.6 — Reject vs mod-archive same listing

**Rationale:** Two-human simultaneous-tap coordination across iOS + Android is timing-fragile. Per Plan 06-06 T-06-33 mitigation: after 3 retries that fail to produce an observable race, the cell does NOT auto-accept. The two formal options are (a) coordinated tool/script with token-capture, or (b) deferral with user sign-off. User chose option (b).

**Backend invariants are covered:**
- MOD-15 atomic findOneAndUpdate guard: tested by Phase 3 supertest suite (Plan 03-05).
- ROLE-11 roleRevokedAt token rejection: tested by Phase 1 verifyFirebaseToken middleware tests + Plan 1.5/1.6 backend-side PASS evidence above.

**User sign-off (verbatim, recorded 2026-05-05):** "Defer race cells to follow-up phase (Phase 6.5 or M3 backlog) — Per T-06-33 option (b)."

**Follow-up:** Phase 6.5 or M3 backlog item — build a coordinated-curl test rig with token-capture mechanism (parallel `curl &` against the live backend with two captured moderator tokens to force an observable race window). Or: physical-device race-coordination harness (Bluetooth-trigger-pair sync).

### Cell 5.6 — attacker socket (HF-04)

**Cell:** websocat + curl attempt to join `user:<victim-uid>` with attacker token → connection drops or refuses room subscription.

**Rationale:** `websocat` is not installed in the local QA station + cell needs a real Firebase token (same constraint as cell 5.3 mismatch path). Cell 5.5 device walk (PASS×2) is the binding empirical proof of HF-04: a regression of the socket handshake JWKS verification would break iOS + Android chat thread message flow, which both PASS.

**User sign-off:** Bundled with race-cell deferral.

**Follow-up (M3 backlog):** Install websocat in QA toolchain + add token-capture step to QA scripts.

## Plan 06-07 hand-off

`walk_disposition: APPROVED` is the binding gate that lets Plan 06-07 proceed:

- Archive build of `95b13c1` for ASC TestFlight Internal upload
- Build `.aab` of `95b13c1` for Play Console Production upload (or closed-testing per M1 D-12 inheritance)
- Paste EN + RU release notes from `06-RELEASE-NOTES.md`
- Inherit privacy declarations + store-listing assets per `06-INHERITANCE-AUDIT.md`

## Re-open conditions

- If TestFlight users surface a regression in any walked cell during external validation, re-walk the affected cell on both devices + bug-fix loop.
- If M3 closes the demote-popup-recovery UX (PARTIAL 1.5/1.6) or the race-cell test rig (DEFERRED 1.7/2.4/2.5/2.6/5.6 + 5.3), update this SUMMARY's deferral block status to `closed-by-followup` and reference the closing commit SHA.
- If the live backend deploy SHA changes between this walk's `2fb5639` and Plan 07's submission, re-run health checks (Plan 04 Section 6 protocol) and confirm the same SHA is live before submitting.

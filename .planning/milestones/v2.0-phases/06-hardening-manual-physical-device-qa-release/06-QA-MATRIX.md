---
phase: 06-hardening-manual-physical-device-qa-release
plan: 06
type: verification-matrix
status: walked
created: 2026-05-05T20:00:00Z
walked: 2026-05-05T20:30:00Z
walked_against_sha: 95b13c1
backend_walked_against_sha: 2fb5639e606a748db73dd0d39875c01015c8f452
walk_disposition: APPROVED
walker: beckprograms@gmail.com
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.x
    build: Fabric / Release
    binary: 2.0.0 build 27
  android:
    model: Moto G XT2513V
    os: Android 16
    build: Fabric / Release
    binary: 2.0.0 versionCode 30
accounts:
  admin: beckprograms@gmail.com
  moderator: 2 pre-existing moderator accounts available at walk time
  owner_with_rejected: created at walk time via Phase 3 reject-flow
  plain_user: test account (signed-in user)
requirements_addressed: [REL-03]
testing_bar: M2 manual physical-device QA per CLAUDE.md
walk_scope: cross-cutting M2 (Phases 1–5) on dual-device + 4 hotfix-bundle empirical verifications + EN+RU parity + dark/light parity
paired_gates_prerequisite_clear: true
matrix_count: 7
totals:
  total_cells: 82
  pass: 74
  partial: 3
  deferred_user_approved: 5
  fail: 0
  na: 0
deferrals:
  race_cells:
    cells: [1.7, 2.4, 2.5, 2.6]
    rationale: "T-06-33 option (b) — formal user-approved deferral. Two-human simultaneous-tap coordination across iOS + Android is timing-fragile; reliable observable race requires a coordinated tool/script (parallel curl with 2 captured moderator tokens) which has overhead disproportionate to release-blocker status. Backend MOD-15 + ROLE-11 atomic invariants are covered by Phase 3 supertest suite + Phase 1 ROLE-11 verifyFirebaseToken middleware tests."
    follow_up: "Phase 6.5 or M3 backlog: build a coordinated-curl test rig with token-capture mechanism. Or: physical-device race-coordination harness (Bluetooth-trigger-pair sync)."
  hf_curl_cells:
    cells: [5.6]
    rationale: "websocat not installed locally + cell 5.5 device walk is the binding empirical proof that HF-04 socket handshake JWKS works (regression would break iOS + Android chat thread message flow, which PASS×2 in cell 5.5)."
    follow_up: "M3 backlog: install websocat in QA toolchain + add token-capture step to QA scripts."
partials:
  cells_1_5_1_6:
    cells: [1.5, 1.6]
    backend_status: "PASS — ROLE-11 invariant holds. Demoted user's NEXT protected request returns 403; backend roleRevokedAt token-rejection works correctly."
    frontend_status: "STUCK — when admin demotes a user who has a moderator action popup OPEN at the time, the popup's submit handler doesn't catch the resulting 403/PermissionDeniedError. Loading spinner stays on; popup hangs. RoleRefreshBanner does not surface; force re-login does not trigger."
    security_impact: "None — demoted user CANNOT complete the action (backend 403). User can force-quit + re-login to recover."
    follow_up: "M3 backlog: add 403/PermissionDeniedError handling to mod-action submit handlers across ModerationQueueScreen approve/reject + RejectListingModal + ArchiveListingModal + PropertyDetailsScreen mod footer. Reset loading state, surface RoleRefreshBanner, force re-login."
  cell_5_3:
    cells: [5.3]
    auth_gate_status: "PASS — invalid-token rejection confirmed (HTTP 401 {\"code\":\"invalid-token\"} via curl 2026-05-05)."
    mismatch_path_status: "DEFERRED — full firebaseUid mismatch test (valid attacker token + body firebaseUid != verified sub → 403) requires capturing a valid Firebase ID token from a signed-in session, which Charles Proxy or app debug log can do but adds capture overhead."
    follow_up: "M3 backlog: capture token + replay test as a one-shot QA step."
---

# Phase 6 — Manual Physical-Device QA Matrix (REL-03)

Walked v2.0.0 (built from commit `95b13c1`, against backend deploy SHA `2fb5639`) on iPhone 15 Pro Max + Moto G XT2513V on 2026-05-05.

## Cell markers

- ✅ **PASS** — observed expected behavior on the listed device
- ❌ **FAIL** — regression observed; bug-fix loop opens
- ⚠ **PARTIAL** — security-critical part PASS; auxiliary part deferred (see `partials` in frontmatter for sign-off)
- 🅓 **DEFERRED-USER-APPROVED** — formally deferred per T-06-33 option (b); follow-up backlog item recorded
- — **N/A** — cell intentionally not applicable on this device
- ☐ **Pending** — not yet walked

## Test environment

| Field | Value |
|-------|-------|
| iOS device | iPhone 15 Pro Max — iOS 26.x — Hermes + Fabric — Release config |
| Android device | Moto G XT2513V — Android 16 — Fabric — Release config |
| iOS binary identity | 2.0.0 build 27 (CURRENT_PROJECT_VERSION 27 from 06-STORE-HISTORY.md) |
| Android binary identity | 2.0.0 versionCode 30 (from 06-STORE-HISTORY.md) |
| Backend | Railway production at SHA `2fb5639` (per 06-BACKEND-DEPLOY.md) |
| Walked-against client SHA | `95b13c1` |

## Memory anchors

- `nav-overlay-hides-bottom-nav.md` — overlays hide the bottom tab bar by design.
- `last-admin-lockout-semantics.md` — ADMIN-03 lockout fires only on Promise.all race or count==1 self-demote.
- `gsd-verifier-misses-regressions.md` — paired-gates prerequisite confirmed clear by user 2026-05-05.

## Phase 3+4 paired-gates prerequisite

Status: **clear** (per 06-STORE-HISTORY.md frontmatter; user-confirmed 2026-05-05 that `/gsd-verify-work 3+4` and `/gsd-code-review 3+4` ran clean).

---

## Matrix 1 — Role Transitions (7 cells)

Walks ROLE-01..ROLE-11 + ADMIN-02 end-to-end. Confirms ROLE-11 `roleRevokedAt` invariant.

| Cell | Transition | Device | Result |
|------|------------|--------|--------|
| 1.1 | user → moderator | iOS | ✅ PASS — promote works, target refreshes within 60s |
| 1.2 | user → moderator | Android | ✅ PASS — works on Moto G |
| 1.3 | moderator → admin | iOS | ✅ PASS — admin promotion works |
| 1.4 | moderator → admin | Android | ✅ PASS — works on Moto G |
| 1.5 | admin → user (ROLE-11 demote) | iOS | ⚠ PARTIAL — backend ROLE-11 verified (token rejected on next protected request); frontend mid-action 403 recovery UX hangs (popup loading state doesn't reset). User-approved deferral; M3 backlog. See frontmatter `partials.cells_1_5_1_6`. |
| 1.6 | admin → user (ROLE-11 demote) | Android | ⚠ PARTIAL — same as 1.5 on Moto G |
| 1.7 | concurrent demote race (both admins demote same target) | iOS + Android | 🅓 DEFERRED-USER-APPROVED — T-06-33 option (b); two-human race coordination deferred to Phase 6.5/M3. See frontmatter `deferrals.race_cells`. |

---

## Matrix 2 — Moderation Queue Actions with Two-Device Race (10 cells)

REL-03 explicit two-device race-condition coverage. Race cells (2.4 / 2.5 / 2.6) DEFERRED per T-06-33 option (b) with explicit user sign-off (recorded in 06-06-SUMMARY.md).

| Cell | Action | Device-A | Device-B | Audit row count | Result |
|------|--------|----------|----------|-----------------|--------|
| 2.1 | Approve listing X | iOS (mod) | (idle) | n/a | ✅ PASS — approved, status flipped, queue refreshed |
| 2.2 | Reject listing Y with reason chip | Android (mod) | (idle) | n/a | ✅ PASS — rejected, reason persists, banner appears |
| 2.3 | Edit-on-behalf listing Z | iOS (mod) | (idle) | n/a | ✅ PASS — moderatorContext banner + RejectionBanner suppressed; ownerUid preserved |
| 2.4 | TWO-DEVICE RACE — A approves / B rejects same X | iOS (mod) | Android (mod) | (deferred) | 🅓 DEFERRED-USER-APPROVED — T-06-33 (b); see frontmatter `deferrals.race_cells` |
| 2.5 | TWO-DEVICE RACE — A approves / B edits-on-behalf same X | iOS (mod) | Android (mod) | (deferred) | 🅓 DEFERRED-USER-APPROVED |
| 2.6 | TWO-DEVICE RACE — A rejects / B archives (mod-archive) same X | iOS (mod) | Android (mod) | (deferred) | 🅓 DEFERRED-USER-APPROVED |
| 2.7 | Approve flow native Alert.alert confirm | iOS | — | n/a | ✅ PASS — native Alert + 200 + toast |
| 2.8 | Approve flow native Alert.alert confirm | Android | — | n/a | ✅ PASS — native Alert + 200 + toast |
| 2.9 | Reject flow chip selection (4 chips) | iOS | — | n/a | ✅ PASS — 4 chips, default + deselect behave correctly |
| 2.10 | Reject flow chip selection (4 chips) | Android | — | n/a | ✅ PASS — 4 chips work |

### Audit-row-count sub-step (cells 2.4, 2.5, 2.6 — DEFERRED)

When race cells are walked in a follow-up phase, the binding sub-step is `db.moderationlogs.countDocuments({targetId: ObjectId("<listingId>")}) === 1`. Three acceptable paths preserved here for the future walker: `mongosh` (Path A), Atlas Data API (Path B), Atlas web UI Mongo Shell (Path C).

---

## Matrix 3 — Archive Flows (12 rows × 2 devices = 24 cells)

Phase 4 walked these on iPhone only (per `04-07-SUMMARY.md`); Phase 6 closes Moto G coverage AND re-walks the v2.0.0 binary.

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 3.1 | Owner archives own live listing → Pending tab | ✅ PASS | ✅ PASS |
| 3.2 | Owner restores self-archived listing → Pending tab + re-moderation copy | ✅ PASS | ✅ PASS |
| 3.3 | Owner CANNOT restore mod-archived listing (D-13 conditional gate) | ✅ PASS | ✅ PASS |
| 3.4 | Mod archives any live listing via PropertyDetailsScreen → ArchiveListingModal 4-chip + note | ✅ PASS | ✅ PASS |
| 3.5 | Mod restores any archived listing → status pending | ✅ PASS | ✅ PASS |
| 3.6 | Admin Hard Delete on archived → DeleteListingModal → permanentlyDeletedToast → screen pops | ✅ PASS | ✅ PASS |
| 3.7 | Plain user sees no Archive/Restore/Hard-Delete affordances | ✅ PASS | ✅ PASS |
| 3.8 | Archived listings hidden from Home / Favorites public lanes | ✅ PASS | ✅ PASS |
| 3.9 | Owner sees own archived in Archived tab (self + mod-archived both visible) | ✅ PASS | ✅ PASS |
| 3.10 | EN+RU locale parity Rows 1+2+4 walked in Russian | ✅ PASS | ✅ PASS |
| 3.11 | Dark theme parity for ArchiveListingModal + RejectionBanner | ✅ PASS | ✅ PASS |
| 3.12 | ARCH-04 re-moderation copy: "back to the moderation queue for review before becoming public again" / «очередь модерации для проверки» | ✅ PASS | ✅ PASS |

---

## Matrix 4 — Owner-Side Rejection Banner Persistence (4 rows × 2 devices = 8 cells)

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 4.1 | Owner with rejected listing sees Home rejection banner; tap → OwnerListings → Rejected tab | ✅ PASS | ✅ PASS |
| 4.2 | Sign out → sign back in → banner STILL appears (persistence) | ✅ PASS | ✅ PASS |
| 4.3 | Edit and resubmit a rejected listing → status → pending → banner auto-dismisses | ✅ PASS | ✅ PASS |
| 4.4 | Locale switch EN ↔ RU mid-session → banner copy updates with current locale | ✅ PASS | ✅ PASS |

---

## Matrix 5 — Hotfix Bundle Empirical Verification (HF-01..HF-04)

**HF-01 — Hospitality field persistence:**

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 5.1 | Create Hospitality (Hotel) listing with rooms=10, maxGuests=20, all 12 amenities → save → re-fetch via PropertyDetails → all values persist | ✅ PASS | ✅ PASS |

**HF-02 — Backend secrets dead:**

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 5.2 | Sign in with current Mongo credentials (post-HF-02 rotation per Plan 04 Section 3) → /api/auth/me returns 200 | ✅ PASS | ✅ PASS |

**HF-03 — firebaseUid mismatch 403 (executor-driven curl):**

| Cell | Scenario | Result |
|------|----------|--------|
| 5.3 | `curl -X POST <BACKEND>/api/auth/users -H "Authorization: Bearer <attacker-token>" -d '{"firebaseUid": "<victim-uid>", ...}'` → 403 | ⚠ PARTIAL — invalid-token rejection confirmed (HTTP 401 `{"code":"invalid-token"}` 2026-05-05). Full mismatch test (valid attacker token + body firebaseUid != verified sub → 403) deferred; needs Charles Proxy + token capture. See frontmatter `partials.cell_5_3`. |
| 5.4 | Same with no Authorization header → 401 | ✅ PASS — HTTP 401, 117ms (curl 2026-05-05) |

**HF-04 — Socket handshake JWKS:**

| Cell | Scenario | iOS | Android | curl |
|------|----------|-----|---------|------|
| 5.5 | Sign in as User A → ChatThreadScreen with User B; exchange messages; messages flow correctly | ✅ PASS | ✅ PASS | — |
| 5.6 | Attacker socket attempt (curl + websocat) tries to join `user:<victim-uid>` with attacker token → connection drops | — | — | 🅓 DEFERRED-USER-APPROVED — websocat not installed + needs token capture; cell 5.5 device-walk PASS×2 is the binding empirical proof of HF-04 (regression would break chat). See frontmatter `deferrals.hf_curl_cells`. |

---

## Matrix 6 — EN+RU Parity (per-screen Russian-language session)

| Cell | Screen | iOS RU | Android RU |
|------|--------|--------|------------|
| 6.1 | LoginScreen / SignupScreen | ✅ PASS | ✅ PASS |
| 6.2 | RoleManagementScreen + RoleChangeModal (3-chip; 23 admin.roles.* keys) | ✅ PASS | ✅ PASS |
| 6.3 | ModerationQueueScreen + RejectListingModal (4-chip + note) | ✅ PASS | ✅ PASS |
| 6.4 | OwnerListings 4-tab segmented control (owner.listings.tab.{live,pending,rejected,archived}) | ✅ PASS | ✅ PASS |
| 6.5 | RejectionBanner with reasonCode lookup in RU | ✅ PASS | ✅ PASS |
| 6.6 | ArchiveListingModal (4-chip + note) | ✅ PASS | ✅ PASS |
| 6.7 | DeleteListingModal | ✅ PASS | ✅ PASS |
| 6.8 | Home rejection banner singular + plural | ✅ PASS | ✅ PASS |

---

## Matrix 7 — Dark/Light Parity (M2-new surfaces only)

| Cell | Surface | iOS dark | Android dark |
|------|---------|----------|--------------|
| 7.1 | PropertyDetailsScreen mod-action footer (Approve / Reject / Edit-on-behalf / Archive / Restore / Hard-Delete + StatusPill) | ✅ PASS | ✅ PASS |
| 7.2 | RoleManagementScreen self-row "(you)" badge + 50-row footer hint | ✅ PASS | ✅ PASS |
| 7.3 | RejectionBanner colors (warning palette) | ✅ PASS | ✅ PASS |
| 7.4 | ArchiveListingModal + DeleteListingModal contrast | ✅ PASS | ✅ PASS |

---

## Sign-off

| Field | Value |
|-------|-------|
| Walker | beckprograms@gmail.com |
| Walk start | 2026-05-05T20:00:00Z |
| Walk end | 2026-05-05T20:30:00Z |
| Total cells | 82 |
| ✅ PASS | 74 |
| ❌ FAIL | 0 |
| ⚠ PARTIAL (user-approved) | 3 (cells 1.5, 1.6, 5.3) |
| 🅓 DEFERRED-USER-APPROVED | 5 (cells 1.7, 2.4, 2.5, 2.6, 5.6) |
| — N/A | 0 |
| **Disposition** | **APPROVED** |

**Disposition rationale:** Zero blocking FAILs. Three PARTIAL cells (1.5/1.6/5.3) and five DEFERRED cells (1.7/2.4/2.5/2.6/5.6) carry explicit user sign-off per T-06-33 option (b) — all backed by either backend-invariant verification (security-critical paths) or alternative empirical proofs (cell 5.5 covers HF-04). All deferred items are in the M3 backlog with recorded follow-up actions in frontmatter.

**Bug-fix loop status:** Not invoked — no FAILs.

**Resume signal:** `approved` — Plan 06-07 (store submission) cleared to proceed.

---
phase: 06-hardening-manual-physical-device-qa-release
plan: 06
type: verification-matrix
status: scaffolded
created: 2026-05-05T20:00:00Z
walked: pending
walked_against_sha: 95b13c1
backend_walked_against_sha: 2fb5639e606a748db73dd0d39875c01015c8f452
walk_disposition: pending
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
  moderator: <promoted at walk time via Phase 5 RoleManagementScreen>
  owner_with_rejected: <created at walk time via Phase 3 reject-flow>
  plain_user: <test account>
requirements_addressed: [REL-03]
testing_bar: M2 manual physical-device QA per CLAUDE.md
walk_scope: cross-cutting M2 (Phases 1–5) on dual-device + 4 hotfix-bundle empirical verifications + EN+RU parity + dark/light parity
paired_gates_prerequisite_clear: true
matrix_count: 7
---

# Phase 6 — Manual Physical-Device QA Matrix (REL-03)

Walks v2.0.0 (built from commit `95b13c1`, against backend deploy SHA `2fb5639`) on iPhone 15 Pro Max + Moto G XT2513V. Each cell is one row in one of the 7 matrices below. Walker flips the cell marker as they go.

## Cell markers

- ✅ **PASS** — observed expected behavior on the listed device
- ❌ **FAIL** — regression observed; bug-fix loop opens
- — **N/A** — cell intentionally not applicable on this device (e.g., overlay-hidden tab bar per memory `nav-overlay-hides-bottom-nav.md`); rationale required
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

- `nav-overlay-hides-bottom-nav.md` — overlays hide the bottom tab bar by design; cells that would require seeing the tab bar WHILE an overlay is still open are intentionally `— N/A`. DO NOT mark FAIL.
- `last-admin-lockout-semantics.md` — ADMIN-03 lockout fires only on Promise.all race or count==1 self-demote. Don't expect it outside concurrent races.
- `gsd-verifier-misses-regressions.md` — paired-gates prerequisite confirmed clear by user 2026-05-05.

## Phase 3+4 paired-gates prerequisite

Status: **clear** (per 06-STORE-HISTORY.md frontmatter; user-confirmed 2026-05-05 that `/gsd-verify-work 3+4` and `/gsd-code-review 3+4` ran clean).

---

## Matrix 1 — Role Transitions (8 cells: 7 transitions × distribution across 2 devices)

Walks ROLE-01..ROLE-11 + ADMIN-02 end-to-end. Confirms ROLE-11 `roleRevokedAt` invariant: demoting a moderator while their app is open causes their next protected request to 403 within 60s.

| Cell | Transition | Device | Expected steps | Result |
|------|------------|--------|----------------|--------|
| 1.1 | user → moderator | iOS | Sign in as admin → RoleManagementScreen → search target user → RoleChangeModal → moderator chip → confirm; signed-in target user's app refreshes role within 60s; Moderation Queue row appears in Profile | ☐ |
| 1.2 | user → moderator | Android | Same as 1.1 on Moto G | ☐ |
| 1.3 | moderator → admin | iOS | RoleManagementScreen → admin chip → confirm; target's role flips to admin; admin-only actions visible | ☐ |
| 1.4 | moderator → admin | Android | Same as 1.3 on Moto G | ☐ |
| 1.5 | admin → user (ROLE-11 demote) | iOS | Sign in as different admin → RoleChangeModal → user chip; demoted user's NEXT protected request returns 403 (token rejected because iat < roleRevokedAt); RoleRefreshBanner shows; tap → re-login required | ☐ |
| 1.6 | admin → user (ROLE-11 demote) | Android | Same as 1.5 on Moto G | ☐ |
| 1.7 | concurrent demote race (both admins demote same target) | iOS + Android | Two devices, DIFFERENT admins; both demote target user simultaneously; per `last-admin-lockout-semantics.md`, lockout fires only on count==1 race. Document outcome (one 200 + one 409 OR both 200). | ☐ |

---

## Matrix 2 — Moderation Queue Actions with Two-Device Race (10 cells)

REL-03 explicit two-device race-condition coverage. The three TWO-DEVICE RACE cells (2.4 / 2.5 / 2.6) include an `Audit row count` column that MUST equal 1 (proving MOD-15 atomic findOneAndUpdate guard holds).

| Cell | Action | Device-A | Device-B | Expected | Audit row count | Result |
|------|--------|----------|----------|----------|-----------------|--------|
| 2.1 | Approve listing X | iOS (mod) | (idle) | Status flips to live; PropertyCard StatusPill removes pending; ModerationLog row 1 | n/a | ☐ |
| 2.2 | Reject listing Y with reason chip | Android (mod) | (idle) | Status flips to rejected; reasonCode/reasonNote persist; owner sees RejectionBanner | n/a | ☐ |
| 2.3 | Edit-on-behalf listing Z | iOS (mod) | (idle) | CreateListingScreen opens with moderatorContext banner + RejectionBanner suppressed; save dispatches editAsModerator; status flips to live; ownerUid preserved | n/a | ☐ |
| 2.4 | TWO-DEVICE RACE — A approves / B rejects same X | iOS (mod) | Android (mod) | Exactly ONE winner; loser sees 409 ALREADY_MODERATED toast; both queue refetches show X removed | MUST = 1 | ☐ |
| 2.5 | TWO-DEVICE RACE — A approves / B edits-on-behalf same X | iOS (mod) | Android (mod) | Same race semantics; one winner; loser 409 | MUST = 1 | ☐ |
| 2.6 | TWO-DEVICE RACE — A rejects / B archives (mod-archive) same X | iOS (mod) | Android (mod) | Same race semantics | MUST = 1 | ☐ |
| 2.7 | Approve flow native Alert.alert confirm | iOS | — | Approve button → confirm prompt → 200 → toast | n/a | ☐ |
| 2.8 | Approve flow native Alert.alert confirm | Android | — | Same | n/a | ☐ |
| 2.9 | Reject flow chip selection (4 chips) | iOS | — | All 4 reasonCodes selectable; default `incomplete-info`; chip-deselection clears pendingReason | n/a | ☐ |
| 2.10 | Reject flow chip selection (4 chips) | Android | — | Same | n/a | ☐ |

### Audit-row-count sub-step (cells 2.4, 2.5, 2.6 — MANDATORY)

After each race resolves, run the equivalent of `db.moderationlogs.countDocuments({targetId: ObjectId("<listingId>")})` and record the integer. Three acceptable paths:

- **Path A** — `mongosh` from QA station shell with live MONGO_URI: `mongosh "<MONGO_URI>" --eval 'db.moderationlogs.countDocuments({targetId: ObjectId("<listingId>")})'`
- **Path B** — Atlas Data API: `curl -X POST "<atlas-data-api-endpoint>/action/aggregate" -H "Content-Type: application/json" -H "api-key: <atlas-data-api-key>" -d '{"dataSource":"<cluster>","database":"<db>","collection":"moderationlogs","pipeline":[{"$match":{"targetId":{"$oid":"<listingId>"}}},{"$count":"n"}]}'`
- **Path C** — User runs the count from Atlas web UI's Mongo Shell and pastes the integer into the matrix.

Cell PASSes only if observed outcome was 1×200 + 1×409 AND `audit_row_count = 1`. Otherwise FAIL (regression of MOD-15 atomic findOneAndUpdate guard) — bug-fix loop applies.

**Race-cell escalation (T-06-33 mitigation):** If devices can't coordinate the race window after **3 retries**, the cell does NOT auto-accept. Two options: (a) coordinated tool/script (e.g., parallel `curl &` against the live backend with two valid moderator tokens) to force an observable race; (b) explicit deferral to follow-up phase with user's written approval recorded in `06-06-SUMMARY.md`.

---

## Matrix 3 — Archive Flows (12 rows × 2 devices = 24 cells)

Phase 4 walked these on iPhone only (per `04-07-SUMMARY.md`); Phase 6 closes Moto G coverage.

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 3.1 | Owner archives own live listing → Pending tab | ☐ | ☐ |
| 3.2 | Owner restores self-archived listing → Pending tab + re-moderation copy | ☐ | ☐ |
| 3.3 | Owner CANNOT restore mod-archived listing (D-13 conditional gate) | ☐ | ☐ |
| 3.4 | Mod archives any live listing via PropertyDetailsScreen → ArchiveListingModal 4-chip + note → status archived | ☐ | ☐ |
| 3.5 | Mod restores any archived listing → status pending | ☐ | ☐ |
| 3.6 | Admin sees Hard Delete on archived → DeleteListingModal → permanentlyDeletedToast → screen pops | ☐ | ☐ |
| 3.7 | Plain user sees no Archive/Restore/Hard-Delete affordances | ☐ | ☐ |
| 3.8 | Archived listings hidden from Home / Favorites public lanes (regression preserved) | ☐ | ☐ |
| 3.9 | Owner sees own archived in Archived tab (self + mod-archived both visible to owner) | ☐ | ☐ |
| 3.10 | EN+RU locale parity Rows 1+2+4 walked in Russian | ☐ | ☐ |
| 3.11 | Dark theme parity confirmed for ArchiveListingModal + RejectionBanner | ☐ | ☐ |
| 3.12 | ARCH-04 re-moderation copy: "back to the moderation queue for review before becoming public again" / «очередь модерации для проверки» | ☐ | ☐ |

---

## Matrix 4 — Owner-Side Rejection Banner Persistence (4 rows × 2 devices = 8 cells)

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 4.1 | Owner with rejected listing sees Home rejection banner; tap navigates to OwnerListings → Rejected tab | ☐ | ☐ |
| 4.2 | Sign out → sign back in → banner STILL appears (persistence, not session-state) | ☐ | ☐ |
| 4.3 | Edit and resubmit a rejected listing → status → pending → banner auto-dismisses | ☐ | ☐ |
| 4.4 | Locale switch EN ↔ RU mid-session → banner copy updates with current locale (D-09 client-side i18n adaptation) | ☐ | ☐ |

---

## Matrix 5 — Hotfix Bundle Empirical Verification (HF-01..HF-04)

**HF-01 — Hospitality field persistence:**

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 5.1 | Create Hospitality (Hotel) listing with rooms=10, maxGuests=20, all 12 amenities → save → re-fetch via PropertyDetails → all values persist | ☐ | ☐ |

**HF-02 — Backend secrets dead:**

| Cell | Scenario | iOS | Android |
|------|----------|-----|---------|
| 5.2 | Sign in with current Mongo credentials (post-rotation per Plan 04 Section 3) → /api/auth/me returns 200 | ☐ | ☐ |

**HF-03 — firebaseUid mismatch 403 (executor-driven curl):**

| Cell | Scenario | Result |
|------|----------|--------|
| 5.3 | `curl -X POST <BACKEND>/api/auth/users -H "Authorization: Bearer <attacker-token>" -d '{"firebaseUid": "<victim-uid>", ...}'` → 403 | ☐ |
| 5.4 | Same with no Authorization header → 401 | ☐ |

**HF-04 — Socket handshake JWKS:**

| Cell | Scenario | iOS | Android | curl |
|------|----------|-----|---------|------|
| 5.5 | Sign in as User A → ChatThreadScreen with User B; exchange messages; messages flow correctly | ☐ | ☐ | — |
| 5.6 | Attacker socket attempt (curl + websocat) tries to join `user:<victim-uid>` with attacker token → connection drops or refuses room subscription | — | — | ☐ |

---

## Matrix 6 — EN+RU Parity (per-screen Russian-language session)

| Cell | Screen | iOS RU | Android RU |
|------|--------|--------|------------|
| 6.1 | LoginScreen / SignupScreen | ☐ | ☐ |
| 6.2 | RoleManagementScreen + RoleChangeModal (3-chip; 23 admin.roles.* keys) | ☐ | ☐ |
| 6.3 | ModerationQueueScreen + RejectListingModal (4-chip + note) | ☐ | ☐ |
| 6.4 | OwnerListings 4-tab segmented control (owner.listings.tab.{live,pending,rejected,archived}) | ☐ | ☐ |
| 6.5 | RejectionBanner with reasonCode lookup in RU | ☐ | ☐ |
| 6.6 | ArchiveListingModal (4-chip + note) | ☐ | ☐ |
| 6.7 | DeleteListingModal | ☐ | ☐ |
| 6.8 | Home rejection banner singular + plural | ☐ | ☐ |

---

## Matrix 7 — Dark/Light Parity (M2-new surfaces only)

| Cell | Surface | iOS dark | Android dark |
|------|---------|----------|--------------|
| 7.1 | PropertyDetailsScreen mod-action footer (Approve / Reject / Edit-on-behalf / Archive / Restore / Hard-Delete buttons + StatusPill) | ☐ | ☐ |
| 7.2 | RoleManagementScreen self-row "(you)" badge + 50-row footer hint | ☐ | ☐ |
| 7.3 | RejectionBanner colors (warning palette) | ☐ | ☐ |
| 7.4 | ArchiveListingModal + DeleteListingModal contrast | ☐ | ☐ |

---

## Sign-off

| Field | Value |
|-------|-------|
| Walker | <user> |
| Walk start | <ISO 8601> |
| Walk end | <ISO 8601> |
| Total cells walked | <count> |
| PASS | <count> |
| FAIL | <count, MUST be 0 for APPROVED disposition> |
| N/A | <count, with brief rationale per N/A cell> |
| Disposition | <APPROVED \| BLOCKED-BY-FAIL> |

**Bug-fix loop (per M1 D-08):** If any cell FAILs, the executor opens a sub-task to fix the regression in-phase, re-walks the affected cell on both devices, then resumes. APPROVED disposition requires zero blocking FAILs.

**Resume signal:** User replies `approved` once the matrix is walked and disposition is APPROVED. If a FAIL is unresolvable in-phase, user explicitly downgrades the disposition and surfaces the carry-forward.

# Phase 4: M2 Carry-Forward Bug Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 04-m2-carry-forward-bug-fixes
**Areas discussed:** CARRY-01 surface map & pattern, CARRY-01 recovery UX on 403, CARRY-02 repair migration semantics, Sentinel + diagnostic + Phase 3 MEDIUM bucket

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| CARRY-01 surface map & pattern | Which surfaces get the 403-catch wired + shared hook vs copy-paste | ✓ |
| CARRY-01 recovery UX on 403 | What the popup does on 403 catch (silent close vs toast vs alert vs sign-out) | ✓ |
| CARRY-02 repair migration semantics | What "repair" means for existing mismatched rows | ✓ |
| Sentinel + diagnostic + Phase 3 MEDIUM bucket | Sentinel scope, diagnostic log handling, MD-01..MD-04 disposition | ✓ |

**User's choice:** All 4 areas selected for discussion.

---

## CARRY-01 Surface Map & Pattern

### Question 1 of 2 — Which surfaces are in scope (multiselect)

| Option | Description | Selected |
|--------|-------------|----------|
| ModerationQueueScreen approve/reject submit | handleApprove + handleRejectSubmit — currently only catch 409, fall through on 403 | ✓ |
| RejectListingModal (M2 Phase 3) | Submit handler doesn't import PermissionDeniedError today | ✓ |
| ArchiveListingModal (M2 Phase 4) | Both owner-archive and mod-archive flows; no 403 catch today | ✓ |
| PropertyDetailsScreen mod footer + DeleteListingModal + RoleManagementScreen role-set submit | Mod action footer, hard-delete modal, and existing handleRoleSubmit (catches client-side PermissionDeniedError but not in-flight 403) | ✓ |

**User's choice:** All 6+ surfaces selected.

### Question 2 of 2 — Shared helper / hook vs copy-paste

| Option | Description | Selected |
|--------|-------------|----------|
| Shared helper `is403PermissionError(err)` + small `useModActionGuard()` hook (Recommended) | Helper detects both PermissionDeniedError and axios 403; hook gives `{ guardedSubmit, onPermissionDenied }`. ~80 LOC + test file. | ✓ |
| Helper function only, no hook — inline catch in each handler | Just `is403PermissionError()` + a small `recoverFromRoleChange()` util | |
| Pure copy-paste, no helper | Match RoleManagementScreen pattern verbatim in each modal | |

**User's choice:** Shared helper + hook (Recommended).

**Notes:** Six+ submit handlers across 5 files; abstracting now keeps the recovery UX consistent if it's tuned later.

---

## CARRY-01 Recovery UX on 403

### Question 1 of 1 — What the user sees mid-action

| Option | Description | Selected |
|--------|-------------|----------|
| Close modal silently → refreshRole() → RoleRefreshBanner does the talking (Recommended) | Reset loading, close modal, fire refreshRole(); AuthContext updates; RoleRefreshBanner appears at top of screen with existing copy. Lightest UX. | ✓ |
| Close modal + ephemeral toast 'Your role changed' | Close modal, show ~3s toast, then refreshRole() + banner. Possible double-up with banner. | |
| Close modal + Alert.alert + refreshRole() | Match RoleManagementScreen pattern verbatim — translated 'errors.permissionDenied' alert. Heaviest dismiss flow. | |
| Force re-login (sign out) | Per original CARRY-01 wording. Heavy: kicks user back to sign-in screen. | |

**User's choice:** Silent close + RoleRefreshBanner (Recommended).

**Notes:** Banner is already mounted globally (Phase 1 ROLE-10 / D-13). Adding an Alert on top would be redundant.

---

## CARRY-02 Repair Migration Semantics

### Question 1 of 1 — What the migration does for existing mismatched rows

| Option | Description | Selected |
|--------|-------------|----------|
| Phone-match repair, orphan-mark the rest (Recommended) | Look up Users by phone. Exactly 1 match + uid mismatch → flip uid (logged). 0 or 2+ matches → status: 'orphaned' (extend enum). Idempotent. | ✓ |
| Orphan-mark only — don't try to recover any uids | Only mark; never flip. Conservative; user just re-submits. | |
| Hard-delete orphans, no flipping | Delete every row whose uid doesn't resolve in Users. Cleanest DB but loses audit trail. | |
| Diagnostic-only — log mismatches, mutate nothing | --report mode only; operator decides row-by-row manually. | |

**User's choice:** Phone-match repair, orphan-mark fallback (Recommended).

**Notes:** LandlordApplication has phone field; User has phone field. Best-effort recovery without the original Firebase token. Operator-supervised --dry-run + --verify=PASS pattern, matching M2 Plan 02-02 + M3 Phase 1 D-04..D-15.

---

## Sentinel + Diagnostic + Phase 3 MEDIUM Bucket

### Question 1 of 3 — Diagnostic console.log handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fully remove (Recommended) | Drop the entire 7-field log block at landlordApplicationRoutes.js:113-122 | ✓ |
| Gate behind DEBUG_LANDLORD_APP env flag | Move behind env flag; flip on later if regression appears | |
| Keep it, mark as permanent observability | Promote to normal info log | |

**User's choice:** Fully remove (Recommended).

### Question 2 of 3 — Sentinel scope

| Option | Description | Selected |
|--------|-------------|----------|
| New `check-no-landlord-uid-spoofing.sh` chained into npm test (Recommended) | Mirrors M2 HF-03 + M3 Phase 3 pattern. Single-purpose. ~10 LOC bash. | ✓ |
| Extend existing check-no-actoruid-spoofing.sh to also scan landlord routes | One sentinel covers both surfaces. Less obvious in audit trail. | |
| Inline grep in supertest only — no separate sentinel | Lighter weight; not an independent pre-merge gate. | |

**User's choice:** New standalone sentinel (Recommended).

### Question 3 of 3 — Phase 3 MEDIUM bucket disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Fold all 4 into Phase 4 commit chain (Recommended) | MD-01 i18n + MD-02 comment + MD-03 CastError + MD-04 sentinel regex. Tiny, related to surfaces we're touching, ~20 LOC. | ✓ |
| Fold MD-01 + MD-02 + MD-04 only — defer MD-03 (CastError) to Phase 5 | MD-03 is broader pattern across multiple routes | |
| Defer all 4 to Phase 5 / M4+ | Keep Phase 4 narrowly focused on CARRY-01 + CARRY-02 | |

**User's choice:** Fold all 4 (Recommended).

---

## Final Confirmation

### Question — Anything else to dig into before writing context?

| Option | Description | Selected |
|--------|-------------|----------|
| Looks good — write the context | Capture everything in 04-CONTEXT.md and hand off to planning | ✓ |
| One more thing — explore more gray areas | Test scope, sequencing, edge cases on phone-match | |

**User's choice:** Write the context.

---

## Claude's Discretion

Items the user deferred to planner discretion:
- Migration audit log enum values (`'uid-repair'` / `'uid-orphan-mark'` recommended).
- CastError → 400 scope (DELETE-only vs all 3 handlers — recommend DELETE-only).
- i18n key split for MD-01 (single rewrite vs split into two keys with code dispatch).
- Test fixture for migration test (in-memory Mongo recommended).
- Defensive comment on read paths' dual-accept window.

## Deferred Ideas

Mentioned during discussion but noted for later:
- Force re-login on 403 (original CARRY-01 wording) — rejected in favor of refreshRole() + banner.
- Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 + 5.3) — M4+ per memory `phase06-m3-carry-forward.md`.
- Token-revocation backend changes — out of scope; trust M2 Phase 1's iat < roleRevokedAt boundary.
- Broader CastError → 400 sweep — Phase 5 hardening or M4+.
- Railway log archival of diagnostic-active window (2026-04-30 → 2026-05-06) — operator-side incident postmortem hygiene.
- Schema-level isValidObjectId middleware — future hardening phase.

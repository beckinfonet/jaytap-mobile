---
phase: 260511-cog
plan: 01
subsystem: moderation
tags: [hotfix, m3-post-ship, cross-repo, mod-14, media-07, cutover]
date_completed: 2026-05-11
type: quick
requirements: [MOD-14]
dependency_graph:
  requires:
    - M3 v3.0.x shipped (POST /properties/:id/approve already holds MEDIA_REQUIRED gate)
    - Backend repo at /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services (Node 24)
  provides:
    - PUT /api/moderation/listings/:id is field-only (no implicit flip-to-live; no MEDIA_REQUIRED gate)
    - Single audited approval chokepoint: POST /properties/:id/approve
  affects:
    - moderationRoutes.js PUT /listings/:id handler
    - moderationRoutes.test.js MOD-14 + M3 nested-shape + Phase 3 MEDIA-07 describe blocks
    - RN i18n EN + RU success-toast string
tech_stack:
  added: []
  patterns:
    - Defensive-depth mass-assignment strip preserved (21 keys still `delete`d even for fields the handler no longer writes)
    - Audit-row diff = changed-fields-only (status omitted naturally because handler doesn't mutate status)
key_files:
  created:
    - /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md
  modified:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
    - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts
    - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts
decisions:
  - "Strict status preservation for ALL 4 reachable states (per orchestrator option A): rejected listings stay rejected; their rejection metadata (reasonCode/Note/rejectedAt/rejectedByUid) is preserved. No carve-out for rejected→pending auto-flip in edit-on-behalf."
  - "21-key mass-assignment strip kept verbatim — every key still `delete`d even though approvedAt/approvedByUid/rejection-metadata are no longer written by the handler. Defensive depth: an attacker body of `{ status: 'live', approvedByUid: 'attacker' }` lands as a no-op."
  - "/approve route at lines 91-108 untouched — sole MEDIA_REQUIRED chokepoint; its `status: 'pending'` filter (only handles pending) is the intentional post-cutover semantics-gap: rejected listings need owner intervention to ever go live."
metrics:
  duration: "~30 minutes"
  files_modified: 4
  tests_rewritten: 8  # A2 + A3 + A4 + A6 + B1 + B3 + B4 + (MOD-14 header comment) — 7 test bodies + 1 describe header
  tests_deleted: 4    # entire Surface-2 MEDIA_REQUIRED describe block (4 tests)
  tests_passing: "275/275 across 11 suites (sentinel chain clears)"
  net_test_count_delta: "-4"
commits:
  backend: "84016d4 — fix(moderation): edit-on-behalf becomes field-only — no force-flip to live (260511-cog)"
  frontend: "01ed067 — fix(i18n): moderation.editOnBehalf.success drops \"and approved\" claim (260511-cog)"
---

# Quick Task 260511-cog: Edit-on-Behalf Field-Only Cutover (M3 Post-Ship) Summary

## One-Liner

Cut `PUT /api/moderation/listings/:id` over to field-only semantics — status preserved as-is, no force-flip-to-live, no MEDIA_REQUIRED gate — so `POST /properties/:id/approve` is the single audited approval chokepoint with the photo-required invariant.

## 1. What Changed

This is an M3 post-ship hotfix that closes the edit-on-behalf force-flip loophole surfaced after the M3 contextual-forms cutover inverted media flow (users submit metadata only; admins curate photos via separate endpoints). Cross-repo: backend route + tests, RN client toast string. Both repos got commits in the same session (~30 minutes apart).

Pre-cutover the edit-on-behalf route ALWAYS flipped status to 'live', wrote `approvedAt`/`approvedByUid`, and cleared rejection metadata. That was an M2 holdover. The M3-era invariant (`>=1 photo in media.photos before any flip to 'live'`) was double-gated — once at `/approve` and once at this route — but the edit-on-behalf gate could be bypassed by listings carrying stale pre-M3 `media.photos` entries. Collapsing approval into one route removes the loophole AND simplifies the audit story (single source of truth for flip-to-live events lives on the `/approve` action row in `ModerationLog`).

## 2. Files Touched

Four files across two git repos:

**Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`):
- `src/routes/moderationRoutes.js` — header docblock rewrite (lines 721-771), inline comment on line 777 (mass-assignment strip), DELETED the MEDIA_REQUIRED gate block (was lines 891-916), DELETED the STEP 4 force-flip block (was lines 932-946), collapsed STEPs 3-5 (audit diff → race-safe update → audit insert) with `now` moved to before the audit row.
- `src/__tests__/moderationRoutes.test.js` — rewrote 7 test bodies + 1 describe header comment; DELETED entire Surface-2 describe block (4 tests for the removed gate); updated parent MEDIA-07 describe header "two enforcement points" → "single chokepoint"; annotated fixture comment.

**RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap`):
- `src/locales/en.ts` line 539 — `'moderation.editOnBehalf.success': 'Listing updated and approved.'` → `'Listing updated.'`
- `src/locales/ru.ts` line 541 — `'Объявление обновлено и одобрено.'` → `'Объявление обновлено.'`

## 3. Backend Behavior Change Summary

**PUT /api/moderation/listings/:id (post-cutover):**
- **Status preserved as-is.** Pending stays pending; rejected stays rejected. No implicit flip-to-live for ANY of the 4 reachable states (pending/rejected/live/archived). Live and archived still return 409 ALREADY_MODERATED via the unchanged `status: { $in: ['pending', 'rejected'] }` race-safe filter.
- **No `approvedAt` / `approvedByUid` writes.** Handler doesn't touch them. Schema defaults stay null.
- **No rejection-metadata clearing.** A rejected listing's `rejectionReasonCode`, `rejectionReasonNote`, `rejectedAt`, and `rejectedByUid` are preserved through the edit.
- **No MEDIA_REQUIRED gate.** The 22-line photo-required check that used to fire here is gone. /approve is the sole enforcement point.
- **Mass-assignment strip unchanged.** All 21 forbidden keys (including the now-unused `approvedAt`/`approvedByUid` and all rejection/archive-audit fields) are still `delete`d from `updateData` before the `$set`. Defensive depth: blocks any future body-supplied attempt to set those fields.
- **Audit row unchanged in shape.** `action='edit-on-behalf'`, `actorUid=req.firebaseUid` (JWKS sub), `before`/`after` is the changed-fields-only diff. Since status isn't in `updateData`, the diff has no status entry — clean and accurate.

**POST /properties/:id/approve (UNCHANGED):**
- Still sole approval chokepoint. Still requires `media.photos.length >= 1` (gate at lines 91-108).
- Still uses `status: 'pending'` filter (only handles pending). **This is the intentional post-cutover semantics-gap:** rejected listings need owner intervention to ever go live (the owner re-edits, which auto-flips them to pending via the existing owner-side route, then a mod can approve). Documented as accepted UX cost.

## 4. Approval Requirement (Restated for Clarity)

| Surface | Required to flip 'live' | Status |
|---|---|---|
| **Photos** (`media.photos` length ≥ 1) | YES | Enforced ONLY at `POST /properties/:id/approve` (post-cutover) |
| **3D tours** (Matterport/Ricoh URLs) | NO | Optional — host's package choice |
| **Panoramic URLs** | NO | Optional — host's package choice |

## 5. Test Impact

**Test count delta: -4** (net; from 79 tests in moderationRoutes.test.js pre-cutover to 75 post-cutover).

**Rewritten in place (7 test bodies + 1 describe-block header comment):**

Group A — MOD-14 describe block (`describe('MOD-14: Edit-on-behalf invariants')` header + 4 test rewrites):
- A0. **MOD-14 describe header comment** — "four hard rules" restated for field-only semantics.
- A2. `'PUT /listings/:id preserves status (no force-flip post-260511-cog cutover) + does NOT write approvedAt/approvedByUid'` — was `'flips status to live + sets approvedAt + approvedByUid (D-12)'`. Asserts `res.body.status === 'pending'`, `approvedAt/approvedByUid === null`, content edit landed.
- A3. `'... writes audit log with action=edit-on-behalf + diff WITHOUT status entry (status unchanged post-cutover)'` — was the bare `+ diff` form. Asserts `logs[0].before.status` and `logs[0].after.status` are both `undefined` (status not in the changed-fields-only diff); asserts `before.content` defined + `after.content.title` correct.
- A4. `'... on rejected listing preserves status=rejected + preserves rejection metadata (no implicit re-approval post-cutover)'` — was `'clears rejection metadata + flips to live'`. Asserts `status === 'rejected'`, `rejectionReasonCode === 'incomplete-info'` (preserved), `rejectionReasonNote === 'old note'` (preserved), `rejectedByUid === 'mod-b-uid'` (preserved). Comment block above the test references 260511-cog explaining the load-bearing semantics shift.
- A6. CR-01 multipart-delivered JSON-string fields — flipped `expect(saved.status).toBe('live')` to `'pending'` and updated the inline comment from "D-12 status flip still applies" to "260511-cog cutover: status preserved (no force-flip)".

Group B — M3 nested-shape describe block (3 test rewrites; B2 untouched because it doesn't assert status):
- B1. CR-02 partial-basics body — flipped status assertion `'live'` → `'pending'`; updated inline comment.
- B3. MOD-14 nested-body round-trip — flipped `status === 'live'` → `'pending'`, `approvedByUid === 'mod-a-uid'` → `toBeNull()`; updated inline comment.
- B4. MOD-14 mass-assignment strip extended — flipped `reloaded.status === 'live'` → `'pending'`, `reloaded.approvedByUid === 'mod-a-uid'` → `toBeNull()`; updated two inline comments documenting that body 'archived' is stripped (mass-assignment guard) and status is preserved (pending).

Group D — fixture comment annotation (line 124-127) — added 260511-cog cutover note that the edit-on-behalf side of the MEDIA_REQUIRED gate is gone.

**Deleted (1 describe block, 4 tests):**

Group C — `describe('PUT /listings/:id (edit-on-behalf) — MEDIA_REQUIRED enforcement', () => {...})` Surface-2 block entirely:
- `'edit-on-behalf with merged photos empty returns 400 MEDIA_REQUIRED + status STAYS pending'`
- `'edit-on-behalf with original photos non-empty + body without media key flips to live (200)'`
- `'edit-on-behalf on REJECTED listing with empty photos returns 400 (branch-parity check — single shared path)'`
- `'edit-on-behalf with body-supplied media.photos non-empty flips to live (mergedPhotos via incoming body)'`

Replaced with a 6-line comment block explaining the deletion. Parent MEDIA-07 describe header comment also rewritten from "Two enforcement points (D-09 + D-10)" to "Single enforcement point post-260511-cog cutover".

**Full backend suite green:** 275 tests passing across 11 suites; sentinel chain (`actorUid` → `landlord-uid` → `media-stripped` → `i18n-parity` → `create-listing-screen-removed` → jest) clears end-to-end. Execution time ~5.7s.

## 6. Frontend Impact

- `moderation.editOnBehalf.success` EN: `'Listing updated and approved.'` → `'Listing updated.'`
- `moderation.editOnBehalf.success` RU: `'Объявление обновлено и одобрено.'` → `'Объявление обновлено.'`
- No component / screen logic changed. The key has no consumer in src today (defined but unused — the toast call site has not yet been wired in). When wired by a future plan, the value will be accurate.
- `scripts/check-i18n-parity.sh` exits 0 — key-set parity preserved.
- TypeScript: no NEW errors introduced. Pre-existing errors in ChatComposeScreen, ChatScreen, ScheduleViewingScreen, TourSelectionScreen, ThemeContext are present on the base commit `19aee15` and are unrelated to this change (M3 carry-forward TS debt; out-of-scope per executor scope-boundary rule).

## 7. Cross-Repo Commit Chain

| Repo | SHA | Subject |
|------|-----|---------|
| Backend (`JayTap-services`) | `84016d4` | `fix(moderation): edit-on-behalf becomes field-only — no force-flip to live (260511-cog)` |
| Frontend (`JayTap` — worktree-agent-a966d2c79bc743de5) | `01ed067` | `fix(i18n): moderation.editOnBehalf.success drops "and approved" claim (260511-cog)` |

Backend lands first (the behavior change). Frontend toast text is no-op until the toast call site is wired anyway. Both repos clean (`git status --short` empty) post-commit.

## 8. Deploy / Release Implications

- **Backend:** Lands on Railway whenever the user next pushes to the backend repo's main branch. Out of scope for this quick task. Once shipped, ALL existing iOS/Android builds (TestFlight build 29 / Play Console versionCode 32) will hit the new field-only handler.
- **Frontend:** The toast-string change ships in the next RN client release. Until then, running TestFlight/Play Console builds carry the OLD copy. Harmless because the key has no consumer in src today; the value sits unused until the toast call site is wired.

## 9. Coordination Risk Window

If the backend deploys before the frontend ships (most likely scenario):
- The toast text in any FUTURE wiring would lie ("and approved") while the backend no longer approves. But: the key currently has no consumer, so there's nothing to lie. Risk window effectively zero.
- Mods who notice can still tap /approve from the queue manually (their normal workflow).
- When the user is ready to ship the frontend string, the next RN release cycle picks it up automatically.

If the frontend ships before the backend deploys (unlikely given Railway auto-deploy speed):
- The toast (when wired) says "updated" but the backend still actually flipped the listing live. Mod sees an under-claim; the listing is correctly live. Harmless.

Neither order is data-unsafe.

## 10. Not in Scope (Per Plan Design Notes)

- `/approve` route — already correct; UNTOUCHED by this cutover. Sole MEDIA_REQUIRED chokepoint.
- Owner-side `PUT /properties/:id` — already correct; uses its own pending→pending preservation pattern via different routes.
- No new "edit-and-approve" combined route added. Intentional UX cost: mods must use two endpoints (edit → /approve) if they want to fix-and-publish atomically. The /approve route handles only `pending` listings, so rejected-listing approval flow requires owner re-engagement (the owner edits → auto-flips to pending → mod approves). This is the load-bearing semantics shift accepted by the orchestrator option A.

## 11. Conventions Followed

- **Backend Node 24** (`nvm use 24` before npm/node ops per auto-memory `backend-node-version.md`). jose@6 ESM-only constraint honored.
- **Two-repo atomic-ish commit** (same session, minutes apart, not days). Cross-repo coordination per `cross_repo_coordination` section of plan.
- **EN + RU i18n parity** preserved (CI gate `scripts/check-i18n-parity.sh` clears).
- **No Firebase SDK touched** (per repo rule — auto-memory `no-firebase-sdk.md`).
- **Audit row shape preserved** (`action='edit-on-behalf'` still written; just no status entry in diff).
- **actorUid invariant preserved** (sourced from `req.firebaseUid` JWKS sub, never from body — anti-spoofing sentinel `check-no-actoruid-spoofing.sh` continues to pass).
- **Race-safe atomic update preserved** (status filter `$in: ['pending', 'rejected']` unchanged — edit-on-behalf still forbidden on live/archived).
- **Worktree isolation honored** for the RN client repo (this commit lands on `worktree-agent-a966d2c79bc743de5`); backend commit lands directly on main of the separate backend repo per `<worktree_branch_check>` cross-repo scope note.

## Deviations from Plan

None. Plan executed exactly as written.

The plan's <verify> block expected "no new errors introduced" by the locale edits via `npx tsc --noEmit`. Confirmed: pre-existing TS errors (Property.title, Property.images, Property.tours, ThemeContext) are present on the base commit `19aee15` and unrelated to the locale string change. They are M3 carry-forward TS debt and out-of-scope per the executor's scope-boundary rule.

## Threat Surface Scan

No new security-relevant surface introduced. The threat register from the plan (`<threat_model>`) was honored:

- **T-260511-cog-01 (Elevation via mass-assignment after force-flip removed)** — Mitigated. The 21-key strip is preserved verbatim; test B4 (`MOD-14 mass-assignment strip extended`) actively verifies an attacker body of `{ status: 'archived', approvedByUid: 'attacker', ... }` lands as a no-op (status stays pending, approvedByUid stays null).
- **T-260511-cog-02 (Tampering — future re-introduction of implicit flip)** — Mitigated by defensive depth: re-introducing a flip would require BOTH adding an implicit flip AND removing the mass-assignment strip — two deliberate changes, not one. /approve's gate is untouched.
- **T-260511-cog-03 (Repudiation — audit diff loses status entries)** — Accepted. Single source of truth for flip events is now the /approve audit row.

No new threats discovered during execution.

## Self-Check: PASSED

**Files exist:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` — modified ✓
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` — modified ✓
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` — modified ✓
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts` — modified ✓
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md` — created ✓

**Commits exist:**
- Backend: `84016d4` on `JayTap-services` main — verified via `git -C ... log --oneline -1` ✓
- Frontend: `01ed067` on `JayTap` `worktree-agent-a966d2c79bc743de5` — verified via `git log --oneline -1` ✓

**Verification gates cleared:**
- `npm test` (backend full suite, nvm use 24): 275 passed / 0 failed, 11 suites green; sentinel chain `actorUid` → `landlord-uid` → `media-stripped` → jest clears ✓
- `scripts/check-i18n-parity.sh` (frontend): exit 0, `en.ts` and `ru.ts` key sets identical ✓
- Manual grep `updateData.status = 'live'` in `moderationRoutes.js`: 0 matches ✓
- Manual grep `MEDIA_REQUIRED` in `moderationRoutes.js`: only inside `/approve` handler (lines 91, 107) + the new self-referencing docblock at line 729 ✓
- Manual grep `before.status` / `after.status` in `moderationRoutes.js`: only inside the unrelated `/properties/:id/archive` docblock at line 533 ✓
- Manual grep `mergedPhotos` in `moderationRoutes.js`: 0 matches ✓
- Both repos `git status --short`: empty (clean) ✓

---
phase: 260511-cog
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Backend repo (separate git repo at /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services)
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  # RN client repo (this repo)
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts
autonomous: true
requirements: [MOD-14]
must_haves:
  truths:
    - "PUT /api/moderation/listings/:id no longer flips status to 'live'; status stays equal to the original (pending or rejected) for every successful response"
    - "The handler does NOT write approvedAt or approvedByUid; those fields are unchanged on the resulting document"
    - "The MEDIA_REQUIRED gate inside PUT /listings/:id is gone (lines 891-916 of pre-cutover moderationRoutes.js); /approve still enforces MEDIA_REQUIRED on its own"
    - "ModerationLog row for action='edit-on-behalf' has NO before.status / after.status entry (diff is changed-fields-only based on body)"
    - "Backend test suite runs and passes end-to-end (all suites, including the rewritten edit-on-behalf assertions)"
    - "RN success toast string ('moderation.editOnBehalf.success') reads 'Listing updated.' / 'Объявление обновлено.' (EN + RU)"
    - "i18n parity script still passes (no missing keys in either locale)"
    - "/approve route still requires >=1 photo in media.photos to flip live (untouched by this cutover)"
  artifacts:
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js"
      provides: "PUT /listings/:id edit-on-behalf handler with no status flip + no MEDIA_REQUIRED gate"
      contains_not: "updateData.status = 'live'"
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js"
      provides: "Rewritten edit-on-behalf assertions (status preservation, no approvedAt/approvedByUid, no status entry in audit diff); MEDIA_REQUIRED-on-edit-on-behalf describe block deleted"
    - path: "/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts"
      provides: "'moderation.editOnBehalf.success': 'Listing updated.'"
    - path: "/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts"
      provides: "'moderation.editOnBehalf.success': 'Объявление обновлено.'"
  key_links:
    - from: "moderationRoutes.js PUT /listings/:id"
      to: "Property.findOneAndUpdate ($in pending/rejected)"
      via: "updateData built from body, no implicit status='live' inject"
      pattern: "findOneAndUpdate.*status:\\s*\\{\\s*\\$in:\\s*\\['pending',\\s*'rejected'\\]"
    - from: "/approve route (lines 91-108)"
      to: "MEDIA_REQUIRED gate"
      via: "media.photos.length check — UNTOUCHED by this cutover"
      pattern: "MEDIA_REQUIRED"
---

<objective>
Cut edit-on-behalf over to field-only semantics: `PUT /api/moderation/listings/:id` becomes a pure mass-assignment-safe update with the listing's status preserved as-is. No more forced flip to 'live', no more implicit approval, no more MEDIA_REQUIRED gate on this route. Mods who want to approve must use `/approve` (single chokepoint).

This is an M3 post-ship hotfix surfaced after the M3 contextual-forms cutover inverted media flow (users submit metadata only; admins curate photos separately). The edit-on-behalf force-flip was an M2 holdover that could bypass the new photo-required invariant on listings carrying stale media URLs from pre-M3 migration. Closing that loophole.

Purpose: collapse approval into a single audited chokepoint (`/approve`) so the MEDIA_REQUIRED invariant — `>=1 photo in media.photos before any flip to 'live'` — has exactly one enforcement point. 3D-tour URLs and panoramic URLs remain optional (host's package choice).

Output:
- Backend: `PUT /listings/:id` is field-only; 14 backend tests rewritten/deleted to match.
- RN client: success toast string updated EN+RU to match new behavior ("Listing updated." — no longer claims approval).
- Cross-repo coordination: backend commit lands first (frontend toast string is a no-op until backend ships), but both repos get committed in this session.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/beckmaldinVL/development/mobileApps/JayTap/CLAUDE.md
@/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/STATE.md

<interfaces>
<!-- Pre-cutover handler shape: PUT /listings/:id in moderationRoutes.js lines 721-998. -->
<!-- The pieces being removed/changed: -->

Header comment block (lines 721-756) — describes "edit + approve combined" semantics:
- Lines 735, 741-743: status forced to 'live' + approvedAt/approvedByUid set + rejection metadata cleared
- Lines 745-750: status filter $in: ['pending','rejected'] race-safety

STEP 1 mass-assignment strip (lines 761-796):
- Line 777: `delete updateData.status; // forced to 'live' below` — comment must be updated, delete line itself STAYS (we still strip body-supplied status to avoid mass-assignment bypass)

MEDIA_REQUIRED gate (lines 891-916) — REMOVE ENTIRELY:
```js
// Phase 3 Plan 03-03 (MEDIA-07 / D-10) — MEDIA_REQUIRED gate at the
// edit-on-behalf flip-to-live path. [...22 lines of comment + code...]
const mergedPhotos = Array.isArray(updateData.media?.photos)
  ? updateData.media.photos
  : (original.media?.photos || []);
if (!mergedPhotos.length) {
  return res.status(400).json({ code: 'MEDIA_REQUIRED', message: 'At least one photo is required before approval.' });
}
```

STEP 3 audit diff (lines 918-930) — KEEP loop, REMOVE explicit status entries below

STEP 4 force flip (lines 932-946) — REMOVE entirely:
```js
const now = new Date();
before.status = original.status;
after.status = 'live';
updateData.status = 'live';
updateData.approvedAt = now;
updateData.approvedByUid = req.firebaseUid;
// Clear all rejection metadata — the mod has FIXED the issue.
updateData.rejectionReasonCode = null;
updateData.rejectionReasonNote = null;
updateData.rejectedAt = null;
updateData.rejectedByUid = null;
```

Audit log insert (lines 970-981) — KEEP. `now` is used in `at: now`, so we need ONE `const now = new Date();` retained ABOVE the audit insert (move it from removed STEP 4 to just before STEP 6).

Race-safe atomic update filter (line 953) — UNCHANGED:
```js
{ _id: propertyId, status: { $in: ['pending', 'rejected'] } }
```
This filter STAYS — edit-on-behalf is still illegal on live/archived (those have their own lifecycle routes).
</interfaces>

<approval_requirement>
Re-stated for the SUMMARY (no change vs M3):
- **Photos REQUIRED** to flip a listing to 'live' (≥1 entry in `media.photos`) — enforced at `/approve` only after this cutover.
- **3D tours** (Matterport/Ricoh URLs) and **panoramic URLs** remain OPTIONAL (host's package choice).
</approval_requirement>

<cross_repo_coordination>
This change spans two git repos owned by the same user:

1. **Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/`) — route + test changes. Backend requires `nvm use 24` before `npm test` (jose@6 ESM-only — per auto-memory `backend-node-version.md`).
2. **RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap/`, CWD) — i18n string updates.

**Commit order (backend first, frontend second):**
- The backend commit is the behavior change. The frontend toast string is currently inaccurate (claims "and approved" but the mod could be on a listing that didn't actually flip live in an empty-photos case — though M3 today still says it does flip). After the backend ships, the toast text becomes the literal truth.
- If the frontend ships first, the toast says "updated" but the listing actually still gets flipped live by the old backend — misleading but not harmful.
- If the backend ships first, the toast still says "and approved" but the listing now only got updated — also misleading but not harmful.
- Net: neither order is data-unsafe; backend-first is cleaner because the test suite verifies the behavior change immediately.

Atomic-ish: both commits happen in this execution session; the gap between them is minutes, not days.
</cross_repo_coordination>

</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — strip force-flip + MEDIA_REQUIRED gate from PUT /listings/:id, rewrite tests</name>
  <files>
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  </files>
  <action>
**Edit moderationRoutes.js — PUT /listings/:id handler (around lines 721-998):**

1. **Update the header comment block (lines 721-756)** to reflect field-only semantics. Rewrite the docblock so it no longer describes "edit + approve combined." Key points the new comment must convey:
   - This is a MASS-ASSIGNMENT-SAFE field update. Status is preserved as-is (no implicit flip).
   - Mods who also want to approve must call `/approve` separately. That route holds the sole MEDIA_REQUIRED gate.
   - Status filter `$in: ['pending', 'rejected']` is kept — edit-on-behalf is still illegal on live/archived.
   - Audit log row still written with action='edit-on-behalf' + changed-fields-only diff.
   - Mass-assignment strip list unchanged (21 forbidden keys including the now-unused approvedAt/approvedByUid — keep stripping them defensively).
   - Reference: M3 post-ship hotfix 260511-cog. Closes the loophole where edit-on-behalf could flip a listing live via stale pre-M3 media.photos entries that bypass the field-presence check.

2. **Update the inline comment on line 777** (`delete updateData.status; // forced to 'live' below`) to: `delete updateData.status;              // preserved as-is — mass-assignment strip only (260511-cog cutover)`. The `delete` itself STAYS (still mass-assignment-strip defense).

3. **DELETE the MEDIA_REQUIRED gate block (lines 891-916)** in its entirety, including the preamble comment. Specifically remove the 22-line block starting at `// Phase 3 Plan 03-03 (MEDIA-07 / D-10) — MEDIA_REQUIRED gate at the` and ending with the closing `}` of `if (!mergedPhotos.length) { ... }`.

4. **DELETE the STEP 4 force-flip block (lines 932-946)** — every line of:
   ```js
   // STEP 4: Force status flip to 'live' ...
   const now = new Date();
   before.status = original.status;
   after.status = 'live';
   updateData.status = 'live';
   updateData.approvedAt = now;
   updateData.approvedByUid = req.firebaseUid;
   updateData.rejectionReasonCode = null;
   updateData.rejectionReasonNote = null;
   updateData.rejectedAt = null;
   updateData.rejectedByUid = null;
   ```

5. **Move `const now = new Date();` to just before the audit insert** so the `at: now` field still resolves. Place it immediately above `try { await ModerationLog.create({...` (currently line 970). Add a short comment: `// Single timestamp shared between findOneAndUpdate result and audit row.`

6. **Renumber the STEP comments** so the remaining steps read logically (STEP 1 mass-assignment strip → STEP 2 load original → STEP 3 compute diff → STEP 4 race-safe atomic update → STEP 5 audit log insert). Drop "STEP 4: Force status flip" entirely.

7. **VERIFY the changed-fields-only diff loop (lines 921-930) is unchanged** — it already correctly omits status from the diff when status isn't in updateData. After step 4 above removes the manual `before.status = ... ; after.status = 'live';` lines, the loop's behavior produces exactly the desired audit shape (no status entry).

**Edit moderationRoutes.test.js — 14 affected tests:**

Group A — MOD-14 describe block (around lines 353-481): 5 tests.

A1. **Line 354 "preserves ownerUid"** — KEEP AS-IS. (The body sends `ownerUid: 'attacker-uid'` and `content.title`; assertions on ownerUid/content still pass under field-only semantics. The status is no longer asserted in this test.)

A2. **Line 367 "flips status to live + sets approvedAt + approvedByUid (D-12)"** — REWRITE:
- Rename test to: `'PUT /listings/:id preserves status (no force-flip post-260511-cog cutover) + does NOT write approvedAt/approvedByUid'`
- Replace assertions:
  - `expect(res.body.status).toBe('live')` → `expect(res.body.status).toBe('pending')` (the seeded `pendingListing` started as 'pending'; we expect it to STAY pending)
  - `expect(res.body.approvedByUid).toBe('mod-a-uid')` → `expect(res.body.approvedByUid).toBeNull()` (handler no longer writes it; default Property schema value)
  - `expect(res.body.approvedAt).toBeDefined()` → `expect(res.body.approvedAt).toBeNull()` (or `.toBeFalsy()` if schema default is undefined — confirm against schema at test-time; pick whichever matches)
- Add a sanity assertion that the field-level edit DID land: `expect(res.body.content?.title).toBe('fixed')`.

A3. **Line 379 "writes audit log with action=edit-on-behalf + diff"** — REWRITE:
- Rename test to: `'PUT /listings/:id writes audit log with action=edit-on-behalf + diff WITHOUT status entry (status unchanged post-cutover)'`
- Replace assertions:
  - `expect(logs[0].before.status).toBe('pending')` → `expect(logs[0].before.status).toBeUndefined()` (status not in changed-fields-only diff because it didn't change)
  - `expect(logs[0].after.status).toBe('live')` → `expect(logs[0].after.status).toBeUndefined()`
- Add: `expect(logs[0].before.content).toBeDefined()` and `expect(logs[0].after.content?.title).toBe('fixed title')` (the actual changed field).

A4. **Line 395 "on rejected listing clears rejection metadata + flips to live"** — REWRITE:
- Rename test to: `'PUT /listings/:id on rejected listing preserves status=rejected + preserves rejection metadata (no implicit re-approval post-cutover)'`
- Replace assertions:
  - `expect(res.body.status).toBe('live')` → `expect(res.body.status).toBe('rejected')`
  - `expect(res.body.rejectionReasonCode).toBeNull()` → `expect(res.body.rejectionReasonCode).toBe('incomplete-info')` (preserved from seed — handler no longer clears it)
  - `expect(res.body.rejectionReasonNote).toBeNull()` → `expect(res.body.rejectionReasonNote).toBe('old note')`
  - `expect(res.body.rejectedAt).toBeNull()` → `expect(res.body.rejectedAt).toBeDefined()` (still a Date from seed)
  - `expect(res.body.rejectedByUid).toBeNull()` → `expect(res.body.rejectedByUid).toBe('mod-b-uid')` (preserved from seed)
- Keep the content.title assertion verifying the actual field edit landed.
- Add a comment block above the test referencing 260511-cog explaining the semantics shift: status STAYS rejected; mod who wants to also un-reject must call /approve (which has its own MEDIA_REQUIRED gate). This is the load-bearing semantics of the cutover.

A5. **Line 425 "on already-live listing returns 409"** — KEEP AS-IS. The status filter `$in: ['pending', 'rejected']` is unchanged; live listings still get 409.

A6. **Line 454 "parses multipart-delivered JSON-string fields (CR-01 regression, M3 nested)"** — REWRITE one assertion:
- `expect(saved.status).toBe('live')` → `expect(saved.status).toBe('pending')` (the comment "D-12 status flip still applies" gets updated to "post-cutover: status preserved").

Group B — Top-level moderationRoutes M3 nested-shape describe block (around lines 515-755): 4 tests.

B1. **Line 612 "(CR-02) partial-basics body preserves untouched basics fields on mod-edit"** — REWRITE the status assertion:
- `expect(res.body.status).toBe('live')` (around line 635) → `expect(res.body.status).toBe('pending')` (seeded as pending — stays pending).
- Update the inline comment from "D-12 status flip still applies" to "post-260511-cog cutover: status preserved (no implicit flip)".

B2. **Line 638 "(CR-02) partial-content body preserves untouched description + language on mod-edit"** — REWRITE if it asserts status (check; if it doesn't, leave alone — only assert untouched-field preservation matters here).

B3. **Line 658 "(MOD-14 edit-on-behalf) accepts nested body and round-trips nested fields"** — REWRITE:
- `expect(res.body.status).toBe('live')` (line 683) → `expect(res.body.status).toBe('pending')`
- `expect(res.body.approvedByUid).toBe('mod-a-uid')` (line 684) → `expect(res.body.approvedByUid).toBeNull()` (or `.toBeFalsy()` matching schema)
- Update inline comment "D-12 status flip applied" to "post-260511-cog: status preserved; mod must call /approve separately to flip live".

B4. **Line 687 "MOD-14 mass-assignment strip extended (21 forbidden keys)"** — REWRITE several assertions:
- `expect(reloaded.status).toBe('live')` (line 736) → `expect(reloaded.status).toBe('pending')` (the seeded `pendingListing` stays pending; the body-supplied 'archived' is stripped; no force-flip)
- Update inline comment "D-12 sets status='live' + approvedAt/approvedByUid" → "post-260511-cog: status preserved (body 'archived' stripped); approvedAt/approvedByUid stay null"
- `expect(reloaded.approvedByUid).toBe('mod-a-uid')` (line 737) → `expect(reloaded.approvedByUid).toBeNull()`
- Update "D-12 status flip wins, NOT 'archived'" comment to "post-cutover: status preserved (pending), body 'archived' stripped via mass-assignment guard"

Group C — Phase 3 MEDIA-07 MEDIA_REQUIRED gate, Surface 2 (lines 1675-1773): DELETE the entire describe block `'PUT /listings/:id (edit-on-behalf) — MEDIA_REQUIRED enforcement'` (4 tests):
- Line 1677 "edit-on-behalf with merged photos empty returns 400 MEDIA_REQUIRED"
- Line 1704 "edit-on-behalf with original photos non-empty + body without media key flips to live"
- Line 1722 "edit-on-behalf on REJECTED listing with empty photos returns 400 (branch-parity check)"
- Line 1750 "edit-on-behalf with body-supplied media.photos non-empty flips to live"

These tests are entirely about the now-deleted MEDIA_REQUIRED gate inside PUT /listings/:id. The gate is gone → the tests are gone. DELETE the whole describe block plus the comment header above it (lines 1675-1676 "─── Surface 2: PUT /listings/:id (edit-on-behalf flip-to-live) ──"). KEEP the parent `describe('Phase 3 MEDIA-07 — MEDIA_REQUIRED gate', ...)` block AND its Surface-1 (`POST /properties/:id/approve`) child describe — /approve still has the gate.

Also update the parent describe's header comment (around line 1587-1601) from:
```
// Two enforcement points (D-09 + D-10):
//   1. POST /api/moderation/properties/:id/approve — direct mod approval.
//   2. PUT /api/moderation/listings/:id — M2 MOD-14 edit-on-behalf flip-to-live.
```
to:
```
// Single enforcement point post-260511-cog cutover:
//   1. POST /api/moderation/properties/:id/approve — sole approval chokepoint.
// (PUT /api/moderation/listings/:id is field-only — no implicit flip, no gate.)
```

Group D — Sanity sweep for the M3 Phase 3 Plan 03-03 MEDIA-07 D-10 references in test comments: grep the test file for `D-10` and `Phase 3 Plan 03-03` mentions tied to the edit-on-behalf surface; add a one-line comment-suffix noting the 260511-cog cutover supersedes the edit-on-behalf side. Do NOT mass-replace — only annotate the ones that reference the deleted gate.

**Test count tally:** 5 in Group A + 3-4 in Group B + 4 in Group C = ~13 tests rewritten/deleted (one or two in Group B may not need changes if they don't assert status; the count is approximate per task design notes).

**Total context budget for this task:** large but contained — single route file (~200 lines of edits) + single test file (~20 assertion rewrites + 1 describe deletion). Estimate ~30-35% context.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services &amp;&amp; nvm use 24 &amp;&amp; npm test -- --testPathPattern=moderationRoutes 2>&amp;1 | tail -80</automated>
    Additional manual greps to confirm the cutover:
    - `grep -n "updateData.status = 'live'" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` → should return ZERO matches
    - `grep -n "updateData.approvedAt\|updateData.approvedByUid" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` → should return ZERO matches in the PUT /listings/:id handler (lines ~720-1000). The `/approve` route's own approvedAt/approvedByUid setters are SEPARATE and stay.
    - `grep -n "MEDIA_REQUIRED" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` → should return matches ONLY inside `/approve` (around lines 91-108), NOT inside PUT /listings/:id.
    - `grep -nE "before\.status|after\.status" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` → should return ZERO matches.
    - Full backend test suite passes (all suites, not just moderation — sentinel chain matters): `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services &amp;&amp; nvm use 24 &amp;&amp; npm test 2>&amp;1 | tail -30` → expect "Tests: 0 failed" and the sentinel chain (`actoruid` → `landlord-uid` → `media-stripped` → `i18n-parity` → `create-listing-screen-removed` → jest) to clear.
  </verify>
  <done>
    - PUT /listings/:id no longer references status='live', approvedAt, approvedByUid, MEDIA_REQUIRED, or the rejection-metadata-clearing block
    - Audit log row for edit-on-behalf has no status entry in before/after
    - All edit-on-behalf tests rewritten to assert status preservation + no approvedAt/approvedByUid
    - MEDIA_REQUIRED-on-edit-on-behalf describe block deleted entirely
    - Full backend test suite passes (npm test, exit 0, no failed tests)
  </done>
</task>

<task type="auto">
  <name>Task 2: RN client — update editOnBehalf.success toast string EN + RU + i18n parity check</name>
  <files>
    /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts
    /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts
  </files>
  <action>
1. **Edit `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` line 539:**
   - Change: `'moderation.editOnBehalf.success': 'Listing updated and approved.',`
   - To: `'moderation.editOnBehalf.success': 'Listing updated.',`

2. **Edit `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts` line 541:**
   - Change: `'moderation.editOnBehalf.success': 'Объявление обновлено и одобрено.',`
   - To: `'moderation.editOnBehalf.success': 'Объявление обновлено.',`

3. **Sanity check no other consumer references the old "and approved" copy:**
   - `grep -rn "and approved\|и одобрено" /Users/beckmaldinVL/development/mobileApps/JayTap/src` — only the two locale lines should be removing this phrase. If any UI component has the phrase hardcoded (it shouldn't — all moderation copy goes through `t()`), surface it before changing.

4. **Don't touch anything else.** The toast call site that uses this key (search for `editOnBehalf.success` in the RN source) does NOT need changes — it consumes the key, and the key's value is what we're updating. No component logic, no screen logic.

5. **No version bump** — this is a copy fix, not a release. v3.0.x is the active store-side version; this lands as an unreleased frontend change paired with the backend route change. If/when the user decides to ship, that's a separate `/gsd-quick` or release flow.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; bash scripts/check-i18n-parity.sh 2>&amp;1 | tail -10</automated>
    Additional manual greps:
    - `grep -n "editOnBehalf.success" /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` → should print `'moderation.editOnBehalf.success': 'Listing updated.',` (no "and approved")
    - `grep -n "editOnBehalf.success" /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts` → should print `'moderation.editOnBehalf.success': 'Объявление обновлено.',` (no "и одобрено")
    - `grep -rn "Listing updated and approved\|обновлено и одобрено" /Users/beckmaldinVL/development/mobileApps/JayTap/src` → should return ZERO matches
    - TypeScript build sanity: `cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; npx tsc --noEmit 2>&amp;1 | tail -10` → expect no new errors introduced by the locale edits (these are plain object-literal string changes; should be clean).
  </verify>
  <done>
    - EN locale shows `'moderation.editOnBehalf.success': 'Listing updated.'`
    - RU locale shows `'moderation.editOnBehalf.success': 'Объявление обновлено.'`
    - i18n parity script passes (`check-i18n-parity.sh` exits 0)
    - No leftover "and approved" / "и одобрено" copy anywhere in src/
    - TypeScript compiles clean
  </done>
</task>

<task type="auto">
  <name>Task 3: Cross-repo commits + SUMMARY.md (backend first, then frontend)</name>
  <files>
    /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md
  </files>
  <action>
**Step A — Backend commit (in /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services):**

Stage and commit the backend changes. Commit message:
```
fix(moderation): edit-on-behalf becomes field-only — no force-flip to live (260511-cog)

PUT /api/moderation/listings/:id no longer flips status to 'live', no longer
writes approvedAt/approvedByUid, and no longer clears rejection metadata.
Status is preserved as-is (pending stays pending; rejected stays rejected).
The MEDIA_REQUIRED gate previously embedded in this route is removed — the
sole enforcement point is now POST /properties/:id/approve.

Rationale: M3 inverted media flow so users submit metadata only and admins
curate photos via a separate surface. The edit-on-behalf force-flip was an
M2 holdover that could bypass the photo-required invariant on listings
carrying stale media.photos entries from pre-M3 migration. Collapsing
approval into a single audited chokepoint closes that loophole.

Approval requirement (unchanged from M3):
- Photos REQUIRED to flip live (>=1 entry in media.photos), gated at /approve.
- 3D tours / panoramic URLs remain OPTIONAL.

Test changes: rewrote ~9 edit-on-behalf assertions in MOD-14 + nested-shape
describe blocks to assert status preservation + no approvedAt/approvedByUid +
no status entry in audit diff. Deleted the entire Phase 3 MEDIA-07 Surface-2
describe block (4 tests for the now-removed gate). Updated the parent
MEDIA-07 header comment from "two enforcement points" to "single chokepoint".
```

Use HEREDOC for the multi-line message. Verify backend repo is clean before commit (`git status` from the backend repo directory).

**Step B — Frontend commit (in /Users/beckmaldinVL/development/mobileApps/JayTap):**

Stage `src/locales/en.ts` and `src/locales/ru.ts`. Commit message:
```
fix(i18n): moderation.editOnBehalf.success drops "and approved" claim (260511-cog)

Pairs with backend cutover (260511-cog) that removes the force-flip-to-live
from PUT /api/moderation/listings/:id. The success toast no longer claims
"and approved" because the route no longer approves anything — it just
updates fields. EN + RU parity preserved.
```

**Step C — Create the SUMMARY.md for the quick task:**

Write `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md` covering:

1. **What changed (one paragraph)** — field-only cutover; both repos touched; M3 post-ship hotfix; closes the edit-on-behalf force-flip loophole.
2. **Files touched** (4 files across 2 repos, with the absolute paths).
3. **Backend behavior change summary** —
   - PUT /listings/:id: status preserved as-is, no approvedAt/approvedByUid written, no rejection metadata cleared, no MEDIA_REQUIRED gate.
   - /approve route: UNCHANGED — still sole approval chokepoint with MEDIA_REQUIRED gate intact.
4. **Approval requirement (restated for clarity per task notes):**
   - Photos REQUIRED (>=1 in media.photos) to flip 'live' — enforced ONLY at /approve.
   - 3D tours (Matterport/Ricoh URLs) and panoramic URLs remain OPTIONAL.
5. **Test impact** — rewrote ~9 status-flip assertions; deleted 4 MEDIA_REQUIRED-on-edit-on-behalf tests; full backend suite green.
6. **Frontend impact** — success toast text updated EN+RU; no logic changes; i18n parity preserved.
7. **Cross-repo commit chain** — backend SHA + frontend SHA (capture from `git log --oneline -1` in each repo after commits).
8. **Deploy/release implications** —
   - Backend ships via Railway whenever the user next pushes (out of scope for this quick task).
   - Frontend toast change ships in the next RN release (v3.0.x patch or M4 bundle — TBD per release cadence). Until then the running TestFlight/Play Console builds still show the old toast — which is harmless (claims approval; backend now no longer approves, but the toast pre-cutover claimed approval truthfully so the regression window is the gap between backend deploy and frontend deploy — see "Coordination risk window" below).
9. **Coordination risk window** — if backend deploys before frontend ships, mods see "Listing updated and approved." but the listing did NOT flip live. Mitigations:
   - Mod UX cost is small (toast lies for one release cycle); listings still visible in the queue under their pre-edit status.
   - Mods who notice can re-tap /approve from the queue (their normal workflow).
   - When the user is ready to ship the frontend string, run a separate `/gsd-quick` or fold into the next milestone release.
10. **Not in scope (per task design notes):**
    - /approve route — already correct
    - Owner-side PUT /properties/:id — already correct
    - No new "edit-and-approve" combined route added (intentional UX cost: mods must go through /approve)
11. **Conventions followed:**
    - Backend Node 24 (`nvm use 24` before npm/node ops per auto-memory `backend-node-version.md`)
    - Two-repo atomic-ish commit (same session, minutes apart, not days)
    - EN+RU i18n parity (CI gate `scripts/check-i18n-parity.sh` clears)
    - No Firebase SDK touched (per repo rule)
    - Audit row shape preserved (action='edit-on-behalf' still written; just no status entry in diff)

Use the standard SUMMARY template structure from `~/.claude/get-shit-done/templates/summary.md`. Date the SUMMARY 2026-05-11.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services &amp;&amp; git log --oneline -1 &amp;&amp; cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; git log --oneline -1 &amp;&amp; test -f /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md &amp;&amp; echo SUMMARY_EXISTS</automated>
    Manual checks:
    - Backend `git log --oneline -3` shows the 260511-cog fix(moderation) commit as HEAD
    - Frontend `git log --oneline -3` shows the 260511-cog fix(i18n) commit as HEAD
    - `git status` in BOTH repos is clean (no uncommitted residuals)
    - SUMMARY.md exists at the expected path and contains all 11 sections above
  </verify>
  <done>
    - Backend commit landed in JayTap-services with the multi-paragraph commit message
    - Frontend commit landed in JayTap with the paired commit message
    - Both repos have clean `git status`
    - SUMMARY.md created with backend+frontend SHAs captured + 11 sections covered
    - Approval requirement (photos required; 3D tours / panoramas optional) restated for clarity
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| mod-client → /api/moderation/listings/:id (PUT) | Authenticated moderator request crosses into mutation territory. Body is partially-trusted (router-level JWKS auth + requireMinRole('moderator') guard already established). |
| /api/moderation/listings/:id → Property collection | Mongo write. Mass-assignment surface — the 21-key strip is the load-bearing defense. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260511-cog-01 | E (Elevation of Privilege) | Mass-assignment via body-supplied `status` / `approvedAt` / `approvedByUid` after force-flip removed | mitigate | The 21-key mass-assignment strip (`delete updateData.status; ... delete updateData.approvedAt; ... delete updateData.approvedByUid;` etc.) STAYS verbatim — every deleted key continues to be stripped defensively even though the handler no longer writes them itself. An attacker body of `{ status: 'live', approvedByUid: 'attacker' }` lands as a no-op because the strip runs BEFORE the Mongo $set. Test B4 (line 687 MOD-14 mass-assignment strip extended) verifies this invariant; post-cutover assertions confirm `reloaded.status === 'pending'` (NOT 'live' from attacker body, NOT 'live' from a vanished force-flip). |
| T-260511-cog-02 | T (Tampering) | Removed MEDIA_REQUIRED gate on edit-on-behalf creates a regression vector if a future change re-adds an implicit flip without re-adding the gate | mitigate | The handler's status filter `$in: ['pending','rejected']` is unchanged, AND `updateData.status` is stripped, so even if a developer later re-introduces an implicit flip they'd have to ALSO delete the strip — two deliberate changes, not one. SUMMARY.md documents the cutover so future readers know the gate moved entirely to /approve. /approve's own MEDIA_REQUIRED gate (lines 91-108) is UNTOUCHED and remains the sole chokepoint. |
| T-260511-cog-03 | R (Repudiation) | Audit log diff shape changes (no more before.status/after.status entries) — could complicate forensic replay of "when did this listing flip live?" | accept | The audit log still records action='edit-on-behalf' with the changed-fields-only diff and actorUid from JWKS. The "when did this go live?" answer now lives in the /approve audit row (action='approve') with its own before.status='pending'/after.status='live'. Single-source-of-truth for flip events is cleaner, not more confusing. |
| T-260511-cog-04 | I (Information Disclosure) | None — no read paths touched | accept | N/A |
| T-260511-cog-05 | D (Denial of Service) | None — no rate-limit or quota surface touched | accept | N/A |
| T-260511-cog-06 | S (Spoofing) | None — actorUid still sourced from req.firebaseUid (JWKS sub), not from body | accept | Existing MOD-16 invariant preserved verbatim. Anti-spoofing test at line 233 still passes. |
</threat_model>

<verification>

**Per-task verification is encoded in each task's `<verify>` block. Phase-level checks:**

1. **Backend full suite green** — `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test 2>&1 | tail -20` should print "Tests: 0 failed" and exit 0. The sentinel chain (`actoruid` → `landlord-uid` → `media-stripped` → `i18n-parity` → `create-listing-screen-removed` → jest) clears.

2. **Behavior invariant manual probe** — after the route change, the following Mongo round-trip behavior must hold (verified by tests A2 + A4 + B3 + B4):
   - PUT a pending listing with `{ content: { title: 'x' } }` → response status 200, body.status === 'pending', body.approvedAt === null/undefined, body.approvedByUid === null/undefined
   - PUT a rejected listing with `{ content: { title: 'x' } }` → response status 200, body.status === 'rejected', body.rejectionReasonCode preserved, body.rejectedByUid preserved
   - PUT a live listing → response status 409 ALREADY_MODERATED (status filter unchanged)
   - PUT an archived listing → response status 409 (archived also excluded by status filter $in)

3. **Frontend i18n parity** — `bash scripts/check-i18n-parity.sh` exits 0.

4. **Cross-repo git hygiene** — both repos have clean `git status` after commits; HEAD on each shows the 260511-cog commits.

5. **No regressions in /approve** — explicit grep verifies `MEDIA_REQUIRED` still present in /approve handler (lines 91-108 ish): `grep -n "MEDIA_REQUIRED" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js | head -5` should still show at least one match inside the /approve handler.

</verification>

<success_criteria>

Plan complete when ALL of the following hold:

1. ✅ `moderationRoutes.js` PUT /listings/:id handler no longer contains: `updateData.status = 'live'`, `updateData.approvedAt = now`, `updateData.approvedByUid`, `MEDIA_REQUIRED` (in this handler), `before.status = original.status`, `after.status = 'live'`, or rejection-metadata-clearing lines.
2. ✅ The `/approve` route's own MEDIA_REQUIRED gate at lines 91-108 is UNTOUCHED (sanity grep confirms it's still there).
3. ✅ All ~9 affected tests in MOD-14 + nested-shape describe blocks rewritten with status-preservation assertions; all 4 tests in the MEDIA_REQUIRED Surface-2 describe block deleted.
4. ✅ Full backend test suite green (npm test exits 0, sentinel chain clears).
5. ✅ EN locale shows `'moderation.editOnBehalf.success': 'Listing updated.'` (no "and approved").
6. ✅ RU locale shows `'moderation.editOnBehalf.success': 'Объявление обновлено.'` (no "и одобрено").
7. ✅ `scripts/check-i18n-parity.sh` exits 0.
8. ✅ Backend commit landed with the multi-paragraph commit message including 260511-cog reference + rationale + approval-requirement restatement.
9. ✅ Frontend commit landed with the paired commit message referencing 260511-cog.
10. ✅ Both repos have clean `git status`.
11. ✅ SUMMARY.md exists at `.planning/quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/260511-cog-SUMMARY.md` with all 11 sections, including the approval-requirement clause: "Photos REQUIRED; 3D tours + panoramic URLs remain OPTIONAL."

</success_criteria>

<output>
After completion, the SUMMARY.md created in Task 3 documents the cross-repo hotfix. No further GSD artifact updates required — this is a `/gsd-quick` task, not a phase, so ROADMAP/STATE remain at their M3-shipped values. (If the user later decides to roll this into an M3.x release, that's a separate `/gsd-insert-phase` or release flow.)
</output>

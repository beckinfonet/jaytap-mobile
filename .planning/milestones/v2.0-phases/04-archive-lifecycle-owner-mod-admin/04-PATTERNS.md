# Phase 4: Archive Lifecycle (Owner + Mod/Admin) — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 12 (4 backend, 8 client) — locked baselines (`wc -l` 2026-05-02)
**Analogs found:** 12 / 12 (every Phase 4 file has a strong existing analog inside this same repo or the Phase 3-shipped sibling)

## File Classification

| New / Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|------|-----------|----------------|---------------|
| `src/routes/propertyRoutes.js` (D-01 owner-archive POST) | backend | route | request-response (CRUD state-flip) | `src/routes/moderationRoutes.js:87-126` (POST /properties/:id/approve) — same race-safe `findOneAndUpdate` + audit-row shape | exact |
| `src/routes/propertyRoutes.js` (D-01 owner-unarchive POST) | backend | route | request-response (CRUD state-flip) | `src/routes/moderationRoutes.js:143-206` (POST /properties/:id/reject) — same status-filter + audit-clear pattern | exact |
| `src/routes/propertyRoutes.js` (D-04 DELETE /:id middleware swap) | backend | route | request-response (delete + audit) | `src/routes/propertyRoutes.js:545-578` (existing DELETE handler) + `src/routes/moderationRoutes.js:87-126` (audit-row pattern) | exact |
| `src/routes/moderationRoutes.js` (D-02 mod-archive POST) | backend | route | request-response (CRUD + reasonCode validation) | `src/routes/moderationRoutes.js:143-206` (POST /properties/:id/reject) — verbatim shape with action verb swap | exact |
| `src/routes/moderationRoutes.js` (D-02 mod-restore POST) | backend | route | request-response (CRUD state-flip + field clears) | `src/routes/moderationRoutes.js:87-126` (POST /properties/:id/approve) — race-safe + audit-row | exact |
| `src/models/Property.js` (D-20 schema additive) | backend | model | n/a (schema definition) | `src/models/Property.js:43-50` (Phase 2/3 audit-field block) | exact |
| `src/models/ModerationLog.js` (D-05 enum extension) | backend | model | n/a (schema definition) | `src/models/ModerationLog.js:19` (existing action enum) | exact |
| `src/components/ArchiveListingModal.tsx` (NEW — D-08 fork) | client | component | event-driven (parent-owns-HTTP) | `src/components/RejectListingModal.tsx` (208 LOC, full file) | exact (verbatim fork — 3 t() call diffs only) |
| `src/components/PropertyCard.tsx` (D-11 verify) | client | component | presentational | `src/components/PropertyCard.tsx:32-33,196-256` — `onUnarchive` already wired, no changes needed | n/a (already-shipped pattern; Phase 4 verifies) |
| `src/components/HospitalitySection.tsx` (D-Claude-Discretion verify) | client | component | presentational pass-through | `src/components/HospitalitySection.tsx:34-35,88-91` — `onUnarchive` prop already wired through to HospitalityCard | n/a (already-shipped) |
| `src/components/DeleteListingModal.tsx` (D-10 unchanged; mount moves) | client | component | event-driven (parent-owns-HTTP) | `src/components/DeleteListingModal.tsx` (existing 206 LOC component) | n/a (component itself untouched) |
| `src/screens/RenterListingsScreen.tsx` (D-09 + D-10 + D-11 + D-14) | client | screen | event-driven + state-management | `src/screens/RenterListingsScreen.tsx:111-197,313-321,368-376` (existing handler/JSX shapes — Phase 4 mutates in place) | exact |
| `src/screens/PropertyDetailsScreen.tsx` (D-06 + D-10 footer extension) | client | screen | event-driven + state-management | `src/screens/PropertyDetailsScreen.tsx:268-356,1316-1390,2106-2130` (existing 3-button mod footer) | exact |
| `src/services/PropertyService.ts` (rewrite + 3 new methods) | client | service | request-response | `src/services/PropertyService.ts:344-358` (approveListing) + `:364-383` (rejectListing) — Phase 3 method shape | exact |
| `src/hooks/useRole.ts` (D-16 Action union + canFromUser switch) | client | hook | n/a (pure function) | `src/hooks/useRole.ts:14-23,75-98` (existing union + switch) | exact (additive in place) |
| `src/locales/en.ts` + `src/locales/ru.ts` (D-08 + D-12 + D-17) | client | config | n/a (string table) | `src/locales/en.ts:160-172,597-604` (existing archive + reject keys) | exact (locale parity gate covers) |

**LOC baselines locked at PATTERN-MAP time (2026-05-02 `wc -l`):**

| File | Actual LOC | CONTEXT.md cited LOC | Drift |
|------|-----------|----------------------|-------|
| `App.tsx` | 1191 | 1178 | +13 |
| `src/screens/PropertyDetailsScreen.tsx` | 2131 | 2122 | +9 |
| `src/screens/RenterListingsScreen.tsx` | 463 | 458 | +5 |
| `src/components/PropertyCard.tsx` | 495 | 492 | +3 |
| `src/components/RejectListingModal.tsx` | 209 | 209 | 0 |
| `src/components/HospitalitySection.tsx` | 132 | (n/a) | n/a |
| `src/components/DeleteListingModal.tsx` | 206 | (n/a) | n/a |
| `src/services/PropertyService.ts` | 432 | (n/a) | n/a |
| `src/hooks/useRole.ts` | 126 | (n/a) | n/a |
| `JayTap-services/src/routes/moderationRoutes.js` | 447 | (n/a) | n/a |
| `JayTap-services/src/routes/propertyRoutes.js` | 580 | (n/a) | n/a |
| `JayTap-services/src/models/Property.js` | 91 | (n/a) | n/a |
| `JayTap-services/src/models/ModerationLog.js` | 31 | (n/a) | n/a |

**App.tsx +13 drift note:** D-19 net-zero target lands at 1191 (not 1178). Plans must reference 1191 as the live baseline; soft cap 1100 + hard ceiling 1180 (per Phase 2 PITFALLS Pitfall 8) are now both formally exceeded — Phase 4 is signal-not-block under PATTERN D, but every planned diff MUST greppable-verify ZERO `useState` / `OVERLAY_FLAGS` / handler additions to App.tsx.

---

## Pattern Assignments

### 1. Backend mod-archive route — `moderationRoutes.js` POST /properties/:id/archive (D-02)

**Analog:** `JayTap-services/src/routes/moderationRoutes.js:143-206` (POST /properties/:id/reject)

**Why this analog:** Same data flow (request-response + race-safe atomic state flip + reasonCode validation + audit-row write). Same router-level `verifyFirebaseToken + requireMinRole('moderator')` mount inheritance. Phase 3 already carved this exact pattern; D-02 is a verb-swap (`reject` → `archive`).

**Insertion point:** After existing approve handler (`moderationRoutes.js:126`) and reject handler (line 206), before `PUT /listings/:id` at line 244. Recommended: line 207 (or grouped with the new mod-restore handler immediately after).

**Imports already in scope** (lines 11-13):
```javascript
const Property = require('../models/Property');
const ModerationLog = require('../models/ModerationLog');
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');
```
(No new imports needed.)

**Reuse `VALID_REJECT_CODES`** const at line 54 — D-02 explicit:
```javascript
const VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];
```

**Core pattern to mirror (lines 143-206):**
```javascript
router.post('/properties/:id/reject', async (req, res) => {
  try {
    const { reasonCode, reasonNote } = req.body;

    // Validate reasonCode against the locked 4-value enum (REQUIREMENTS MOD-12).
    if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) {
      return res.status(400).json({
        message: `reasonCode must be one of ${VALID_REJECT_CODES.join(', ')}`,
      });
    }

    const now = new Date();
    const trimmedNote = (typeof reasonNote === 'string' && reasonNote.trim()) ? reasonNote.trim() : null;

    // Atomic state flip — same race-safety pattern as approve.
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: {
          status: 'rejected',
          rejectedAt: now,
          rejectedByUid: req.firebaseUid,
          rejectionReasonCode: reasonCode,
          rejectionReasonNote: trimmedNote,
        } },
      { new: true }
    );

    if (!result) {
      return res.status(409).json({
        code: 'ALREADY_MODERATED',
        message: 'This listing was already reviewed by another moderator.',
      });
    }

    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,                         // PATTERN §D — JWKS sub, NEVER body
        action: 'reject',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'rejected', rejectionReasonCode: reasonCode },
        reasonCode,
        reasonNote: trimmedNote,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'reject',
        targetId: String(result._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    return res.json(result);
  } catch (err) {
    console.error('Error rejecting listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

**Phase 4 D-02 mod-archive diffs from analog:**

| Line in analog | Replace with | Why |
|----------------|--------------|-----|
| `'/properties/:id/reject'` | `'/properties/:id/archive'` | new route path |
| `status: 'pending'` (filter) | `status: { $ne: 'archived' }` | per D-02; mod-archive accepts any non-archived current status (live, pending, rejected) |
| `status: 'rejected'` | `status: 'archived'` | new target status |
| `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote` | `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote` | per D-02 + D-20 schema fields |
| `code: 'ALREADY_MODERATED'` | `code: 'ALREADY_ARCHIVED'` (recommended) OR `'ALREADY_MODERATED'` (planner discretion per D-17 — symmetry vs specificity) | per D-17 |
| `action: 'reject'` (audit) | `action: 'archive'` (per D-05 enum extension) | new audit verb |
| `before: { status: 'pending' }` | `before: { status: <pre-update via findById().lean()> }` OR `before: { status: 'pre-archive' }` placeholder | mod-archive accepts ANY non-archived status; capture via separate read (per Q5 Open Question) |

---

### 2. Backend mod-restore route — `moderationRoutes.js` POST /properties/:id/restore (D-02 + D-03)

**Analog:** `JayTap-services/src/routes/moderationRoutes.js:87-126` (POST /properties/:id/approve)

**Why this analog:** Mod-restore is the symmetric counterpart of approve — flips status to `'pending'`, no reasonCode body, race-safe atomic, audit-row write. Approve is the simpler shape (no body validation) — closer match than reject.

**Insertion point:** Immediately after the new mod-archive handler (recommended grouping).

**Core pattern to mirror (lines 87-126):**
```javascript
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({
        code: 'ALREADY_MODERATED',
        message: 'This listing was already reviewed by another moderator.',
      });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'approve',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid },
        at: now,
      });
    } catch (auditErr) { /* ... orphan log ... */ }
    return res.json(result);
  } catch (err) { /* ... 500 ... */ }
});
```

**Phase 4 D-02 mod-restore diffs from analog:**

| Line in analog | Replace with | Why |
|----------------|--------------|-----|
| `'/properties/:id/approve'` | `'/properties/:id/restore'` | new path |
| `status: 'pending'` (filter) | `status: 'archived'` | restore only operates on archived listings |
| `status: 'live'`, `approvedAt`, `approvedByUid` | `status: 'pending'`, `submittedAt: now`, `archivedAt: null`, `archivedByUid: null`, `archivedReasonCode: null`, `archivedReasonNote: null` | per D-03 + D-15 audit-field clears + submittedAt re-stamp |
| `action: 'approve'` | `action: 'unarchive'` | per D-05 enum extension |
| `before: { status: 'pending' }` | `before: { status: 'archived', archivedReasonCode, archivedReasonNote }` | capture via findById().lean() before the update for clean diff |
| `after: { ... }` | `after: { status: 'pending', submittedAt: now }` | reflect actual transition |
| `code: 'ALREADY_MODERATED'` | `code: 'NOT_ARCHIVED'` OR `'ALREADY_RESTORED'` | per D-17 — null result here means listing wasn't archived (race lost OR never archived) |

**D-15 invariant (audit-field clears on restore):** Clear `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`. PRESERVE `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`. Do NOT use `$unset`; use `$set` with `null` values to match Phase 2 D-22's "rejected→pending edit-resubmit" precedent (clears via `null` for symmetry).

---

### 3. Backend owner-archive route — `propertyRoutes.js` POST /:id/archive (D-01)

**Analog:** `JayTap-services/src/routes/propertyRoutes.js:545-578` (existing DELETE /:id) for the local file shape; `moderationRoutes.js:143-206` for the race-safe pattern.

**Why TWO analogs:** propertyRoutes.js currently has ZERO race-safe `findOneAndUpdate` handlers. The DELETE handler is the closest local pattern (verifyFirebaseToken + ownership-check + atomic action), but it does not race-safely update — it does `findById` then `findByIdAndDelete`. Phase 4's owner-archive must mirror moderationRoutes.js's race-safe approach, NOT the existing DELETE shape's read-then-act pattern.

**Imports needed (NEW to propertyRoutes.js):**
```javascript
const ModerationLog = require('../models/ModerationLog'); // line 7 area — NEW import for Phase 4
```
(Existing imports at lines 6-10 already cover `Property`, `verifyFirebaseToken`, `optionalAuth`. `requireMinRole` is also exported from the middleware module per moderationRoutes.js:13 — Phase 4 D-04 needs to add it to the destructure.)

**Insertion point:** After existing DELETE handler (line 578) — recommended grouping with the new POST /:id/unarchive handler.

**Core pattern (composed from both analogs):**

Reference shape from `moderationRoutes.js:87-126` (race-safe atomic + audit-row try/catch + orphan log):
```javascript
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },
  { $set: { ... } },
  { new: true }
);
if (!result) return res.status(409).json({ code: 'ALREADY_MODERATED', message: '...' });
try { await ModerationLog.create({ actorUid: req.firebaseUid, ... }); }
catch (auditErr) { console.error(JSON.stringify({ evt: 'moderation_audit_orphan', ... })); }
return res.json(result);
```

Reference shape from `propertyRoutes.js:545-578` (verifyFirebaseToken middleware + ownership-error response code):
```javascript
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.ownerUid !== req.firebaseUid) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own listings.' });
    }
    // ...
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**Phase 4 D-01 owner-archive composition (Race-safe atomic + 403/404/409 disambiguation per Q4 Open Question):**

```javascript
// JayTap-services/src/routes/propertyRoutes.js — NEW HANDLER
// Source: composes moderationRoutes.js:143-206 race-safe pattern + propertyRoutes.js:545-578 ownership-disambiguation pattern
router.post('/:id/archive', verifyFirebaseToken, async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, ownerUid: req.firebaseUid, status: { $ne: 'archived' } },
      { $set: {
          status: 'archived',
          archivedAt: now,
          archivedByUid: req.firebaseUid,
          archivedReasonCode: null,        // owner-archive is no-reason per ARCH-01 + D-01
          archivedReasonNote: null,
        } },
      { new: true }
    );

    if (!result) {
      // Disambiguate 403/404/409 per Q4 Open Question recommendation.
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerUid !== req.firebaseUid) {
        return res.status(403).json({ message: 'Access denied. You can only archive your own listings.' });
      }
      return res.status(409).json({ code: 'ALREADY_ARCHIVED', message: 'This listing is already archived.' });
    }

    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'archive',
        targetType: 'property',
        targetId: result._id,
        before: {},                    // owner-archive accepts any pre-status; planner picks per Q5 (recommend: capture via findById().lean() before update)
        after: { status: 'archived' },
        reasonCode: null,
        reasonNote: null,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'archive',
        targetId: String(result._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    return res.json(result);
  } catch (err) {
    console.error('Error owner-archiving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

---

### 4. Backend owner-unarchive route — `propertyRoutes.js` POST /:id/unarchive (D-01 + D-03 + D-13)

**Analog:** Phase 4 mod-restore handler (above) for transition shape; D-13 owner-restore gate adds the second filter clause (`archivedByUid: req.firebaseUid`).

**D-13 invariant:** `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid`. The `findOneAndUpdate` filter encodes BOTH conditions; null result triggers disambiguation read.

**Code shape (composed):**
```javascript
router.post('/:id/unarchive', verifyFirebaseToken, async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerUid: req.firebaseUid,
        archivedByUid: req.firebaseUid,    // D-13 — owner can only restore listings THEY self-archived
        status: 'archived',
      },
      { $set: {
          status: 'pending',
          submittedAt: now,                 // D-15 FIFO re-queue
          archivedAt: null,
          archivedByUid: null,
          archivedReasonCode: null,
          archivedReasonNote: null,
          // D-15 PRESERVES: approvedAt, approvedByUid, rejectedAt, rejectedByUid, rejectionReasonCode, rejectionReasonNote
        } },
      { new: true }
    );

    if (!result) {
      // Disambiguate 403/404/409 per Q4 — owner restoring mod-archived listing is a 403 per D-13.
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerUid !== req.firebaseUid) {
        return res.status(403).json({ message: 'Access denied. You can only restore your own listings.' });
      }
      if (property.archivedByUid !== req.firebaseUid) {
        return res.status(403).json({
          code: 'NOT_ORIGINAL_ARCHIVER',
          message: 'Only a moderator can restore this listing.',
        });
      }
      return res.status(409).json({ code: 'NOT_ARCHIVED', message: 'This listing is not currently archived.' });
    }

    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'unarchive',                // per D-05 enum extension
        targetType: 'property',
        targetId: result._id,
        before: { status: 'archived' },
        after: { status: 'pending', submittedAt: now },
        reasonCode: null,
        reasonNote: null,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan', action: 'unarchive',
        targetId: String(result._id), actorUid: req.firebaseUid,
        err: auditErr.message, ts: new Date().toISOString(),
      }));
    }

    return res.json(result);
  } catch (err) {
    console.error('Error owner-unarchiving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

---

### 5. Backend hard-delete middleware swap — `propertyRoutes.js` DELETE /:id (D-04)

**Analog:** `JayTap-services/src/routes/propertyRoutes.js:545-578` (existing DELETE — modify in place).

**Imports needed (NEW destructure addition at line 8):**
```javascript
// CURRENT
const { verifyFirebaseToken, optionalAuth, ROLE_RANK } = require('../middleware/verifyFirebaseToken');

// PHASE 4 D-04
const { verifyFirebaseToken, optionalAuth, ROLE_RANK, requireMinRole } = require('../middleware/verifyFirebaseToken');
const ModerationLog = require('../models/ModerationLog');   // NEW
```

**Existing handler (lines 545-578):**
```javascript
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Verify ownership
    if (property.ownerUid !== req.firebaseUid) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own listings.' });
    }

    // Soft-delete guard
    const status = property.status;
    const isHardDeletable = status === 'archived';
    if (!isHardDeletable) {
      return res.status(400).json({
        message: 'Listing must be archived before permanent deletion.',
        code: 'HARD_DELETE_REQUIRES_ARCHIVED',
      });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**Phase 4 D-04 diffs (3 changes, atomic in same commit per Pitfall 2 mitigation):**

| Change | Why |
|--------|-----|
| Line 545: add `requireMinRole('admin')` between `verifyFirebaseToken` and the handler fn | D-04 middleware swap |
| Lines 554-557: DELETE the inline ownership block entirely | Pitfall 2 — admins don't own the listing they're deleting; without this delete, admins get 403 |
| Lines 547-573: capture `before` snapshot via `findById().lean()` BEFORE delete; insert `ModerationLog.create({ action: 'hard-delete', before, after: null, ... })` AFTER `findByIdAndDelete` | D-18 audit-row write + before-snapshot per D-18 |

**Phase 4 final shape:**
```javascript
router.delete('/:id', verifyFirebaseToken, requireMinRole('admin'), async (req, res) => {
  try {
    // STEP 1: Capture full snapshot for audit BEFORE delete (D-18).
    const before = await Property.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Property not found' });

    // STEP 2: Preserve existing must-be-archived precondition (regression-protected by ARCH-05 supertest).
    if (before.status !== 'archived') {
      return res.status(400).json({
        message: 'Listing must be archived before permanent deletion.',
        code: 'HARD_DELETE_REQUIRES_ARCHIVED',
      });
    }

    // STEP 3: Hard delete.
    await Property.findByIdAndDelete(req.params.id);

    // STEP 4: Audit row with full before-snapshot.
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'hard-delete',                     // per D-05 enum extension
        targetType: 'property',
        targetId: before._id,
        before,                                     // FULL snapshot per D-18
        after: null,
        at: new Date(),
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan', action: 'hard-delete',
        targetId: String(before._id), actorUid: req.firebaseUid,
        err: auditErr.message, ts: new Date().toISOString(),
      }));
    }

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: error.message });
  }
});
```

---

### 6. Backend Property schema — `Property.js` additive (D-20 + Pitfall 1)

**Analog:** `JayTap-services/src/models/Property.js:43-50` (existing audit-fields block).

**Pitfall 1:** CONTEXT.md D-20 claims `archivedReasonCode` is already on the schema. **It is not.** Phase 4 must add BOTH `archivedReasonCode` AND `archivedReasonNote`.

**Existing block (lines 43-50):**
```javascript
submittedAt: { type: Date },
approvedAt: { type: Date, default: null },
approvedByUid: { type: String, default: null },
rejectedAt: { type: Date, default: null },
rejectedByUid: { type: String, default: null },
rejectionReasonCode: { type: String, default: null },
rejectionReasonNote: { type: String, default: null },
archivedAt: { type: Date, default: null },
archivedByUid: { type: String, default: null },
```

**Phase 4 diff (insert after line 50):**
```javascript
archivedAt: { type: Date, default: null },
archivedByUid: { type: String, default: null },
+ archivedReasonCode: { type: String, default: null }, // Phase 4 D-20: mod-archive populates from VALID_REJECT_CODES; owner-archive leaves null
+ archivedReasonNote: { type: String, default: null }, // Phase 4 D-20: mod-archive optional free-text; owner-archive leaves null
```

**Pattern:** "additive only" per Phase 1 D-04 + Phase 2 D-21 + Phase 3 D-10 precedent. No migration needed; null-default applies to existing docs at read time.

---

### 7. Backend `ModerationLog` action enum — `ModerationLog.js` (D-05)

**Analog:** `JayTap-services/src/models/ModerationLog.js:19` (existing enum line).

**Existing line:**
```javascript
action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
```

**Phase 4 diff:**
```javascript
- action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
+ action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete'], required: true },
```

**Pattern:** Single-line additive enum extension (Phase 3 D-10 explicitly reserved these values).

---

### 8. Client `<ArchiveListingModal>` — NEW FILE, fork of `RejectListingModal.tsx` (D-08)

**Analog:** `src/components/RejectListingModal.tsx` (full file, 209 LOC) — verbatim fork target.

**Why this analog:** D-08 explicitly mandates a fork (NOT parametrization). The component is presentational, no service calls, parent-owns-HTTP. Phase 4 ArchiveListingModal is a near-byte-identical copy with 3 t() call swaps.

**Imports pattern (lines 16-30):**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
```

**Type export pattern (lines 32-35) — REUSE, do NOT duplicate:**
```typescript
// Single-line union for grep-friendly acceptance gate (Plan 03-04 Task 01).
export type RejectReasonCode = 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other';

const REJECT_CODES: RejectReasonCode[] = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];
```
**ArchiveListingModal:** Import `RejectReasonCode` from `RejectListingModal` (NO new union — same 4 codes per CONTEXT.md `<specifics>`). Or duplicate as `ArchiveReasonCode` if planner prefers symmetry over reuse.

**Props interface (lines 37-42):**
```typescript
interface RejectListingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: { reasonCode: RejectReasonCode; reasonNote?: string }) => Promise<void>;
  submitting?: boolean;
}
```
**Fork:** `interface ArchiveListingModalProps` — same 4 props, same shapes.

**Modal body pattern (lines 71-171) — copy verbatim:**
```typescript
return (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('moderation.reject.modalTitle')}                  {/* ← FORK: t('moderation.archive.modalTitle') */}
          </Text>
          <View style={styles.codesGroup}>
            {REJECT_CODES.map((code) => {
              const selected = rejectCode === code;
              const selectedTextColor = isDark ? '#121212' : '#FFFFFF';   // ← Pitfall 7: do NOT drop this line
              return (
                <TouchableOpacity key={code} onPress={() => setRejectCode(code)} disabled={submitting}
                  style={[styles.codeChip, {
                    backgroundColor: selected ? colors.primary : colors.inputBackground,
                    borderColor: selected ? colors.primary : colors.border,
                  }]} activeOpacity={0.7}>
                  <Text style={[styles.codeChipText, { color: selected ? selectedTextColor : colors.text }]}>
                    {t(`moderation.reject.reason.${code}` as any)}    {/* ← REUSE: same chip-label keys per <specifics> */}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('moderation.reject.notePlaceholder')}     {/* ← REUSE OR fork (planner picks per D-08) */}
            placeholderTextColor={colors.textSecondary}
            multiline numberOfLines={3} maxLength={500}
            value={rejectNote} onChangeText={setRejectNote} editable={!submitting} />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.inputBackground }]}
              onPress={onClose} disabled={submitting} activeOpacity={0.7}>
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.error }]}
              onPress={handleSubmit} disabled={submitting} activeOpacity={0.7}>
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFF' }]}>
                  {t('moderation.reject.submit')}                {/* ← FORK: t('moderation.archive.submit') */}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>
);
```

**Styles pattern (lines 174-207):** Copy verbatim. No diff needed.

**Diff summary from analog (3 changes):**

| Line in analog | Change | Why |
|----------------|--------|-----|
| 85: `t('moderation.reject.modalTitle')` | → `t('moderation.archive.modalTitle')` | D-08 new locale key |
| 162: `t('moderation.reject.submit')` | → `t('moderation.archive.submit')` | D-08 new locale key |
| 131: `t('moderation.reject.notePlaceholder')` | REUSE OR fork to `t('moderation.archive.notePlaceholder')` | planner discretion per D-08 |

**Critical Pitfall 7:** Preserve line 94 `selectedTextColor = isDark ? '#121212' : '#FFFFFF'` — chip selected-state contrast logic; refactoring here breaks dark mode.

---

### 9. Client `useRole.ts` Action union + canFromUser switch (D-16)

**Analog:** `src/hooks/useRole.ts:14-23,75-98` (existing union + switch — modify in place).

**Existing union (lines 14-23):**
```typescript
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue';
```

**Phase 4 D-16 diff (add 3 members at end):**
```typescript
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue'
+ | 'archiveOwnListing'                  // ARCH-05 — any authenticated user; backend gates ownership
+ | 'archiveAnyListing'                  // ARCH-05 — moderator + admin; backend requireMinRole('moderator')
+ | 'hardDeleteListing';                 // ARCH-05 — admin only; backend requireMinRole('admin')
```

**Existing switch (lines 75-98):**
```typescript
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
    case 'reviewLandlordApplications':
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
    case 'viewModerationQueue':
      return role === 'admin' || role === 'moderator';
    case 'manageListings':
      if (role === 'admin' || role === 'moderator') return true;
      if (role === 'user') return user?.backendProfile?.canListProperties === true;
      return false;
  }
}
```

**Phase 4 D-16 diff (3 cases — fall-through `admin`/`mod+admin` lines and one new explicit case):**
```typescript
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
    case 'reviewLandlordApplications':
+   case 'hardDeleteListing':                 // admin only — fall-through to admin block
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
    case 'viewModerationQueue':
+   case 'archiveAnyListing':                 // moderator + admin — fall-through
      return role === 'admin' || role === 'moderator';
+   case 'archiveOwnListing':
+     // any authenticated user with backendProfile (D-16). Belt-and-suspenders only —
+     // backend's per-route ownership check (req.user.uid === property.ownerUid) is
+     // the authoritative gate.
+     return role !== 'guest' && !!user?.backendProfile;
    case 'manageListings':
      if (role === 'admin' || role === 'moderator') return true;
      if (role === 'user') return user?.backendProfile?.canListProperties === true;
      return false;
  }
}
```

**Pattern:** Pure function additive switch case extension. No new tests fail; existing tests still pass; Phase 4 ADDS 3-6 new test rows for the new Actions.

---

### 10. Client `PropertyService` — rewrite + 3 new methods

**Analog:** `src/services/PropertyService.ts:344-358` (`approveListing`) + `:364-383` (`rejectListing`) — Phase 3 method shape with belt-and-suspenders `canFromUser` guard + `apiClient.post` + 409 bubble-up.

**Existing approveListing (lines 344-358) — pattern to mirror:**
```typescript
approveListing: async (propertyId: string): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'approveListings')) {
      console.error('[PropertyService.approveListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.post(`/moderation/properties/${propertyId}/approve`);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error approving listing:', error?.message);
    throw error;
  }
},
```

**Existing rejectListing (lines 364-383) — pattern for `archiveAnyListing(id, reasonCode, reasonNote?)`:**
```typescript
rejectListing: async (
  propertyId: string,
  reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
  reasonNote?: string,
): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'approveListings')) {
      console.error('[PropertyService.rejectListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const body: any = { reasonCode };
    if (reasonNote && reasonNote.trim()) body.reasonNote = reasonNote.trim();
    const response = await apiClient.post(`/moderation/properties/${propertyId}/reject`, body);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error rejecting listing:', error?.message);
    throw error;
  }
},
```

**Existing broken stubs to REWRITE/REPLACE (lines 217-264):**
- `archiveProperty(id)` — currently writes `body.status: 'archived'` via PUT; broken because Phase 2 D-22 sanitizer strips this. **REWRITE OR DEPRECATE.**
- `unarchiveProperty(id)` — currently writes `body.status: 'draft'` via PUT; broken (no `'draft'` enum value). **REWRITE OR DEPRECATE.**
- `deleteProperty(id)` (lines 266-286) — calls `apiClient.delete('/properties/:id')` correctly. Path stays per D-04; only the BACKEND middleware tightens. Client-side: keep working OR rename to `hardDeleteListing` for Action union symmetry.

**Phase 4 D-Claude-Discretion recommended new method shapes (4 methods):**

```typescript
// REPLACE archiveProperty (lines 217-240) with:
archiveOwnListing: async (propertyId: string): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'archiveOwnListing')) {
      console.error('[PropertyService.archiveOwnListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.post(`/properties/${propertyId}/archive`);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error owner-archiving listing:', error?.message);
    throw error;
  }
},

// NEW — mirrors rejectListing shape (lines 364-383)
archiveAnyListing: async (
  propertyId: string,
  reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
  reasonNote?: string,
): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'archiveAnyListing')) {
      console.error('[PropertyService.archiveAnyListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const body: any = { reasonCode };
    if (reasonNote && reasonNote.trim()) body.reasonNote = reasonNote.trim();
    const response = await apiClient.post(`/moderation/properties/${propertyId}/archive`, body);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error mod-archiving listing:', error?.message);
    throw error;
  }
},

// REPLACE unarchiveProperty (lines 243-264) with:
restoreListing: async (propertyId: string): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    // Restore piggybacks on archive Actions per D-16 (no separate restoreOwnListing/restoreAnyListing).
    // Caller knows their context and picks the right URL — owner→/properties/:id/unarchive, mod→/moderation/properties/:id/restore.
    // Recommended impl per D-Claude-Discretion: split-route by role at call time (single method, role-aware URL).
    const isMod = canFromUser(userData, 'archiveAnyListing');
    const url = isMod
      ? `/moderation/properties/${propertyId}/restore`
      : `/properties/${propertyId}/unarchive`;
    if (!isMod && !canFromUser(userData, 'archiveOwnListing')) {
      console.error('[PropertyService.restoreListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.post(url);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error restoring listing:', error?.message);
    throw error;
  }
},

// RENAME deleteProperty (lines 266-286) — keep apiClient.delete path unchanged per D-04
hardDeleteListing: async (propertyId: string): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'hardDeleteListing')) {
      console.error('[PropertyService.hardDeleteListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.delete(`/properties/${propertyId}`, {
      data: { firebaseUid: userData?.localId },     // Legacy body field — see createProperty note
    });
    return response.data;
  } catch (error: any) {
    console.error('Error hard-deleting listing:', error?.message);
    if (error.response?.data?.message) throw new Error(error.response.data.message);
    throw error;
  }
},
```

**Belt-and-suspenders pattern preserved:** Every Phase 4 PropertyService method uses `canFromUser(userData, '<Action>')` guard before HTTP call (Phase 1 ROLE-12 + Phase 3 PATTERN §A precedent).

---

### 11. Client `RenterListingsScreen.tsx` — handler rewires + strip + re-mount (D-09 + D-10 + D-11 + D-14)

**Analog:** `src/screens/RenterListingsScreen.tsx:111-197,313-321,368-376` — modify in place.

**Existing `handleDeleteProperty` + `confirmDelete` (lines 111-134) — STRIP entirely per D-10 + D-14:**
```typescript
// DELETE THESE LINES (111-134):
const handleDeleteProperty = (property: Property) => {
  setPropertyToDelete(property);
  setDeleteModalVisible(true);
};

const confirmDelete = async () => {
  if (!propertyToDelete?.id) return;
  try {
    await PropertyService.deleteProperty(propertyToDelete.id);
    setProperties(properties.filter(p => p.id !== propertyToDelete.id));
    setDeleteModalVisible(false);
    setPropertyToDelete(null);
    onListingMutated?.();
    Alert.alert(t('common.success'), t('property.permanentlyDeletedToast'));
  } catch (error: any) { /* ... */ }
};
```

**Pitfall 6 mitigation:** Strip MUST be atomic — same commit removes the handlers AND the state hooks (`propertyToDelete`, `deleteModalVisible`) AND the JSX modal mount (lines 368-376) AND the `onDelete` prop on `<PropertyCard>` (line 319) AND the `onDelete` prop on `<HospitalitySection>` (line 359). Plan-time grep:
```bash
grep -n "handleDeleteProperty\|propertyToDelete\|deleteModalVisible\|DeleteListingModal" src/screens/RenterListingsScreen.tsx
# After Phase 4 strip: must return 0 hits
```

**Existing `handleArchiveProperty` (lines 141-167) — REWIRE per D-09 (single-line change):**
```typescript
// CURRENT (line 153):
await PropertyService.archiveProperty(property.id!);

// PHASE 4 D-09:
await PropertyService.archiveOwnListing(property.id!);
```

**Existing `handleUnarchiveProperty` (lines 171-197) — REWIRE per D-12 (single-line change + locale rewrite already invoked via existing `t()` calls):**
```typescript
// CURRENT (line 183):
await PropertyService.unarchiveProperty(property.id!);

// PHASE 4 D-12:
await PropertyService.restoreListing(property.id!);
```
(The optimistic state update at lines 184-186 already correctly maps `'pending' as const` — no diff needed there.)

**Existing PropertyCard mount (lines 313-321) — STRIP `onDelete`, ADD `onArchive`, ADD `onUnarchive` per D-11 + D-13 conditional gate:**
```typescript
// CURRENT (lines 313-321):
<PropertyCard
  property={item}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onViewVideo={handleViewVideo}
  onEdit={onEditProperty}
  onDelete={handleDeleteProperty}    // ← STRIP per D-14
  showEditButton={true}
/>

// PHASE 4:
<PropertyCard
  property={item}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onViewVideo={handleViewVideo}
  onEdit={onEditProperty}
  onArchive={handleArchiveProperty}                                     // ← re-mount per D-09 + D-11
  onUnarchive={canSelfRestore(item) ? handleUnarchiveProperty : undefined}  // ← D-13 conditional gate (Pitfall 4)
  // NO onDelete — owner delete removed per D-14
  showEditButton={true}
/>
```

**Pitfall 4 mitigation — `canSelfRestore` helper:**
```typescript
// Add near top of component, after other helper hooks/derivations:
const { user } = useAuth();   // already imported in source — verify
const canSelfRestore = (p: Property): boolean =>
  p.archivedByUid != null && p.archivedByUid === user?.localId;
```
**Type prerequisite:** `Property.archivedByUid` field must be added to `src/types/Property.ts` (currently only `submittedAt`, `rejectionReasonCode`, `rejectionReasonNote` are present in lines 65-79). Phase 4 type extension diff:
```typescript
// src/types/Property.ts — add to PropertyMeta block (after rejectionReasonNote at line 79):
archivedAt?: string;
archivedByUid?: string | null;
archivedReasonCode?: string | null;
archivedReasonNote?: string | null;
```

**Existing HospitalitySection mount (lines 354-361) — STRIP `onDelete`, ADD `onArchive`, ADD `onUnarchive`:**
```typescript
// CURRENT:
<HospitalitySection
  properties={hospitalityProperties}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onEdit={onEditProperty}
  onDelete={handleDeleteProperty}    // ← STRIP per D-14
  showEditButton={true}
/>

// PHASE 4 (HospitalitySection prop signature already supports onArchive/onUnarchive per HospitalitySection.tsx:34-35):
<HospitalitySection
  properties={hospitalityProperties}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onEdit={onEditProperty}
  onArchive={handleArchiveProperty}
  // NB: HospitalityCard at line 88-91 of HospitalitySection passes onArchive/onUnarchive through to HospitalityCard;
  // verify HospitalityCard's archived-state branch shows the unarchive button (likely identical to PropertyCard pattern)
  showEditButton={true}
/>
```
*Note:* Within HospitalitySection's archived-tab strip, `onUnarchive` would also need the `canSelfRestore` gating per item — recommend computing per-item inside the `renderItem` of the parent FlatList, NOT at the HospitalitySection level (which is presentational and shouldn't know about uid). Planner picks: pass `onUnarchive={handleUnarchiveProperty}` unconditionally and let HospitalityCard short-circuit with a `property.archivedByUid` check, OR pass a `getCanRestore` function prop. Recommend the simpler unconditional + per-item check pattern OR defer the Hospitality-archived case (low traffic surface) per D-Claude-Discretion.

**Net LOC impact (estimate):** -10 to -25 LOC (strip handlers + state + modal mount; add archive/unarchive props back). Net well below RenterListingsScreen's 463 baseline.

---

### 12. Client `PropertyDetailsScreen.tsx` — mod footer extension + DeletePropertyModal mount (D-06 + D-10)

**Analog:** `src/screens/PropertyDetailsScreen.tsx:268-356` (Phase 3 mod footer state + handlers) + `:1316-1390` (Phase 3 mod footer JSX + RejectListingModal sibling) + `:2106-2130` (mod footer styles).

**Existing state cluster (lines 272-274):**
```typescript
const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
const [submittingAction, setSubmittingAction] = useState(false);
const showModFooter = can('approveListings') && property.status === 'pending';
```

**Phase 4 D-06 state cluster additions (parallel pattern):**
```typescript
+ const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
+ const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
// New render predicates:
+ const showArchiveBtn = can('archiveAnyListing') && property.status !== 'archived';
+ const showRestoreBtn = can('archiveAnyListing') && property.status === 'archived';
+ const showHardDeleteBtn = can('hardDeleteListing');     // admin-only; backend HARD_DELETE_REQUIRES_ARCHIVED still gates by status
```

**Existing handler shapes (lines 299-352):**
- `handleApprove` (lines 299-330) → Alert.alert confirm → service call → 409 race-conflict path → refetchProperty
- `handleRejectSubmit` (lines 332-352) → service call from modal's `onSubmit` → 409 race path → refetchProperty

**Phase 4 D-06 new handlers (mirror existing shapes):**
```typescript
// MIRROR handleApprove (lines 299-330):
const handleModArchiveSubmit = async (params: { reasonCode: any; reasonNote?: string }) => {
  if (!property.id) return;
  setSubmittingAction(true);
  try {
    await PropertyService.archiveAnyListing(property.id, params.reasonCode, params.reasonNote);
    setIsArchiveModalOpen(false);
    await refetchProperty();
  } catch (err: any) {
    if (err?.response?.status === 409) { await handleRaceConflict(); return; }
    Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
  } finally { setSubmittingAction(false); }
};

// MIRROR handleApprove (Alert.alert flow):
const handleRestore = () => {
  Alert.alert(
    t('property.unarchiveDialogTitle'),         // value rewritten per D-12 — but key name preserved
    t('property.unarchiveDialogMessage'),       // value rewritten per D-12
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('property.unarchiveConfirm'),
        onPress: async () => {
          if (!property.id) return;
          setSubmittingAction(true);
          try {
            await PropertyService.restoreListing(property.id);
            await refetchProperty();
          } catch (err: any) {
            if (err?.response?.status === 409) { await handleRaceConflict(); return; }
            Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
          } finally { setSubmittingAction(false); }
        },
      },
    ],
  );
};

// HARD DELETE — opens DeleteListingModal which calls confirmHardDelete on Confirm
const confirmHardDelete = async () => {
  if (!property.id) return;
  setSubmittingAction(true);
  try {
    await PropertyService.hardDeleteListing(property.id);
    setIsHardDeleteModalOpen(false);
    Alert.alert(t('common.success'), t('property.permanentlyDeletedToast'));
    if (onRefreshProperty) await onRefreshProperty();
    // Caller is expected to pop the navigation state since the listing no longer exists.
  } catch (err: any) {
    Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
  } finally { setSubmittingAction(false); }
};
```

**Existing footer JSX (lines 1316-1376) — extend with new buttons (D-06 explicit: pending listings see BOTH the existing 3-button row AND the new Archive button):**

Recommendation per D-Claude-Discretion (visual treatment): TWO `modActionFooter` rows. Row 1 = existing Approve/Reject/Edit-on-behalf (already shipped). Row 2 = Archive | Restore | HardDelete (Phase 4) — render conditionally on each button's predicate.

**Existing styles (lines 2106-2130) — REUSE verbatim for new buttons:**
```typescript
modActionFooter: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 12, borderTopWidth: 1 },
modActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  paddingVertical: 12, borderRadius: 10, gap: 6 },
modActionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600', lineHeight: 20 },
```

**Phase 4 footer extension shape (insert after line 1376, before the existing RejectListingModal mount at 1382):**
```tsx
{(showArchiveBtn || showRestoreBtn || showHardDeleteBtn) && (
  <View style={[styles.modActionFooter, {
    backgroundColor: colors.surface, borderTopColor: colors.border,
    paddingBottom: Math.max(insets.bottom, 12),
  }]}>
    {showArchiveBtn && (
      <TouchableOpacity
        style={[styles.modActionBtn, { backgroundColor: '#D97706' /* amber — archive convention from PropertyCard:469 */ }]}
        onPress={() => setIsArchiveModalOpen(true)}
        disabled={submittingAction} activeOpacity={0.7}>
        <Archive size={18} color="#FFF" />
        <Text style={styles.modActionBtnText}>{t('property.archive')}</Text>
      </TouchableOpacity>
    )}
    {showRestoreBtn && (
      <TouchableOpacity
        style={[styles.modActionBtn, { backgroundColor: '#059669' /* emerald — restorative convention from PropertyCard:480 */ }]}
        onPress={handleRestore}
        disabled={submittingAction} activeOpacity={0.7}>
        <ArchiveRestore size={18} color="#FFF" />
        <Text style={styles.modActionBtnText}>{t('property.unarchive')}</Text>
      </TouchableOpacity>
    )}
    {showHardDeleteBtn && (
      <TouchableOpacity
        style={[styles.modActionBtn, { backgroundColor: colors.error }]}
        onPress={() => setIsHardDeleteModalOpen(true)}
        disabled={submittingAction} activeOpacity={0.7}>
        <Trash2 size={18} color="#FFF" />
        <Text style={styles.modActionBtnText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    )}
  </View>
)}

{/* Modal siblings (sister to existing RejectListingModal at line 1382): */}
<ArchiveListingModal
  visible={isArchiveModalOpen}
  onClose={() => setIsArchiveModalOpen(false)}
  onSubmit={handleModArchiveSubmit}
  submitting={submittingAction}
/>
<DeleteListingModal
  visible={isHardDeleteModalOpen}
  onClose={() => setIsHardDeleteModalOpen(false)}
  onConfirm={confirmHardDelete}
  property={property}
/>
```

**Imports to add at top of PropertyDetailsScreen.tsx:**
```typescript
import ArchiveListingModal from '../components/ArchiveListingModal';
import { DeleteListingModal } from '../components/DeleteListingModal';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react-native';   // verify already imported; if Archive/ArchiveRestore exist in PropertyCard imports, mirror
```

**Net LOC impact:** +50-80 LOC. Acceptable on the 2131-LOC baseline (no soft cap exists for this screen).

---

### 13. Client locales — `en.ts` + `ru.ts` (D-08 new keys + D-12 value rewrites + D-17 optional)

**Analog:** `src/locales/en.ts:160-172` (existing archive keys) + `:597-604` (existing reject keys) — value rewrite + new key additive.

**Existing keys to REWRITE VALUES (D-12 — preserve key NAMES per Pitfall 3):**

| Key | EN current | EN Phase 4 | RU current | RU Phase 4 |
|-----|-----------|-----------|-----------|-----------|
| `property.unarchiveDialogTitle` | "Unarchive Listing" | "Restore Listing" | (existing) | «Восстановить объявление» |
| `property.unarchiveDialogMessage` | "Restore this listing to Drafts? You'll need to re-publish it from the edit screen before it shows up in search again." | "Restore this listing? It will go back to the moderation queue for review before becoming public again." | (existing) | «Восстановить это объявление? Оно вернётся в очередь модерации для проверки перед публикацией.» |
| `property.unarchiveConfirm` | "Unarchive" | "Restore" | (existing) | «Восстановить» |
| `property.unarchivedToastTitle` | "Listing moved to Drafts" | "Listing sent to moderation" | (existing) | «Объявление отправлено на модерацию» |
| `property.unarchivedToastMessage` | "Open the listing and tap Edit to publish it when ready." | "It will appear publicly once a moderator approves it." | (existing) | «Оно появится публично после одобрения модератором.» |

**Pitfall 3 verification:** After D-12 commit, run:
```bash
grep "moderation queue for review" src/locales/en.ts            # MUST match unarchiveDialogMessage
grep "очередь модерации для проверки" src/locales/ru.ts          # MUST match unarchiveDialogMessage RU
grep "moderator approves" src/locales/en.ts                       # MUST match unarchivedToastMessage
```
The bash i18n parity gate (`scripts/check-i18n-parity.sh`) only checks key NAMES — value drift is invisible to it. Plan-checker MUST grep VALUES.

**New keys to ADD (D-08 — 4 keys × 2 locales = 8 strings):**
```typescript
// src/locales/en.ts — add to moderation block (around line 597-604):
'moderation.archive.modalTitle': 'Archive Listing',
'moderation.archive.submit': 'Archive',
'moderation.archive.success': 'Listing archived',         // optional — planner picks if a separate success toast is wanted vs reusing property.archivedToastTitle
'moderation.archive.failure': 'Failed to archive listing. Please try again.',  // optional — planner picks if a separate error key vs reusing property.archiveErrorMessage

// src/locales/ru.ts — same keys, RU values:
'moderation.archive.modalTitle': 'Архивировать объявление',
'moderation.archive.submit': 'В архив',
'moderation.archive.success': 'Объявление архивировано',
'moderation.archive.failure': 'Не удалось архивировать объявление. Повторите попытку.',
```
**Note:** D-08 says 4 keys; planner can collapse to 2 (`modalTitle` + `submit`) if no new success/failure copy is required (existing `property.archive*` keys cover the toast/error surface). Recommend 2 keys minimum (modalTitle + submit) to satisfy the modal copy mandate; optional 2 more for distinct mod-archive toast copy.

**Optional D-17 race-toast key (planner discretion — D-Claude-Discretion item):**
```typescript
'moderation.race.archive.toast': 'This listing was already archived.',          // EN
'moderation.race.archive.toast': 'Это объявление уже архивировано.',             // RU
```
OR reuse existing `moderation.race.toast` for the archive race surface (Phase 3 precedent).

**D-10 hard-delete admin warning copy augmentation (D-Claude-Discretion):**

Recommended approach: prepend a 1-line warning to the existing `property.deleteDialogMessage` (planner picks key — current `DeleteListingModal` uses inline literals at lines 70-73 NOT i18n keys; refactor the modal to use `t('property.deleteDialogMessage')` + a new `t('property.deleteDialogAuditWarning')` line OR keep inline and accept the existing copy gap).

```typescript
// EN: prepend audit warning
'property.deleteDialogTitle': 'Delete Listing',
'property.deleteDialogMessage': 'Are you sure you want to delete this listing? PERMANENT — this action will be recorded in the audit log.',
// RU
'property.deleteDialogTitle': 'Удалить объявление',
'property.deleteDialogMessage': 'Вы уверены, что хотите удалить это объявление? БЕЗВОЗВРАТНО — это действие будет записано в журнал аудита.',
```
*Note:* `DeleteListingModal.tsx:70-73` currently uses HARDCODED English strings. Phase 4 D-10 likely needs to migrate these to `t()` calls (small but real refactor — planner picks scope).

---

## Shared Patterns

### A. Authentication (server-side belt)
**Source:** `JayTap-services/src/middleware/verifyFirebaseToken.js` (Phase 1 ROLE-04)
**Apply to:** ALL Phase 4 backend routes (mod-archive, mod-restore, owner-archive, owner-unarchive, hard-delete)
**Pattern:**
```javascript
// Per-route mount (propertyRoutes.js owner-archive/unarchive):
router.post('/:id/archive', verifyFirebaseToken, async (req, res) => { /* ... */ });

// Router-level mount (moderationRoutes.js inherits from line 50):
router.use(verifyFirebaseToken, requireMinRole('moderator'));   // every endpoint below inherits

// Hard-delete admin gate (D-04):
router.delete('/:id', verifyFirebaseToken, requireMinRole('admin'), async (req, res) => { /* ... */ });
```

### B. Authorization belt-and-suspenders (3 tiers)
**Source:** Phase 1 D-08 + Phase 2 D-02/D-07 + Phase 3 service-layer pattern
**Apply to:** All Phase 4 archive/restore/hard-delete actions
**Pattern:**
1. **Client UI gate:** `<Gated action="archiveAnyListing">` hides the button (UX layer, not security)
2. **Service guard:** `if (!canFromUser(userData, 'archiveAnyListing')) throw new PermissionDeniedError()` (defense in depth — service-layer guard, not authoritative)
3. **Backend gate:** `requireMinRole('moderator')` on the route — AUTHORITATIVE security boundary (returns 403 with `code: 'insufficient-role'`)

### C. Race-safety atomic state flip
**Source:** `JayTap-services/src/routes/moderationRoutes.js:90-94` (POST /approve race primitive)
**Apply to:** ALL Phase 4 status-changing routes (owner-archive, owner-unarchive, mod-archive, mod-restore)
**Pattern:**
```javascript
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: '<expected-current>', ...filter },     // status filter IS the lock primitive
  { $set: { status: '<target>', ...auditFields } },
  { new: true }
);
if (!result) {
  // Race lost OR precondition failed. Return 409 OR disambiguate per route.
  return res.status(409).json({ code: '<RACE_CODE>', message: '...' });
}
```
**409 codes used:** `'ALREADY_MODERATED'` (Phase 3 — recommend reuse for symmetry per D-17), `'ALREADY_ARCHIVED'` (Phase 4 — alternative for specificity), `'NOT_ARCHIVED'` / `'ALREADY_RESTORED'` (mod-restore), `'NOT_ORIGINAL_ARCHIVER'` (D-13 owner-restore 403).

### D. Audit-row write-after-update with orphan log
**Source:** `JayTap-services/src/routes/moderationRoutes.js:101-120` (POST /approve audit pattern)
**Apply to:** ALL Phase 4 status-changing routes + hard-delete
**Pattern:**
```javascript
try {
  await ModerationLog.create({
    actorUid: req.firebaseUid,                    // PATTERN §A — JWKS sub, NEVER req.body / req.headers
    action: '<verb>',                             // 'archive' | 'unarchive' | 'hard-delete' (per D-05 enum extension)
    targetType: 'property',
    targetId: result._id,
    before: <pre-update snapshot>,                // empty {} or via separate findById().lean() per Q5
    after: <post-update snapshot>,
    reasonCode,                                    // null for owner-archive; populated for mod-archive
    reasonNote,                                    // null OR trimmed string
    at: now,
  });
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',                // structured-log event name (Phase 3 D-10)
    action: '<verb>',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
  // Status flip is NOT rolled back — audit is forward-fit observability per D-18
}
```

### E. Anti-spoofing on `actorUid` (grep gate)
**Source:** Phase 3 PATTERNS §D + auto-memory `phase45-landlord-application-uid-mismatch-bug.md`
**Apply to:** ALL Phase 4 backend audit-row writes
**Invariant:** `actorUid` MUST come from `req.firebaseUid` (JWKS-verified token sub via `verifyFirebaseToken` middleware). NEVER from `req.body`, NEVER from `req.headers`.
**Phase-close grep gate:**
```bash
grep -rn "actorUid: req\.body\|actorUid: req\.headers" \
  /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes
# MUST return 0 hits
```

### F. ReasonCode validation (mod-archive only)
**Source:** `JayTap-services/src/routes/moderationRoutes.js:54,148-152` (`VALID_REJECT_CODES` const + body validation)
**Apply to:** Phase 4 mod-archive route only (owner-archive is no-reason per ARCH-01)
**Pattern:**
```javascript
const { reasonCode, reasonNote } = req.body;
if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) {
  return res.status(400).json({
    message: `reasonCode must be one of ${VALID_REJECT_CODES.join(', ')}`,
  });
}
const trimmedNote = (typeof reasonNote === 'string' && reasonNote.trim()) ? reasonNote.trim() : null;
```
**Single source of truth:** `VALID_REJECT_CODES` is exported from moderationRoutes.js:447 (`module.exports = { router, VALID_REJECT_CODES }`). Phase 4 mod-archive uses the same const — no new enum.

### G. Theme tokens — no hardcoded colors (with documented exceptions)
**Source:** CONVENTIONS.md + `RejectListingModal.tsx:50` (`useTheme()`) + `PropertyCard.tsx:469-490` (Platform.select shadow + amber/emerald semantic colors)
**Apply to:** All Phase 4 client UI surfaces
**Pattern:**
```typescript
const { colors, isDark } = useTheme();
// Standard usage:
<View style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
// Documented brownfield-reuse hex literals (acceptable per Phase 3 PATTERN A):
amber  = '#D97706'   // archive action (PropertyCard.tsx:469 + Phase 4 footer Archive button)
emerald = '#059669'  // restore action (PropertyCard.tsx:480 + Phase 4 footer Restore button)
red    = '#DC2626'   // reject/destructive (PropertyDetailsScreen.tsx:1349) OR `colors.error` (theme-driven)
contrast = isDark ? '#121212' : '#FFFFFF'   // chip selected-state contrast (RejectListingModal.tsx:94 — Pitfall 7)
```

### H. EN+RU bilingual parity (CI gate)
**Source:** `scripts/check-i18n-parity.sh` (28 LOC) + `src/locales/index.ts` `Record<TranslationKeys, string>` type
**Apply to:** All Phase 4 locale changes (D-08 new keys + D-12 value rewrites + D-17 optional)
**Discipline:**
1. Every new key lands in BOTH `en.ts` AND `ru.ts` in the SAME commit.
2. Every value rewrite lands in BOTH locales in the SAME commit (Pitfall 3 — bash gate doesn't catch value drift; tsc doesn't either).
3. Run `bash scripts/check-i18n-parity.sh` before every Phase 4 commit; expect `OK   #1: en.ts and ru.ts key sets are identical`.
4. Run targeted value-presence greps for D-12 rewrites (Pitfall 3 verification).

### I. Component presentational pattern (parent-owns-HTTP)
**Source:** `RejectListingModal.tsx:71-171` + `DeleteListingModal.tsx:60-...` + `PropertyCard.tsx:222-254`
**Apply to:** New `ArchiveListingModal` + reused `DeleteListingModal`
**Pattern:** Component renders UI + manages local form state; parent owns the HTTP call via the `onSubmit` / `onConfirm` prop. Service-layer `canFromUser` guard lives in the parent screen, NOT the modal.
```typescript
// Modal:
interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: { reasonCode; reasonNote? }) => Promise<void>;   // parent supplies
  submitting?: boolean;
}

// Parent (PropertyDetailsScreen):
const handleModArchiveSubmit = async ({ reasonCode, reasonNote }) => {
  await PropertyService.archiveAnyListing(property.id, reasonCode, reasonNote);   // service-layer canFromUser inside
  setIsArchiveModalOpen(false);
  await refetchProperty();
};
```

### J. App.tsx LOC budget (signal-not-block per PATTERN D)
**Source:** Phase 2 PITFALLS Pitfall 8 + Phase 3 PATTERN D + D-19 + auto-memory drift
**Apply to:** All Phase 4 plans
**Discipline:**
1. Lock baseline at plan time: `wc -l App.tsx` (currently 1191).
2. Phase 4 target: net-zero LOC delta (NO new `useState`, NO new `OVERLAY_FLAGS` entries, NO new back-handler branches in App.tsx).
3. Plan-time grep gate: `grep -n "useState\|OVERLAY_FLAGS\|handleBackPress" /Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx | wc -l` — must equal pre-Phase-4 baseline after each commit.
4. If drift sneaks in: signal-not-block; document in plan SUMMARY; queue M3 remediation candidates (`<ModerationQueueOverlayHost>` extraction + `useModerationQueueCount` hook from Phase 3 SUMMARY).

---

## No Analog Found

Files with NO close match in the codebase (planner should use RESEARCH.md patterns instead):

| File / Capability | Why no analog | Recommended source |
|-------------------|---------------|--------------------|
| (none) | All 12 Phase 4 files have strong analogs in either Phase 3 sibling code or the same file's existing patterns. | n/a |

**Strong analog quality across the board** — Phase 4 is mostly additive lift on Phase 2 (status field) + Phase 3 (mod-route patterns + audit collection). Every new file copies an existing pattern; every modified file extends an existing block.

---

## Forward-Compat Constraints / Anti-Pattern Grep Gates

| Gate | Command | Expected | Source |
|------|---------|----------|--------|
| `actorUid` anti-spoofing | `grep -rn "actorUid: req\.body\|actorUid: req\.headers" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes` | 0 hits | Phase 3 PATTERN §D + auto-memory |
| Phase 4 broken stub removal | `grep -n "PropertyService\.archiveProperty\|PropertyService\.unarchiveProperty\|PropertyService\.deleteProperty" src/screens/RenterListingsScreen.tsx src/screens/PropertyDetailsScreen.tsx` | 0 hits (replaced by archiveOwnListing / restoreListing / hardDeleteListing) | D-09 + D-10 + D-Claude-Discretion |
| RenterListingsScreen owner-delete strip | `grep -n "handleDeleteProperty\|propertyToDelete\|deleteModalVisible\|DeleteListingModal" src/screens/RenterListingsScreen.tsx` | 0 hits | D-10 + D-14 + Pitfall 6 |
| App.tsx state additions | `diff <(grep -c "useState\|OVERLAY_FLAGS" App.tsx@pre-phase-4) <(grep -c "useState\|OVERLAY_FLAGS" App.tsx@post-phase-4)` | identical | D-19 + Pitfall 5 |
| Locale parity (key set) | `bash scripts/check-i18n-parity.sh` | exit 0 | CONVENTIONS.md + Pitfall 3 |
| Locale value rewrite landed (D-12) | `grep "moderation queue for review" src/locales/en.ts && grep "очередь модерации для проверки" src/locales/ru.ts` | 1 match each | D-12 + Pitfall 3 |
| TypeScript baseline preserved | `npx tsc --noEmit` from `/Users/beckmaldinVL/development/mobileApps/JayTap` | 2 pre-existing ThemeContext errors only (no new errors) | Phase 3 SUMMARY |
| Race-safe filter on every status route | `grep -A2 "findOneAndUpdate" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/{property,moderation}Routes.js \| grep -c "status:"` | ≥ 4 (one per Phase 4 status-changing route) | C above + D-17 |
| Schema additive land (D-20) | `grep -c "archivedReason" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` | 2 (Code + Note) | D-20 + Pitfall 1 |
| ModerationLog enum extended (D-05) | `grep "enum:" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js \| grep -c "archive"` | 2 ('archive' + 'unarchive' — also 'hard-delete') | D-05 |

---

## Metadata

**Analog search scope:**
- Backend: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/`, `/src/models/`, `/src/middleware/`, `/src/__tests__/`
- Client: `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/`, `/src/screens/`, `/src/services/`, `/src/hooks/`, `/src/types/`, `/src/locales/`, `/scripts/`

**Files scanned (Read tool — no re-reads):** 11 files (RejectListingModal full, useRole full, PropertyCard ranges, RenterListingsScreen ranges, PropertyDetailsScreen ranges, HospitalitySection full, DeleteListingModal partial, PropertyService ranges, moderationRoutes ranges, propertyRoutes ranges, Property.js full, ModerationLog full)

**Files line-counted (Bash `wc -l`):** 11 files for baseline lock

**Pattern extraction date:** 2026-05-02

**Confidence:** HIGH — every Phase 4 file has at least one in-repo analog; Phase 3 mod-route patterns are line-for-line mirrorable; CONTEXT.md tensions (Pitfalls 1, 2, 4 + Open Questions Q1/Q2/Q3) are flagged with concrete recommendations.

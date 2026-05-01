# Phase 2: Listing Lifecycle Status Field Absorption — Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 19 (12 client + 7 backend)
**Analogs found:** 19 / 19 (every new file has a verified analog in repo)

## File Classification

### Backend repo — `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/`

| File | New / Modified | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/models/Property.js` | MODIFIED | mongoose schema | persistence | (self — extend in place) | n/a |
| `src/routes/propertyRoutes.js` | MODIFIED | express route handler | request-response (multi-verb CRUD) | (self — 4 route branches added) | n/a |
| `src/middleware/verifyFirebaseToken.js` | MODIFIED | auth middleware | request-response | (self — add `optionalAuth` + export `ROLE_RANK`) | n/a |
| `src/scripts/migrate-listings-m2.js` | NEW | one-shot mongo migration script | batch (CLI → DB) | `src/scripts/migrate-roles-m2.js` | exact (same shape, same args, same connectDB) |
| `src/__tests__/Property.test.js` | NEW | jest unit test | test | `src/__tests__/propertyRoutes.test.js` (setup only — no `Property.test.js` exists yet) | role-match |
| `src/__tests__/propertyRoutes.test.js` | MODIFIED (extend) | jest+supertest integration test | test | (self — add `describe('property status — Phase 2')` block) | n/a |
| `package.json` | MODIFIED | npm config | config | (self — add `migrate:listings-m2` script) | n/a |

### RN client repo — `/Users/beckmaldinVL/development/mobileApps/JayTap/`

| File | New / Modified | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/types/Property.ts` | MODIFIED | TypeScript type | n/a | (self — line 66 enum) | n/a |
| `src/services/PropertyService.ts` | MODIFIED | network service | request-response (axios) | (self — lines 76, 145, 242 status defaults) | n/a |
| `src/components/StatusPill.tsx` | NEW | presentational component | render-only | `src/components/RoleRefreshBanner.tsx` (color-token + `t()` pattern) + existing `PropertyCard.tsx` `statusBadge` styles (lines 302-313) | role-match (compose) |
| `src/components/RejectionBanner.tsx` | NEW | banner component (with CTA + dismiss) | event-driven (CTA + dismiss callbacks) | `src/components/LandlordApplicationStatusBanner.tsx` | exact (banner shell + accent stripe + body + chevron) |
| `src/components/HomeRejectionBanner.tsx` | NEW | banner component (tap-only, no dismiss) | event-driven (single tap) | `src/components/LandlordApplicationStatusBanner.tsx` | exact |
| `src/components/BannerShell.tsx` (OPTIONAL) | NEW (planner discretion) | shared banner primitive | render-only | `src/components/LandlordApplicationStatusBanner.tsx` lines 132-146 (extract reusable shell) | exact |
| `src/screens/RenterListingsScreen.tsx` | MODIFIED | screen (4-tab segmented + per-tab Hospitality + empty states) | request-response + client filter | (self for fetch path; HomeScreen lines 364-391 for segmented-control inline pattern) | role-match |
| `src/screens/HomeScreen.tsx` | MODIFIED | screen (banner mount + D-07 client filter) | request-response | (self — lines 109-119 fetch + 133-160 filter chain; new banner mounts inline) | n/a |
| `src/screens/FavoritesScreen.tsx` | MODIFIED | screen (D-07 client filter) | request-response | (self — lines 50-71 fetch) | n/a |
| `src/screens/PropertyDetailsScreen.tsx` | MODIFIED | screen (RejectionBanner mount + status pill) | render-only | (self — banner mounts above hero) | n/a |
| `src/screens/CreateListingScreen.tsx` | MODIFIED | screen (D-20 submit copy + D-15 edit-from-banner entry) | event-driven | (self — lines 800-821 submit button) | n/a |
| `src/components/PropertyCard.tsx` | MODIFIED | card component (StatusPill mount, top-left below rent badge per D-19) | render-only | (self — `topBadges` style line 294-298 is the new mount slot) | n/a |
| `src/context/AuthContext.tsx` | MODIFIED | context provider (AppState listener + cooldown) | event-driven (RN AppState) | (self — adds `useEffect` next to existing hook registration on line 217-219) | n/a |
| `src/locales/en.ts` + `src/locales/ru.ts` | MODIFIED | translation maps | render-only | (self — see lines 130-154 for `property.status*` keys to deprecate / extend) | n/a |
| `App.tsx` | MODIFIED (light) | nav state machine | event-driven | (self — lines 494, 889 are the existing RenterListings entry points; D-15 adds `defaultTab='rejected'` plumbing + new `onEditListing` from PropertyDetailsScreen banner) | n/a |

---

## Pattern Assignments

### 1. Backend — `src/scripts/migrate-listings-m2.js` (NEW)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m2.js`
**Role:** one-shot mongo migration script
**Data flow:** CLI → connectDB → updateMany (batch)

**Analog:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-roles-m2.js` (129 LOC, shipped to production 2026-04-30 with `--verify=PASS`)

**Imports / args / connect pattern (lines 15-31):**
```js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerify = args.includes('--verify');

async function main() {
  await connectDB();
  // ...
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**`--verify` branch pattern (lines 33-47):**
```js
if (isVerify) {
  const remainingLegacy = await User.countDocuments({
    userType: { $nin: ['user', 'moderator', 'admin'] },
  });
  console.log(`Records with non-canonical userType: ${remainingLegacy}`);
  if (remainingLegacy === 0) {
    console.log('VERIFY: PASS — ROLE-02 acceptance met');
    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.log('VERIFY: FAIL — run migration first');
    await mongoose.disconnect();
    process.exit(1);
  }
}
```

**Idempotent updateMany loop pattern (lines 49-67):**
```js
console.log(isDryRun ? '=== DRY RUN ===' : '=== MIGRATION ===');
const flips = [
  { from: 'renter', to: 'user' },
  { from: 'owner',  to: 'user' },
  { from: 'agent',  to: 'user' },
];
for (const { from, to } of flips) {
  const filter = { userType: from };
  const matched = await User.countDocuments(filter);
  console.log(`  ${from} -> ${to}: ${matched} records`);
  if (!isDryRun && matched > 0) {
    const result = await User.updateMany(filter, { $set: { userType: to } });
    console.log(`    updated: ${result.modifiedCount}`);
  }
}
```

**Post-migration verification + non-zero exit pattern (lines 92-119):**
```js
const remaining = await User.countDocuments({
  userType: { $nin: ['user', 'moderator', 'admin'] },
});
console.log(`\nPost-migration: ${remaining} records still at non-canonical userType.`);

if (!isDryRun) {
  if (remaining === 0) {
    console.log('ACCEPTANCE MET (ROLE-02): ...');
  } else {
    console.error(`MIGRATION INCOMPLETE: ${remaining} records still at non-canonical userType`);
    await mongoose.disconnect();
    process.exit(1);
  }
} else {
  console.log('(dry-run — would meet acceptance after running without --dry-run)');
}

await mongoose.disconnect();
process.exit(0);
```

**Key differences executor must apply:**
- Replace `User` model with `Property` model: `const Property = require('../models/Property');`
- Verify filter (D-03): `{status: {$nin: ['pending','live','rejected','archived']}}` — log header should read "Records with non-canonical status".
- Two flips per D-04: `{ from: { status: 'draft' }, to: { status: 'pending' } }` and `{ from: { status: { $exists: false } }, to: { status: 'live' } }`. Note: `from`/`to` are now full filter/$set objects (not enum strings) since one flip is `$exists`-based — the iterator pattern must match RESEARCH.md Section "Topic 2 / Idempotent migration step" (lines 928-941).
- No equivalent of "Step 2: M1 admin promotion" — Phase 2 has no analog promotion step. Skip.
- Acceptance message text: "ACCEPTANCE MET (LISTING-LIFECYCLE-M2): db.properties.countDocuments({status:{$nin:[\"pending\",\"live\",\"rejected\",\"archived\"]}}) === 0".

---

### 2. Backend — `src/models/Property.js` (MODIFIED)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js`
**Role:** mongoose schema
**Data flow:** persistence
**Analog:** self (extend in place)

**Current state (line 35):**
```js
status: { type: String, enum: ['draft', 'pending', 'live', 'archived'], default: 'draft' }, // draft, pending (for review), live, archived (...)
```

**Target state (D-01 + D-18 + D-21):**
```js
// D-01: drop 'draft', add 'rejected'; D-18: single default 'pending' (legacy null absorbed by migration backfill + client `?? 'live'` coalesce)
status: { type: String, enum: ['pending', 'live', 'rejected', 'archived'], default: 'pending' },

// D-21: audit fields. Phase 2 only writes submittedAt (POST + edit-resubmit PUT auto-flip).
// Phase 3 writes approve/reject fields; Phase 4 writes archive fields.
submittedAt: { type: Date },
approvedAt: { type: Date, default: null },
approvedByUid: { type: String, default: null },
rejectedAt: { type: Date, default: null },
rejectedByUid: { type: String, default: null },
rejectionReasonCode: { type: String, default: null }, // No enum constraint in Phase 2 — Phase 3 adds it
rejectionReasonNote: { type: String, default: null },
archivedAt: { type: Date, default: null },
archivedByUid: { type: String, default: null },
```

**Key differences executor must apply:**
- Insert audit fields BEFORE the closing `}, { timestamps: true, ... });` block (around current line 56-62).
- Audit-field defaults are `null` (not `undefined`) so the JSON shape is consistent for Phase 3 banner reads (see RESEARCH.md Topic 6: `<RejectionBanner>` reads `rejectionReasonCode` — Phase 2 always returns null, Phase 3 fills it).
- Do NOT touch the existing `platformVerifications` block (CR-01 anti-tamper test guards it; see propertyRoutes.test.js).
- The schema diff is small but the deploy ORDER (CONTEXT.md derived deploy order) is load-bearing: migration `--verify=PASS` against production Mongo MUST land BEFORE this commit deploys, or any owner editing a legacy `'draft'` listing hits Mongoose validation 500 (PITFALL 2 in RESEARCH.md).

---

### 3. Backend — `src/middleware/verifyFirebaseToken.js` (MODIFIED — exports + new `optionalAuth`)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js`
**Role:** auth middleware
**Data flow:** request-response

**Existing `requireMinRole` pattern (lines 103-113):**
```js
const ROLE_RANK = { user: 0, moderator: 1, admin: 2 };

function requireMinRole(minRole) {
  return (req, res, next) => {
    const userType = (req.user && req.user.userType) || 'user';
    if (ROLE_RANK[userType] >= ROLE_RANK[minRole]) {
      return next();
    }
    return res.status(403).json({ code: 'insufficient-role', message: 'Insufficient permissions' });
  };
}
```

**Existing partial-auth pattern — `verifyTokenForUserCreation` (lines 127-154):**
```js
async function verifyTokenForUserCreation(req, res, next) {
  try {
    const authHeader = req.header('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!bearerToken) {
      return res.status(401).json({ code: 'missing-token', message: 'Authorization required' });
    }
    // ... jose.jwtVerify ...
  }
}

module.exports = { verifyFirebaseToken, requireMinRole, verifyTokenForUserCreation };
```

**Target additions for D-06:**

Add `optionalAuth` middleware (mirrors RESEARCH.md Topic 9 / Code Examples lines 913-923):
```js
async function optionalAuth(req, res, next) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();  // No auth header → continue as anonymous; req.user / req.firebaseUid stay undefined.
  }
  // Header present → fall through to full verification (404 if user missing, 401 if token bad).
  return verifyFirebaseToken(req, res, next);
}
```

Update the `module.exports` line to add both `optionalAuth` and `ROLE_RANK`:
```js
module.exports = { verifyFirebaseToken, requireMinRole, verifyTokenForUserCreation, optionalAuth, ROLE_RANK };
```

**Key differences executor must apply:**
- `optionalAuth` differs from `verifyTokenForUserCreation` in that the latter REQUIRES a Bearer (returns 401 if missing) and only attaches `req.firebaseUid + req.tokenEmail` (no Mongo lookup). `optionalAuth` is the inverse: it allows missing Bearer (continues as anonymous) BUT calls full `verifyFirebaseToken` (with Mongo lookup) if the Bearer is present. This is the third middleware variant.
- Export `ROLE_RANK` as a named export so `propertyRoutes.js` can compute `ROLE_RANK[req.user.userType] >= 1` for owner-OR-mod-or-admin checks (D-12, D-06). Keeping `requireMinRole` is fine but the inline computation is more flexible for the "owner-self OR mod+" branch.

---

### 4. Backend — `src/routes/propertyRoutes.js` (MODIFIED — 4 route branches)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js`
**Role:** express route handler
**Data flow:** request-response (multi-verb CRUD)
**Analog:** self (4 surgical edits)

**4.a. `GET /api/properties` (D-05 lock to live-only)**

Current (lines 41-75) — supports `?status=` query for non-canonical reads, including `?status=all`:
```js
// Get All Properties (public - no auth required)
// Default: only 'live' listings (and legacy without status field). Drafts and archived are hidden.
// Pass ?status=<draft|pending|live|archived|all> to override.
router.get('/', async (req, res) => {
  try {
    const status = req.query.status;
    let query = {};
    if (status === 'all') { query = {}; }
    else if (status) {
      query = { $or: [{ status: status }, { status: { $exists: false } }] };
    } else {
      query = { $or: [{ status: 'live' }, { status: { $exists: false } }] };
    }
    const properties = await Property.find(query);
    res.json(properties);
  } catch (error) { /* ... */ }
});
```

Target (RESEARCH.md Topic 3 lines 226-243):
```js
// D-05: live-only for everyone — no escape hatch.
// Phase 3 owns /api/moderation/* for mod+ access to non-live listings.
router.get('/', async (req, res) => {
  try {
    const query = { $or: [{ status: 'live' }, { status: { $exists: false } }] };
    const properties = await Property.find(query);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**Key differences:** drop the `?status=` query parameter ENTIRELY. The legacy comment "Pass ?status=<...> to override" is removed. No auth mounted (anonymous renters can still browse). Replace lines 41-75.

---

**4.b. `GET /api/properties/user/:firebaseUid` (D-12 owner-scoped role-aware fetch)**

Current (lines 78-87) — public, returns ALL statuses for any caller:
```js
router.get('/user/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const properties = await Property.find({ ownerUid: firebaseUid })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) { res.status(500).json({ message: error.message }); }
});
```

Target (RESEARCH.md Topic 3 lines 252-273):
```js
// D-12: owner-scoped fetch. Owner OR mod+ sees ALL statuses; others see live-only (defense in depth).
// Note: this route is consumed by BOTH OwnerListingsScreen (viewing OTHER owners) and RenterListingsScreen
// (viewing self listings). The role-aware branch handles both call sites.
router.get('/user/:firebaseUid', verifyFirebaseToken, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const isOwner = req.firebaseUid === firebaseUid;
    const isModPlus = req.user && ROLE_RANK[req.user.userType] >= 1;  // moderator or admin

    let query = { ownerUid: firebaseUid };
    if (!isOwner && !isModPlus) {
      query = {
        $and: [
          { ownerUid: firebaseUid },
          { $or: [{ status: 'live' }, { status: { $exists: false } }] }
        ]
      };
    }
    const properties = await Property.find(query).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

**Key differences:** mount `verifyFirebaseToken` (route now requires auth — anonymous calls 401). Add `ROLE_RANK` import: `const { verifyFirebaseToken, ROLE_RANK } = require('../middleware/verifyFirebaseToken');` at line 8. Replace lines 78-87.

---

**4.c. `GET /api/properties/:id` (D-06 deep-link 404 for non-owner-non-mod on non-live)**

Current (lines 300-329) — public, returns any listing in any status:
```js
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    // ... owner-population block ...
    res.json(property);
  } catch (error) { res.status(500).json({ message: error.message }); }
});
```

Target (RESEARCH.md Topic 3 lines 283-305):
```js
// D-06: non-live listings only visible to owner OR mod+. Non-owner-non-mod gets 404 (deep-link bypass closed).
// optionalAuth: anonymous renters can still deep-link to LIVE listings (req.user undefined → live-only branch).
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const status = property.status || 'live';  // D-02 sub-clause (c): legacy null → live
    if (status !== 'live') {
      const isOwner = req.firebaseUid && req.firebaseUid === property.ownerUid;
      const isModPlus = req.user && ROLE_RANK[req.user.userType] >= 1;
      if (!isOwner && !isModPlus) {
        return res.status(404).json({ message: 'Property not found' });
      }
    }

    // Existing owner-population block preserved (lines 305-323 in current file).
    if (property.ownerUid) {
      const User = require('../models/User');
      const owner = await User.findOne({ uid: property.ownerUid });
      if (owner) {
        const propertyObj = property.toObject();
        propertyObj.owner = {
          uid: property.ownerUid,
          email: owner.email,
          phone: owner.phone,
          whatsapp: owner.whatsapp,
          telegram: owner.telegram,
          firstName: owner.firstName,
          lastName: owner.lastName,
        };
        return res.json(propertyObj);
      }
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

**Key differences:** mount `optionalAuth` (NOT `verifyFirebaseToken` — anonymous deep-link sharing of live listings must keep working). Insert the status-gate BEFORE the owner-population block. Import update: `const { verifyFirebaseToken, ROLE_RANK, optionalAuth } = require('../middleware/verifyFirebaseToken');`. Replace lines 300-329.

---

**4.d. `PUT /api/properties/:id` (D-15 + D-22 rejected→pending auto-flip + body-status sanitizer)**

Current (lines 333-489) — owner ownership check at line 342-349; `updateData = { ...req.body }` at line 352; `Object.assign(property, updateData)` at line 481.

**Target insertion (RESEARCH.md Topic 3 lines 308-321 + D-22 amendment):**

Insert immediately after the existing ownership check (after line 349) and AFTER the platformVerifications sanitizer block (lines 358-378), but BEFORE the image/features/tours processing:

```js
// D-22: rejected→pending auto-flip on owner edit-resubmit.
// Conditions:
//   - listing's CURRENT status is 'rejected'
//   - caller is the owner (already gated by lines 342-349)
//   - caller did NOT explicitly set a status in their PUT body (sanitized below)
// Effect: atomically flip to pending + re-stamp submittedAt + clear rejection audit fields.
//
// D-22: PUT on 'archived' is rejected with 409 (archive lifecycle is Phase 4).
if (property.status === 'archived') {
  return res.status(409).json({
    code: 'ARCHIVED_READONLY',
    message: 'Archived listings cannot be edited. Restore via the archive flow first.',
  });
}

// Strip body-supplied 'status' for owners on this route. Status transitions are server-authoritative
// in Phase 2 (D-22 auto-flip is the only owner-driven transition; archive/approve/reject are not exposed
// here). This also prevents an owner from ?status=live'-bypassing moderation.
delete updateData.status;

if (property.status === 'rejected') {
  updateData.status = 'pending';
  updateData.submittedAt = new Date();           // FIFO re-queue stamp
  updateData.rejectionReasonCode = null;
  updateData.rejectionReasonNote = null;
  updateData.rejectedAt = null;
  updateData.rejectedByUid = null;
}
```

**Key differences:**
- The 409 on `'archived'` PUT closes a Phase 4 boundary cleanly — Phase 2 ships the schema enum (`'archived'` is now a legal value) but no archive UI; until Phase 4 ships, an archived listing is read-only.
- The `delete updateData.status` line is the body-status sanitizer per D-22. This is critical because `PropertyService.archiveProperty()` (`src/services/PropertyService.ts:222`) sends `formData.append('status', 'archived')` — Phase 2 hides the archive UI per RESEARCH.md Topic 8, but the sanitizer is the belt-and-suspenders defense if the legacy code path fires.
- Place this block AFTER the platformVerifications sanitizer (line 378) and BEFORE the `if (req.files && req.files.length > 0)` image block (line 381).

**4.e. POST `/api/properties` — D-01 + D-21 `submittedAt` write**

Current line 217:
```js
status: status || 'draft', // Default to draft
```

Target:
```js
// D-01: schema default ('pending') drives this; explicitly stamp submittedAt for FIFO ordering on Pending tab.
// (Do NOT pass status from body — schema default applies. The sanitizer in PUT handles the same concern there.)
submittedAt: new Date(),
// status omitted — schema default 'pending' applies
```

Remove the `status: status || 'draft'` line; the schema default per D-01 covers it. Add `submittedAt` to the propertyData object so D-09's "FIFO sort by submittedAt" on the Pending tab works on new submissions.

**4.f. DELETE — hard-delete guard update (RESEARCH.md A12)**

Line 509 currently allows hard-delete on `'archived'` OR `'draft'`:
```js
const isHardDeletable = status === 'archived' || status === 'draft';
```

Target (drop `'draft'` since it no longer exists; per A12 do NOT add `'rejected'` — rejected listings should be re-edited not deleted):
```js
const isHardDeletable = status === 'archived';
```

---

### 5. Backend — `src/__tests__/Property.test.js` (NEW)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js`
**Role:** jest unit test (schema-level)
**Data flow:** test
**Analog:** `src/__tests__/propertyRoutes.test.js` (setup pattern only — no `Property.test.js` exists today)

**Test infrastructure pattern (from propertyRoutes.test.js lines 22-49):**
```js
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
// ... AWS env vars (not strictly needed for unit-only tests, but harmless) ...

jest.mock('../config/firebase', () => { /* in-memory keypair */ });

const Property = require('../models/Property');

beforeEach(async () => {
  // mongodb-memory-server is wired in setup.js — Property.create works in-memory
});
```

**Recommended test cases (RESEARCH.md Topic 10 lines 337-345 + Validation Architecture):**
- `Property.create({ title, address, price, ownerUid })` (no status) → `status === 'pending'` (D-01 schema default).
- `Property.create({ ..., status: 'draft' })` → throws Mongoose ValidationError (enum cutover dropped 'draft').
- `Property.create({ ..., status: 'rejected' })` → succeeds (new enum value).
- `Property.create({ ..., status: 'live' })` → succeeds; `submittedAt`, `approvedAt`, `rejectedAt`, `rejectionReasonCode`, etc. all null/undefined (Phase 2 schema additive shape).
- `Property.findOne(...)` on a doc with no `status` field (simulating legacy) → returns property; `property.status` is undefined (no schema-level coalesce — D-18 retracted that path).

**Key differences executor must apply:**
- This is a UNIT test on the schema, not a route integration test — no `supertest`, no `makeApp()`, no `buildToken()`. Just `Property.create()` + assertions.
- Setup file (`src/__tests__/setup.js`) already wires mongodb-memory-server; no changes needed to the test infrastructure.

---

### 6. Backend — `src/__tests__/propertyRoutes.test.js` (MODIFIED — extend)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js`
**Role:** jest+supertest integration test
**Data flow:** test
**Analog:** self (extend with new `describe` block)

**Existing setup pattern (lines 51-65):**
```js
describe('propertyRoutes — CR-01 PUT /:id platformVerifications anti-tamper (T-1-02)', () => {
  let app;
  let property;

  beforeEach(async () => {
    app = makeApp();
    await User.create({ uid: 'owner-uid', email: 'owner@x.com', userType: 'user' });
    property = await Property.create({
      title: 'Test listing',
      address: '123 Test St',
      price: 1000,
      ownerUid: 'owner-uid',
    });
  });

  test("...", async () => {
    const token = await buildToken({ sub: 'owner-uid', role: 'user', kind: 'valid' });
    const res = await request(app)
      .put(`/api/properties/${property._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ /* body */ });
    expect(res.status).toBe(200);
  });
});
```

**Target additions — new `describe` block per RESEARCH.md Topic 10 (lines 711-725):**
```js
describe('propertyRoutes — Phase 2 status field absorption (D-05/D-06/D-12/D-15/D-22)', () => {
  let app;

  beforeEach(async () => {
    app = makeApp();
    await User.create({ uid: 'owner-uid', email: 'owner@x.com', userType: 'user' });
    await User.create({ uid: 'renter-uid', email: 'renter@x.com', userType: 'user' });
    await User.create({ uid: 'mod-uid', email: 'mod@x.com', userType: 'moderator' });
    await User.create({ uid: 'admin-uid', email: 'admin@x.com', userType: 'admin' });
    await Property.create({ title: 'Live', address: '1 St', price: 100, ownerUid: 'owner-uid', status: 'live' });
    await Property.create({ title: 'Pending', address: '2 St', price: 100, ownerUid: 'owner-uid', status: 'pending' });
    await Property.create({ title: 'Rejected', address: '3 St', price: 100, ownerUid: 'owner-uid', status: 'rejected' });
    await Property.create({ title: 'Archived', address: '4 St', price: 100, ownerUid: 'owner-uid', status: 'archived' });
    await Property.create({ title: 'Legacy', address: '5 St', price: 100, ownerUid: 'owner-uid' /* no status */ });
  });

  // D-05: GET /api/properties returns only live + legacy null
  test('GET / returns only status:live + legacy null rows (no draft/pending/rejected/archived for any caller)', async () => { /* ... */ });

  // D-06: GET /api/properties/:id 404 for non-owner-non-mod on non-live
  test('GET /:id 404 for anonymous on rejected listing', async () => { /* ... */ });
  test('GET /:id 200 for owner on own rejected listing', async () => { /* ... */ });
  test('GET /:id 200 for moderator on someone else\'s rejected listing', async () => { /* ... */ });
  test('GET /:id 404 for non-owner non-mod on rejected listing', async () => { /* ... */ });
  test('GET /:id 200 for anonymous on live listing (deep-link share-flow preserved)', async () => { /* ... */ });

  // D-12: GET /api/properties/user/:uid role-aware
  test('GET /user/:uid returns all 4 statuses for owner-self', async () => { /* ... */ });
  test('GET /user/:uid returns all 4 statuses for moderator', async () => { /* ... */ });
  test('GET /user/:uid returns only live + legacy for non-owner non-mod', async () => { /* ... */ });

  // D-15 + D-22: PUT /:id auto-flip on rejected listing
  test('PUT /:id by owner on rejected listing flips status to pending + re-stamps submittedAt + clears rejection fields', async () => { /* ... */ });
  test('PUT /:id by owner on live listing does NOT flip status', async () => { /* ... */ });
  test('PUT /:id by owner on pending listing does NOT flip status', async () => { /* ... */ });
  test('PUT /:id by owner on archived listing returns 409', async () => { /* ... */ });
  test('PUT /:id strips body-supplied status field (D-22 sanitizer)', async () => { /* ... */ });

  // D-01 / MOD-03: POST defaults to pending
  test('POST / lands new listing with status:pending and submittedAt set', async () => { /* ... */ });
});
```

**Key differences executor must apply:**
- Reuse the existing `buildToken({ sub, role, kind: 'valid' })` helper from `fixtures/jwks-tokens.js`. The `role` field is `'user' | 'moderator' | 'admin'` (post Phase 1 enum cutover).
- Place the new `describe` block AFTER the existing `describe('propertyRoutes — CR-01 ...')` block — do NOT modify the CR-01 block (it guards a separate anti-tamper invariant).
- Phase 1 retro lesson per memory `gsd-verifier-misses-regressions.md`: these route-level tests catch downstream surface breakage that goal-backward verifiers miss. Especially MOD-05 (D-06 404 guard) is the highest-value test — that's exactly the regression class missed in M2 Phase 1.

---

### 7. Backend — `package.json` (MODIFIED)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json`
**Role:** npm config
**Analog:** self (line 12)

**Current (line 12):**
```json
"migrate:roles-m2": "node src/scripts/migrate-roles-m2.js"
```

**Target — add immediately below:**
```json
"migrate:roles-m2": "node src/scripts/migrate-roles-m2.js",
"migrate:listings-m2": "node src/scripts/migrate-listings-m2.js"
```

No other package.json changes (Phase 2 introduces zero new dependencies per RESEARCH.md Standard Stack lines 767-768).

---

### 8. Client — `src/types/Property.ts` (MODIFIED)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts`
**Role:** TypeScript type
**Analog:** self (line 66)

**Current (lines 65-66):**
```ts
/** Listing publication state. 'draft' is the author's staging area; 'live' is user-visible; 'archived' is soft-deleted (hidden from browse, restorable to draft). */
status?: 'draft' | 'live' | 'archived';
```

**Target (D-01 enum cutover):**
```ts
/** Listing publication state. 4-state moderation lifecycle (M2):
 *   pending  — submitted, awaiting moderator review (default for new submissions)
 *   live     — approved and publicly browsable
 *   rejected — moderator rejected with a reasonCode/reasonNote (owner sees rejection banner)
 *   archived — soft-deleted (hidden from browse). Phase 4 reintroduces archive actions.
 * `status?:` (optional) is preserved during the cutover window — defensive `?? 'live'` coalesce
 * (D-07) at every read site absorbs any legacy null until backend migration completes.
 */
status?: 'pending' | 'live' | 'rejected' | 'archived';

// D-21: audit fields (Phase 2 schema addition; client may read submittedAt for FIFO sort
// on the Pending tab + rejectionReasonCode/Note for the RejectionBanner). Phase 3+ writes
// approve/reject/archive timestamps.
submittedAt?: string;
rejectionReasonCode?: string | null;
rejectionReasonNote?: string | null;
// (Other audit fields — approvedAt, rejectedAt, archivedAt, *ByUid — are Phase 3/4 reads;
// add as needed when Phase 3 surfaces them. Phase 2 doesn't render them.)
```

**Key differences executor must apply:**
- Keep `status?:` (optional) in Phase 2 — defensive coalesce `(p.status ?? 'live')` per D-07 needs the optional shape until production migration verification is observed (after which a follow-up phase can tighten to non-optional).
- Add `submittedAt`, `rejectionReasonCode`, `rejectionReasonNote` ONLY (the three Phase 2 reads). Other audit fields are Phase 3/4 writes — adding them now would tempt premature client surface area.

---

### 9. Client — `src/services/PropertyService.ts` (MODIFIED)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts`
**Role:** axios network service
**Data flow:** request-response
**Analog:** self (lines 76, 145, 242)

**Current status defaults (lines 76, 145):**
```ts
formData.append('status', propertyData.status || 'draft');
```

**Target:** REMOVE these two lines entirely. The backend schema default (`'pending'` per D-01) is now the source of truth for new submissions; the body-status sanitizer in PUT (per D-22) strips body-supplied status anyway, so sending it is wasted bytes and a contract-leakage risk.

**Current unarchive (line 242):**
```ts
formData.append('status', 'draft');
```

**Target:** Phase 2 hides the unarchive UI from RenterListingsScreen entirely (RESEARCH.md Topic 8). The `unarchiveProperty()` method stays in source (Phase 4 will reuse with corrected `'pending'` semantics) — but it is unreferenced after Phase 2. Consider adding a `// TODO(Phase 4): unarchive UI is hidden in Phase 2; this method's status:'draft' will fail post-D-01 enum cutover. Phase 4 redesigns to status:'pending'.` comment so future grep'ing is unambiguous.

**Key differences executor must apply:**
- Two lines deleted (76, 145) — the schema default + sanitizer cover the new-submission case.
- Line 242 stays for code-path symmetry but a comment flags it as Phase-4-redesign-target. Do NOT delete the method — Phase 4 needs the shape.

---

### 10. Client — `src/components/StatusPill.tsx` (NEW)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/StatusPill.tsx`
**Role:** presentational component
**Data flow:** render-only
**Analog:** `RoleRefreshBanner.tsx` (color-token + `t()` consumption pattern, 95 LOC)

**Imports + theme + locale pattern (RoleRefreshBanner lines 1-7):**
```tsx
import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
```

Note: `RoleRefreshBanner` uses the `t` import from `../locales` (top-level helper) because it has the `language` prop in scope; `StatusPill` is mounted inside `PropertyCard` which uses `useLanguage()` hook style (PropertyCard.tsx line 58: `const { t } = useLanguage();`). Mirror PropertyCard's `useLanguage()` style for consistency with the mount surface.

**Color-token + onWarning pattern (RoleRefreshBanner lines 64-82):**
```tsx
return (
  <TouchableOpacity
    style={[styles.banner, { backgroundColor: colors.warning }]}
    // ...
  >
    <Text style={[styles.text, { color: colors.onWarning }]}>
      {t(language, 'auth.roleChanged.banner')}
    </Text>
  </TouchableOpacity>
);
```

**StyleSheet pill geometry pattern (PropertyCard.tsx lines 302-313 — existing rent/sale `statusBadge`):**
```tsx
statusBadge: {
  backgroundColor: 'rgba(255,255,255,0.9)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
},
statusText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#333',
  letterSpacing: 0.5,
},
```

**Target component (UI-SPEC §"Pill geometry" lines 47-49 + RESEARCH.md Topic 5 lines 422-465):**
```tsx
import React from 'react';
import { Text, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface StatusPillProps {
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  /** Optional style override for absolute positioning by the parent (PropertyCard mounts at top-left below rent/sale badge per D-19). */
  style?: ViewStyle;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, style }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const effective = status ?? 'live'; // D-07 defensive coalesce
  if (effective === 'live') return null; // D-16: live = no pill

  const config = {
    pending:  { bg: colors.warning,      fg: colors.onWarning, key: 'listings.status.pending' as const },
    rejected: { bg: colors.error,        fg: '#FFFFFF',         key: 'listings.status.rejected' as const },
    archived: { bg: colors.textTertiary, fg: '#FFFFFF',         key: 'listings.status.archived' as const },
  }[effective];

  return (
    <View
      style={[styles.pill, { backgroundColor: config.bg }, style]}
      accessibilityLabel={t(config.key)}
    >
      <Text style={[styles.label, { color: config.fg }]}>{t(config.key)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,    // UI-SPEC: pill internal vertical padding
    paddingHorizontal: 8,  // UI-SPEC: pill internal horizontal padding
    borderRadius: 12,      // UI-SPEC: capsule radius
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,          // UI-SPEC: pill label size
    fontWeight: '600',     // UI-SPEC: 2-weights-max contract
    lineHeight: 14,        // UI-SPEC: pill line-height
  },
});
```

**Key differences executor must apply:**
- TS `Record<typeof effective, ...>` is awkward when one branch is unreachable — use the simpler 3-key map shown above (after the `if (effective === 'live') return null` early return, the type narrows to the other 3).
- The `style?:` prop lets PropertyCard handle absolute positioning (top-left below rent badge per D-19); StatusPill itself is layout-agnostic. This makes it reusable on PropertyDetailsScreen too if a future plan task needs it.
- Tokens verified to exist in `src/theme/colors.ts` lines 19-20, 41-42 (`warning`, `onWarning`) and lines 7, 29 (`textTertiary`) and lines 18, 40 (`error`).

---

### 11. Client — `src/components/RejectionBanner.tsx` (NEW)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RejectionBanner.tsx`
**Role:** banner component (per-listing dismiss + edit CTA)
**Data flow:** event-driven
**Analog:** `src/components/LandlordApplicationStatusBanner.tsx` (162 LOC, exact UI-SPEC contract shape)

**Banner shell pattern (LandlordApplicationStatusBanner lines 132-146):**
```tsx
return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
  >
    <View style={[styles.accentBar, { backgroundColor: accent }]} />
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>{body}</Text>
    </View>
    <ChevronRight size={18} color={colors.textSecondary} />
  </TouchableOpacity>
);
```

**StyleSheet pattern (LandlordApplicationStatusBanner lines 148-162):**
```tsx
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
```

**Locale interpolation pattern (LandlordApplicationStatusBanner lines 114-119, with `reasonCode` + free-text `reasonNote`):**
```tsx
case 'rejected':
  title = t('landlordApp.banner.rejectedTitle');
  body = state.reasonNote
    ? `${t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any)} — ${state.reasonNote}`
    : t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any);
  accent = '#DC2626';
  break;
```

**Target component shape (UI-SPEC §"`<RejectionBanner>`" + RESEARCH.md Topic 6):**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface RejectionBannerProps {
  reasonCode?: string | null;       // Phase-3-supplied; null in Phase 2
  reasonNote?: string | null;       // Free-text from moderator
  onEditResubmit: () => void;       // Parent navigates to CreateListingScreen edit mode (D-15)
  onDismiss: () => void;            // Per-session dismiss (D-13)
}

export const RejectionBanner: React.FC<RejectionBannerProps> = ({
  reasonCode,
  reasonNote,
  onEditResubmit,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Body composition: reasonNote takes precedence; otherwise the localized fallback with {reasonCode} interpolation.
  const codeLabel = reasonCode || 'incomplete-info'; // raw enum until Phase 3 supplies translation map
  const fallback = t('listings.rejection.bodyFallback' as any).replace('{reasonCode}', codeLabel);
  const body = reasonNote ? `${codeLabel} — ${reasonNote}` : fallback;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.accentBar, { backgroundColor: colors.error }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('listings.rejection.title' as any)}
          </Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={t('common.dismiss' as any)}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={3}>
          {body}
        </Text>
        <TouchableOpacity
          onPress={onEditResubmit}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.ctaText}>{t('listings.rejection.cta' as any)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12, paddingHorizontal: 16 }, // UI-SPEC: 12 vertical / 16 horizontal
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 20 }, // UI-SPEC: banner label 14/20/600
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 10 }, // UI-SPEC: body 13/18/400
  cta: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'stretch', alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
```

**Key differences executor must apply:**
- Replace the chevron icon (LandlordApplicationStatusBanner uses `<ChevronRight>`) with `<X>` for dismiss + a separate CTA button below body. The two banners diverge here intentionally per D-13 (dismiss + CTA) vs LandlordApplicationStatusBanner (single tap routes).
- Use `colors.error` for the accent stripe (D-19 + UI-SPEC §"Color"), NOT a hardcoded `'#DC2626'`. The analog uses literals because that banner predates the `colors.error` token convergence; this is the cleanup opportunity.
- `colors.accent` for the CTA background (UI-SPEC §"Color" 10% rule — accent is reserved for the Edit & resubmit CTA).
- Per-session dismiss state lives in PropertyDetailsScreen-local `useState<Set<string>>(new Set())` keyed by `property.id` (RESEARCH.md Topic 6 lines 511). Banner does NOT manage its own dismiss state — parent passes `onDismiss` and conditionally mounts the banner.

---

### 12. Client — `src/components/HomeRejectionBanner.tsx` (NEW)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/HomeRejectionBanner.tsx`
**Role:** banner component (tap-only, no dismiss)
**Data flow:** event-driven (single tap → route)
**Analog:** `src/components/LandlordApplicationStatusBanner.tsx` (closest match; whole-banner tappable + chevron)

**Pattern: full-banner TouchableOpacity + chevron (LandlordApplicationStatusBanner lines 132-145):**
```tsx
return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
  >
    <View style={[styles.accentBar, { backgroundColor: accent }]} />
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>{body}</Text>
    </View>
    <ChevronRight size={18} color={colors.textSecondary} />
  </TouchableOpacity>
);
```

**Pluralization pattern (existing project i18n — RESEARCH.md UI-SPEC line 162; singular + plural keys, no full Russian 3-form):**
```tsx
const key = count === 1 ? 'home.rejection.banner.singular' : 'home.rejection.banner.plural';
const text = t(key as any).replace('{N}', String(count));
```

The `t()` helper at `src/locales/index.ts:11-22` already supports `{key}` interpolation via the `params` arg:
```ts
return Object.entries(params).reduce(
  (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
  str
);
```

**Target component shape (UI-SPEC §"`<HomeRejectionBanner>`"):**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HomeRejectionBannerProps {
  count: number;
  onPress: () => void; // Parent routes to RenterListings → Rejected tab via defaultTab='rejected'
}

export const HomeRejectionBanner: React.FC<HomeRejectionBannerProps> = ({ count, onPress }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (count <= 0) return null; // Auto-dismiss when zero rejected (D-14)

  const key = count === 1
    ? 'home.rejection.banner.singular'
    : 'home.rejection.banner.plural';
  const body = (t(key as any) as string).replace('{N}', String(count));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.error }]} />
      <View style={styles.body}>
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>{body}</Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12, paddingHorizontal: 16 },
  text: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
```

**Key differences from RejectionBanner:**
- No CTA button — tapping the banner itself routes (D-14: "tappable wholesale").
- No dismiss `<X>` — auto-dismiss only (D-14: informational, not noisy).
- Single body line, not title+subtitle — UI-SPEC §"`<HomeRejectionBanner>`" content is just the pluralized count text.
- The count source is HomeScreen's lazy fetch of `PropertyService.getUserProperties(user.localId)` filtered to `status === 'rejected'` (RESEARCH.md Topic 6 / "Source for `myListings` count" recommendation = option 1, lazy fetch).

---

### 13. Client — `src/components/BannerShell.tsx` (OPTIONAL — planner discretion)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/BannerShell.tsx` (only if planner extracts shared primitive)
**Role:** shared banner skeleton primitive
**Analog:** `LandlordApplicationStatusBanner.tsx` lines 132-162 (full skeleton)

**Recommended shape (RESEARCH.md Topic 6 lines 504-505):**
```tsx
interface BannerShellProps {
  accentColor: string;
  title?: string;
  body: string;
  onPress?: () => void;       // Whole-banner tap (HomeRejectionBanner case)
  ctaLabel?: string;
  onCtaPress?: () => void;    // Optional CTA button (RejectionBanner case)
  dismissible?: boolean;
  onDismiss?: () => void;     // Optional X-button (RejectionBanner case)
  trailingChevron?: boolean;  // Show right chevron (HomeRejectionBanner / LandlordAppBanner case)
}
```

LOC budget: with this shell, RejectionBanner shrinks to ~30-40 LOC and HomeRejectionBanner to ~20-30 LOC. Without it, both are ~80 + ~60 LOC (UI-SPEC §"Component Inventory" budgets). **Planner decides** based on whether `LandlordApplicationStatusBanner.tsx` is also worth refactoring (it's NOT in scope — Phase 2 boundary).

**Recommendation:** SKIP the shell extraction in Phase 2. The two new banners diverge enough (CTA + dismiss vs neither) that a shared shell costs more in props-plumbing than it saves. Duplication at this scale is acceptable. If Phase 3 adds more banner variants, extract then.

---

### 14. Client — `src/screens/RenterListingsScreen.tsx` (MODIFIED — segmented control + per-tab + empty states)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx`
**Role:** screen (4-tab segmented control + per-tab Hospitality + per-tab empty states)
**Data flow:** request-response + client filter
**Analog:** self for fetch + per-category split (lines 50-69 + 181-188); HomeScreen lines 364-391 for inline segmented-control inline pattern

**Existing fetch + per-category split (lines 50-69 + 181-188):**
```tsx
useEffect(() => {
  loadProperties();
}, [refreshKey]);

const loadProperties = async () => {
  if (!user?.localId) {
    setLoading(false);
    return;
  }
  try {
    const data = await PropertyService.getUserProperties(user.localId);
    setProperties(data);
  } catch (error) {
    Alert.alert('Error', 'Failed to load your listings');
  } finally {
    setLoading(false);
  }
};

// D-06 + Gap 9.3: split data into hospitality strip + non-hospitality vertical list
const hospitalityProperties = useMemo(
  () => properties.filter((p) => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
  [properties],
);
const otherProperties = useMemo(
  () => properties.filter((p) => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
  [properties],
);
```

**Existing FlatList + ListHeaderComponent + ListEmptyComponent pattern (lines 252-283):**
```tsx
<FlatList
  data={otherProperties}
  keyExtractor={(item) => item.id || Math.random().toString()}
  renderItem={renderPropertyItem}
  ListHeaderComponent={
    <>
      {renderHeader()}
      <HospitalitySection
        properties={hospitalityProperties}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onEdit={onEditProperty}
        onDelete={handleDeleteProperty}
        onArchive={handleArchiveProperty}
        onUnarchive={handleUnarchiveProperty}
        showEditButton={true}
      />
    </>
  }
  ListEmptyComponent={
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't created any listings yet.</Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Create your first listing to get started!</Text>
    </View>
  }
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
```

**Inline segmented-control reference (HomeScreen.tsx lines 364-391 + styles 695-711):**
```tsx
<View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
  <TouchableOpacity
    style={[
      styles.segmentButton,
      transactionType === 'rent' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
    ]}
    onPress={() => setTransactionType('rent')}
    activeOpacity={0.8}
  >
    <Text style={[
      styles.segmentText,
      { color: transactionType === 'rent' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }
    ]}>🏠 {t('home.rent')}</Text>
  </TouchableOpacity>
  {/* ... second segment ... */}
</View>

// styles
segmentedControl: { flexDirection: 'row', borderRadius: 30, padding: 4, marginBottom: 16, height: 44 },
segmentButton: { flex: 1, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
segmentText: { fontWeight: '600', fontSize: 16 },
```

**Target adaptation per UI-SPEC §"OwnerListings 4-tab segmented control" + D-09/D-10/D-11/D-12:**

```tsx
type ListingTab = 'live' | 'pending' | 'rejected' | 'archived';

interface RenterListingsScreenProps {
  // ... existing props ...
  defaultTab?: ListingTab; // D-15: Home banner CTA opens screen with defaultTab='rejected'
}

export const RenterListingsScreen: React.FC<RenterListingsScreenProps> = ({ /* ... */ defaultTab }) => {
  // ... existing state ...
  const [activeTab, setActiveTab] = useState<ListingTab>(defaultTab ?? 'pending'); // D-09: Pending default

  // D-12: single fetch returns ALL statuses for owner (backend role-aware branch handles this)
  // ... existing loadProperties unchanged ...

  // D-07 + per-tab filter: filter by active tab BEFORE the hospitality split
  const tabFilteredProperties = useMemo(
    () => properties.filter(p => (p.status ?? 'live') === activeTab),
    [properties, activeTab],
  );
  const hospitalityProperties = useMemo(
    () => tabFilteredProperties.filter(p => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
    [tabFilteredProperties],
  );
  const otherProperties = useMemo(
    () => tabFilteredProperties.filter(p => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
    [tabFilteredProperties],
  );

  // 4-tab segmented control (renders OUTSIDE ListHeaderComponent so it pins above the per-tab Hospitality strip)
  const TABS: ListingTab[] = ['live', 'pending', 'rejected', 'archived'];
  const renderTabs = () => (
    <View style={[styles.tabsRow, { backgroundColor: colors.surface }]}>
      {TABS.map((tab) => {
        const selected = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
            style={[
              styles.tabButton,
              selected && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // CONVENTIONS.md TAP=44 honor
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[
              styles.tabLabel,
              { color: selected ? colors.text : colors.textSecondary, fontWeight: selected ? '600' : '500' },
            ]}>
              {t(`owner.listings.tab.${tab}` as any)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Per-tab empty state (D-11)
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyHeading, { color: colors.text }]}>
        {t(`owner.listings.empty.${activeTab}` as any)}
      </Text>
      {(activeTab === 'live' || activeTab === 'pending') && (
        <TouchableOpacity onPress={onCreateListing /* parent prop */} style={[styles.cta, { backgroundColor: colors.accent }]}>
          <Text style={styles.ctaText}>{t('owner.listings.empty.cta' as any)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ... in render, segmented control above FlatList; ListHeaderComponent is renderHeader + HospitalitySection per-tab ...
};

// Style additions
tabsRow: { flexDirection: 'row', height: 40, marginHorizontal: 16, marginBottom: 16 },
tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
tabLabel: { fontSize: 14, lineHeight: 20 }, // UI-SPEC: 14/20/600 active, 14/20/500 inactive
emptyHeading: { fontSize: 15, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginBottom: 16 },
cta: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
ctaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
```

**Removals (RESEARCH.md Topic 5 + Topic 8):**
- DELETE `formatStatus()` helper (lines 190-203) — per-tab grouping makes per-card status display redundant.
- DELETE inline status badge JSX (lines 217-221) and `statusBadge` / `statusText` styles (lines 334-352).
- DELETE archive/unarchive button props passed to `<PropertyCard>` (lines 229-230) — Phase 2 hides archive UI per D-Phase-4-deferral. The handlers `handleArchiveProperty` / `handleUnarchiveProperty` (lines 122-178) can stay in source but go unused; consider commenting out the alert dialogs to mark them inactive, OR delete them and add a TODO referencing Phase 4 ARCH-04.

**Key differences executor must apply:**
- Tab order locked: Live / Pending / Rejected / Archived (D-09).
- Default tab: `defaultTab ?? 'pending'` (D-09 lands on Pending by default; Home banner CTA passes `defaultTab='rejected'` per D-15).
- Active-tab visual: 2px underline in `colors.accent` (UI-SPEC §"OwnerListings 4-tab segmented control" — planner picks underline OR fill; underline is the cleaner default for a 4-tab strip).
- LOC budget: 369 → ~480-490 (RESEARCH.md A7).
- The screen's header ("My Listings" line 210) STAYS — the file is `RenterListingsScreen.tsx` but the user-facing label is fine; CONTEXT.md Critical Implementation Fact section line 115 calls this out.

---

### 15. Client — `src/screens/HomeScreen.tsx` (MODIFIED — D-07 client filter + HomeRejectionBanner mount)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/HomeScreen.tsx`
**Role:** screen
**Analog:** self (lines 109-119 fetch + 133-160 filter chain)

**D-07 client filter — REPLACE the `setProperties(data ?? []);` (line 112 + line 125):**

Current:
```tsx
const data = await PropertyService.getAllProperties();
setProperties(data ?? []);
```

Target (RESEARCH.md Code Examples lines 947-951 + Pitfall 3 mitigation):
```tsx
const data = await PropertyService.getAllProperties();
// D-07: defense in depth — server filters but client coalesces and re-filters.
// Filter at SOURCE (not in a downstream memo) so both filteredProperties + hospitalityProperties
// branches inherit the live-only set. Pitfall 3: filtering only filteredProperties leaks
// pending/rejected rows into the hospitality strip.
const liveOnly = (data ?? []).filter((p: Property) => (p.status ?? 'live') === 'live');
setProperties(liveOnly);
```

Apply the same change to `onRefresh` (line 125).

**HomeRejectionBanner mount — NEW lazy fetch + render slot:**

Add a new state + effect for the rejected count (RESEARCH.md Topic 6 lines 552-559, option 1):
```tsx
const [rejectedCount, setRejectedCount] = useState(0);

useEffect(() => {
  // Lazy fetch: only if user is signed in AND eligible to list (canListProperties=true OR mod+).
  if (!user?.localId) return;
  const profile = (user as any)?.backendProfile;
  const canList = profile?.canListProperties === true || profile?.userType === 'moderator' || profile?.userType === 'admin';
  if (!canList) return;

  PropertyService.getUserProperties(user.localId)
    .then((mine: Property[]) => {
      const rejected = (mine ?? []).filter(p => p.status === 'rejected').length;
      setRejectedCount(rejected);
    })
    .catch((err) => {
      console.warn('[HomeScreen] failed to count rejected listings:', err?.message);
    });
}, [user?.localId, refreshKey]);
```

Render the banner just below the search bar / above the property list (UI-SPEC §"`<HomeRejectionBanner>`"):
```tsx
{rejectedCount > 0 && (
  <HomeRejectionBanner
    count={rejectedCount}
    onPress={onOpenMyListingsRejectedTab /* parent prop wired via App.tsx defaultTab='rejected' */}
  />
)}
```

**Key differences executor must apply:**
- Banner fetch uses `getUserProperties(user.localId)` — eligible to use the same role-aware D-12 endpoint; backend will return all statuses for owner-self.
- New parent prop `onOpenMyListingsRejectedTab` (or similar) passed from `App.tsx` to set `renterListingsDefaultTab='rejected'` and `setIsRenterListingsOpen(true)` — see App.tsx wiring at lines 494, 889.

---

### 16. Client — `src/screens/FavoritesScreen.tsx` (MODIFIED — D-07 client filter)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/FavoritesScreen.tsx`
**Role:** screen
**Analog:** self (lines 50-71 fetch)

**Current (lines 56-63):**
```tsx
const data = await FavoritesService.getFavorites();
if (data && Array.isArray(data) && data.length > 0) {
  setProperties(data);
} else {
  setProperties([]);
}
```

**Target (D-07):**
```tsx
const data = await FavoritesService.getFavorites();
const list = (data && Array.isArray(data)) ? data : [];
// D-07: defense in depth — even if a favorited listing transitions out of 'live' server-side,
// hide it from the renter-facing favorites list. The owner can still see it via My Listings.
const liveOnly = list.filter((p: Property) => (p.status ?? 'live') === 'live');
setProperties(liveOnly);
```

**Key differences executor must apply:**
- Single edit; mirrors HomeScreen's `liveOnly` pattern.
- Hospitality split (lines 104-111) stays as-is — derives from `properties` which is now pre-filtered.

---

### 17. Client — `src/screens/PropertyDetailsScreen.tsx` (MODIFIED — RejectionBanner mount + status pill)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx`
**Role:** screen
**Analog:** self (banner mounts above hero); RejectionBanner.tsx is the new dependency

**Mount slot:** above the hero image area. The screen is 1868 LOC; the executor uses the existing `useState` + early-render block patterns. Add at the top of the rendered content tree:

```tsx
import { RejectionBanner } from '../components/RejectionBanner';
import { StatusPill } from '../components/StatusPill';

// inside component:
const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

const isOwnedByMe = property.owner?.uid === user?.localId; // or property.ownerUid (verify the field name in this screen)
const showRejectionBanner =
  isOwnedByMe &&
  (property.status ?? 'live') === 'rejected' &&
  property.id != null &&
  !dismissedBanners.has(property.id);

// Auto-flow on edit-resubmit (D-15)
const onEditResubmit = () => {
  // Parent prop — App.tsx wires this to CreateListingScreen edit-mode entry.
  onEditListing?.(property);
};

const onDismissBanner = () => {
  if (property.id) {
    setDismissedBanners(prev => new Set(prev).add(property.id!));
  }
};

// Status pill: render inline near the title or below the hero (planner picks position; UI-SPEC says
// PropertyCard pill goes top-left of card image — for the details screen, a top-of-content inline pill
// adjacent to the title/badges row is the natural placement).
{(property.status ?? 'live') !== 'live' && <StatusPill status={property.status} />}

// RejectionBanner mount — top of the screen content above hero
{showRejectionBanner && (
  <RejectionBanner
    reasonCode={property.rejectionReasonCode}
    reasonNote={property.rejectionReasonNote}
    onEditResubmit={onEditResubmit}
    onDismiss={onDismissBanner}
  />
)}
```

**Key differences executor must apply:**
- Add a new prop to `PropertyDetailsScreenProps`: `onEditListing?: (property: Property) => void;` for D-15 banner CTA.
- Per-listing dismiss state (Set keyed by `property.id`) lives in screen-local `useState` — D-13 + RESEARCH.md Pitfall 8 (don't lift to Context or App.tsx — navigate-away should reset).
- Verify the user-ownership check matches what the screen already does for owner-only affordances (e.g., the existing AdminVerifyDocuments gate at the top of the screen). Reuse that check; don't introduce a parallel one.

---

### 18. Client — `src/screens/CreateListingScreen.tsx` (MODIFIED — D-20 submit copy + D-15 edit-from-banner entry)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/CreateListingScreen.tsx`
**Role:** screen
**Analog:** self (lines 800-821 submit button; lines 810-818 the conditional copy chain)

**Current submit copy logic (lines 810-818):**
```tsx
{isEditMode
  ? (propertyToEdit?.status === 'draft'
      ? (status === 'draft'
          ? t('createListing.saveAsDraft')
          : t('createListing.publishListing'))
      : t('createListing.updateListing'))
  : (status === 'draft'
      ? t('createListing.saveAsDraft')
      : t('createListing.createListing'))}
```

**Target (D-20):** simplify under the new mental model "submit means submit for review":

```tsx
{(() => {
  if (isEditMode) {
    // D-15 edit-resubmit path: rejected listing → "Resubmit for review"; otherwise "Update listing"
    if (propertyToEdit?.status === 'rejected') return t('createListing.resubmit');
    return t('createListing.updateListing');
  }
  // New listing — D-20: copy reframes from "Publish" / "Create listing" to "Submit for review"
  return t('createListing.submitForReview');
})()}
```

Add 2 (or 4) new locale keys:
- `createListing.submitForReview` — EN: "Submit for review" / RU: «Отправить на модерацию»
- `createListing.resubmit` — EN: "Resubmit for review" / RU: «Отправить повторно»

Also REMOVE the `'draft'` branch entirely from the conditional — D-01 drops draft. The `status` variable in this file's scope (a `useState`-backed status the user toggled in the form) needs a separate cleanup pass: search for `status === 'draft'` and any "save as draft" affordance in this 929-LOC file (likely in the Status segmented control section) and remove them. The form no longer offers a "Draft" choice — submission is always "submit for review".

**Deprecated locale keys to clean up:**
- `createListing.saveAsDraft` — remove
- `createListing.publishListing` — remove (replaced by `submitForReview`)
- `createListing.createListing` — remove (replaced by `submitForReview`)
- `createListing.statusHint` — update copy (line 289 EN: "Draft: Save for later. Submit: Publish listing (images will be added by platform).") to remove the "Draft" framing entirely.

**Key differences executor must apply:**
- Don't touch the EDIT-on-LIVE-listing path's CTA copy beyond the `'rejected'` branch — D-22 says PUT on `'live'` is in-place edit (no re-moderation), so "Update listing" stays correct there.
- The Status segmented control inside the form (which lets users toggle between "Draft" and "Live" pre-submit) goes away entirely — D-01 leaves no user-side status choice. This is a substantive form-shape simplification; planner may want to break it out as its own task.

---

### 19. Client — `src/components/PropertyCard.tsx` (MODIFIED — StatusPill mount at top-left below rent/sale badge)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyCard.tsx`
**Role:** card component
**Analog:** self (existing `topBadges` style at lines 294-298 is the new mount slot)

**Existing top-left badge structure (lines 98-104):**
```tsx
<View style={styles.topBadges}>
  <View style={[styles.badge, styles.statusBadge]}>
    <Text style={styles.statusText}>
      {property.type === 'rent' ? t('property.forRent') : t('property.forSale')}
    </Text>
  </View>
</View>
```

with `topBadges` at `top: 16, left: 16`.

**Target (D-19 supersedes UI-SPEC's original "top-right 8px inset"):** stack the new StatusPill BELOW the existing rent/sale badge, vertically inside the same `topBadges` container:

```tsx
<View style={styles.topBadges}>
  <View style={[styles.badge, styles.statusBadge]}>
    <Text style={styles.statusText}>
      {property.type === 'rent' ? t('property.forRent') : t('property.forSale')}
    </Text>
  </View>
  {/* D-19: status pill stacked below rent/sale badge (top-left), avoids collision with top-right share+heart actions */}
  {(property.status ?? 'live') !== 'live' && (
    <StatusPill status={property.status} style={{ marginTop: 6 }} />
  )}
</View>
```

Add the import:
```tsx
import { StatusPill } from './StatusPill';
```

**Key differences executor must apply:**
- D-19 explicit position lock: top-left, below rent badge. NOT top-right (UI-SPEC original), NOT inside `topRightActions` (collides with share + heart). The existing `topBadges` container is already absolute-positioned at `top: 16, left: 16` — the new pill inherits that container's position and stacks via flexbox column flow with a small `marginTop`.
- The `style={{ marginTop: 6 }}` honors UI-SPEC's `sm = 8px` "gap between status pill and PropertyCard title row" — but adapted for the stack-below context (between two badges) where 6px reads tighter and avoids visual disconnection.
- Update UI-SPEC.md as part of plan execution (D-19 explicitly says NOT a separate UI-SPEC revision phase). The `pill geometry` block in UI-SPEC line 49 should be reworded: "Position: top-left of the PropertyCard image area, vertically below the existing rent/sale type badge, with 6px gap. Avoids the existing top-right share+heart actions cluster."

---

### 20. Client — `src/context/AuthContext.tsx` (MODIFIED — AppState listener + cooldown)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx`
**Role:** context provider
**Analog:** self (adds new `useEffect` next to existing hook registration on lines 217-219)

**Existing hook registration pattern (lines 217-219) — the natural neighbor for the AppState listener:**
```tsx
useEffect(() => {
  registerAuthHooks({ refreshRole, logout, toast });
}, [refreshRole, logout, toast]);
```

**Existing `refreshRole` shape (lines 171-184) — already useCallback-stable, idempotent, non-fatal:**
```tsx
const refreshRole = useCallback(async () => {
  if (!user?.localId) return;
  setIsLoadingRole(true);
  try {
    const fresh = await apiClient.get<BackendProfile>('/auth/me');
    setUser(prev => (prev ? { ...prev, backendProfile: fresh.data } : null));
  } catch (e) {
    console.warn('refreshRole failed', e);
  } finally {
    setIsLoadingRole(false);
  }
}, [user?.localId, language]);
```

**Target additions (RESEARCH.md Topic 7 lines 575-601):**

Add the import + module-scope cooldown variable at the top of the file:
```tsx
import { AppState, AppStateStatus } from 'react-native';

// Module-scope cooldown timestamp for AppState 'active' role-refresh debounce (D-17, 60s).
// NOT shared with apiClient.ts's 403 interceptor refresh path (RESEARCH.md Topic 7 / "Sharing
// the cooldown timestamp with apiClient.ts") — the interceptor has its own single-flight
// `refreshRolePromise` so concurrent refreshes are already coalesced. This cooldown only
// prevents wasteful refreshes on rapid foreground/background cycles in iOS multitasking.
let lastRefreshAt: number | null = null;
const REFRESH_COOLDOWN_MS = 60_000;
```

Add a new useEffect inside `AuthProvider`, immediately after the existing `useEffect(() => { registerAuthHooks(...); }, ...)` block:
```tsx
// D-17: AppState 'active' role-refresh hook (Phase 1 D-12 deferral landed here).
// On every foreground transition, if (a) user is signed in and (b) we haven't refreshed in 60s,
// call refreshRole(). The existing RoleRefreshBanner (App.tsx) handles the user-visible banner
// when the role actually changed — this hook just keeps the cached role fresh.
useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt && now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
      return; // Within cooldown — skip.
    }
    if (!user?.localId) return; // Not signed in.
    lastRefreshAt = now;
    refreshRole().catch(() => {/* non-fatal; refreshRole already warns */});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [refreshRole, user?.localId]);
```

**Key differences executor must apply:**
- Place the new useEffect AFTER the existing `registerAuthHooks` effect (lines 217-219). Both effects are siblings in the provider scope.
- Module-scope `lastRefreshAt` (NOT inside the component or in a ref) — survives component re-renders but resets on full app reload (which is correct: a fresh launch should refresh).
- The `if (!user?.localId) return` guard inside the handler closure prevents firing `refreshRole()` after a user logs out while backgrounded (RESEARCH.md Topic 7 / Pitfalls bullet 4).
- Cleanup `sub.remove()` is required (RESEARCH.md Topic 7 / Pitfalls bullet 3). RN 0.84's AppState API confirmed.

---

### 21. Client — `src/locales/en.ts` + `src/locales/ru.ts` (MODIFIED — 8-14 new keys + deprecations)

**Target files:**
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts`
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts`

**Role:** translation maps
**Analog:** self (lines 130-154 for `property.status*` cluster to deprecate)

**Existing `property.status*` cluster (en.ts lines 136-139):**
```ts
'property.statusDraft': '📝 Draft',
'property.statusPending': '⏳ Pending Review',
'property.statusLive': '✅ Live',
'property.statusArchived': '🗄 Archived',
```

**Target — RESEARCH.md Topic 5 recommendation = option (b): introduce new `listings.status.*` namespace + delete old `property.status*` keys.**

Removals (en.ts lines 136-139, ru.ts equivalent):
- DELETE `property.statusDraft` (D-01 drops draft)
- DELETE `property.statusPending` (replaced by `listings.status.pending`)
- DELETE `property.statusLive` (replaced — but `listings.status.live` is unused since live shows no pill)
- DELETE `property.statusArchived` (replaced by `listings.status.archived`)

Additions (UI-SPEC §"Copywriting Contract" tables):

**Status pills (3 EN+RU pairs = 6 keys):**
```ts
// en.ts
'listings.status.pending':  'Pending review',
'listings.status.rejected': 'Rejected',
'listings.status.archived': 'Unpublished',

// ru.ts
'listings.status.pending':  'На модерации',
'listings.status.rejected': 'Отклонено',
'listings.status.archived': 'Снято с публикации',
```

**Owner listings tab labels (4 EN+RU pairs = 8 keys):**
```ts
// en.ts
'owner.listings.tab.live':     'Live',
'owner.listings.tab.pending':  'Pending',
'owner.listings.tab.rejected': 'Rejected',
'owner.listings.tab.archived': 'Archived',

// ru.ts
'owner.listings.tab.live':     'Опубликовано',
'owner.listings.tab.pending':  'На модерации',
'owner.listings.tab.rejected': 'Отклонено',
'owner.listings.tab.archived': 'Снято',
```

**Per-tab empty states (4 EN+RU pairs = 8 keys):**
```ts
// en.ts
'owner.listings.empty.live':     'Nothing live yet — your approved listings will appear here.',
'owner.listings.empty.pending':  'No listings under review.',
'owner.listings.empty.rejected': 'No rejected listings.',
'owner.listings.empty.archived': 'Nothing archived.',
'owner.listings.empty.cta':      'Create listing',

// ru.ts
'owner.listings.empty.live':     'Пока ничего не опубликовано — одобренные объявления появятся здесь.',
'owner.listings.empty.pending':  'Объявлений на модерации нет.',
'owner.listings.empty.rejected': 'Отклонённых объявлений нет.',
'owner.listings.empty.archived': 'Снятых объявлений нет.',
'owner.listings.empty.cta':      'Создать объявление',
```

(Verify if `owner.listings.empty.cta` overlaps with an existing `profile.createListing` key — the existing en.ts:170 has `'profile.createListing': 'Create Listing'` and `createListing.createListing` — planner consolidates if a clean reuse exists; otherwise add the new key.)

**RejectionBanner copy (3 EN+RU pairs = 6 keys):**
```ts
// en.ts
'listings.rejection.title':         'Listing rejected',
'listings.rejection.bodyFallback':  'Reason: {reasonCode}. Edit your listing and resubmit for review.',
'listings.rejection.cta':           'Edit & resubmit',

// ru.ts
'listings.rejection.title':         'Объявление отклонено',
'listings.rejection.bodyFallback':  'Причина: {reasonCode}. Отредактируйте объявление и отправьте на повторную проверку.',
'listings.rejection.cta':           'Исправить',
```

**HomeRejectionBanner copy (1 pluralized EN+RU pair = 4 keys):**
```ts
// en.ts
'home.rejection.banner.singular': 'You have 1 listing that needs edits.',
'home.rejection.banner.plural':   'You have {N} listings that need edits.',

// ru.ts
'home.rejection.banner.singular': 'У вас 1 объявление требует исправления.',
'home.rejection.banner.plural':   'У вас {N} объявлений требуют исправления.',
```

**CreateListingScreen submit copy (D-20 — 2 EN+RU pairs = 4 keys):**
```ts
// en.ts
'createListing.submitForReview': 'Submit for review',
'createListing.resubmit':        'Resubmit for review',

// ru.ts
'createListing.submitForReview': 'Отправить на модерацию',
'createListing.resubmit':        'Отправить повторно',
```

**Common dismiss key (1 EN+RU pair = 2 keys, if not already present):**
```ts
// en.ts
'common.dismiss': 'Dismiss',
// ru.ts
'common.dismiss': 'Скрыть',
```

(Verify against existing `common.*` cluster en.ts:1-15 — likely missing.)

**Total new keys: 36 (across both locales) = ~18 unique key paths × 2 languages.** This is above the CONTEXT.md "8-12" estimate but within the UI-SPEC "8-14" + the D-20 submit-copy add-on. Planner may consolidate `owner.listings.tab.*` if a single label set can be reused from existing keys (e.g. could the Live tab label reuse `property.statusLive`? — no, that's deprecated. Tab labels are new.).

**Key differences executor must apply:**
- The CI gate `scripts/check-i18n-parity.sh` enforces EN+RU parity (CONVENTIONS.md). Add ALL keys to BOTH files in the SAME commit.
- The `t()` helper supports `{key}` interpolation via the `params` arg (`src/locales/index.ts:11-22`) — `home.rejection.banner.plural` and `listings.rejection.bodyFallback` rely on this.
- Russian plural form simplification (singular + plural only, NOT 1/2-4/5+) is the project convention per UI-SPEC line 162.
- TypeScript `TranslationKeys` type (`src/locales/en.ts:570` end-of-file) is `keyof typeof en` — adding new keys auto-extends the type. Removing deprecated keys is also a type-level signal that catches stale references during compilation.
- Search the codebase for the deprecated keys before deletion: `grep -rn "property\.statusDraft\|property\.statusPending\|property\.statusLive\|property\.statusArchived" src/` — the only consumer should be `RenterListingsScreen.tsx:190-203` `formatStatus()`. Confirm before deletion.

---

### 22. Client — `App.tsx` (MODIFIED — RenterListings `defaultTab` plumbing + `onEditListing` from PropertyDetailsScreen)

**Target file:** `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx`
**Role:** nav state machine
**Analog:** self (lines 494, 889 for existing RenterListings open path; lines 580 for OwnerListings; lines 869 for `ownerListingsUid`/`ownerListingsName`)

**Existing wiring (line 494):**
```tsx
const onProfileViewListings = useCallback(() => setIsRenterListingsOpen(true), []);
```

**Existing mount (line 889):**
```tsx
<RenterListingsScreen
  onBack={() => setIsRenterListingsOpen(false)}
  // ... other props ...
/>
```

**Target additions:**

State for the rejected-tab default:
```tsx
const [renterListingsDefaultTab, setRenterListingsDefaultTab] = useState<'live' | 'pending' | 'rejected' | 'archived' | undefined>(undefined);
```

New entry point invoked by HomeScreen's `<HomeRejectionBanner>`:
```tsx
const onOpenMyListingsRejectedTab = useCallback(() => {
  setRenterListingsDefaultTab('rejected');
  setIsRenterListingsOpen(true);
}, []);
```

Reset the default-tab state on close so a subsequent profile-tap doesn't land on Rejected:
```tsx
const onCloseRenterListings = useCallback(() => {
  setIsRenterListingsOpen(false);
  setRenterListingsDefaultTab(undefined); // reset so next open goes to Pending default (D-09)
}, []);
```

Pass `defaultTab` to RenterListingsScreen:
```tsx
<RenterListingsScreen
  onBack={onCloseRenterListings}
  defaultTab={renterListingsDefaultTab}
  // ...
/>
```

Pass `onOpenMyListingsRejectedTab` to HomeScreen:
```tsx
<HomeScreen
  // ...
  onOpenMyListingsRejectedTab={onOpenMyListingsRejectedTab}
/>
```

PropertyDetailsScreen `onEditListing` (D-15 banner CTA) — wire to existing CreateListingScreen edit-mode entry:
```tsx
<PropertyDetailsScreen
  // ...
  onEditListing={(property) => {
    // Reuse existing edit-listing entry point — App.tsx state machine already sets propertyToEdit.
    setPropertyToEdit(property);
    setIsCreateListingOpen(true);
  }}
/>
```

(Verify the exact state names — `propertyToEdit` and `setIsCreateListingOpen` are placeholders for the actual App.tsx state shape; the executor reads App.tsx around lines 580 + 869 to find the existing edit-mode entry the M1 Phase 5 decomposition wired up.)

**Key differences executor must apply:**
- App.tsx is at 1099 LOC near the 1100 soft cap (PITFALLS Pitfall 8). The Phase 2 additions are ~15-25 net LOC; net-zero would be ideal but acceptable. If close to 1100, look for an opportunistic extraction (e.g., move the deep-link handler block out — but only if it's clean, otherwise let the cap drift slightly).
- No new OVERLAY_FLAGS needed — banners are in-screen mounts, not overlays (CONTEXT.md `<code_context>` confirms).

---

## Shared Patterns

### Pattern A: Defense-in-depth client filter (D-07)

**Source pattern:** RESEARCH.md Code Examples lines 947-951.
**Apply to:** `src/screens/HomeScreen.tsx` (line 112 + 125), `src/screens/FavoritesScreen.tsx` (lines 56-63). RenterListingsScreen does NOT apply this — it intentionally keeps non-live listings (Pending / Rejected / Archived tabs).
```ts
const liveOnly = (data ?? []).filter((p: Property) => (p.status ?? 'live') === 'live');
setProperties(liveOnly);
```

### Pattern B: `useTheme()` semantic-token banner accent stripe

**Source:** `LandlordApplicationStatusBanner.tsx:138 + 158` — `<View style={[styles.accentBar, { backgroundColor: accent }]} />` with `accentBar: { width: 4, alignSelf: 'stretch' }`.
**Apply to:** `RejectionBanner` (use `colors.error`), `HomeRejectionBanner` (use `colors.error`).
**Anti-pattern to avoid:** hardcoded hex (`'#DC2626'`). The analog uses literals because that banner predates the `colors.error` token convergence — Phase 2 is the cleanup pass.

### Pattern C: Per-component module-scope cooldown timestamp

**Source pattern:** RESEARCH.md Topic 7 lines 583-585.
**Apply to:** `AuthContext.tsx` AppState listener (single subsystem; do NOT share with apiClient.ts — RESEARCH.md Topic 7 / Sharing analysis).
```tsx
let lastRefreshAt: number | null = null;
const REFRESH_COOLDOWN_MS = 60_000;
```

### Pattern D: Inline segmented-control / category-toggle (NO new component)

**Source:** `HomeScreen.tsx:364-391` (rent/sale segmented control) + `393-433` (Residential/Commercial/Hospitality category-chip row) + `styles.ts:695-740`.
**Apply to:** `RenterListingsScreen.tsx` 4-tab control. Inline (~80-120 LOC) per UI-SPEC §"Component Inventory". No new shared component — the RN brownfield convention is inline `TouchableOpacity`+`StyleSheet`. Two existing inline patterns at HomeScreen prove this is the project shape.

### Pattern E: One-shot mongo migration (Phase 1 D-08 lineage)

**Source:** `migrate-roles-m2.js` (entire file, 129 LOC). Battle-tested in production 2026-04-30.
**Apply to:** `migrate-listings-m2.js`. Anti-patterns (RESEARCH.md Section "Don't Hand-Roll" + "Anti-Patterns to Avoid"): no upserts, no synthetic data, no Railway release-hook wiring (manual `--verify=PASS` pre-deploy gate).

### Pattern F: Role-aware route branch (D-12 / D-06 owner-or-mod check)

**Source:** RESEARCH.md Topic 3 lines 252-273 (`GET /user/:firebaseUid` shape) + lines 283-305 (`GET /:id` shape).
**Apply to:** propertyRoutes.js routes 4.b + 4.c.
```js
const isOwner = req.firebaseUid === ownerUid;
const isModPlus = req.user && ROLE_RANK[req.user.userType] >= 1;
if (!isOwner && !isModPlus) {
  // tighten the query OR return 404
}
```

### Pattern G: Belt-and-suspenders deploy ordering

**Source:** RESEARCH.md Pitfall 2 + Phase 1 D-08 precedent.
**Apply to:** ALL plan tasks must respect the order: migration `--verify=PASS` → schema cutover → client deploy. Plan task headers should call out the gate explicitly.

### Pattern H: Per-session in-memory dismiss (NOT AsyncStorage)

**Source:** RESEARCH.md Pattern 5 lines 800-804 + UI-SPEC line 232.
**Apply to:** PropertyDetailsScreen `<RejectionBanner>` dismiss state. `useState<Set<string>>(new Set())` keyed by listing id, screen-local. NEVER `AsyncStorage.setItem(...)`.

---

## No Analog Found

All 19 files have at least a role-match analog. No file lacks reference patterns.

| File | Why this section is empty |
|------|---------------------------|
| (none) | RESEARCH.md identified concrete analogs for every new file: `migrate-roles-m2.js` for the migration script; `LandlordApplicationStatusBanner.tsx` for both new banners; `RoleRefreshBanner.tsx` + existing PropertyCard `statusBadge` styles for `StatusPill`; HomeScreen segmented-control inline pattern for the RenterListings 4-tab; verifyFirebaseToken middleware shape for `optionalAuth`; existing propertyRoutes.test.js setup for both new test additions. |

---

## Theme-Token Verification (Claude's Discretion confirmation)

CONTEXT.md `<discretion>` flagged that planner verifies token presence. Verified against `src/theme/colors.ts:1-46`:

| Token | Light | Dark | Used by |
|---|---|---|---|
| `warning` | `#F59E0B` | `#F59E0B` | StatusPill `pending` background |
| `onWarning` | `#FFFFFF` | `#0F172A` | StatusPill `pending` text |
| `error` | `#F44336` | `#EF5350` | StatusPill `rejected` background; RejectionBanner left-stripe; HomeRejectionBanner left-stripe |
| `accent` | `#FF385C` | `#FF5C7C` | RejectionBanner CTA bg; "Create listing" empty-state CTA bg; segmented-control active-tab underline |
| `textTertiary` | `#999999` | `#6B6F76` | StatusPill `archived` background |
| `surface` | `#FFFFFF` | `#25282F` | Banner backgrounds; PropertyCard surface |
| `text` | `#2D2D2D` | `#F5F5F5` | Tab label active; banner title |
| `textSecondary` | `#666666` | `#A0A3A8` | Tab label inactive; banner subtitle |
| `border` | `#E0E0E0` | `#2E3238` | Banner borders |

**No new tokens required.** Phase 2 is the absorb-into-existing-tokens phase per UI-SPEC line 30.

---

## Metadata

**Analog search scope (read):**
- Backend: `src/scripts/migrate-roles-m2.js`, `src/models/Property.js`, `src/middleware/verifyFirebaseToken.js`, `src/routes/propertyRoutes.js` (lines 1-200 + 200-525), `src/__tests__/propertyRoutes.test.js`, `package.json`
- Client: `src/components/LandlordApplicationStatusBanner.tsx`, `src/components/RoleRefreshBanner.tsx`, `src/components/PropertyCard.tsx` (lines 1-200 + 280-492), `src/screens/RenterListingsScreen.tsx`, `src/screens/HomeScreen.tsx` (lines 1-160 + 360-440 + 690-770), `src/screens/FavoritesScreen.tsx` (lines 1-120), `src/screens/PropertyDetailsScreen.tsx` (lines 1-100), `src/screens/CreateListingScreen.tsx` (lines 795-832), `src/services/PropertyService.ts`, `src/types/Property.ts`, `src/context/AuthContext.tsx`, `src/theme/colors.ts`, `src/locales/en.ts` (lines 1-80 + 130-180), `src/locales/index.ts`
- Phase docs: 02-CONTEXT.md (full), 02-RESEARCH.md (lines 1-700 + 700-1100), 02-UI-SPEC.md (full)

**Project skills directories:**
- `.claude/skills/` — does not exist
- `.agents/skills/` — does not exist
No skill SKILL.md files loaded (none present).

**Files scanned:** 19 distinct analog/target files across both repos.

**Pattern extraction date:** 2026-05-01.

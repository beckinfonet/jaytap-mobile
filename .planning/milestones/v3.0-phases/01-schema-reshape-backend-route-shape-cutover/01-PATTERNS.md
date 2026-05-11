# Phase 1: Schema Reshape + Backend Route Shape Cutover - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 10 (2 NEW + 8 MODIFIED)
**Analogs found:** 10 / 10 (all in-codebase analogs identified)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `JayTap-services/src/scripts/migrate-listings-m3.js` (NEW) | script (one-shot migration) | batch transform | `JayTap-services/src/scripts/migrate-listings-m2.js` | exact (same role + flow + idempotency posture) |
| `JayTap-services/src/__tests__/migrate-listings-m3.test.js` (NEW) | test (migration unit + acceptance) | batch | `JayTap-services/src/__tests__/Property.test.js` (env-wiring) + `JayTap-services/src/__tests__/setup.js` (memory-server) | role-match (no prior migration test exists; jest+memory-server idiom carries) |
| `JayTap-services/src/models/Property.js` (RESHAPE) | model (Mongoose schema) | declarative shape | `JayTap-services/src/models/Property.js` lines 67-71 (`platformVerifications` nested) + lines 28-33 (`tours[]` nested) | exact (in-file precedent for nested-object pattern) |
| `JayTap-services/package.json` (ADD npm script) | config (npm scripts) | declarative | `JayTap-services/package.json` line 13 (`migrate:listings-m2` sibling) | exact (verbatim sibling pattern) |
| `JayTap-services/src/routes/propertyRoutes.js` (CUTOVER) | controller (REST routes) | request-response (CRUD) | self (M2 destructure + `Property.find` + `Property.findById` patterns at lines 44, 105, 296, 354) | exact (same file; lines flip flat → nested) |
| `JayTap-services/src/routes/moderationRoutes.js` (CUTOVER) | controller (REST routes) | request-response (CRUD) | self + `propertyRoutes.js` (queue route at line 61, `findOneAndUpdate` race-safe pattern at line 90) | exact (same file; queue/approve/reject/edit responses flip flat → nested) |
| `JayTap-services/src/__tests__/Property.test.js` (UPDATE) | test (model unit) | batch | self (existing M2 D-21 audit-field assertions, lines 35-119) | exact (same file; fixtures flip flat → nested) |
| `JayTap-services/src/__tests__/propertyRoutes.test.js` (UPDATE) | test (route integration) | request-response | self (supertest pattern + `makeApp()` helper at lines 49-54, fixture seeding at lines 113-152) | exact (same file; supertest fixtures flip flat → nested) |
| `JayTap-services/src/__tests__/moderationRoutes.test.js` (UPDATE) | test (route integration) | request-response | self (supertest pattern + `Property.create` fixtures at lines 77-80, queue test pattern at line 392) | exact (same file; supertest fixtures flip flat → nested) |
| `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts` (UPDATE) | type (TypeScript) | declarative | self (current flat-shape interface as "before") + RESEARCH §"Code Examples" §7 (full nested type as "after") | role-match (no prior nested-shape analog in `src/types/`; flat shape is the only sibling) |

**Possibly modified (planner discretion):**
| `JayTap-services/src/__tests__/adminRoutes.test.js` | test (admin routes) | — | N/A — `grep` of file returned 0 matches for `Property\|address\|bedrooms\|propertyType` | **NOT TOUCHED** (verified does not reference Property shape) |
| `JayTap-services/src/scripts/seed.js` | script (seed) | batch | self (lines 9-40 use FLAT shape: `address`, `bedrooms`, `bathrooms`, `type`, `tours[]`, `agent`) | exact (file is unused at runtime per planner discretion; seed script can be DELETED or rewritten to nested shape) |

---

## Pattern Assignments

### `JayTap-services/src/scripts/migrate-listings-m3.js` (NEW — script, batch transform)

**Analog:** `JayTap-services/src/scripts/migrate-listings-m2.js` (99 LOC, M2 Phase 2 shipped 2026-05-01)

**Imports + dotenv pattern** (lines 19-24):
```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Property = require('../models/Property');
const connectDB = require('../config/db');

dotenv.config();
```
Copy verbatim. Same require shape; same dotenv invocation order.

**Flag parsing pattern** (lines 26-28):
```javascript
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerify = args.includes('--verify');
```
**ADAPT:** Phase 1 changes the verify flag to `args.includes('--verify=PASS')` per RESEARCH §"Code Example 3" (REQUIREMENTS.md SCHEMA-02 verbatim wording requires `=PASS` suffix). Add a fail-loud guard for unsuffixed `--verify`:
```javascript
if (args.includes('--verify') && !args.includes('--verify=PASS')) {
  console.error('FATAL: `--verify` requires the `=PASS` suffix.');
  process.exit(2);
}
```

**Verify subcommand pattern** (lines 33-47):
```javascript
if (isVerify) {
  const remainingLegacy = await Property.countDocuments({
    status: { $nin: ['pending', 'live', 'rejected', 'archived'] },
  });
  console.log(`Records with non-canonical status: ${remainingLegacy}`);
  if (remainingLegacy === 0) {
    console.log('VERIFY: PASS — LISTING-LIFECYCLE-M2 acceptance met');
    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.log('VERIFY: FAIL — run migration first');
    await mongoose.disconnect();
    process.exit(1);
  }
}
```
**ADAPT:** Replace the `status: {$nin: [...]}` filter with the SCHEMA-02 verbatim filter `{location: {$exists: false}}`. Replace label `LISTING-LIFECYCLE-M2` with `SCHEMA-02`. Exit-code semantics (0 = PASS, 1 = FAIL) carry forward unchanged.

**Lifecycle pattern** (lines 30-32 + 91-92):
```javascript
async function main() {
  await connectDB();
  // ... per-op dry-run / live branches ...
  await mongoose.disconnect();
  process.exit(0);
}
```
Copy verbatim. Same `connectDB` → ops → `mongoose.disconnect()` → `process.exit(0)` shape.

**Per-op dry-run / live branch pattern** (lines 51-58):
```javascript
const op1Filter = { status: 'draft' };
const op1Count = await Property.countDocuments(op1Filter);
console.log(`  draft -> pending: ${op1Count} records`);
if (!isDryRun && op1Count > 0) {
  const result = await Property.updateMany(op1Filter, { $set: { status: 'pending' } });
  console.log(`    updated: ${result.modifiedCount}`);
}
```
**ADAPT:** Phase 1 has ONE conceptual op (flat → nested) but per RESEARCH §"Code Example 2" the live run uses a `Property.find().cursor()` per-doc iteration (not bulk `updateMany`) because each doc needs custom transform via `buildNestedShape(doc)`. The dry-run / live branch GUARD pattern (`if (!isDryRun && count > 0) { ... }`) carries forward; the BODY changes from `updateMany` to cursor + per-doc `updateOne`.

**Top-level error handler** (lines 95-98):
```javascript
main().catch(err => {
  console.error(err);
  process.exit(1);
});
```
Copy verbatim.

**ADD (new for Phase 1)** — Defensive Node version check at top of file (per RESEARCH §"Common Pitfalls" §2 — exits with distinct code 2 to distinguish from migration errors):
```javascript
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('FATAL: Node ≥22.12 required (run `nvm use 24`)');
  process.exit(2);
}
```

**ADD (new for Phase 1)** — Per-doc transform helpers per D-04..D-15. Source: RESEARCH §"Code Example 2" lines 614-672. Helpers `mapDealType`, `mapRooms`, `buildNestedShape`, `collectBiasedSamples` (propertyType-biased sample selection per Claude's Discretion #4), `stripNoise` are the new content; the OUTER skeleton (`main`, `connectDB`, dry-run guard, exit codes) is the M2 verbatim template.

---

### `JayTap-services/src/__tests__/migrate-listings-m3.test.js` (NEW — test, batch)

**Analog:** No existing migration script test exists in the repo (`migrate-listings-m2.js` shipped without a `.test.js` companion). Closest analogs are:

- **`JayTap-services/src/__tests__/Property.test.js`** for env-wiring + jest.mock pattern
- **`JayTap-services/src/__tests__/setup.js`** for memory-server lifecycle

**Env-wiring pattern** (`Property.test.js` lines 13-31):
```javascript
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'jaytap-test-bucket';

jest.mock('../config/firebase', () => {
  const { importJWK } = require('jose');
  const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens');
  const JWKS = async () => {
    const { publicJwk } = await getKeys();
    return await importJWK(publicJwk, 'RS256');
  };
  return { JWKS, ISSUER: TEST_ISSUER, FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID };
});

const Property = require('../models/Property');
```
Copy verbatim. The Property model loads transitively via `multerS3` → `S3Client` → AWS env vars — the AWS env block is mandatory.

**Memory-server lifecycle** (`setup.js` lines 1-25 — auto-loaded via `jest.config.cjs` `setupFilesAfterEnv`):
```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'jaytap-test' });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
```
**Inherited automatically.** No copy needed — `setup.js` is loaded by `jest.config.cjs setupFilesAfterEnv` and applies to every backend test. The migration test's seed-then-run-then-assert pattern works against this in-memory Mongo.

**Idempotency test pattern** (RESEARCH §"Code Example 4"):
```javascript
describe('migrate-listings-m3 — idempotency (D-03)', () => {
  test('re-running on a fully-migrated dataset modifies 0 rows', async () => {
    await Property.create({
      ownerUid: 'owner-uid',
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: { city: 'Bishkek', district: '', coordinates: { lat: 42.87, lng: 74.59 }, showExactAddress: false },
      basics:   { areaSqm: 50, price: 500, currency: 'KGS', rooms: '2' },
      // ...
    });
    const needsMigration = await Property.countDocuments({ location: { $exists: false } });
    expect(needsMigration).toBe(0);
    // run migration ...
    expect(await Property.countDocuments({ location: { $exists: false } })).toBe(0);
  });
});
```

**Acceptance test pattern (`--verify=PASS` exit codes)** (RESEARCH §"Code Example 5"):
```javascript
const { spawn } = require('child_process');

function runMigrationScript(args) {
  return new Promise((resolve) => {
    const child = spawn('node', ['src/scripts/migrate-listings-m3.js', ...args], {
      env: { ...process.env, MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/test' },
    });
    child.on('exit', code => resolve(code));
  });
}
```
**Note for planner:** Either refactor `migrate-listings-m3.js` to export `mapDealType`, `mapRooms`, `buildNestedShape` for direct unit testing (RECOMMENDED — avoids `child_process spawn` brittleness) AND keep `main()` un-exported (still calls `process.exit`), OR test via `child_process spawn` for the exit-code semantics. Hybrid is cheapest: unit-test helpers via direct require; integration-test exit codes via spawn.

---

### `JayTap-services/src/models/Property.js` (RESHAPE — model, declarative shape)

**Analog:** Self (in-file precedent for nested-object pattern at lines 28-33 + 67-71)

**Imports + schema header** (lines 1-3):
```javascript
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
```
Copy verbatim. No new imports needed.

**In-file nested-object pattern — `platformVerifications`** (lines 67-71):
```javascript
platformVerifications: {
  ownershipDocuments: { type: Boolean, default: false },
  ownerIdentityVerified: { type: Boolean, default: false },
  stateIssuedDocumentsVerified: { type: Boolean, default: false },
},
```
**THIS IS THE TEMPLATE** for `location`, `basics`, `conditionAndAmenities`, `content`, `terms`, `media`. Each new nested object follows the same `key: { sub-key: { type: ..., default: ... }, ... }` shape.

**In-file nested-array pattern — `tours[]`** (lines 28-33):
```javascript
tours: [{
    id: String,
    title: String,
    url: String,
    thumbnailUrl: String
}],
```
**Reference only** — Phase 1 DROPS `tours[]` per D-12. The pattern is illustrative for Mongoose nested-array syntax (in case `media.photos` / `media.videos` need richer shapes later — they do NOT in Phase 1; both are `[String]`).

**Status enum — VERBATIM PRESERVED** (line 38):
```javascript
status: { type: String, enum: ['pending', 'live', 'rejected', 'archived'], default: 'pending' },
```
**DO NOT CHANGE.** SCHEMA-03 hard rule. Migration does NOT touch `status`.

**Audit fields — VERBATIM PRESERVED at TOP LEVEL** (lines 42-52):
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
archivedReasonCode: { type: String, default: null },
archivedReasonNote: { type: String, default: null },
```
**DO NOT NEST UNDER `terms.*`.** SCHEMA-04 hard rule. Eleven fields stay top-level.

**Schema options — VERBATIM PRESERVED** (lines 74-79):
```javascript
}, {
  timestamps: true,
  collection: 'listings',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```
Copy verbatim. `collection: 'listings'` is critical for the migration-find filter to land on the right collection.

**DELETE pattern — `specs` virtual** (lines 82-88):
```javascript
PropertySchema.virtual('specs').get(function() {
  return {
    beds: this.bedrooms,
    baths: this.bathrooms,
    sqft: this.areaSqm
  };
});
```
**DELETE entirely** per RESEARCH §"Anti-Patterns to Avoid" — D-08 drops `bedrooms`/`bathrooms`, the virtual breaks. M2 client (already breaking per D-01) won't render it; Phase 2 client reads `basics.{rooms, areaSqm}` directly. NO rewrite (creates hidden coupling).

**Full nested target shape:** RESEARCH §"Pattern 1: Mongoose Nested Schema Definition" (lines 256-361 of RESEARCH.md) is the verbatim drop-in skeleton for Phase 1's reshape. All D-04..D-15 mappings are encoded.

---

### `JayTap-services/package.json` (ADD npm script)

**Analog:** Self, line 13 (`migrate:listings-m2` sibling)

**Existing pattern** (lines 8-14):
```json
"scripts": {
    "start": "node index.js",
    "test": "jest --config jest.config.cjs",
    "test:quick": "jest --config jest.config.cjs --testPathPattern=verifyFirebaseToken",
    "migrate:roles-m2": "node src/scripts/migrate-roles-m2.js",
    "migrate:listings-m2": "node src/scripts/migrate-listings-m2.js"
},
```

**ADD (verbatim sibling):**
```json
"migrate:listings-m3": "node src/scripts/migrate-listings-m3.js"
```
Place after `migrate:listings-m2`. No comma trailing JSON adjustment needed beyond the standard line.

---

### `JayTap-services/src/routes/propertyRoutes.js` (CUTOVER — controller, request-response)

**Analog:** Self (every route's destructuring + `Property.find` + `Property.findById` calls)

**GET / read pattern** (line 44-53):
```javascript
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
**CUTOVER NOTE:** The Mongoose-level filter is unchanged — `status` still lives at the top level (SCHEMA-03/04 preserve). The RESPONSE shape automatically becomes nested because `Property.find()` returns docs that conform to the new schema. NO route code change for this read; the schema reshape alone flips the wire shape. Same for line 73 (`GET /user/:firebaseUid`) and lines 296-350 (`GET /:id` deep-link 404 + owner enrichment).

**GET /:id stripModIdentity pattern (PRESERVE)** (lines 317-324):
```javascript
const isModeratorOrAdmin = req.user && ROLE_RANK[req.user.userType] >= 1;
const stripModIdentity = (obj) => {
  if (!isModeratorOrAdmin) {
    delete obj.rejectedByUid;
    delete obj.approvedByUid;
  }
  return obj;
};
```
**DO NOT CHANGE.** MOD-13 trust-boundary strip operates on top-level audit fields (`rejectedByUid`, `approvedByUid`) which are PRESERVED at top level per SCHEMA-04. Carries forward verbatim.

**POST / destructure pattern (CUTOVER)** (lines 105-129):
```javascript
router.post('/', upload.array('images', 40), verifyFirebaseToken, requireListingCapability, async (req, res) => {
  try {
    const {
      title, description, address, city, price, currency, period,
      type, propertyType, bedrooms, bathrooms, areaSqm, rooms, maxGuests, amenities,
      features, videoUrl, panoramicPhotosUrl, instagramUrl, tours, availableDate,
    } = req.body;

    if (!title || !address || !price) {
      return res.status(400).json({
        message: 'Missing required fields: title, address, and price are required'
      });
    }
```
**CUTOVER:** Destructure changes from FLAT keys (`address`, `bedrooms`, `bathrooms`, `type`, `rooms` …) to NESTED keys per SPEC §"Suggested Data Shape":
```javascript
const {
  // top-level (preserved per D-09/D-10)
  propertyType, dealType, ownerUid, instagramUrl, availableDate, listingId,
  maxGuests, amenities,
  // nested
  location,            // { city, district, coordinates: { lat, lng }, showExactAddress }
  basics,              // { areaSqm, price, currency, rooms?, bathroom?, kitchen?, hotelRooms?, hotelClass? }
  conditionAndAmenities, // { condition?, furnished? }
  content,             // { title, description, language }
  terms,               // { negotiable?, deposit?, prepaymentMonths?, minTerm? }
  media,               // { photos: [], videos: [], tourUrl? }
} = req.body;

// Validate required nested fields
if (!content?.title || !location?.coordinates || !basics?.price) {
  return res.status(400).json({
    message: 'Missing required fields: content.title, location.coordinates, basics.price are required'
  });
}
```

**POST / propertyData construction pattern (CUTOVER)** (lines 184-217):
```javascript
const propertyData = {
  listingId, title, description, address, latitude, longitude,
  city: city || 'Bishkek', price: ..., currency: ..., period: ...,
  type: type || 'rent', propertyType: propertyType || 'apartment',
  bedrooms: parseInt(bedrooms) || 0, bathrooms: ...,
  // ...
  submittedAt: new Date(),
  ownerUid: req.firebaseUid,
  images: imageUrls.length > 0 ? imageUrls : undefined,
  // ...
};
```
**CUTOVER:** Build nested shape directly. Top-level `submittedAt: new Date()`, `ownerUid: req.firebaseUid`, `listingId` PRESERVED. Multer-uploaded images flow into `media.photos` instead of top-level `images`:
```javascript
const propertyData = {
  // top-level operational
  listingId, propertyType: propertyType || 'apartment', dealType,
  ownerUid: req.firebaseUid, instagramUrl, availableDate: availableDate ? new Date(availableDate) : undefined,
  maxGuests, amenities,
  // nested
  location,
  basics,
  conditionAndAmenities,
  content,
  terms,
  media: {
    ...media,
    photos: imageUrls.length > 0 ? imageUrls : (media?.photos || []),
  },
  // top-level audit (SCHEMA-04)
  submittedAt: new Date(),
};
```

**PUT body-status sanitizer + rejected→pending auto-flip — VERBATIM PRESERVED** (lines 414-431):
```javascript
const ALLOWED_OWNER_STATUS_TRANSITIONS = [];
if (actingUser.userType !== 'admin' && actingUser.userType !== 'moderator') {
  if (updateData.status && !ALLOWED_OWNER_STATUS_TRANSITIONS.includes(updateData.status)) {
    delete updateData.status;
  }
}

if (property.status === 'rejected') {
  updateData.status = 'pending';
  updateData.submittedAt = new Date();
  updateData.rejectionReasonCode = null;
  updateData.rejectionReasonNote = null;
  updateData.rejectedAt = null;
  updateData.rejectedByUid = null;
}
```
**DO NOT CHANGE.** All operands are top-level fields preserved per SCHEMA-03/04. RESEARCH §"Anti-Patterns to Avoid" calls out body-status sanitizer regression as out-of-scope.

**PATCH /:id/verifications — VERBATIM PRESERVED** (lines 265-290):
```javascript
const v = req.body.platformVerifications || {};
property.platformVerifications = {
  ownershipDocuments: !!v.ownershipDocuments,
  ownerIdentityVerified: !!v.ownerIdentityVerified,
  stateIssuedDocumentsVerified: !!v.stateIssuedDocumentsVerified,
};
property.verificationUpdatedAt = new Date();
property.verificationUpdatedByUid = req.firebaseUid;
```
**DO NOT CHANGE.** `platformVerifications` is preserved at top level per D-10.

---

### `JayTap-services/src/routes/moderationRoutes.js` (CUTOVER — controller, request-response)

**Analog:** Self + `propertyRoutes.js` patterns

**Router-level role gate — VERBATIM PRESERVED** (line 50):
```javascript
router.use(verifyFirebaseToken, requireMinRole('moderator'));
```
**DO NOT CHANGE.** Phase 1 is shape cutover; auth boundary unchanged.

**GET /queue read pattern** (lines 61-69):
```javascript
router.get('/queue', async (req, res) => {
  try {
    const items = await Property.find({ status: 'pending' }).sort({ submittedAt: 1 });
    return res.json({ items, totalCount: items.length });
  } catch (err) {
    console.error('Error fetching moderation queue:', err);
    return res.status(500).json({ message: err.message });
  }
});
```
**CUTOVER NOTE:** Same as `propertyRoutes.js` GET / — top-level filter (`status`) and top-level sort (`submittedAt`) are preserved per SCHEMA-03/04. Response shape automatically becomes nested via the new schema. `{ items, totalCount }` envelope shape preserved per D-03.

**Race-safe atomic transition — VERBATIM PRESERVED** (lines 87-100):
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
```
**DO NOT CHANGE.** All operands are top-level (`status`, `approvedAt`, `approvedByUid`) preserved per SCHEMA-03/04. Race-cell pattern carries verbatim. Same for `reject` and `restore` handlers (lines 335-400).

**Audit-log orphan-tolerant write — VERBATIM PRESERVED** (lines 101-120):
```javascript
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
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',
    action: 'approve',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}
```
**DO NOT CHANGE.** ModerationLog rows are forward-fit per RESEARCH §"Runtime State Inventory" — old rows correctly snapshot the old shape; new rows snapshot the new shape. The `before`/`after` snapshots include only top-level fields here so the cutover doesn't change the audit shape.

**PUT /listings/:id (edit-on-behalf) mass-assignment safety — VERBATIM PRESERVED** (lines 402-419 commentary; sanitizer body-strip):
```javascript
// Mass-assignment safety (MOD-14 hard rule): `ownerUid` MUST NOT be mutated
// Strip whitelist: `ownerUid`, `_id`, `id`, `createdAt`, `submittedAt`, `status`,
// `approvedAt`/`approvedByUid`, `rejectedAt`/`rejectedByUid`/`rejectionReasonCode`/
// `rejectionReasonNote`, `actorUid`, `firebaseUid`
```
**DO NOT CHANGE.** All stripped fields are top-level (preserved per SCHEMA-04). The cutover mostly affects which BODY keys the route accepts (now nested) — the sanitizer-strip list is unaffected because it operates on top-level shape.

---

### `JayTap-services/src/__tests__/Property.test.js` (UPDATE — test, batch)

**Analog:** Self (M2 D-21 audit-field assertions, lines 35-119)

**Env-wiring + jest.mock — VERBATIM PRESERVED** (lines 13-31):
```javascript
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
// ... AWS env block ...
jest.mock('../config/firebase', () => { /* ... */ });
const Property = require('../models/Property');
```
**DO NOT CHANGE.** Inheritance from `setup.js` + jest.mock pattern carries.

**Test fixture pattern (current FLAT)** (lines 36-44):
```javascript
test('default status is "pending" when not specified (D-01 default flip)', async () => {
  const doc = await Property.create({
    title: 'X',
    address: '1 St',
    price: 100,
    ownerUid: 'owner-uid',
  });
  expect(doc.status).toBe('pending');
});
```
**CUTOVER:** Flip fixture to nested:
```javascript
test('default status is "pending" when not specified (preserved)', async () => {
  const doc = await Property.create({
    ownerUid: 'owner-uid',
    propertyType: 'apartment',
    dealType: 'rent_long',
    location: { city: 'Bishkek', coordinates: { lat: 42.87, lng: 74.59 } },
    basics: { areaSqm: 50, price: 500, currency: 'KGS', rooms: '2' },
    content: { title: 'X', language: 'ru' },
    media: { photos: [], videos: [] },
  });
  expect(doc.status).toBe('pending');
});
```

**Audit-field assertion pattern — VERBATIM PRESERVED** (lines 78-93):
```javascript
const auditFields = [
  'submittedAt', 'approvedAt', 'approvedByUid',
  'rejectedAt', 'rejectedByUid',
  'rejectionReasonCode', 'rejectionReasonNote',
  'archivedAt', 'archivedByUid',
];
for (const f of auditFields) {
  expect(doc).toHaveProperty(f);
  expect(doc[f] == null).toBe(true);
}
```
**DO NOT CHANGE.** Audit fields stay top-level per SCHEMA-04; this test verifies that invariant. **EXTEND** with `archivedReasonCode` + `archivedReasonNote` (the M2-Phase-4 additions) to assert all 11 audit fields stay top-level.

**ADD (new tests for Phase 1)**:
- Strict-mode rejection of legacy flat keys (`address`, `bedrooms`, `bathrooms`, `type`) on `Property.create()` → expect undefined or validation error per Mongoose `strict: true` default.
- Audit-field "NOT under `terms.*`" assertion: `expect(doc.terms?.submittedAt).toBeUndefined()` etc. — defends against the SPEC-misread Pitfall #4.

---

### `JayTap-services/src/__tests__/propertyRoutes.test.js` (UPDATE — test, request-response)

**Analog:** Self (supertest pattern + makeApp helper + fixture seeding)

**makeApp helper — VERBATIM PRESERVED** (lines 49-54):
```javascript
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/properties', propertyRoutes);
  return app;
}
```

**Fixture seeding pattern (current FLAT)** (lines 113-152):
```javascript
beforeEach(async () => {
  app = makeApp();
  await User.create({ uid: 'owner-uid',  email: 'owner@x.com',  userType: 'user', canListProperties: true });
  // ...
  live = await Property.create({
    title: 'Live', listingId: 'P2-LIVE', address: '1 St', price: 100, ownerUid: 'owner-uid', status: 'live',
  });
  // ... pending, archived ...
  // bypass schema for legacy:
  const inserted = await Property.collection.insertOne({
    title: 'Legacy', listingId: 'P2-LEGACY', address: '5 St', price: 100, ownerUid: 'owner-uid',
    createdAt: new Date(), updatedAt: new Date(),
  });
  legacy = await Property.findById(inserted.insertedId);
});
```
**CUTOVER:** Flip every `Property.create({ flat... })` to nested fixture per D-04..D-15 mapping. Example:
```javascript
live = await Property.create({
  listingId: 'P1-LIVE',
  ownerUid: 'owner-uid',
  propertyType: 'apartment',
  dealType: 'rent_long',
  location: { city: 'Bishkek', district: '', coordinates: { lat: 42.87, lng: 74.59 }, showExactAddress: false },
  basics:   { areaSqm: 50, price: 500, currency: 'KGS', rooms: '2' },
  content:  { title: 'Live', description: '', language: 'ru' },
  media:    { photos: [], videos: [] },
  status: 'live',
});
```
The `Property.collection.insertOne` direct-MongoDB path for legacy/rejected fixtures is PRESERVED — it's a deliberate schema-bypass for testing edge cases (lines 133-141 use it to seed a pre-cutover legacy doc).

**Anti-tamper test pattern — VERBATIM PRESERVED** (lines 56-97):
```javascript
test("userType:'user' owner PUT with platformVerifications:{...:true} → field stripped, DB flag remains false", async () => {
  // ... POST + PUT + Property.findById + assert verifications stay false
});
```
**DO NOT CHANGE.** CR-01 anti-tamper test operates on top-level `platformVerifications` field (preserved per D-10).

**Auth-mock pattern — VERBATIM PRESERVED** (lines 23-39):
```javascript
jest.mock('../config/firebase', () => { /* ... */ });
jest.mock('../utils/geocoder', () => ({ geocodeAddress: async () => null }));
jest.mock('../utils/listingIdGenerator', () => ({ generateListingId: async () => 'TEST-001' }));
```
Carries verbatim. Note: `geocoder` mock returns `null` — Phase 1 nested-shape POST may bypass `geocodeAddress` entirely (client supplies `location.coordinates`); the existing mock still works.

---

### `JayTap-services/src/__tests__/moderationRoutes.test.js` (UPDATE — test, request-response)

**Analog:** Self (supertest pattern + Property.create fixtures)

**Fixture seeding (current FLAT, line 77-80)**:
```javascript
pendingListing = await Property.create({
  title: 'Race', listingId: 'P3-RACE', address: '1 Race St', price: 100,
  ownerUid: 'owner-uid', status: 'pending', submittedAt: new Date(),
});
```
**CUTOVER:** Flip to nested:
```javascript
pendingListing = await Property.create({
  listingId: 'P3-RACE',
  ownerUid: 'owner-uid',
  propertyType: 'apartment',
  dealType: 'rent_long',
  location: { city: 'Bishkek', coordinates: { lat: 42.87, lng: 74.59 } },
  basics: { areaSqm: 50, price: 100, currency: 'KGS', rooms: '2' },
  content: { title: 'Race', language: 'ru' },
  media: { photos: [], videos: [] },
  status: 'pending',
  submittedAt: new Date(),
});
```

**Race-cell pattern — VERBATIM PRESERVED** (lines 89-112):
```javascript
const [resA, resB] = await Promise.all([
  request(app).post(`/api/moderation/properties/${pendingListing._id}/approve`).set('Authorization', `Bearer ${tokenA}`),
  request(app).post(`/api/moderation/properties/${pendingListing._id}/approve`).set('Authorization', `Bearer ${tokenB}`),
]);

const statuses = [resA.status, resB.status].sort();
expect(statuses).toEqual([200, 409]);
```
**DO NOT CHANGE.** MOD-15 race-cell test operates on top-level `status` field (preserved per SCHEMA-03). Response body assertions on `code: 'ALREADY_MODERATED'` are unchanged.

**Queue FIFO test — VERBATIM PRESERVED** (line 392):
```javascript
test('GET /queue returns FIFO sort by submittedAt ASC + totalCount', async () => {
  // ...
});
```
**DO NOT CHANGE.** Queue route returns nested-shape items but the FIFO ordering is by top-level `submittedAt`. Response assertions on `res.body.items` may need to be updated if any test asserts on flat-shape fields like `res.body.items[0].address` — those flip to `res.body.items[0].location.city` etc.

---

### `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts` (UPDATE — type, declarative)

**Analog:** Self (current flat-shape type as "before"). No prior nested-shape analog exists in `src/types/`.

**Current FLAT type (before)** — top-level keys at risk of replacement (lines 17-91):
```typescript
export interface Property {
  id: string;
  listingId?: string;
  title: string;
  price: number | string;
  currency: string;
  period?: string;
  address: string;       // D-05: DROP (no SPEC analog)
  city?: string;         // moves to location.city
  latitude?: number;     // moves to location.coordinates.lat
  longitude?: number;    // moves to location.coordinates.lng
  description: string;   // moves to content.description
  specs: { beds, baths, sqft }; // D-08: DROP (specs virtual deleted)
  features: string[];
  imageUrl: string;      // derived from media.photos[0] at render
  images?: string[];     // moves to media.photos
  videoUrl?: string;     // moves to media.videos[0]
  agent?: { ... };       // D-10: DROP (dead field)
  is3DTourAvailable: boolean; // D-10: DROP (derive at read time)
  tours: Tour[];         // D-12: DROP (single tourUrl wins)
  type: 'rent' | 'sale'; // D-04: → dealType (top-level, preserved)
  // ... rest preserved per D-09/D-10
}
```

**Target NESTED type (after)** — RESEARCH §"Code Example 7" lines 921-1037:
```typescript
export interface Property {
  id: string;
  listingId?: string;

  dealType?: 'sale' | 'rent_long' | 'rent_daily';
  propertyType?: 'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel';

  location?: {
    city?: string;
    district?: string;
    coordinates?: { lat: number; lng: number };
    showExactAddress?: boolean;
  };

  basics?: {
    areaSqm?: number;
    price?: number;
    currency?: 'KGS' | 'USD' | 'EUR';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
  };

  conditionAndAmenities?: { condition?: 'rough' | 'whitebox' | 'good' | 'euro'; furnished?: boolean };
  content?: { title?: string; description?: string; language?: 'ru' | 'en' };
  terms?: { negotiable?: boolean; deposit?: { amount: number; currency: 'KGS' | 'USD' | 'EUR' };
            prepaymentMonths?: number; minTerm?: '1_day' | '1_month' | '3_months' };
  media?: { photos: string[]; videos: string[]; tourUrl?: string };

  // Top-level preserved per D-09/D-10
  ownerUid?: string;
  instagramUrl?: string;
  availableDate?: string;
  maxGuests?: number;
  amenities?: HospitalityAmenity[];
  platformVerifications?: PlatformVerifications;
  verificationUpdatedAt?: string;
  verificationUpdatedByUid?: string;

  // M2 status + audit (top-level — SCHEMA-03/04)
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  submittedAt?: string;
  rejectionReasonCode?: string | null;
  rejectionReasonNote?: string | null;
  archivedAt?: string;
  archivedByUid?: string | null;
  archivedReasonCode?: string | null;
  archivedReasonNote?: string | null;

  // Owner-enrichment from GET /:id (preserved verbatim — propertyRoutes.js lines 327-341)
  owner?: { uid?: string; email?: string; phone?: string; whatsapp?: string;
            telegram?: string; firstName?: string; lastName?: string };
}

// PRESERVED top-level imports
import type { HospitalityAmenity } from '../utils/hospitalityAmenities';

export interface PlatformVerifications {
  ownershipDocuments?: boolean;
  ownerIdentityVerified?: boolean;
  stateIssuedDocumentsVerified?: boolean;
}

// DELETED in Phase 1: `Tour` interface (replaced by string `media.tourUrl`)
```

**Recommendation (Claude's Discretion #3):** Ship the FULL nested type, NOT a `LegacyFlat | NestedShape` union. Per RESEARCH §"Code Example 7" rationale, the M2 client is already broken per D-01 — the union just preserves a half-broken state with extra type-narrowing burden.

---

## Shared Patterns

### Authentication / role gating
**Source:** `JayTap-services/src/middleware/verifyFirebaseToken.js` (imported via `propertyRoutes.js` line 9, `moderationRoutes.js` line 13)
**Apply to:** All route mutations (POST/PUT/PATCH/DELETE)
```javascript
const { verifyFirebaseToken, optionalAuth, ROLE_RANK, requireMinRole } = require('../middleware/verifyFirebaseToken');
// ...
router.post('/', upload.array('images', 40), verifyFirebaseToken, requireListingCapability, async (req, res) => { ... });
// router-level mount (moderationRoutes.js):
router.use(verifyFirebaseToken, requireMinRole('moderator'));
```
**DO NOT CHANGE.** Phase 1 is shape cutover; auth pipeline preserved verbatim across both route files.

### Request-response error handling
**Source:** `JayTap-services/src/routes/propertyRoutes.js` (every route)
**Apply to:** All new route logic introduced by cutover
```javascript
try {
  // ... happy path
  res.status(200).json(result);
} catch (error) {
  console.error('Error <action>:', error);
  res.status(500).json({ message: error.message });
}
```
Try/catch + console.error + `{ message: error.message }` envelope is the canonical project pattern. Use 400 for validation errors, 403 for role denials, 404 for not-found, 409 for race-conflict (`code: 'ALREADY_MODERATED'`), 500 for crashes.

### Audit-log orphan-tolerant write
**Source:** `JayTap-services/src/routes/moderationRoutes.js` lines 101-120
**Apply to:** Every `ModerationLog.create()` call in moderation actions
```javascript
try {
  await ModerationLog.create({ actorUid: req.firebaseUid, action: '...', /* ... */ });
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',
    action: '...',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}
```
**DO NOT CHANGE.** Forward-fit observability per D-10. Audit row failure does NOT abort the user-facing 200 response.

### Anti-spoofing actorUid sourcing
**Source:** Auto-memory `phase45-landlord-application-uid-mismatch-bug.md` + `moderationRoutes.js` lines 78-80 commentary
**Apply to:** Every audit-row insert in Phase 1's modified routes
```javascript
// CORRECT (verbatim from existing routes):
actorUid: req.firebaseUid,   // JWKS-verified token sub

// FORBIDDEN:
actorUid: req.body.firebaseUid,
actorUid: req.headers['x-firebase-uid'],
```
Phase 1's cutover does NOT introduce new audit-row writes (existing approve/reject/etc. preserved verbatim). The grep gate `grep -nE "actorUid: req\.(body|headers)"` should return 0 against the post-cutover file.

### Mongoose schema discipline (additive only)
**Source:** M2 Phase 1 D-04 + Phase 2 D-21 + Phase 4 archive lifecycle (RESEARCH §"Pattern 3")
**Apply to:** `Property.js` reshape
- Audit fields stay top-level (NEVER under `terms.*`)
- `status` enum preserved verbatim
- `collection: 'listings'` preserved verbatim
- `timestamps: true` + `toJSON: { virtuals: true }` + `toObject: { virtuals: true }` preserved verbatim
- New nested objects ADDED (never replacing existing top-level audit fields)

### Test environment wiring (jest + memory-server)
**Source:** `JayTap-services/src/__tests__/setup.js` (auto-loaded) + `jest.mock('../config/firebase')` block at top of every test file
**Apply to:** Every modified test file + the new `migrate-listings-m3.test.js`
```javascript
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'jaytap-test-bucket';

jest.mock('../config/firebase', () => {
  const { importJWK } = require('jose');
  const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens');
  const JWKS = async () => {
    const { publicJwk } = await getKeys();
    return await importJWK(publicJwk, 'RS256');
  };
  return { JWKS, ISSUER: TEST_ISSUER, FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID };
});
```
**DO NOT CHANGE.** AWS env block is mandatory — Property model loads via multerS3 → S3Client which requires these at module-load time.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `JayTap-services/src/__tests__/migrate-listings-m3.test.js` (NEW) | test (migration) | batch | No prior migration script test exists in repo. The closest analogs cover env-wiring (`Property.test.js`) and memory-server lifecycle (`setup.js`); the test BODY (helper-fn unit tests + `child_process spawn` for exit-code semantics) is novel for Phase 1. RESEARCH §"Code Examples §4 + §5" provides the verbatim drop-in test bodies. |

**Note:** The novelty is structural (no prior migration test), not technical — the underlying jest+memory-server+Property idiom is fully established in the existing test suite. The new test file simply combines those idioms in service of migration acceptance.

---

## Metadata

**Analog search scope:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/` (4 files)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/config/db.js`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (735 LOC)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` (641 LOC)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/` (8 files + fixtures/)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json`
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts`

**Files scanned:** 13

**Pattern extraction date:** 2026-05-05

**Cross-references:**
- RESEARCH.md §"Pattern 1: Mongoose Nested Schema Definition" (lines 248-366) — verbatim drop-in for `Property.js` reshape
- RESEARCH.md §"Code Example 2: Migration Script Skeleton" (lines 583-793) — verbatim drop-in for `migrate-listings-m3.js`
- RESEARCH.md §"Code Example 7: RN Client Property.ts Type Stub" (lines 921-1037) — verbatim drop-in for client type stub
- CONTEXT.md §<decisions> D-04..D-15 — encoded in `buildNestedShape()` helper of migration script
- CONTEXT.md §<canonical_refs> — Anchor SPEC + REQUIREMENTS.md SCHEMA-01..SCHEMA-05
- Auto-memory `gsd-verifier-misses-regressions.md` — paired-gate posture (verifier + reviewer) mandatory after `gsd-execute-phase`
- Auto-memory `backend-node-version.md` — `nvm use 24` MUST appear before any backend `npm run` step

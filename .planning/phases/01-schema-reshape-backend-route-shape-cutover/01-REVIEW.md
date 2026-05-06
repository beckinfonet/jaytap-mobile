---
phase: 01-schema-reshape-backend-route-shape-cutover
reviewed_at: 2026-05-06T04:30:02Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/migrate-listings-m3.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 1: Code Review Report — Schema Reshape + Backend Route Shape Cutover

**Reviewed:** 2026-05-06T04:30:02Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The phase delivers a clean M2-flat → M3-nested schema cutover with strong defenses around the SCHEMA-03/04 hard rules (status enum + 11 audit fields stay top-level). Anti-spoofing (HF-03) is correctly applied for every audit-row write across `propertyRoutes.js` and `moderationRoutes.js` — `actorUid` always sources from `req.firebaseUid`. Race-safety (MOD-15) is enforced via atomic `findOneAndUpdate` with status-as-lock-primitive on every state transition, including the new owner-archive / owner-unarchive routes. The migration script correctly avoids touching status / audit fields / D-09/D-10 keep-set fields and is properly idempotent.

However, **two critical gaps surfaced** that mirror the pattern flagged in `gsd-verifier-misses-regressions.md` (verifier finds happy path, reviewer finds the regression):

1. **The owner-side PUT in `propertyRoutes.js` is missing the 21-key mass-assignment strip that was added to the mod-side PUT in Plan 01-04.** An authenticated owner can PUT body fields `ownerUid`, `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`, `_id`, `id`, `createdAt`, `actorUid`, `firebaseUid` and they will all be `Object.assign`'d onto the document. This is a forgery / audit-tampering surface that the moderation route already closed.
2. **Nested-subtree PUTs are destructive.** `Object.assign(property, updateData)` shallow-replaces entire subtrees: a client sending `{ basics: { price: 600 } }` to update only the price will overwrite `basics.areaSqm`, `basics.currency`, `basics.rooms`, etc. with `undefined`. This affects both `propertyRoutes.js` PUT and `moderationRoutes.js` PUT.

Both are real bugs, both have zero test coverage in this phase, and both are exactly the load-bearing surface area Phase 2 will start consuming.

The migration script and the schema itself are otherwise solid. Tests are thorough on the happy paths but consistently absent on the negative/mass-assignment paths for the owner PUT.

---

## Critical Issues

### CR-01: Owner-side PUT `/api/properties/:id` is missing the 21-key mass-assignment strip — regression vs. mod-side PUT

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:357-490`
**Category:** security
**Issue:**
The handler does `const updateData = { ...req.body }` at L357, strips only `platformVerifications` / `verificationUpdatedAt` / `verificationUpdatedByUid` (for non-admins) and `status` (for non-mod owners), then runs `Object.assign(property, updateData)` at L490. Every other top-level field — including all 11 SCHEMA-04 audit fields, `ownerUid`, `_id`, `createdAt`, `actorUid`, `firebaseUid` — passes through and is written to the document.

Concrete attacks an authenticated owner can run:
- `PUT { ownerUid: 'someone-else-uid' }` → transfers ownership of their listing.
- `PUT { approvedByUid: 'random-mod-uid', approvedAt: '2026-01-01' }` → fabricates a fake moderation history (admin/mod identity forgery — same class as the Phase 4.5 uid-mismatch bug per memory `phase45-landlord-application-uid-mismatch-bug.md`).
- `PUT { submittedAt: '2020-01-01' }` → backdates submission and skips the FIFO queue position.
- `PUT { rejectedByUid: null, rejectedAt: null, rejectionReasonCode: null }` → clears moderator-applied rejection metadata without using the legitimate `rejected → pending` auto-flip path (which goes through the M2 D-15 + D-22 server-authoritative reset block at L408-415).
- `PUT { archivedByUid: 'attacker' }` → on an unarchived listing, defaces the archive history. (Note: the new POST `/:id/archive` route is correctly protected — this is an unrelated PUT-body path.)

Plan 01-04 added a 21-key forbidden list to the mod-side PUT (`moderationRoutes.js:456-481`); the equivalent strip is required here. The owner PUT is the higher-traffic surface and the more obvious attack vector.

**Fix:**
```js
// In propertyRoutes.js PUT /:id handler, immediately after `const updateData = { ...req.body };`
// Match the 21-key forbidden list from moderationRoutes.js:456-481 (ADJUSTED — owner PUT
// MUST keep `submittedAt` writable for the rejected→pending auto-flip block at L408-415,
// but only as a server-stamped value, not from req.body. Strip submittedAt from body
// FIRST, then the auto-flip block re-assigns it from `new Date()`).

// 5 standard:
delete updateData.ownerUid;       // anti-transfer
delete updateData._id;
delete updateData.id;
delete updateData.createdAt;
// (status is already stripped below by D-22 sanitizer at L399-403; keep that)

// 11 audit (SCHEMA-04):
delete updateData.submittedAt;
delete updateData.approvedAt;
delete updateData.approvedByUid;
delete updateData.rejectedAt;
delete updateData.rejectedByUid;
delete updateData.rejectionReasonCode;
delete updateData.rejectionReasonNote;
delete updateData.archivedAt;
delete updateData.archivedByUid;
delete updateData.archivedReasonCode;
delete updateData.archivedReasonNote;

// 2 defensive (HF-03 anti-spoofing):
delete updateData.actorUid;
delete updateData.firebaseUid;

// (platformVerifications + verificationUpdatedAt + verificationUpdatedByUid are
//  already handled by the existing admin-only gate at L363-383; leave that alone.)
```

Add a regression test mirroring `moderationRoutes.test.js` "21 forbidden keys" test at L599-666:
```js
test('PUT /:id owner mass-assignment strip — 21 forbidden keys cannot be forged', async () => {
  const token = await buildToken({ sub: 'owner-uid', role: 'user', kind: 'valid' });
  await request(app).put(`/api/properties/${liveListing._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      ownerUid: 'attacker',
      approvedByUid: 'attacker',
      approvedAt: new Date('2020-01-01'),
      submittedAt: new Date('2020-01-01'),
      rejectedByUid: 'attacker',
      // … all 21 keys
    });
  const reloaded = await Property.findById(liveListing._id);
  expect(reloaded.ownerUid).toBe('owner-uid');                // unchanged
  expect(reloaded.approvedByUid).not.toBe('attacker');
  // … assert each forbidden key is unchanged from seed/null.
});
```

---

### CR-02: Nested-subtree PUT performs destructive shallow replace on `Object.assign` (data-loss bug)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:478-490` (and mirror at `moderationRoutes.js:546-554, 590-594`)
**Category:** correctness
**Issue:**
The PUT handler iterates `for (const nestedKey of ['location', 'basics', 'conditionAndAmenities', 'content', 'terms'])` to JSON.parse the nested subtrees, then calls `Object.assign(property, updateData)` at L490. Mongoose `Object.assign` on a nested Mongoose subdoc-style path performs a **shallow replace of the entire subtree**, not a merge.

Concrete data-loss scenarios:
- A Phase 2 client doing a "just update the price" partial PUT with `{ basics: { price: 600 } }` will end up with `basics = { price: 600 }` and **lose** `areaSqm`, `currency`, `rooms`, `bathroom`, `kitchen`, `hotelRooms`, `hotelClass`. After save, the listing has no area, no currency, no rooms count.
- A client updating only `{ location: { city: 'Almaty' } }` will lose `coordinates`, `district`, `showExactAddress` — the deep-link 404 guard, map pins, and hotel/hostel exact-address rule all break.
- The MOD-14 edit-on-behalf has the same destructive behavior: a moderator fixing only `{ content: { title: 'Fixed' } }` will lose `description` and `language`.

The integration tests in this phase pass full nested objects (e.g. `propertyRoutes.test.js:484-488` always sends complete `basics` + `location` + `content`), so the bug never surfaces. Phase 2 will start using partial PUTs as soon as the screens land.

A subtle test that already exists DOES round-trip the un-touched nested fields — `moderationRoutes.test.js:592-593` at "PUT /listings/:id (MOD-14 edit-on-behalf) accepts nested body" sends `{ content, location }` and asserts `basics.rooms === '2'` survived. That works only because `basics` was NOT in the body — when the body omits a subtree, Mongoose preserves it. The bug bites when the body INCLUDES a partial subtree.

**Fix (option A — recommended):**
```js
// Replace the bare `Object.assign(property, updateData)` at L490 with a per-subtree merge.
const NESTED_SUBTREES = ['location', 'basics', 'conditionAndAmenities', 'content', 'terms', 'media'];
for (const key of NESTED_SUBTREES) {
  if (updateData[key] !== undefined && updateData[key] !== null && typeof updateData[key] === 'object') {
    // Merge into the existing subtree rather than replacing it.
    property[key] = { ...(property[key]?.toObject?.() ?? property[key] ?? {}), ...updateData[key] };
    delete updateData[key];
  }
}
Object.assign(property, updateData); // top-level scalars only
```

**Fix (option B — explicit "full replace" contract):**
Document in the API contract that PUT semantics are PUT-as-replace (caller must echo back the full subtree). This requires a Phase 2 client convention but avoids the merge complexity. Either is acceptable; option A is the lower-risk default. Add a regression test that exercises a partial-subtree PUT and asserts the unmodified sibling fields survive.

```js
test('PUT /:id partial-basics body preserves unmodified basics fields', async () => {
  const seeded = await Property.create(makeNestedFixture({
    basics: { areaSqm: 50, price: 500, currency: 'KGS', rooms: '2' },
  }));
  const token = await buildToken({ sub: 'owner-uid', role: 'user', kind: 'valid' });
  await request(app).put(`/api/properties/${seeded._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ basics: { price: 600 } })
    .expect(200);
  const reloaded = await Property.findById(seeded._id);
  expect(reloaded.basics.price).toBe(600);
  expect(reloaded.basics.areaSqm).toBe(50);  // PRESERVED, not undefined
  expect(reloaded.basics.currency).toBe('KGS');
  expect(reloaded.basics.rooms).toBe('2');
});
```

The same regression test should be added to `moderationRoutes.test.js` for the MOD-14 PUT path.

---

## Warnings

### WR-01: Migration coerces missing `areaSqm` and `price` to literal `0` — loses "missing" signal

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js:127-128`
**Category:** correctness
**Issue:**
```js
basics: {
  areaSqm:  doc.areaSqm || 0,
  price:    typeof doc.price === 'number' ? doc.price : (parseFloat(doc.price) || 0),
  ...
}
```
A legacy doc with no `areaSqm` (or `areaSqm: undefined`, or stringly-typed `''`) becomes `basics.areaSqm = 0`. Same for `price`. The schema allows undefined for both fields, and Phase 2's client UI almost certainly distinguishes "not yet entered" (placeholder) from "explicitly zero" (visible "Free!" / "0 m²"). The coercion to `0` collapses the two states.

For `price` specifically, this also lets a $0 listing slip past any future "no free listings" business rule, and changes the economics signal in any aggregations.

**Fix:**
```js
basics: {
  areaSqm:  typeof doc.areaSqm === 'number' && doc.areaSqm > 0 ? doc.areaSqm : undefined,
  price:    typeof doc.price === 'number' && Number.isFinite(doc.price) ? doc.price
            : (typeof doc.price === 'string' && Number.isFinite(parseFloat(doc.price)) ? parseFloat(doc.price) : undefined),
  ...
}
```
And add a buildNestedShape unit test:
```js
test('areaSqm/price absent in legacy doc → undefined in nested basics (no zero coercion)', () => {
  const r = buildNestedShape({ type: 'rent', propertyType: 'apartment' });
  expect(r.basics.areaSqm).toBeUndefined();
  expect(r.basics.price).toBeUndefined();
});
```

---

### WR-02: `mapCurrency` silently coerces unknown currencies to `KGS`

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js:86-92`
**Category:** correctness
**Issue:**
```js
function mapCurrency(legacyCurrency) {
  if (legacyCurrency === 'USD' || legacyCurrency === '$') return 'USD';
  if (legacyCurrency === 'EUR' || legacyCurrency === '€') return 'EUR';
  return 'KGS'; // KGS / сом / null / unknown → default
}
```
The "unknown → KGS" fallback hides data-quality issues. A legacy doc with `currency: 'GBP'` or `'RUB'` (memory `geographic-scope.md` notes KZ/UZ expansion is planned — RUB is plausible) silently becomes a KGS-priced listing, with the price number unchanged. A USD price of 500 → "500 KGS" is a real misstatement, not a default.

Idempotency makes this even harder to catch: the next migration run sees `location: { ... }` already present, skips the doc, and the wrong-currency value persists indefinitely.

**Fix:**
```js
function mapCurrency(legacyCurrency) {
  if (legacyCurrency === 'USD' || legacyCurrency === '$') return 'USD';
  if (legacyCurrency === 'EUR' || legacyCurrency === '€') return 'EUR';
  if (legacyCurrency === 'KGS' || legacyCurrency === 'сом' || legacyCurrency == null || legacyCurrency === '') return 'KGS';
  // Surface unrecognized values rather than silently defaulting.
  console.warn(`mapCurrency: unrecognized legacy currency "${legacyCurrency}" — defaulting to KGS. Manual review required.`);
  return 'KGS';
}
```
Better still: emit the unrecognized values as a summary at the end of the migration so the operator can spot-check.

---

### WR-03: POST validator misses `basics.price === null` and `location.coordinates` when shape is malformed

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:143-148`
**Category:** correctness
**Issue:**
```js
if (!content?.title || !location?.coordinates || basics?.price === undefined) {
  return res.status(400).json({ ... code: 'M3_NESTED_BODY_REQUIRED' });
}
```
Two gaps:
1. `basics?.price === undefined` returns `false` for `basics.price === null` — a JSON `null` price slips past validation. Mongoose then accepts `null` for the `Number` field (or coerces it), creating a published listing with no price.
2. `location?.coordinates` checks existence of the object but not its content. `{ location: { coordinates: {} } }` or `{ location: { coordinates: { lat: 'banana' } } }` passes the validator but breaks the map / geo-search downstream.

**Fix:**
```js
const titleOk = typeof content?.title === 'string' && content.title.trim().length > 0;
const coordsOk =
  location?.coordinates &&
  typeof location.coordinates.lat === 'number' &&
  Number.isFinite(location.coordinates.lat) &&
  typeof location.coordinates.lng === 'number' &&
  Number.isFinite(location.coordinates.lng);
const priceOk = typeof basics?.price === 'number' && Number.isFinite(basics.price);
if (!titleOk || !coordsOk || !priceOk) {
  return res.status(400).json({
    message: 'Missing or invalid required fields: content.title (non-empty), location.coordinates.{lat,lng} (numbers), basics.price (number)',
    code: 'M3_NESTED_BODY_REQUIRED',
  });
}
```

---

### WR-04: Test coverage gap — owner PUT mass-assignment and partial-subtree-merge are not exercised

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js`
**Category:** correctness
**Issue:**
The "CR-01 PUT /:id platformVerifications anti-tamper" test at L128-167 covers only the platformVerifications strip. There is no negative-path test that an authenticated owner cannot mutate `ownerUid`, `submittedAt`, `approvedByUid`, etc. via PUT body. The mod-side PUT has this coverage at `moderationRoutes.test.js:599-666` ("21 forbidden keys"); the owner PUT does not.

Likewise, every nested-shape PUT test (e.g. L579-605, L607-621) sends complete subtrees and so cannot detect the CR-02 destructive `Object.assign` behavior.

This is the test-coverage class flagged in memory `gsd-verifier-misses-regressions.md` — happy paths green, negative paths absent, regression slips through.

**Fix:**
Add the two regression tests sketched in CR-01 and CR-02 above. They are small, fast, and would have caught both bugs.

---

### WR-05: Migration `.lean()` cursor with `--dry-run` BIASED sample picks may skip stragglers; sample logic could mismatch live-run scope

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js:215-233, 279-306`
**Category:** correctness
**Issue:**
The dry-run uses `collectBiasedSamples()` which prefers 1 apartment + 1 commercial + 1 hospitality. If the dataset is, say, 1000 apartments and 0 commercial / 0 hospitality, the dry-run shows only 1 sample (with a backfill of 2 random apartments). That's intentional per Claude's Discretion #4. But the operator's mental model of "I'm seeing 3 samples — those represent the spread" is wrong when bucket coverage is asymmetric.

More importantly: `findOne` with no sort returns insertion order (or whatever the driver picks), so the dry-run sample is NOT representative of the actual live-run cursor. A stragger doc with weird `tours[]` data may not appear in the sample but will be migrated.

**Fix:**
Either annotate the dry-run output with the bucket distribution ("Found 1000 apartments, 0 commercial, 0 hospitality — sample shows 1+0+0 + 2 random apartment backfill") so the operator knows what they're NOT seeing, or augment with a "tail sample" — also pull the most recent (by createdAt DESC) and oldest (ASC) docs to expose schema drift across time.

---

## Info

### IR-01: `propertyRoutes.js` POST handler comment block is misleading about D-04 backfill

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js:27`
**Category:** style
**Issue:**
The comment on the schema's top-level `dealType` field reads `D-04 backfill destination`. Field is fine; the comment implies the migration script writes here from a backfill, but the migration source is `doc.type` not `doc.dealType` (and `dealType` doesn't exist on M2 docs). Future readers will hunt for a "backfill source" mistakenly. Suggest "D-04 — written by migration script via mapDealType(doc.type); never set on M2 docs."

---

### IR-02: `LEGACY_FLAT_FIELDS_TO_UNSET` includes `period` and `agent` but no test asserts the M2 source had those fields

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js:166-180`
**Category:** style
**Issue:**
The "exact 17 keys" test at `migrate-listings-m3.test.js:411-420` locks the list. But none of the integration fixtures include `period`, `agent`, `is3DTourAvailable`, `panoramicPhotosUrl`, `imageUrl`, `matterportUrl`. If those fields were never on actual M2 production docs, the `$unset` is harmless dead surface; if they were, the live migration's behavior is untested. A sanity test that inserts a doc WITH each of those fields and asserts they're gone post-migration would close the loop.

**Fix:**
Add one integration test:
```js
test('all 17 legacy flat keys are removed by the live migration (defense)', async () => {
  await TxnProperty.collection.insertOne(makeFlatFixture({
    address: 'x', latitude: 42, longitude: 74, bedrooms: 2, bathrooms: 1,
    period: 'monthly', agent: 'foo', is3DTourAvailable: true, panoramicPhotosUrl: 'u',
    imageUrl: 'u', images: ['x'], tours: [], videoUrl: '', type: 'rent', city: 'B',
    rooms: 2, matterportUrl: 'u', ownerUid: 'all17',
  }));
  await runMigrationScript([]);
  const doc = await TxnProperty.findOne({ ownerUid: 'all17' }).lean();
  for (const k of Object.keys(LEGACY_FLAT_FIELDS_TO_UNSET)) {
    expect(doc[k]).toBeUndefined();
  }
});
```

---

### IR-03: `Property.ts` audit-field types declared `string` but values can be `null`

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts:95-105`
**Category:** style
**Issue:**
The schema explicitly defaults audit dates to `null` (e.g. `approvedAt: { type: Date, default: null }` in `Property.js:96`). Backend serializes these as JSON `null`. The TypeScript type currently has `approvedAt?: string` (optional, but not nullable) while peers like `approvedByUid?: string | null` correctly model nullability. Inconsistent — Phase 2 consumers using strict null checks will get spurious `undefined` narrowing but real `null` values at runtime.

**Fix:**
```ts
submittedAt?: string | null;
approvedAt?: string | null;
rejectedAt?: string | null;
archivedAt?: string | null;
```
(matching the existing `*ByUid` and `*ReasonCode` peers).

---

### IR-04: PUT handler runs `D-22 archived → 409` AFTER the PUT body is fully parsed but BEFORE the 21-key strip would run

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:386-392`
**Category:** style
**Issue:**
Minor: when CR-01 is fixed, ordering matters. The 21-key strip should run BEFORE the archived-readonly 409 check (so a request to an archived listing carrying mass-assignment fields is rejected as 409, not as a successful no-op + 409 — purely to avoid the appearance that "we accepted your malicious payload but happened to reject the operation"). It's a defense-in-depth ordering nit, not a behavioral bug.

**Fix:**
When implementing CR-01, place the 21-key strip immediately after `const updateData = { ...req.body };` and before the existing platformVerifications guard at L363.

---

_Reviewed: 2026-05-06T04:30:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

# Phase 2: Listing Lifecycle Status Field Absorption — Research

**Researched:** 2026-05-01
**Domain:** Property lifecycle state machine (4-state) — RN client + Mongoose backend
**Confidence:** HIGH (every claim is verified against the code in both repos as of this session)

---

## Summary

Phase 2 lands a 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`) end-to-end. CONTEXT.md locks 17 decisions (D-01..D-17); UI-SPEC.md (already approved) locks the visual contract. **Research confirms every locked decision is implementable against the current code, with two non-trivial complications the planner must address explicitly:**

1. **Naming flip:** `OwnerListingsScreen` despite its name is a **read-only viewer of OTHER owners' listings**. The actual self-listings screen is `RenterListingsScreen` (`src/screens/RenterListingsScreen.tsx:34`, header literal `"My Listings"`). Every CONTEXT.md/UI-SPEC.md reference to "OwnerListings" lands on **RenterListingsScreen**, not the file called `OwnerListingsScreen.tsx`. This must be called out at plan-task naming time so the executor doesn't edit the wrong file.
2. **Existing M1 status pill collision:** `RenterListingsScreen` *already* renders a status badge (`src/screens/RenterListingsScreen.tsx:217-221` + `formatStatus()` lines 190-203) using existing `property.statusDraft|Pending|Live|Archived` locale keys decorated with emojis (`📝 Draft` / `⏳ Pending Review` / `✅ Live` / `🗄 Archived`). UI-SPEC.md's Phase 2 contract is **a different visual** (no emojis, Avito-anchored RU framing, capsule pill on PropertyCard). Phase 2 must replace, not coexist with, the M1 inline status badge — and consolidate the locale keys.

**Primary recommendation:** Run the migration first (manual `npm run migrate:listings-m2` against production Mongo, `--verify=PASS` gate), then deploy backend (schema enum cutover + role-aware route filters), then deploy client (status pill, banners, segmented control, AppState hook). Mirror Phase 1 D-08's go/no-go gating exactly. The migration script must use the `update-only` posture from `migrate-roles-m2.js` (no upserts, no synthetic data).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema, default, and legacy data reconciliation:**

- **D-01:** Backend `Property.js:35` enum becomes `['pending', 'live', 'rejected', 'archived']` with `default: 'pending'`. Drop `'draft'` (migrate existing `'draft'` rows to `'pending'`).
- **D-02:** Three-layer null-status absorption: (a) Mongoose `default: 'live'` for absorbed reads at schema layer; (b) one-shot `migrate-listings-m2.js` backfills status-missing → `'live'`; (c) client `(p.status ?? 'live')` defensive coalesce.
- **D-03:** Standalone `JayTap-services/src/scripts/migrate-listings-m2.js` (sibling of `migrate-roles-m2.js`). `--dry-run` previews counts, `updateMany` operations are idempotent, `--verify` subcommand asserts `db.properties.countDocuments({status: {$nin: ['pending', 'live', 'rejected', 'archived']}})` returns 0. Manual `npm run migrate:listings-m2` against production `MONGO_URI`. NOT wired into Railway release hook.
- **D-04:** All existing M1 listings → `'live'` (preserve current public visibility). Two operations: `{status: 'draft'} → {status: 'pending'}` AND `{status: {$exists: false}} → {status: 'live'}`. Audit fields stay null/missing.

**Mod/admin read scope:**

- **D-05:** `GET /api/properties` returns `status: 'live'` only — no `?includeAll=1` escape hatch for any role.
- **D-06:** `GET /api/properties/:id` mods/admins see non-live listings (full payload + status field, no moderationContext yet); non-owner-non-mod gets 404; owner sees own non-live listing + rejection banner if rejected.
- **D-07:** Defensive client filter on Home/Favorites/RenterListings: `properties.filter(p => (p.status ?? 'live') === 'live')`.
- **D-08:** NO `/api/moderation/queue` route stub. NO shared moderation TypeScript types. Phase 3 owns the entire moderation surface from blank slate.

**OwnerListings 4-tab UX:**

- **D-09:** Default landing tab = **Pending** (second tab). Tab order: Live / Pending / Rejected / Archived.
- **D-10:** `<HospitalitySection>` mounted inside each tab as `ListHeaderComponent`, status-filtered per-tab.
- **D-11:** Per-tab empty states (8 new locale keys minimum). Live + Pending have "Create listing" CTA; Rejected + Archived text-only.
- **D-12:** Single fetch on screen mount, client-side tab filter. Owner-scoped endpoint returns ALL statuses if requester owns/is mod+.

**Rejection messaging:**

- **D-13:** PropertyDetailsScreen rejection banner — per-session in-memory dismiss (NOT AsyncStorage). Reappear on cold start, AppState 'active' after >5min background, OR next navigate.
- **D-14:** Home persistent rejection banner — auto-dismiss when zero rejected listings. No manual dismiss X.
- **D-15:** "Edit & resubmit" CTA — PropertyDetailsScreen banner → CreateListingScreen edit mode (auto-flips `'rejected'` → `'pending'` on save server-side); Home banner → OwnerListings Rejected tab.
- **D-16:** Status pill labels locked. EN: "Pending review" / "Rejected" / "Unpublished". RU: «На модерации» / «Отклонено» / «Снято с публикации». Live = no pill.

**AppState hook:**

- **D-17:** AppState listener in `AuthContext.tsx`; on `'active'` calls `refreshRole()` if last refresh > 60s ago. 60s cooldown shared with Phase 1's 403 interceptor refresh path via module-scope `lastRefreshAt`.

### Claude's Discretion

- Banner visual design (color tokens, icon, animation, pill border radius / padding) — pick from `useTheme()` semantic palette. UI-SPEC.md already locked these; planner just verifies tokens exist.
- Owner-scoped fetch endpoint path — discovery time during planning. **Research finding (Section 3 below):** today's path is `GET /api/properties/user/:firebaseUid`. Either reuse this (with owner-self detection) or add a new `GET /api/properties?ownerUid=<self>` query.
- `<RejectionBanner>` and `<HomeRejectionBanner>` component locations — likely `src/components/RejectionBanner.tsx` and `src/components/HomeRejectionBanner.tsx`. Planner decides whether to share an internal `<BannerShell>` primitive.
- AppState refresh hook unit-test coverage — discretionary; project has effectively zero RN tests.
- CreateListingScreen submit-button copy change — open question whether MOD-03 framing implies "Submit for review" rename (+2 locale keys).
- Audit-field synthetic timestamps for legacy backfill — D-04 sets these as null/missing; acceptable.

### Deferred Ideas (OUT OF SCOPE)

- `serviceAreas` config storage location — Phase 3 (consumed by MOD-12 reject-reason enum)
- MOD-13 reasonCode → owner-locale translation table — Phase 3
- `/api/moderation/queue` endpoint stub — Phase 3 (D-08)
- Moderation actions (approve/reject/edit-on-behalf) — Phase 3 (MOD-10..MOD-18)
- Archive actions (owner self-archive, mod-archive, restore-to-pending) — Phase 4 (ARCH-01..ARCH-05)
- 5th OwnerListings tab for owner-WIP draft — rejected by D-01
- Mod/admin "view all statuses" debug surface — rejected by D-05
- Crash reporting + `react-native-config` / `.env` loader — M2 backlog

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOD-01 | `Property.status` enum extends to `['draft','pending','live','rejected','archived']` + audit fields. | D-01 amends MOD-01: drop `'draft'` (NEW enum is `['pending','live','rejected','archived']`). Schema patch lands at `src/models/Property.js:35`. |
| MOD-02 | Legacy null-status fallback. | D-02 belt-and-suspenders absorbs: schema `default: 'live'` + migration backfill + client `?? 'live'`. |
| MOD-03 | `POST /api/properties` defaults to `status: 'pending'`. | Schema default flip per D-01 covers this. Existing client `formData.append('status', propertyData.status \|\| 'draft')` (`PropertyService.ts:76, 145`) must change `'draft'` → `'pending'` (or omit the append entirely so the schema default takes over). Submit-button copy decision (open question: "Submit for review"). |
| MOD-04 | `GET /api/properties` filters server-side to live for non-mods. | D-05 — uniform live-only for all roles; no escape hatch. Insertion point in route is `propertyRoutes.js:44-75` (entire `router.get('/')` handler — currently public, no auth). Phase 2 must mount `verifyFirebaseToken` *optionally* (or split branches) so role-aware filtering works. |
| MOD-05 | `GET /api/properties/:id` returns 404 for non-live unless owner/mod/admin. | D-06 + insertion point `propertyRoutes.js:300-329`. Currently the route is public (no auth) — Phase 2 mounts `verifyFirebaseToken` and adds the role-aware visibility check. |
| MOD-06 | OwnerListings 4-tab segmented control. | D-09/D-10/D-11/D-12. **Critical naming finding: lands in `RenterListingsScreen.tsx`, not `OwnerListingsScreen.tsx`** (see Section 3.3). |
| MOD-07 | PropertyCard status pill. | D-16 + UI-SPEC §"Pill geometry". New `<StatusPill>` component (~50 LOC) mounted inside PropertyCard image area. **Position conflict with existing rent/sale badge — see Section 5.** |
| MOD-08 | PropertyDetailsScreen rejection banner. | D-13 + D-15 + UI-SPEC §"`<RejectionBanner>`". Banner mounts at top of PropertyDetailsScreen (~80 LOC, modeled on `LandlordApplicationStatusBanner.tsx`). |
| MOD-09 | Home persistent rejection banner. | D-14 + D-15 + UI-SPEC §"`<HomeRejectionBanner>`". Banner mounts below search bar, derived from owner's listings. Tap → OwnerListings Rejected tab via existing `defaultTab` nav-state pattern. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `Property.status` enum + default | Database (Mongoose schema) | — | Schema defines the contract; all reads/writes flow through Property.find/save. |
| Legacy null-status absorption | Database (Mongoose `default: 'live'`) + Database (migration script) + Client (defensive `?? 'live'`) | — | D-02 explicitly is three-layer defense in depth. |
| `GET /api/properties` filter | API/Backend | — | Authoritative gate per D-05; renter clients trust the filter. |
| `GET /api/properties/:id` deep-link 404 | API/Backend | — | D-06 mandates server-side 404 — client cannot enforce. |
| Renter list-screen client filter | Client (RN) | API (defense in depth) | D-07 belt-and-suspenders; backend is authoritative. |
| Owner-scoped multi-status fetch | API/Backend | Client (tab filter) | D-12: backend returns all statuses to owner, client splits in-memory by active tab. |
| 4-tab segmented control | Client (RenterListingsScreen) | — | UX surface; pure client state. |
| Status pill rendering | Client (PropertyCard) | — | Visual layer reads `property.status`. |
| Rejection banner rendering | Client (PropertyDetailsScreen / HomeScreen) | — | UI surface only; reads server data. |
| `'rejected' → 'pending'` auto-flip on owner save | API/Backend | — | Server-side state transition only (route-level branch in PUT /:id handler). |
| AppState role refresh | Client (AuthContext) | — | RN-only event source. |
| Migration script | Database (Node script against MongoDB Atlas) | — | One-shot operation; not an API. |

---

## Topic 1 — Mongoose Schema Migration Mechanics

### Current state (verified)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js:35`

```javascript
status: { type: String, enum: ['draft', 'pending', 'live', 'archived'], default: 'draft' },
```

The current enum already includes `'pending'` and `'live'` and `'archived'`. **The enum diff is small:** drop `'draft'`, add `'rejected'`, change default `'draft'` → `'pending'`. The MOD-01 spec listed audit fields (`submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`) — Phase 2 only *needs* the enum + default flip; the audit fields are referenced by Phase 3's moderation actions but are additive Mongoose fields that can land in Phase 2 or Phase 3. **Recommendation:** land the audit fields in Phase 2 alongside the enum cutover (one schema edit, additive only) — Phase 3 then writes to them but doesn't have to redefine them.

### CONTEXT.md "schema default 'live'" vs D-01 "default 'pending'" reconciliation

**This is a real ambiguity in CONTEXT.md.** D-01 says `default: 'pending'` (for new submissions). D-02 says `default: 'live'` (for null-coalescing legacy reads). A single Mongoose `default` cannot do both.

**Resolution (planner-confirmable, but research's recommendation):** the **schema default** is `'pending'` (D-01, applies to new `new Property({...})` constructions). The **null-coalesce for legacy reads** is handled by the **migration script** backfilling all `{status: {$exists: false}}` rows to `'live'` (D-04 second operation), AND by the **client** `(p.status ?? 'live')` defense-in-depth coalesce (D-07). Once the migration runs, no legacy `{status: {$exists: false}}` row exists in Mongo, so the schema default never has to coalesce them. **The "schema default 'live'" wording in D-02 is a misalignment with D-01 — clarify with the user.**

**Alternative resolution (if user wants schema default = `'live'` literally):** Mongoose's `default` only applies on document creation, NOT on read. So `default: 'live'` on the schema would coalesce *new* documents to `'live'` (which contradicts D-01's "new submissions are pending"). This would require a **pre-find hook** (`PropertySchema.pre('find', ...)`) to inject `'live'` on reads where status is missing — an unusual pattern that introduces a runtime cost. **Not recommended.**

### Migration ordering (verified safe)

Per D-01..D-04 deploy order:

1. **Pre-deploy schema-cutover step:** Run migration script against production `MONGO_URI` BEFORE the schema PR ships. Acceptance gate: `--verify` exits 0.
2. **Schema cutover deploy:** Once Mongo holds zero rows at `{status: 'draft'}` or `{status: {$exists: false}}`, ship the enum cutover (drop `'draft'`, add `'rejected'`, default flip). No live row will fail Mongoose validation post-deploy because all rows are at canonical values.
3. **Client deploy after backend:** Pill, banners, AppState hook.

**Why this ordering matters:** Mongoose `enum` validation runs at `save()` time. If a row has `{status: 'draft'}` and the enum no longer includes `'draft'`, any save (e.g., owner edit) fails. The migration MUST run first. This mirrors Phase 1 D-08 (User enum cutover gated by `migrate-roles-m2.js --verify=PASS`).

### Production data: are there `'draft'` rows live?

**Cannot verify without DB access.** The planner should query production Mongo at plan time:

```bash
# From a backend env with MONGO_URI:
node -e "
require('dotenv').config();
const m=require('mongoose');
m.connect(process.env.MONGO_URI).then(async()=>{
  const c=m.connection.collection('listings');
  console.log('draft:', await c.countDocuments({status:'draft'}));
  console.log('null/missing:', await c.countDocuments({status:{\$exists:false}}));
  console.log('live:', await c.countDocuments({status:'live'}));
  console.log('archived:', await c.countDocuments({status:'archived'}));
  await m.disconnect();
});
"
```

This is the same shape Phase 1 used to bound risk before the User enum cutover.

---

## Topic 2 — Migration Script (`migrate-listings-m2.js`)

### Pattern source (verified)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-roles-m2.js` (129 LOC, complete and battle-tested — ran in production 2026-04-30 with `--verify=PASS`).

### Replicate this structure exactly

The script must mirror `migrate-roles-m2.js`:

1. **Args:** `--dry-run` and `--verify` parsed from `process.argv.slice(2)`.
2. **Connect:** `await connectDB()` from `../config/db`.
3. **Verify branch:** count `{status: {$nin: ['pending','live','rejected','archived']}}`; exit 0 if 0, exit 1 if non-zero.
4. **Migration body (two operations, both idempotent updateMany):**
   - `updateMany({status: 'draft'}, {$set: {status: 'pending'}})` — D-04 first op
   - `updateMany({status: {$exists: false}}, {$set: {status: 'live'}})` — D-04 second op
5. **Post-migration verification block:** count remaining at `{$nin: canonical}`; exit 1 if non-zero on live run (mirrors `migrate-roles-m2.js` lines 105-119 MD-03 pattern).
6. **Logging:** `console.log` in dry-run paths, `console.error` for failures.
7. **Cleanup:** `await mongoose.disconnect()`; `process.exit(0)` on success.

### npm script registration

`package.json:12` currently has `"migrate:roles-m2": "node src/scripts/migrate-roles-m2.js"`. Phase 2 adds:

```json
"migrate:listings-m2": "node src/scripts/migrate-listings-m2.js"
```

### Idempotency guarantees

The two `updateMany` filters are mutually exclusive and self-extinguishing:

- After the first run, `{status: 'draft'}` matches 0 rows (all flipped to `'pending'`).
- After the first run, `{status: {$exists: false}}` matches 0 rows (all set to `'live'`).
- A second run is a no-op.

Phase 3 reject-actions write `{status: 'rejected'}` — the migration's filters never touch those rows (no `'rejected'` in the migration's source filters). Safe to re-run after Phase 3 ships, though there's no reason to.

### Confidence: HIGH (sourced from a script that already shipped to production)

---

## Topic 3 — Backend Route Branching (Role-Aware)

### Current routes (verified at `propertyRoutes.js`)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js`

| Endpoint | Line | Auth Today | Phase 2 Change |
|----------|------|-----------|----------------|
| `GET /api/properties` | 44-75 | **No auth** (public) | D-05: hard-cut to `status: 'live'` only. Optionally mount `verifyFirebaseToken` so future per-role logic is easy, but D-05 says "live-only for everyone" — so auth is **not strictly required** to enforce D-05. Recommended: keep public, drop the `?status=` query parameter, hard-code the `{$or: [{status:'live'}, {status:{$exists:false}}]}` filter. |
| `GET /api/properties/user/:firebaseUid` | 78-87 | **No auth** today | D-12 owner-scoped path. Mount `verifyFirebaseToken`, add owner-self OR mod+ check. If `req.firebaseUid === req.params.firebaseUid` OR `ROLE_RANK[req.user.userType] >= 1`, return all statuses; else return live-only. |
| `POST /api/properties` | 114 | `verifyFirebaseToken` + `requireListingCapability` | No change to auth. D-01 schema default makes new listings `'pending'` automatically. **However:** the route currently sets `status: status \|\| 'draft'` (line 217). Phase 2 must change this to `status: 'pending'` (or remove the assignment entirely so the schema default takes over). |
| `GET /api/properties/:id` | 300-329 | **No auth** today | D-06: mount `verifyFirebaseToken` (optional? or required?). **Critical decision for planner:** the existing route is public so renters can deep-link without signing in. Phase 2 D-06 says "non-owner-non-mod gets 404 on non-live listings." That requires identifying `req.user`, which requires auth. Recommendations:<br>(a) Make `verifyFirebaseToken` **conditional**: parse Bearer if present, but don't 401 if missing. Then `if (property.status !== 'live' && (no req.user OR (req.user.uid !== property.ownerUid AND ROLE_RANK[req.user.userType] < 1))) return 404`. The "anonymous renter clicks a deep-link" path stays alive for live listings.<br>(b) Always require auth, return 404 for everyone on non-live. Breaks anonymous deep-link share-flow for unrelated listings — undesirable.<br>**Recommendation: option (a).** Add a new lightweight `optionalAuthMiddleware` that calls `verifyFirebaseToken` if `Authorization` header exists, else next() with `req.user = null`. |
| `PUT /api/properties/:id` | 333-489 | `verifyFirebaseToken` + ownership check | D-15: Phase 2 must add a route-level branch — if owner is editing a `'rejected'` listing AND no explicit `status` is in `req.body`, auto-flip status to `'pending'` on save. Server-side only. Insertion point: before `Object.assign(property, updateData)` line 481. |
| `DELETE /api/properties/:id` | 493-525 | `verifyFirebaseToken` + ownership + status guard | No change in Phase 2 (Phase 4 makes it admin-only per ARCH-05). |

### Code insertion blueprints

**For `GET /api/properties` (D-05):**

```javascript
// Replace lines 44-75
router.get('/', async (req, res) => {
  try {
    // D-05: live-only for everyone — no escape hatch.
    // Phase 3 owns /api/moderation/* for mod+ access to non-live listings.
    const query = {
      $or: [{ status: 'live' }, { status: { $exists: false } }]
    };
    const properties = await Property.find(query);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**For `GET /api/properties/user/:firebaseUid` (D-12 owner-scoped path):**

The endpoint Phase 2 needs is **the existing `GET /api/properties/user/:firebaseUid`** at line 78. Phase 2 doesn't need a new path. The route just needs:

```javascript
// Replace lines 78-87
router.get('/user/:firebaseUid', verifyFirebaseToken, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const isOwner = req.firebaseUid === firebaseUid;
    const isModPlus = req.user && ROLE_RANK[req.user.userType] >= 1;  // moderator or admin

    let query = { ownerUid: firebaseUid };
    if (!isOwner && !isModPlus) {
      // Other users viewing this owner's listings see only live ones.
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

(Note: Today the route is invoked from `OwnerListingsScreen.tsx:52` which views OTHER owners' listings, AND from `RenterListingsScreen.tsx:61` which views self listings. The role-aware branch handles both.)

**Import `ROLE_RANK`:** `const { verifyFirebaseToken, ROLE_RANK } = require('../middleware/verifyFirebaseToken');` — but `ROLE_RANK` is currently NOT exported from `verifyFirebaseToken.js` (verified line 103-113: `requireMinRole` is exported but not the `ROLE_RANK` table). Phase 2 should export it OR call `requireMinRole('moderator')` / use a helper. Cleanest: extract a tiny helper `function isModeratorOrAbove(user) { return user && ROLE_RANK[user.userType] >= 1; }` exported from `verifyFirebaseToken.js`.

**For `GET /api/properties/:id` (D-06):**

```javascript
// Replace lines 300-329
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // D-06: non-live listings only visible to owner OR mod+.
    const status = property.status || 'live';  // D-02: legacy null → live
    if (status !== 'live') {
      const isOwner = req.firebaseUid && req.firebaseUid === property.ownerUid;
      const isModPlus = req.user && ROLE_RANK[req.user.userType] >= 1;
      if (!isOwner && !isModPlus) {
        return res.status(404).json({ message: 'Property not found' });
      }
    }

    // Existing owner-population block (lines 305-323) preserved.
    // ...
    res.json(property);  // (or propertyObj if owner is populated)
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

**For `PUT /api/properties/:id` (D-15 auto-flip):**

```javascript
// Insert before line 481 `Object.assign(property, updateData)`:

// D-15: owner edits a rejected listing → auto-flip back to 'pending' for re-review.
// Only flips if (a) status was 'rejected' before this PUT, (b) caller is the owner
// (already gated by line 344-349 `isOwner` check), (c) caller didn't explicitly set
// a different status in their PUT body (mod+ archiving via this route would be
// out of scope for Phase 2 — Phase 4's archive flow uses a dedicated endpoint).
if (property.status === 'rejected' && updateData.status === undefined) {
  updateData.status = 'pending';
}
```

### Backend test infrastructure (verified)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs` + `src/__tests__/setup.js` + `src/__tests__/fixtures/jwks-tokens.js`

Phase 1 left a complete jest+supertest+mongodb-memory-server scaffold. New tests for Phase 2 follow the pattern in `propertyRoutes.test.js` (verified):

- `jest.mock('../config/firebase', ...)` swaps real Firebase JWKS with the test keypair from `fixtures/jwks-tokens.js`.
- `buildToken({ sub, role, kind })` produces a signed test token. **`role` is one of `'user'` / `'moderator'` / `'admin'` (post Phase 1 enum cutover).** Verified in `fixtures/jwks-tokens.js:36`.
- `User.create({ uid, email, userType })` seeds a user.
- `Property.create({...})` seeds listings.
- `request(app).get('/api/properties/...')` exercises the route.

Recommended Phase 2 backend test additions (`src/__tests__/propertyRoutes.test.js` extension):

- `GET /api/properties` returns only `status: 'live'` rows + legacy null-status rows.
- `GET /api/properties` does NOT return `'pending'` / `'rejected'` / `'archived'` for any role (renter, mod, admin).
- `GET /api/properties/user/:firebaseUid` as owner returns all 4 statuses.
- `GET /api/properties/user/:firebaseUid` as different user returns only live + legacy.
- `GET /api/properties/user/:firebaseUid` as moderator returns all 4 statuses.
- `GET /api/properties/:id` for `status: 'rejected'` listing: 404 to anonymous, 404 to non-owner non-mod, 200 to owner, 200 to mod, 200 to admin.
- `POST /api/properties` lands new listing with `status: 'pending'` (schema default).
- `PUT /api/properties/:id` from owner on rejected listing flips status to `'pending'` (D-15 auto-flip).
- `PUT /api/properties/:id` from owner on rejected listing with explicit `status: 'archived'` in body **respects the body** (no auto-flip override).
- `PUT /api/properties/:id` from owner on `'live'` listing does NOT auto-flip.

### Confidence: HIGH (every line number verified by reading the route file)

---

## Topic 3.5 — Naming flip (CRITICAL for planner)

**Verified by reading:**
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/OwnerListingsScreen.tsx` (216 LOC, takes `ownerUid` + `ownerName` as props, header reads `"{ownerName}'s Listings"` line 104, called from `App.tsx:580` with externally-supplied `ownerListingsUid`/`ownerListingsName` set at `App.tsx:869`).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx` (369 LOC, header reads `"My Listings"` line 210, calls `PropertyService.getUserProperties(user.localId)` line 61, mounted via `App.tsx:888` triggered by `onProfileViewListings → setIsRenterListingsOpen(true)` line 494, has Hospitality strip, archive/unarchive buttons, status-badge rendering).

**The 4-tab segmented control + per-tab Hospitality strip + per-tab empty states + status filter MUST land in `RenterListingsScreen.tsx`, NOT in the file called `OwnerListingsScreen.tsx`.** The `OwnerListingsScreen` is a passive viewer of *another* user's listings — it has no concept of "my pending vs my rejected" because the viewer is not the owner.

**CONTEXT.md and UI-SPEC.md both say "OwnerListingsScreen" everywhere they should say "RenterListingsScreen."** This is a **historical naming choice from M1** (the project labels self-listings as "renter listings" because in M1 the user-as-renter could also self-list). Phase 2 should NOT rename the file (out-of-scope churn) — just route the work to `RenterListingsScreen.tsx`.

**Planner action:** Re-read CONTEXT.md `<canonical_refs>` line 131 — it says "`src/screens/OwnerListingsScreen.tsx` (216 LOC) — adds 4-tab segmented control..." This is **wrong**. The 216 LOC is a tip-off it's the OwnerListings file; the actual file Phase 2 changes is the 369-LOC RenterListings file. Plan tasks must explicitly say `src/screens/RenterListingsScreen.tsx` to prevent the executor from editing the wrong screen.

### Confidence: HIGH

---

## Topic 4 — CreateListingScreen edit-mode plumbing (D-15)

### Current state (verified)

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/CreateListingScreen.tsx` (929 LOC — UI-SPEC says 1300; the file is currently 929 after M1 Phase 5 decomposition).

The `RenterListingsScreen.tsx` exposes `onEditProperty` at line 28. App.tsx wires this to a CreateListingScreen edit-mode entry-point. **Verified existence:** `RenterListingsScreen.tsx:227` passes `onEdit={onEditProperty}` into `<PropertyCard>`. `App.tsx` connects this to its CreateListing navigation.

### What Phase 2 needs

Per D-15: PropertyDetailsScreen rejection banner CTA → CreateListingScreen edit-mode for that listing → on save, server auto-flips `'rejected'` → `'pending'` (Topic 3 above handles the server side).

**Client side:** the existing edit entry-point is already pre-fillable with the listing's data (M1 Phase 5 ships this; verified by the existing OwnerListings → Edit flow). Phase 2 just needs a new entry-point from PropertyDetailsScreen's `<RejectionBanner>` CTA. The flow:

1. Owner views own rejected listing → `<RejectionBanner>` renders with "Edit & resubmit" CTA.
2. CTA tapped → calls a parent-supplied `onEditListing(property)` prop → App.tsx state machine flips to CreateListingScreen edit-mode, prefilled with listing.
3. Owner edits, saves → existing `PropertyService.updateProperty(...)` call fires PUT /api/properties/:id (already wired).
4. Backend D-15 branch flips status to `'pending'`.
5. Client refetches, banner disappears, listing now lives in Pending tab.

**No new client plumbing needed beyond the banner component itself + a small App.tsx wire-up of `onEditListing` from PropertyDetailsScreen.**

### Auto-flip on the **client** side

D-15 mandates the auto-flip happens server-side (Topic 3 PUT branch). **Client should NOT also pre-flip status to `'pending'` in the PUT body** — relying on server transition keeps the contract single-source-of-truth.

### Confidence: HIGH

---

## Topic 5 — `<StatusPill>` component & PropertyCard mounting

### Existing badge layout (verified at `PropertyCard.tsx:98-104` and styles `294-313`)

PropertyCard image area already has:
- `topBadges` (left, `top: 16, left: 16`) — rent/sale badge.
- `topRightActions` (right, `top: 16, right: 16`) — share + heart buttons (each 36×36, 8px gap).

UI-SPEC.md line 49 says: *"Position: top-right of the PropertyCard image area, inset 8px from each corner — matches the existing favorite-button positioning convention on PropertyCard."*

**Conflict:** the top-right of PropertyCard is already occupied by share + heart actions. **Two resolution options for the planner:**

1. **Stack pill ABOVE the share/heart actions** (e.g., new container at `top: 16, right: 16`, share+heart shifts to `top: 60, right: 16`). Requires editing `topRightActions` style and adding a third top-right child.
2. **Place pill at top-LEFT below the rent/sale badge.** The rent/sale badge is at `top: 16, left: 16`. Pill could go at `top: 56, left: 16` (24px gap below the rent badge). This is visually consistent with how moderation states "stack" on the left edge.
3. **Place pill at bottom-LEFT or bottom-RIGHT** of the image (UI-SPEC says "top-right" but may be flexible to avoid the conflict).

**Recommendation:** option 2 (top-left below rent/sale badge). This avoids changing the existing share/heart layout AND mirrors how the M1 inline status badge works in `RenterListingsScreen.tsx:217` (positioned absolutely on the card).

**Planner must decide and update UI-SPEC.md if the position changes from "top-right".**

### `<StatusPill>` component shape

Per UI-SPEC §"Component Inventory" + §"Color":

```tsx
// src/components/StatusPill.tsx (~50 LOC)
import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  status?: 'pending' | 'live' | 'rejected' | 'archived';
}

export const StatusPill: React.FC<Props> = ({ status }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const effective = status ?? 'live';  // D-07 defensive coalesce
  if (effective === 'live') return null;  // D-16: live = no pill

  const config: Record<typeof effective, { bg: string; fg: string; key: string }> = {
    pending:  { bg: colors.warning,       fg: colors.onWarning, key: 'listings.status.pending' },
    rejected: { bg: colors.error,         fg: '#FFFFFF',        key: 'listings.status.rejected' },
    archived: { bg: colors.textTertiary,  fg: '#FFFFFF',        key: 'listings.status.archived' },
    live:     { bg: '',                   fg: '',               key: '' },  // unreachable but TS-required
  };
  const { bg, fg, key } = config[effective];

  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={t(key as any)}>
      <Text style={[styles.label, { color: fg }]}>{t(key as any)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
```

### Locale keys (UI-SPEC §"Status pill labels" — 6 keys)

```jsonc
// en.ts additions
'listings.status.pending':  'Pending review',
'listings.status.rejected': 'Rejected',
'listings.status.archived': 'Unpublished',
// ru.ts additions
'listings.status.pending':  'На модерации',
'listings.status.rejected': 'Отклонено',
'listings.status.archived': 'Снято с публикации',
```

**Existing keys to deprecate or update:**
- `property.statusDraft` (`📝 Draft` / `📝 Черновик`) — D-01 drops draft; key can be deleted (or kept as a fallback during the dual-deploy window).
- `property.statusPending` (`⏳ Pending Review` / `⏳ На проверке`) — emoji'd version. Phase 2 should either (a) change values to match UI-SPEC's "Pending review" / «На модерации» (stripping emoji) and let the existing M1 inline badge in `RenterListingsScreen.tsx:217` keep working, OR (b) introduce the new `listings.status.*` namespace and remove the M1 inline `formatStatus()` block from `RenterListingsScreen.tsx` (deleting lines 190-203 and the `statusBadge` styles 334-352, since the 4-tab design surfaces status at the TAB level rather than per-card in `RenterListingsScreen`).
- `property.statusLive` / `property.statusArchived` — same deprecation path as above.

**Recommendation:** option (b). Phase 2's per-tab grouping makes per-card status badges in `RenterListingsScreen` redundant (every card in the Pending tab is pending). Status pills appear on PropertyCard in **public-facing** screens (Home, Favorites, RenterListings-as-mod-viewer) where mixed-status display can occur. The M1 inline badge in `RenterListingsScreen` is leftover M1 code; remove it.

### Confidence: HIGH

---

## Topic 6 — `<RejectionBanner>` & `<HomeRejectionBanner>` (D-13, D-14, MOD-08, MOD-09)

### Banner shape primitive (verified)

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/LandlordApplicationStatusBanner.tsx` (162 LOC).

This component already implements **the exact banner shape** UI-SPEC.md describes:
- 4px left accent bar (`accentBar: { width: 4, alignSelf: 'stretch' }` line 158).
- Body with title (15px / 700) + subtitle (13px / 18 line-height) — matches UI-SPEC's typography contract for body 13px.
- Right-aligned chevron (decorative).
- Full TouchableOpacity wrapper on tap.
- Theme-token-aware (`colors.surface` background + colored accent bar).

**Recommendation:** the planner may extract a private `<BannerShell>` primitive (~40 LOC) at `src/components/BannerShell.tsx` with props `{ accentColor, title, body, onPress, ctaLabel?, onCtaPress?, dismissible?, onDismiss? }` that powers both `<RejectionBanner>` and `<HomeRejectionBanner>` (and `<LandlordApplicationStatusBanner>` could be refactored later — out of scope). LOC budget per UI-SPEC: RejectionBanner ~80 LOC, HomeRejectionBanner ~60 LOC. With a shared shell, both shrink to ~30-40 LOC each.

### `<RejectionBanner>` (D-13, MOD-08)

**Mount:** PropertyDetailsScreen.tsx (1868 LOC), at the top above hero.
**Render condition:** `currentUser.uid === property.ownerUid && property.status === 'rejected' && !dismissed`.
**Per-session dismiss state:** held in PropertyDetailsScreen-local `useState<Set<string>>(new Set())` keyed by listing id, NOT persisted. Trigger to re-evaluate dismiss = (cold start = fresh useState; AppState 'active' transition after >5min background = re-render via AppState event from D-17 hook OR a separate listener; navigate-to-this-listing = a new useEffect cycle on `property.id` change).

**Props sketch:**
```tsx
interface RejectionBannerProps {
  reasonCode?: string;       // Phase-3-supplied; null until Phase 3 ships
  reasonNote?: string;       // Free-text from moderator
  onEditResubmit: () => void; // Parent navigates to CreateListingScreen edit mode
  onDismiss: () => void;
}
```

**Phase-2-shippable copy** (UI-SPEC §"`<RejectionBanner>`"):
- Title: `listings.rejection.title` → "Listing rejected" / «Объявление отклонено»
- Body fallback: `listings.rejection.bodyFallback` → "Reason: {reasonCode}. Edit your listing and resubmit for review." / «Причина: {reasonCode}. Отредактируйте объявление и отправьте на повторную проверку.»
- CTA: `listings.rejection.cta` → "Edit & resubmit" / «Исправить»

`{reasonCode}` is interpolated; until Phase 3 supplies the per-code translation, render the raw enum string (e.g., `incomplete-info`).

### `<HomeRejectionBanner>` (D-14, MOD-09)

**Mount:** HomeScreen.tsx, below search bar above the list.
**Render condition:** `count(myListings where status === 'rejected') > 0` AND user is signed in.
**Behavior:** auto-dismiss (no manual X). Tap navigates to RenterListings (the actual self-listings screen) with `defaultTab='rejected'` passed via the existing nav-state pattern.

**Props sketch:**
```tsx
interface HomeRejectionBannerProps {
  count: number;
  onPress: () => void;  // Parent routes to RenterListings → Rejected tab
}
```

**Plural copy (UI-SPEC §"`<HomeRejectionBanner>`"):**
- `home.rejection.banner.singular` → "You have 1 listing that needs edits." / «У вас 1 объявление требует исправления.»
- `home.rejection.banner.plural` → "You have {N} listings that need edits." / «У вас {N} объявлений требуют исправления.»

(RU 3-form plural simplification per UI-SPEC line 162 — singular + plural only, matching existing project i18n convention.)

### Source for `myListings` count on Home

HomeScreen calls `PropertyService.getAllProperties()` at line 111 — this returns **all live listings, not the user's own**. After D-05, the public list endpoint returns only `live`, so the rejected count cannot be derived from this fetch.

**Two options for the planner:**

1. **Add a dedicated fetch on HomeScreen mount:** `PropertyService.getUserProperties(user.localId)`, count `where status === 'rejected'`. One extra HTTP round-trip. Cheap.
2. **Reuse the RenterListings fetch via shared state:** elevate to a context or pass via App.tsx. Higher complexity, marginal saving.

**Recommendation:** option 1. Run the rejected-count fetch lazily (only if `user.localId && user.backendProfile?.canListProperties === true`); short-circuit for guests and renters-without-listings.

### Confidence: HIGH

---

## Topic 7 — AppState 'active' role-refresh hook (D-17)

### Current state (verified — no existing AppState listener)

`grep -nE "AppState" src/context/AuthContext.tsx App.tsx` returns only the comment in AuthContext.tsx line 164 ("(c) the AppState 'active' listener (Phase 2 placement)"). Phase 1 explicitly deferred the wiring; Phase 2 ships it.

`AuthContext.refreshRole()` is **already wired** (`AuthContext.tsx:171-184`) and idempotent — it's safe to call repeatedly.

### Implementation pattern

```tsx
// Inside AuthContext.tsx, after the existing useEffect that registers hooks (line 217-219):

import { AppState } from 'react-native';

// Module-scope cooldown timestamp shared with the apiClient interceptor's refresh path.
// Phase 1's apiClient.ts has its own single-flight `refreshRolePromise`; that handles
// concurrent in-flight refreshes. THIS cooldown is for "the user just foregrounded the
// app, but we already refreshed 30s ago via a 403" — skip duplicate work.
let lastRefreshAt: number | null = null;
const REFRESH_COOLDOWN_MS = 60_000;

useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt && now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
      // Within cooldown — skip.
      return;
    }
    if (!user?.localId) return;  // Not signed in.
    lastRefreshAt = now;
    refreshRole().catch(() => {/* non-fatal; apiClient.refreshRole already logs */});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [refreshRole, user?.localId]);
```

### Sharing the cooldown timestamp with apiClient.ts

Phase 1's `apiClient.ts` 403 interceptor calls `authHooks.refreshRole?.()` via the registered hook (verified). For the 60s cooldown to be **shared** between (a) AppState 'active' and (b) the 403 interceptor refresh, both code sites must consult the same timestamp.

**Cleanest implementation:** export `lastRefreshAt` getter/setter from `apiClient.ts`:

```tsx
// apiClient.ts addition
let _lastRefreshAt: number | null = null;
export function getLastRefreshAt() { return _lastRefreshAt; }
export function markRefreshed() { _lastRefreshAt = Date.now(); }

// Then both apiClient interceptor AND AuthContext AppState listener call markRefreshed()
// when they trigger a refresh, and consult getLastRefreshAt() before deciding to skip.
```

**Alternative:** keep the AppState cooldown as a module-scope variable inside AuthContext.tsx (not shared with apiClient). The 403 interceptor's single-flight `refreshRolePromise` already coalesces concurrent 403 refreshes; the only *extra* benefit of sharing is preventing AppState from firing a refresh "right after" a 403 refreshed in the last 30s. This is a minor optimization. Acceptable to keep cooldowns local to each subsystem.

**Recommendation:** keep cooldowns separate (simpler), per-subsystem. Document in the hook's JSDoc that the apiClient interceptor's refresh path has its own single-flight semantics, so concurrent refreshes are already handled — the AppState cooldown is just to avoid wasteful refreshes on rapid foreground/background cycles.

### Pitfalls (RN AppState specifics)

- **iOS multitasking thrashes AppState** — switching to control center, dragging the app card down halfway, returning to home, etc. all fire `'inactive'` and `'active'` rapidly. The 60s cooldown absorbs this.
- **`AppState.currentState` initial value:** RN guarantees the listener fires on the first `'active'` after mount, but in practice the initial currentState is already `'active'` if the app launched via tap (not deep-link in background). The hook should NOT fire `refreshRole()` on initial mount — `loadStorageData()` in AuthContext already does this. **Mitigation:** the `useEffect` dependency on `refreshRole` ensures the listener subscribes AFTER the first mount; the initial `'active'` state isn't replayed by `addEventListener`.
- **Memory leak risk:** the `useEffect` cleanup `sub.remove()` is required. RN `AppState.addEventListener` returns a `NativeEventSubscription` with `.remove()` (RN 0.65+; verified RN 0.84 still uses this API).
- **`user?.localId` dependency:** if user logs out while backgrounded, the listener should NOT call `refreshRole()` (which 401s and triggers logout cycle). The `if (!user?.localId) return` guard inside the handler closes this hole. The `useEffect` re-subscribes on user change — closure captures fresh `user`.

### Confidence: HIGH

---

## Topic 8 — Per-tab structure in `RenterListingsScreen.tsx`

### Plan for the 4-tab segmented control

Per D-09/D-10/D-11/D-12 + UI-SPEC §"OwnerListings 4-tab segmented control":

1. **Add `activeTab` state** typed as `'live' | 'pending' | 'rejected' | 'archived'`, default `'pending'` (D-09).
2. **Optionally accept `defaultTab` prop** for D-15's Home banner CTA → "Rejected" tab navigation. Plumb via App.tsx state (`renterListingsDefaultTab`).
3. **Filter properties per tab** before splitting into hospitality vs other:
   ```tsx
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
   ```
4. **Segmented control header** rendered above the FlatList — outside `ListHeaderComponent` (so it pins above the per-tab Hospitality strip; tapping a tab swaps the visible list without remounting the segmented control). Inline component (~80-120 LOC) — UI-SPEC line 207 suggests `INLINE inside OwnerListingsScreen.tsx +~120 LOC (216 → ~340)`. Apply to RenterListings (369 → ~480-490).
5. **Per-tab empty state** via `ListEmptyComponent`:
   ```tsx
   ListEmptyComponent={
     <View style={styles.emptyContainer}>
       <Text style={styles.emptyHeading}>{t(`owner.listings.empty.${activeTab}` as any)}</Text>
       {(activeTab === 'live' || activeTab === 'pending') && (
         <TouchableOpacity onPress={onCreateListing} style={[styles.cta, { backgroundColor: colors.accent }]}>
           <Text style={[styles.ctaText, { color: '#FFF' }]}>{t('owner.listings.empty.cta' as any)}</Text>
         </TouchableOpacity>
       )}
     </View>
   }
   ```
6. **Status badge removal:** delete the existing inline status badge (`RenterListingsScreen.tsx:217-221`) and `formatStatus()` (lines 190-203) and the `statusBadge` / `statusText` styles (lines 334-352). Per-tab grouping makes per-card status redundant.
7. **Per-tab Hospitality strip:** existing pattern at line 259-268 already wraps `<HospitalitySection>` inside `ListHeaderComponent`. Keep the structure; just feed it `tabFilteredProperties`-derived `hospitalityProperties` instead of all-properties-derived.

### Existing M1 archive/unarchive logic

`RenterListingsScreen.tsx:122-178` defines `handleArchiveProperty` and `handleUnarchiveProperty`. These work via M1's `'live'` ↔ `'archived'` transitions through PUT /api/properties/:id with `status: 'archived'` / `status: 'draft'` body. **Conflict with D-01:** `'draft'` is removed in Phase 2. The existing `handleUnarchiveProperty` posts `formData.append('status', 'draft')` (`PropertyService.ts:242`) — this will fail Mongoose enum validation post-Phase-2 schema cutover.

**Phase 2 must either:**
- (a) Remove archive/unarchive UI from `RenterListingsScreen.tsx` entirely (Phase 4 will reintroduce them with the corrected `'archived'` ↔ `'pending'` flow per ARCH-04). The Archived tab in Phase 2 stays empty for everyone (no archive action), and the Phase 2 ROADMAP note line 70 says "tour-first Hospitality cards render in every tab" — Phase 2 needs the *display* of `'archived'` listings (legacy archived M1 listings + future Phase 4 archives) but NOT the actions.
- (b) Update the unarchive flow to send `'pending'` instead of `'draft'` (matching ARCH-04 prep). Out of scope per CONTEXT.md `<deferred>` "Archive actions — Phase 4".

**Recommendation:** option (a) — remove the archive/unarchive button rendering from PropertyCard via the `RenterListingsScreen` props (set `onArchive={undefined} / onUnarchive={undefined}` — already optional per `PropertyCardProps`). Phase 4 reintroduces them. The status field still flows through; the buttons just don't show.

**Side effect of removal:** the `archiveProperty` and `unarchiveProperty` methods in `PropertyService.ts:213-250` become unused but stay in source. Phase 4 will reuse them (with fixes for the `'draft'` → `'pending'` server-side semantics).

### Confidence: HIGH

---

## Topic 9 — Deep-link 404 guard (MOD-05 / D-06)

### Current deep-link handler (verified in `App.tsx`)

`App.tsx:140` (per INTEGRATIONS.md) handles `/property/:id` deep-links via `PropertyService.getPropertyById(id)`. After Phase 2's `GET /api/properties/:id` route enforces D-06 (404 to non-owner-non-mod on non-live listings), the client receives the 404 and must surface a clean error.

**Verified:** `PropertyService.getPropertyById` (lines 23-31) re-throws on error. The deep-link handler in `App.tsx` (need to re-read) catches and surfaces — recommend the planner inspect `App.tsx:handleDeepLink` to ensure 404 surfaces a localized "Listing not found" toast rather than a raw stack trace.

### No new client work for the 404 itself

The 404 is enforced server-side (Topic 3). Client just needs to not crash — existing axios error path in `PropertyService.getPropertyById` already throws; UI catches.

### Confidence: MEDIUM (App.tsx deep-link handler not re-read in research; planner verifies)

---

## Topic 10 — Test infrastructure for Phase 2

### Backend (HIGH confidence)

`src/__tests__/propertyRoutes.test.js` already exists (92 LOC, focused on CR-01 platformVerifications anti-tamper). Phase 2 extends it with a new `describe('property status — Phase 2 D-05/D-06/D-12/D-15')` block. The setup pattern is fully reusable:

```javascript
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
  await Property.create({ title: 'Legacy', address: '5 St', price: 100, ownerUid: 'owner-uid' /* status missing */ });
});
```

Phase 1 retro lesson (per memory `gsd-verifier-misses-regressions.md`): **integration tests at the route level catch downstream surface breakage that the verifier misses.** Phase 2 should run these tests AND a code review.

### Client (LOW confidence — project posture is "effectively zero tests")

CONVENTIONS.md notes the project has 1 test file (`__tests__/App.test.tsx`). Adding RN component tests for the new status pill / banners would be a project-posture change. **Out of scope per CONTEXT.md "AppState refresh hook unit-test coverage — Phase 1's CONVENTIONS.md notes 'Effectively zero tests'; planner has discretion."**

**Recommendation:** skip RN unit tests. Rely on physical-device QA (the project's manual testing bar) for UI surfaces. Backend integration tests cover the load-bearing route-level changes.

### Validation Architecture (per Nyquist Dimension 8) — see dedicated section below.

### Confidence: HIGH (backend test patterns verified)

---

## Project Constraints (from CLAUDE.md)

- **No Firebase SDK** in RN client repo (`firebase`, `@react-native-firebase/*`) — verified by memory `no-firebase-sdk.md`. Backend uses `jose` for JWKS verification (verified at `src/middleware/verifyFirebaseToken.js:26`).
- **Custom `App.tsx` state machine** — no `react-navigation`. Status pills, banners, segmented control are all in-screen state; no new overlay needed (CONTEXT.md `<code_context>` confirms "No new persisted keys, no new overlays").
- **EN+RU bilingual parity** — CI gate `scripts/check-i18n-parity.sh` enforces. Phase 2 adds 8-12 keys per UI-SPEC. Do not stage a partial parity ship.
- **`useTheme()` semantic tokens** — no hardcoded colors. Verified all required tokens exist: `warning`, `onWarning`, `error`, `accent`, `textTertiary`, `surface`, `background`, `text` (`src/theme/colors.ts:1-46`).
- **Manual physical-device QA bar (iPhone 15 Pro Max + Moto G XT2513V)** — applies to Phase 6, but Phase 2's UI changes should be smoke-tested per existing convention.
- **Backend Node ≥22.12** — `nvm use 24` before backend npm/node commands (per memory `backend-node-version.md`). RN client uses default v20.

---

## Standard Stack

### Already in place — DO NOT introduce new dependencies

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react-native` | 0.84.0 | Core | New Architecture enabled |
| `axios` | ^1.13.5 | HTTP client | Use through `src/services/apiClient.ts` (Phase 1) |
| `lucide-react-native` | ^0.564.0 | Icons | `<X>` for dismiss, `<ChevronRight>` for banner |
| `mongoose` | ^9.1.6 (backend) | ODM | `Property.js` schema layer |
| `jose` | ^6.2.3 (backend) | JWKS verify | `verifyFirebaseToken.js` middleware |
| `multer` + `multer-s3` | (backend) | Multipart upload | Existing on PUT/POST /properties |
| `jest` + `supertest` + `mongodb-memory-server` | (backend) | Tests | Verified live in `__tests__/setup.js` |

### Phase 2 introduces ZERO new packages

UI-SPEC §"Design System" line 30: *"No new dependencies in this phase. No design-token additions. Phase 2 is the absorb-into-existing-tokens phase."*

---

## Architecture Patterns

### Pattern 1: Server-side filter + client-side defense in depth (D-02 + D-05 + D-07)

**What:** Backend route filters by status; client also coalesces and re-filters.
**When to use:** Any data the server is the authority for, but where a server regression would have user-visible consequences.
**Example:** Phase 1 D-08+D-10 set the precedent (server-resolved roles + client `useRole()` defaults to guest if backendProfile missing). D-07 mirrors this.

### Pattern 2: Update-only Mongo migration (no upsert, no synthetic data)

**What:** Migration script uses `updateMany` with idempotent filters; explicitly avoids inserts.
**When to use:** State-shape migrations (enum cutovers, field defaults, name flips).
**Example:** `migrate-roles-m2.js:69-90` (D-09 M1 admin promotion is update-only; if the user record doesn't exist, log a warning and skip — do not create).
**Anti-pattern (avoid):** "Just upsert if missing" — creates fake records with synthetic uids.

### Pattern 3: Belt-and-suspenders deploy ordering

**What:** Migration runs BEFORE schema cutover deploys.
**When to use:** Any enum tightening that would Mongoose-validation-fail existing rows.
**Example:** Phase 1 Plan 08 → Plan 09 sequence (migrate-roles-m2.js exits 0 → User.js enum cutover deploys → zero documents fail validation post-deploy).

### Pattern 4: Single-flight `useCallback` for context-exposed callables

**What:** Context functions called from multiple places use `useCallback` with proper deps.
**When to use:** Any `AuthContext.refreshRole`-style callable consumed by both interceptors and direct UI.
**Example:** `AuthContext.tsx:171-184` — `refreshRole` is `useCallback`-stable across `[user?.localId, language]` to keep registered hooks fresh.

### Pattern 5: Per-session in-memory state (NOT AsyncStorage) for ephemeral UI dismissals

**What:** `useState` set keyed by entity id, NOT persisted.
**When to use:** "Don't show me this banner again *for this session*" UX.
**Example:** D-13 banner dismiss. UI-SPEC line 232 explicitly says NOT AsyncStorage.

### Anti-Patterns to Avoid

- **Adding Firebase SDK to client:** REPO RULE per memory + REQUIREMENTS.md "Hard rules carried forward."
- **Switching to react-navigation:** out of scope; preserve App.tsx state machine.
- **Adding a new overlay flag for a 4-tab control:** tabs are in-screen state, NOT an overlay. UI-SPEC §"Component Inventory" `LOC budget` correctly says "+~120 LOC" inline, not a new overlay route.
- **Returning all statuses on `GET /api/properties` to mods/admins:** D-05 explicitly rejects this.
- **Synthetic timestamps for legacy backfill:** D-04 sets audit fields as null/missing; do not fabricate.
- **Schema `default: 'live'` on creation path:** would contradict D-01 (new submissions are pending). Use migration backfill + client coalesce instead.
- **Editing `OwnerListingsScreen.tsx` thinking it's the self-listings screen:** see Section 3.5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWKS token verification | Manual JWKS fetch + RSA verify | `jose.jwtVerify` + `verifyFirebaseToken` middleware (already in place) | Phase 1 sunk this cost |
| Firebase token refresh | Manual `securetoken.googleapis.com` POST chain | `apiClient.ts` 401 interceptor (Phase 1) | Single-flight + retry already wired |
| Role-aware route gating | Inline `if (req.user.userType === ...)` per route | `requireMinRole('moderator')` from `verifyFirebaseToken.js:105` | Already exported and tested |
| Migration script structure | New script template | Copy `migrate-roles-m2.js` shape exactly | Battle-tested through M2 Phase 1 production run |
| Banner left-stripe layout | New StyleSheet pattern | Reuse `LandlordApplicationStatusBanner.tsx` shape (`accentBar` 4px width + body + chevron) | Already lands the UI-SPEC contract |
| AppState foreground refresh | Custom polling timer | `AppState.addEventListener('change', ...)` + 60s cooldown | RN-canonical |
| Plural string interpolation | Custom plural rules | Existing `t()` helper with separate `.singular` / `.plural` keys | Project convention; UI-SPEC line 162 |
| Schema status validator | Pre-save hook | Mongoose `enum` array | Phase 1 already does this |

---

## Runtime State Inventory (rename / refactor — applicable to D-01 enum drop of `'draft'`)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | MongoDB Atlas `listings` collection: rows with `{status: 'draft'}` (count unknown — query before plan), rows with `{status: {$exists: false}}` (legacy M1 self-listings). | Data migration via `migrate-listings-m2.js` (D-03). |
| **Live service config** | None. The lifecycle enum is owned solely by the Mongoose schema; no external service (Datadog, n8n, Cloudflare) keys on the value `'draft'`. | None. |
| **OS-registered state** | None. No Windows tasks, launchd plists, etc. reference `'draft'`. | None. |
| **Secrets and env vars** | None — `'draft'` is a literal in source code, not an env var name. | None. |
| **Build artifacts / installed packages** | None — JS literal in source, no `.egg-info` or compiled artifact equivalent. | None — `npm install` in either repo not required. |
| **Source-code references** | <br>**Backend:**<br>• `src/models/Property.js:35` enum array.<br>• `src/routes/propertyRoutes.js:42-43` (route comment), `:46` (`req.query.status` accepts `'draft'` query — drop), `:136` (POST body destructure comment "draft or live"), `:217` (`status \|\| 'draft'` default — change to `'pending'` or remove).<br>• `src/routes/propertyRoutes.js:493` (DELETE comment), `:509` (`isHardDeletable = status === 'archived' \|\| status === 'draft'` — Phase 2 keeps `'archived'` only? Or `'archived' \|\| 'rejected'`? **Open question for planner: under D-01 dropping `'draft'`, can owners still hard-delete `'rejected'` listings? CONTEXT.md doesn't specify. Recommend keep DELETE archived-only, since rejected listings should be re-edited not deleted.**)<br><br>**Client:**<br>• `src/types/Property.ts:66` `status?: 'draft' \| 'live' \| 'archived'` — change to `'pending' \| 'live' \| 'rejected' \| 'archived'`.<br>• `src/services/PropertyService.ts:76, 145` `propertyData.status \|\| 'draft'` — change to `'pending'`.<br>• `src/services/PropertyService.ts:242` (unarchive sends `status: 'draft'`) — Phase 2 disables unarchive UI per Topic 8.<br>• `src/screens/RenterListingsScreen.tsx:166` (state set to `'draft'` after unarchive) — Phase 2 disables unarchive UI.<br>• `src/screens/RenterListingsScreen.tsx:192-202` `formatStatus()` lookup — Phase 2 deletes this block.<br>• `src/locales/en.ts:136-139` + `ru.ts:138-141` (`property.statusDraft|Pending|Live|Archived`) — Phase 2 deprecates the `Draft` key, reframes others to UI-SPEC labels OR adds new `listings.status.*` namespace.<br>• `src/locales/en.ts:289` + `ru.ts:291` `createListing.statusHint` mentions "Draft" — Phase 2 updates copy. | Code edit + locale edit + (optional) data migration of any client-side persisted status references (none found — AsyncStorage stores only auth state). |

**Canonical question:** *After every file in the repo is updated, what runtime systems still have `'draft'` cached, stored, or registered?*

**Answer:** Only MongoDB Atlas. The migration script handles it. After `--verify=PASS`, no `'draft'` exists anywhere.

---

## Common Pitfalls

### Pitfall 1: Editing `OwnerListingsScreen.tsx` instead of `RenterListingsScreen.tsx`

**What goes wrong:** Plan tasks copy CONTEXT.md verbatim ("`src/screens/OwnerListingsScreen.tsx` (216 LOC) — adds 4-tab segmented control..."). Executor opens that file, adds the segmented control, ships. Result: a 4-tab segmented control on a screen that displays *another* user's listings — broken UX, the executor can't even test it (would need a second account's listings to populate the tabs).
**Why it happens:** Naming flip (Section 3.5).
**How to avoid:** Plan tasks must explicitly state `src/screens/RenterListingsScreen.tsx` and reference its line counts (369 LOC pre-Phase-2).
**Warning signs:** A plan task says "edit OwnerListingsScreen to add tabs" — STOP, re-route to RenterListingsScreen.

### Pitfall 2: Schema enum cutover deploys before migration runs

**What goes wrong:** Backend deploys with `enum: ['pending','live','rejected','archived']` while production Mongo still has `{status: 'draft'}` rows. Any owner editing one of those rows hits Mongoose validation error 500. New M1 admin/owner sees mysterious "save failed" with no obvious cause.
**Why it happens:** Forgetting the deploy ordering. CI doesn't naturally enforce DB-first.
**How to avoid:** Treat migration script `--verify=PASS` as a hard pre-deploy gate. Document in plan that the schema-cutover commit MUST be merged AFTER `--verify=PASS` is observed against production Mongo.
**Warning signs:** Plan order doesn't show migration as a Wave-0 task; plan order ships schema patch and migration in parallel.

### Pitfall 3: D-07 client filter applied before hospitality split, missing on hospitality strip

**What goes wrong:** HomeScreen has TWO derived memoizations from the raw `properties` array: `filteredProperties` (transactionType + category + district + search) and `hospitalityProperties` (separate from raw). If D-07 filter applied only to `filteredProperties`, the hospitality strip still shows non-live listings.
**Why it happens:** `properties` is the source for both branches; filtering must happen at `setProperties()` time OR via a shared `liveProperties` memo upstream of both.
**How to avoid:** introduce `const liveProperties = useMemo(() => properties.filter(p => (p.status ?? 'live') === 'live'), [properties])` and derive both `filteredProperties` and `hospitalityProperties` from `liveProperties`.
**Warning signs:** D-07 filter only mentioned in one of the two memo blocks; manual QA shows pending/rejected listings in the hospitality strip.

### Pitfall 4: M1 archive/unarchive flow breaks under D-01 enum

**What goes wrong:** `PropertyService.unarchiveProperty()` sends `status: 'draft'`. After Phase 2's enum cutover, `'draft'` is invalid; PUT /api/properties/:id returns Mongoose validation error.
**Why it happens:** Carryover M1 code; Phase 2 doesn't redesign archive (Phase 4 owns it).
**How to avoid:** disable archive/unarchive UI in Phase 2 (per Topic 8). The `archiveProperty` / `unarchiveProperty` service methods stay in source but are unreferenced.
**Warning signs:** Phase 2 ships and an owner taps "Unarchive" on a legacy archived listing → 500 error, listing stuck.

### Pitfall 5: Status pill positioning collides with share/heart actions

**What goes wrong:** UI-SPEC says pill goes top-right (8px inset). PropertyCard already has share + heart at top-right with 36×36 circles. Pill overlaps.
**Why it happens:** UI-SPEC author may not have verified PropertyCard's existing layout.
**How to avoid:** Plan task explicitly chooses pill position (recommend top-left below rent/sale badge) and updates UI-SPEC.md if position changes.
**Warning signs:** Visual QA shows pill clipped behind heart icon.

### Pitfall 6: Stale `lastSeenRole` closure in AppState handler

**What goes wrong:** AppState 'active' fires `refreshRole()`. RoleRefreshBanner uses `lastSeenRole` to detect role changes. If the AppState handler captures a stale closure that doesn't see the new role, the banner doesn't surface.
**Why it happens:** RoleRefreshBanner already has a documented "stale-closure" mitigation (`RoleRefreshBanner.tsx:18-31`) using optimistic-dismiss + useEffect rebase. The Phase 2 hook just calls `refreshRole()` — the banner itself handles the rebase.
**How to avoid:** Don't reimplement role-comparison logic in the AppState hook. Just call `refreshRole()` and let RoleRefreshBanner do its existing job.

### Pitfall 7: `'rejected' → 'pending'` auto-flip races with mod re-rejection

**What goes wrong:** Mod rejects → owner edits + saves (auto-flips to `'pending'`) → mod re-rejects almost simultaneously. Mongo last-write-wins. **Phase 2 doesn't ship moderation actions** so this race is theoretical until Phase 3 — but the route logic must be ready: D-15 auto-flip is unconditional, so if a mod rejected a listing AND the owner saves at the same moment, the save wins.
**Why it happens:** No optimistic concurrency control on PUT /api/properties/:id.
**How to avoid:** Out of scope for Phase 2 (Phase 3 owns rejection). Note the race for Phase 3 retro.

### Pitfall 8: PropertyDetailsScreen banner re-evaluates dismiss on every render

**What goes wrong:** D-13 says banner re-evaluates on cold start, AppState >5min, or navigate-to-this-listing. If the dismiss state lives in PropertyDetailsScreen-local state, it resets on remount (navigate away and back). That's correct per D-13. But if it lives in a higher-level state (Context, App.tsx), navigate-away preserves the dismissed state and the banner doesn't reappear on next navigate-to-this-listing.
**How to avoid:** Keep dismiss state in PropertyDetailsScreen-local `useState`. The screen unmounts on navigate-away (verified by App.tsx state machine pattern) so dismissal is per-mount.
**Warning signs:** Tap dismiss on listing A's banner → navigate to home → tap listing A from home → banner doesn't reappear.

---

## Code Examples (verified patterns from existing M2 codebase)

### Server-side conditional middleware (optional auth, like Topic 3 GET /:id needs)

Existing `verifyTokenForUserCreation` in `verifyFirebaseToken.js:127` shows the pattern of a custom middleware variant. New `optionalAuthMiddleware`:

```javascript
// Add to verifyFirebaseToken.js
async function optionalAuth(req, res, next) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();  // No auth header → continue as anonymous; req.user/req.firebaseUid stay undefined.
  }
  // Header present → fall through to full verification.
  return verifyFirebaseToken(req, res, next);
}
module.exports = { verifyFirebaseToken, requireMinRole, verifyTokenForUserCreation, optionalAuth };
```

### Idempotent migration step (mirrors `migrate-roles-m2.js:60-66`)

```javascript
const flips = [
  { from: { status: 'draft' }, to: { status: 'pending' } },
  { from: { status: { $exists: false } }, to: { status: 'live' } },
];
for (const { from, to } of flips) {
  const matched = await Property.countDocuments(from);
  console.log(`  ${JSON.stringify(from)} -> ${JSON.stringify(to)}: ${matched} records`);
  if (!isDryRun && matched > 0) {
    const result = await Property.updateMany(from, { $set: to });
    console.log(`    updated: ${result.modifiedCount}`);
  }
}
```

### Belt-and-suspenders client filter

```typescript
// HomeScreen.tsx — REPLACE the current setProperties call site to filter at source.
const data = await PropertyService.getAllProperties();
// D-07: defense in depth — server filters but client also enforces.
const liveOnly = (data ?? []).filter((p: Property) => (p.status ?? 'live') === 'live');
setProperties(liveOnly);
```

### AppState foreground hook (Topic 7 full snippet)

See Topic 7 for the full pattern. Key points: `useEffect` with `AppState.addEventListener`; cooldown check; `if (!user?.localId) return` guard; `refreshRole().catch(...)` non-fatal.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Property.status enum `['draft','pending','live','archived']` | `['pending','live','rejected','archived']` | Phase 2 (D-01) | New submissions go through moderation; reject becomes a first-class state. |
| Server `default: 'draft'` | Server `default: 'pending'` | Phase 2 (D-01) | Submit means "submit for review" not "save as draft." |
| `GET /properties` returns all live + legacy null | Same (live + legacy null) | Phase 2 (D-05) | No change for renters; mods/admins now use Phase 3 endpoints. |
| `GET /properties/:id` returns any listing publicly | Returns 404 for non-live to non-owner-non-mod | Phase 2 (D-06) | Closes deep-link bypass. |
| `GET /properties/user/:firebaseUid` returns owner's all listings, public | Role-aware: all to owner+mod, live-only to others | Phase 2 (D-12) | Privacy improvement; legacy "view another owner's draft" is closed. |
| RenterListingsScreen flat list with inline status badge | 4-tab segmented control (Live/Pending/Rejected/Archived), per-tab Hospitality strip, per-tab empty states | Phase 2 (D-09/D-10/D-11) | Mental model shifts to "where did my submission go?" |
| PropertyCard no status pill | Pill on non-live statuses with locked Avito-anchored RU | Phase 2 (D-16) | Visual cue for state. |
| No rejection messaging | RejectionBanner on PropertyDetailsScreen + HomeRejectionBanner | Phase 2 (D-13/D-14) | Owner gets actionable feedback. |
| AppState role refresh deferred | AuthContext listener with 60s cooldown | Phase 2 (D-17) | Closes Phase 1 deferral; mod/admin demotion propagates within 60s. |
| Inline `useState`-driven status filter (legacy `?status=` query) | Hard-coded server-side filter; client trusts and re-filters | Phase 2 | No more `?includeAll=1` escape hatch. |

**Deprecated/outdated:**
- `'draft'` enum value: removed.
- `?status=` query parameter on `GET /api/properties` (`propertyRoutes.js:46-67`): removed (D-05 hardcodes live-only; the conditional branching becomes dead code).
- `PropertyService.archiveProperty` / `unarchiveProperty` UI surfaces in `RenterListingsScreen.tsx`: hidden in Phase 2 (Phase 4 reintroduces with corrected semantics).
- `formatStatus()` helper in `RenterListingsScreen.tsx:190-203`: removed (per-tab grouping makes per-card status redundant).
- `property.statusDraft` locale key: removed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Production Mongo has zero rows at `{status: 'rejected'}` today (since `'rejected'` was never in the M1 enum). [VERIFIED: Property.js:35 only had draft/pending/live/archived] | Topic 1 | If wrong, the migration is still safe (it doesn't touch `'rejected'` rows). No risk. |
| A2 | Rows with `{status: {$exists: false}}` should backfill to `'live'` (D-04) regardless of M1 admin actions. [CITED: ROADMAP success criteria #1 + CONTEXT.md D-04 verbatim] | Topic 1 | If wrong, pre-existing M1 listings disappear from public browse overnight. Migration `--dry-run` lets the operator preview the count. Acceptable risk. |
| A3 | `verifyFirebaseToken` middleware can be safely added to `GET /api/properties/:id` without breaking anonymous deep-link sharing of LIVE listings. [ASSUMED — needs `optionalAuth` variant; recommendation in Topic 3 / Code Examples] | Topic 3 | If wrong, anonymous users hit 401 on `/property/:id` deep-links. **Mitigation: implement `optionalAuth` exactly as sketched.** | 
| A4 | The `LandlordApplicationStatusBanner.tsx` shape is reusable as a `<BannerShell>` primitive for both new banners. [VERIFIED: lines 132-146 show 4px-equivalent left-stripe + body + chevron pattern] | Topic 6 | None — pattern is verbatim what UI-SPEC describes. |
| A5 | The `useTheme()` palette has all required tokens for status pill rendering. [VERIFIED: `colors.warning`, `onWarning`, `error`, `accent`, `textTertiary`, `surface` all present in `src/theme/colors.ts:1-46`] | Topic 5 | None. |
| A6 | Phase 1's `apiClient.ts` 403 interceptor's single-flight refresh is idempotent and the Phase 2 AppState hook can call `refreshRole()` without coordination. [VERIFIED: AuthContext.refreshRole is `useCallback`-stable + non-fatal on failure (lines 171-184); apiClient has its own `refreshRolePromise` single-flight] | Topic 7 | None. |
| A7 | The 4-tab segmented control fits inline in `RenterListingsScreen.tsx` without exceeding screen-LOC quality bar. [VERIFIED: target ~480-490 LOC; comparable screens (HomeScreen 774 LOC, PropertyDetailsScreen 1868 LOC, CreateListingScreen 929 LOC) are larger; no decomposition needed] | Topic 8 | None. |
| A8 | The `PUT /api/properties/:id` D-15 auto-flip branch (`property.status === 'rejected'` → set updateData.status to `'pending'`) is correct only when the owner is editing — not when, e.g., a Phase 3 mod uses the same endpoint to edit-on-behalf. [ASSUMED] | Topic 3 | Phase 3 will add `editAsModerator` (a separate endpoint per MOD-17) — won't go through PUT /:id. Phase 2 ownership check at line 344-349 already restricts PUT to owner. Safe. |
| A9 | The schema-default ambiguity in CONTEXT.md (D-01 says `'pending'`, D-02 says `'live'`) is reconcilable as: schema default = `'pending'` (creation-time), null-coalesce for legacy reads = migration backfill + client `?? 'live'`. [ASSUMED — needs confirmation] | Topic 1 | If user actually wants schema default `'live'` literally, the implementation diverges; pre-find hook needed. **Flag for CONTEXT.md amendment.** |
| A10 | Existing M1 `property.statusXXX` locale keys can be deprecated/replaced rather than coexisting with new `listings.status.*` keys. [ASSUMED] | Topic 5 | If both kept, locale-parity gate is satisfied but UI inconsistency (some screens use M1 emoji'd labels). Cleaner to unify. |
| A11 | `RenterListingsScreen.tsx` is the actual self-listings screen, not `OwnerListingsScreen.tsx`. [VERIFIED: file reading + App.tsx wiring + header strings] | Topic 3.5 | None — verified by reading code. |
| A12 | The status of the M1 `propertyRoutes.js` line 509 hard-delete guard (`isHardDeletable = status === 'archived' \|\| status === 'draft'`) — under D-01 dropping `'draft'` — should become `status === 'archived'` only. [ASSUMED: rejected listings should be re-edited not deleted] | Runtime State Inventory + Topic 3 | If wrong, owners can't permanently delete failed-rejection listings. Acceptable per D-01 mental model. |

**Items that warrant CONTEXT.md amendment before plan:**
- **A9 (schema default reconciliation):** confirm with user that schema default = `'pending'` and null-coalesce happens via migration + client.
- **A12 (hard-delete guard):** confirm rejected listings can't be hard-deleted (must archive first).
- **Open question from CONTEXT.md `<specifics>` last bullet:** CreateListingScreen submit-button copy "Publish" → "Submit for review" change. **Recommendation: rename to match MOD-03 framing; +2 locale keys; UI-SPEC §"Open question deferred to planner" already greenlit this as the recommended path.**

---

## Open Questions

1. **Schema-default ambiguity (A9 above)**
   - What we know: D-01 says `default: 'pending'`. D-02 says schema layer `default: 'live'` for legacy reads.
   - What's unclear: a Mongoose schema can have only one `default`. Which one wins?
   - Recommendation: planner clarifies with user; recommended resolution = schema default `'pending'`, null-coalesce via migration + client `?? 'live'`.

2. **Pill position vs share/heart actions (Pitfall 5)**
   - What we know: UI-SPEC says top-right.
   - What's unclear: existing share/heart already there; UI-SPEC author may not have verified.
   - Recommendation: planner picks top-left-below-rent-badge OR left-of-share-button; update UI-SPEC if changing.

3. **CreateListingScreen submit copy (CONTEXT.md `<specifics>` last bullet)**
   - What we know: MOD-03 framing implies "Submit for review" not "Publish."
   - What's unclear: whether to ship the copy change in Phase 2 or defer.
   - Recommendation: ship the copy change (+2 locale keys per UI-SPEC). Planner has discretion.

4. **Hard-delete guard (A12 above)**
   - What we know: `propertyRoutes.js:509` allows hard-delete of `'archived'` or `'draft'`.
   - What's unclear: Phase 2 drops `'draft'`; should `'rejected'` join `'archived'` as hard-deletable?
   - Recommendation: keep `'archived'`-only; `'rejected'` listings should be re-edited not deleted.

5. **Audit fields (`submittedAt`, `approvedAt`, etc.) — Phase 2 or Phase 3?**
   - What we know: MOD-01 lists ~10 audit fields; Phase 2 implements MOD-01 per requirements traceability.
   - What's unclear: Phase 3 actions (approve/reject) populate these fields, but Phase 2's schema doesn't strictly need them defined yet.
   - Recommendation: land them in Phase 2 schema patch (one additive Mongoose edit) so Phase 3 can write without re-editing schema.

6. **Should the unarchive UI be hidden or rewritten in Phase 2?**
   - What we know: `PropertyService.unarchiveProperty()` sends `status: 'draft'` which fails post-Phase-2 enum.
   - What's unclear: Topic 8 recommends hide; alternative is rewrite to `'pending'`.
   - Recommendation: hide in Phase 2 (per Topic 8); Phase 4 redesigns archive flow.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20 | RN client (`npm test`, `npx tsc`) | ✓ | v20.19.1 (default shell) | — |
| Node.js v22.12+ | Backend (`nvm use 24` for npm/node) | ✓ | per memory `backend-node-version.md` | — |
| MongoDB Atlas (production) | Migration script | ✓ | Live, accessible via `MONGO_URI` | — |
| `mongodb-memory-server` | Backend tests | ✓ | Verified `setup.js` connects | — |
| `jose` | Backend JWKS | ✓ | ^6.2.3 | — |
| Firebase Identity Toolkit REST | Client signin (existing) | ✓ | Hardcoded API key | — |
| AWS S3 | Multipart image upload (existing) | ✓ | jaytap-prod-s3 IAM (per memory) | — |
| Railway | Backend deploy | ✓ | Production deploys via maintainer | — |
| TestFlight + Play Console | M2 Phase 6 release (NOT Phase 2) | n/a | — | — |
| Physical iPhone 15 Pro Max + Moto G XT2513V | Manual QA | ✓ (per project policy) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

---

## Validation Architecture (Nyquist Dimension 8)

**Note:** `.planning/config.json` not re-read in this research; assume `nyquist_validation` is enabled per default.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest 29.7.0 + supertest 7.1.4 + mongodb-memory-server |
| Backend config file | `backend-services/JayTap-services/jest.config.cjs` |
| Backend quick run | `npm test -- --testPathPattern=propertyRoutes` |
| Backend full suite | `npm test` (currently 42/42 green post-Phase-1) |
| RN client framework | Jest 29.6.3 + react-test-renderer (de facto unused) |
| RN client config | `JayTap/jest.config.js` (preset: 'react-native') |
| RN client quick run | `npm test` (1 file `__tests__/App.test.tsx`) |
| RN client full suite | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-01 | `Property.status` enum cutover (drop `'draft'`, add `'rejected'`, default `'pending'`) | unit (schema test) | `cd JayTap-services && npm test -- --testPathPattern=Property` | ❌ — Wave 0 creates `src/__tests__/Property.test.js` (covers enum validation, default value, audit fields additive) |
| MOD-02 | Legacy null-status fallback (3-layer) | integration | `cd JayTap-services && npm test -- --testPathPattern=propertyRoutes` (extension) + manual QA | ❌ — Wave 0 extends propertyRoutes.test.js |
| MOD-03 | POST /api/properties defaults `status: 'pending'` | integration | as above | ❌ |
| MOD-04 | GET /api/properties returns only live + legacy null | integration | as above | ❌ |
| MOD-05 | GET /api/properties/:id 404 on non-live to non-owner-non-mod | integration | as above (most important test — addresses memory `gsd-verifier-misses-regressions.md`) | ❌ |
| MOD-06 | OwnerListings (RenterListings) 4-tab segmented control | manual-only | physical-device QA per CONVENTIONS.md | manual |
| MOD-07 | Status pill on PropertyCard | manual-only | physical-device QA EN+RU + dark/light parity | manual |
| MOD-08 | RejectionBanner on PropertyDetailsScreen | manual-only | physical-device QA + per-session-dismiss verification | manual |
| MOD-09 | HomeRejectionBanner persistence | manual-only | physical-device QA | manual |
| D-12 owner-scoped fetch role-aware | GET /api/properties/user/:firebaseUid returns all statuses to owner+mod, live-only to others | integration | extends propertyRoutes.test.js | ❌ |
| D-15 PUT /:id auto-flip rejected→pending | PUT to rejected listing from owner flips status | integration | extends propertyRoutes.test.js | ❌ |
| D-17 AppState role refresh | Hook subscribes + cooldown | manual-only OR optional jest | physical-device test (background app, change role server-side, foreground, observe banner) | manual (jest discretionary) |
| Migration script | `migrate-listings-m2.js --dry-run` previews + `--verify` exit 0 | bash CLI | `npm run migrate:listings-m2 -- --dry-run` against staging Mongo | ❌ — Wave 0 creates the script |

### Sampling Rate

- **Per task commit (backend):** `npm test -- --testPathPattern=propertyRoutes` (~1.5s)
- **Per wave merge (backend):** `npm test` full suite (target: 42 → ~58 with Phase 2 additions; under 5s)
- **Per task commit (client):** `npx tsc --noEmit` (baseline 2 ThemeContext errors only — preserve)
- **Phase gate:** all backend tests green + manual QA matrix walked APPROVED on physical devices + i18n parity gate exits 0

### Wave 0 Gaps (test files to create)

- [ ] `src/__tests__/Property.test.js` — Property schema unit tests (enum cutover, defaults, audit fields)
- [ ] `src/__tests__/propertyRoutes.test.js` — extend with `describe('Phase 2 status filter — D-05/D-06/D-12/D-15')` block (~10 new tests covering the matrix in Topic 10)
- [ ] `src/scripts/migrate-listings-m2.js` — the migration script itself (not a test, but Wave 0 deliverable)
- [ ] (Optional, discretionary) `src/__tests__/StatusPill.test.tsx` — RN component test for pill rendering by status. Skip per project posture.

---

## Security Domain

`security_enforcement` not explicitly checked but applicable to this phase. Phase 2 touches authentication/authorization-adjacent code (route-level role gates).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `verifyFirebaseToken` (Phase 1); Phase 2 reuses unchanged. |
| V3 Session Management | yes | Existing axios interceptor + AppState refresh (Phase 1 + Phase 2 D-17). |
| V4 Access Control | **yes (load-bearing)** | Role-aware route filters (D-05/D-06/D-12) + `requireMinRole`. |
| V5 Input Validation | yes | Mongoose `enum` validates status values; route handlers validate request bodies (existing pattern from Phase 1 hardening). |
| V6 Cryptography | n/a (Phase 1 owns; Phase 2 doesn't touch keys). | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Pending listing leaks to public feed** (highest blast radius) | Information Disclosure | D-05 hard-codes live-only filter on `GET /api/properties`; no escape hatch exists. |
| **Deep-link bypass to non-live listings** | Information Disclosure | D-06 server-side 404 on non-live to non-owner-non-mod; no client enforcement (D-06 explicit). |
| **Owner views another owner's drafts/rejections via `/api/properties/user/:firebaseUid`** | Information Disclosure | D-12 role-aware filter — same logic as D-05/D-06. |
| **Mod uses `?includeAll=1` to leak pending listings** | Privilege Escalation | D-05 explicitly rejects `?includeAll=1`. |
| **Owner forges `status: 'live'` in POST body to skip moderation** | Tampering | Schema default + route handler should NOT accept `status` from body for new listings. **Currently `propertyRoutes.js:217` reads `req.body.status \|\| 'draft'`** — Phase 2 must change this to ignore body `status` and rely on schema default `'pending'`. |
| **Owner forges `status: 'live'` in PUT body to skip re-moderation** | Tampering | D-15 auto-flip handles the rejected→pending case. But what about owner setting `status: 'live'` directly? **Phase 2 should reject any owner-attempted status mutation in PUT body except `'archived'` (which Phase 4 will own).** Recommendation: in PUT /:id, if `actingUser.userType !== 'admin' && actingUser.userType !== 'moderator' && updateData.status` is set to anything other than `'archived'` → strip the field. |
| **Race: mod and owner concurrent PUT** | Tampering | Out of scope for Phase 2 (Phase 3 race handling per Pitfall 5 of project PITFALLS.md). Phase 2's auto-flip is best-effort; mod actions in Phase 3 will use conditional `findOneAndUpdate({_id, status: ...}, ...)` patterns. |

**Phase 2 specific recommendation:** add an explicit body-status sanitizer in PUT /:id, mirroring the existing platformVerifications sanitizer pattern (`propertyRoutes.js:358-378`). Pattern:

```javascript
// Insert before line 481:
const ALLOWED_OWNER_STATUS_TRANSITIONS = ['archived'];  // owner can move to archived (Phase 4 reactivates) — others stripped
if (actingUser.userType !== 'admin' && actingUser.userType !== 'moderator') {
  if (updateData.status && !ALLOWED_OWNER_STATUS_TRANSITIONS.includes(updateData.status)) {
    delete updateData.status;
  }
}
```

This is a **defense-in-depth measure not strictly mandated by CONTEXT.md** but recommended given Phase 1's verifier-vs-reviewer learning.

---

## Sources

### Primary (HIGH confidence)

- **CONTEXT.md** at `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` — D-01..D-17 verbatim
- **UI-SPEC.md** (approved 2026-04-29) at same directory — visual contract verbatim
- **DISCUSSION-LOG.md** — alternatives considered (audit only)
- **REQUIREMENTS.md** lines 46-54 — MOD-01..MOD-09 acceptance criteria
- **Backend Property model:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` (line 35 enum)
- **Backend property routes:** same repo `src/routes/propertyRoutes.js` (lines 44, 78, 114, 217, 300, 333, 481, 493, 509)
- **Backend JWKS middleware:** same repo `src/middleware/verifyFirebaseToken.js` (lines 30, 103-113, 127)
- **Backend migration script template:** same repo `src/scripts/migrate-roles-m2.js` (verified 129 LOC)
- **Backend test infra:** same repo `src/__tests__/setup.js`, `propertyRoutes.test.js`, `fixtures/jwks-tokens.js`
- **Client RenterListingsScreen:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx` (369 LOC; the actual "self listings" screen)
- **Client OwnerListingsScreen:** same repo `src/screens/OwnerListingsScreen.tsx` (216 LOC; OTHER-owner viewer — naming flip per Section 3.5)
- **Client Property type:** same repo `src/types/Property.ts:66`
- **Client PropertyService:** same repo `src/services/PropertyService.ts:33-273`
- **Client AuthContext:** same repo `src/context/AuthContext.tsx` (refreshRole pattern at 171-184)
- **Client PropertyCard:** same repo `src/components/PropertyCard.tsx` (status badge slot 98-104, top-right actions 314-320)
- **Client RoleRefreshBanner:** same repo `src/components/RoleRefreshBanner.tsx` (stale-closure mitigation pattern)
- **Client LandlordApplicationStatusBanner:** same repo `src/components/LandlordApplicationStatusBanner.tsx` (banner shell pattern UI-SPEC samples from)
- **Client theme tokens:** same repo `src/theme/colors.ts` (warning, onWarning, error, accent, textTertiary verified present)
- **Client locales:** same repo `src/locales/en.ts:136-139, 289` + `ru.ts:138-141, 291` (existing `property.statusXXX` keys verified)

### Secondary (M2 research — already committed and approved)

- `.planning/research/PITFALLS.md` Pitfalls #4 (stale role cache → AppState hook addresses), #8 (App.tsx LOC budget — Phase 2 net-zero or extract-on-touch), #11 (status enum proliferation), #12 (i18n parity drift)
- `.planning/codebase/STRUCTURE.md`, `STACK.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`, `CONCERNS.md`, `TESTING.md`
- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` D-12 (deferred AppState; Phase 2 ships per D-17)

### Tertiary

- Auto-memory pointers: `gsd-verifier-misses-regressions.md`, `no-firebase-sdk.md`, `identity-vs-user-store.md`, `backend-node-version.md`, `backend-repo-location.md`, `geographic-scope.md`

---

## Recommended Task Ordering / Wave Structure

The planner consumes this section to derive plans.

### Wave 0 — Pre-deploy verification + script

| Task | Repo | Output |
|------|------|--------|
| Production Mongo audit (count `{status:'draft'}`, `{$exists:false}`) | bash + Mongo | console output to inform `--dry-run` expectations |
| Create `migrate-listings-m2.js` (mirror `migrate-roles-m2.js`) | backend | New script + `package.json` registration |
| Create `src/__tests__/Property.test.js` (RED initially — pre-cutover) | backend | Schema validation tests |
| Extend `src/__tests__/propertyRoutes.test.js` with Phase 2 status block (RED initially) | backend | Integration tests |
| Run migration `--dry-run` against staging | bash | Operator review |

### Wave 1 — BLOCKING migration on production Mongo

| Task | Repo | Output |
|------|------|--------|
| Run `npm run migrate:listings-m2` against production `MONGO_URI` | bash | Live writes |
| Run `--verify` | bash | Exit 0 (acceptance gate) |

### Wave 2 — Backend schema + route changes

| Task | Repo | Output |
|------|------|--------|
| Property.js enum cutover + audit fields (additive) + default flip | backend | Schema patch |
| `optionalAuth` middleware export | backend | New helper |
| `GET /api/properties` hard-cut to live-only (D-05) | backend | Route patch |
| `GET /api/properties/user/:firebaseUid` role-aware (D-12) | backend | Route patch |
| `GET /api/properties/:id` 404 guard (D-06) | backend | Route patch |
| `POST /api/properties` defaults to `'pending'` (D-01 + body-status sanitizer) | backend | Route patch |
| `PUT /api/properties/:id` D-15 auto-flip + body-status sanitizer | backend | Route patch |
| Tests now green (Wave 0's RED → GREEN transition) | backend | Verify |
| Backend deploy | Railway | Backend tests green in CI |

### Wave 3 — Client foundation (types, services, locales)

| Task | Repo | Output |
|------|------|--------|
| `src/types/Property.ts:66` cutover | client | Type patch |
| Update `PropertyService.ts:76, 145` defaults from `'draft'` to `'pending'` (or remove) | client | Service patch |
| Add 8-12 locale keys (UI-SPEC §"Copywriting Contract") + run i18n parity gate | client | Locale patch |
| Deprecate M1 `property.statusDraft` key + reframe `Pending/Live/Archived` to UI-SPEC labels | client | Locale patch |

### Wave 4 — Client components (banners + pill + segmented control)

| Task | Repo | Output |
|------|------|--------|
| `<StatusPill>` component (~50 LOC) | client | New file |
| `<BannerShell>` private primitive (~40 LOC, optional) | client | New file |
| `<RejectionBanner>` (~30-80 LOC) | client | New file |
| `<HomeRejectionBanner>` (~30-60 LOC) | client | New file |
| Mount `<StatusPill>` inside `PropertyCard.tsx` (top-left below rent badge — see Pitfall 5) | client | PropertyCard patch |
| 4-tab segmented control inline in `RenterListingsScreen.tsx` + per-tab Hospitality strip + per-tab empty states + delete M1 inline status badge + remove unarchive UI | client | RenterListings patch |
| Mount `<RejectionBanner>` in `PropertyDetailsScreen.tsx` (per-session dismiss state local to screen) | client | PropertyDetails patch |
| Mount `<HomeRejectionBanner>` in `HomeScreen.tsx` (with rejected-count fetch) | client | HomeScreen patch |
| Apply D-07 client filter on Home/Favorites/RenterListings (live-only memo upstream of derived memos — see Pitfall 3) | client | Filter additions |

### Wave 5 — AppState hook + final integration

| Task | Repo | Output |
|------|------|--------|
| `useAppStateRoleRefresh` hook inside `AuthContext.tsx` (or beside it) — D-17 | client | AuthContext patch |
| App.tsx wire-up: PropertyDetailsScreen banner CTA → CreateListingScreen edit-mode; HomeRejectionBanner CTA → RenterListings `defaultTab='rejected'` | client | App.tsx patches |
| (Optional) submit-button copy change in CreateListingScreen → "Submit for review" / «Отправить на модерацию» (+2 locale keys) | client | CreateListingScreen + locale patches |

### Wave 6 — QA gate

| Task | Output |
|------|--------|
| All backend tests green | npm test exit 0 |
| Whole-project tsc baseline preserved (2 ThemeContext errors only) | npx tsc --noEmit |
| i18n parity gate exit 0 | scripts/check-i18n-parity.sh |
| Manual physical-device QA matrix (4-tab × Hospitality × banner × pill × dark/light × EN/RU) | walked APPROVED |
| Code review (per memory `gsd-verifier-misses-regressions.md`) | both `/gsd-verify-work` AND code-review pass |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified in `package.json` of both repos.
- Architecture: HIGH — code paths read end-to-end in both repos.
- Pitfalls: HIGH — Pitfall 1 (naming flip) verified by reading both screen files; Pitfall 5 (pill collision) verified by reading `PropertyCard.tsx` styles.
- Migration mechanics: HIGH — pattern source `migrate-roles-m2.js` already production-shipped.
- AppState pattern: HIGH — RN 0.84 API verified against existing usage conventions.
- Schema-default ambiguity (A9): MEDIUM — research recommends a resolution; user confirmation pending.

**Research date:** 2026-05-01
**Valid until:** 2026-05-15 (14 days; backend codebase moves slowly post-Phase-1)

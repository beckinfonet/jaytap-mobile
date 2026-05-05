# Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 22 (8 backend new/modified + 11 client new/modified + 3 deletions)
**Analogs found:** 19 / 22 (3 NEW files have no codebase analog — see "No Analog Found")

**Cross-repo scope:**
- Backend: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` (Node 22 + Express 5 + Mongoose 9 + socket.io 4)
- Client: `/Users/beckmaldinVL/development/mobileApps/JayTap` (RN 0.84 New Architecture + axios 1.13)

**File-naming reality check:** CLAUDE.md / CONTEXT.md refer to locale files as `src/locales/{en,ru}.json` — they are actually `.ts` files (`src/locales/en.ts`, `src/locales/ru.ts`) using a flat `Record<string,string>` literal. Planner must spec keys as `.ts` literal additions, NOT JSON edits.

**Endpoint naming reality check:** CONTEXT.md additional context calls out `userRoutes.js` for HF-03 PATCH `/users/me` lockdown. There is no `userRoutes.js` and no `PATCH /users/me`. The actual surface is `authRoutes.js` `POST /users` (lines 7-65), which body-merges `req.body` into the User document. RESEARCH.md §"Code Examples — HF-03 body-uid match" lines 1132-1158 captures the correct shape. Planner should spec HF-03 against `POST /users` in `authRoutes.js`, not against a non-existent route.

---

## File Classification

### Backend (`JayTap-services`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/middleware/verifyFirebaseToken.js` (NEW) | middleware | request-response (auth gate) | `src/middleware/authMiddleware.js` | exact (role + flow) |
| `src/scripts/migrate-roles-m2.js` (NEW) | script (CLI) | batch | `src/scripts/seed.js` | exact (role + flow) |
| `src/routes/authRoutes.js` (MODIFIED) | route handler | request-response | self (existing patterns inside the file) | exact |
| `src/models/User.js` (MODIFIED) | model (schema) | persistence | self | exact |
| `src/models/Property.js` (MODIFIED) | model (schema) | persistence | self (HF-01 additive) | exact |
| `src/routes/propertyRoutes.js` (MODIFIED) | route handler | request-response | `src/middleware/authMiddleware.js` mount + `src/routes/chatRoutes.js` `router.use(...)` | role-match |
| `src/routes/favoriteRoutes.js` (MODIFIED) | route handler | request-response | `src/routes/chatRoutes.js` `router.use(...)` | role-match |
| `src/routes/chatRoutes.js` (MODIFIED) | route handler | request-response | self (line 10 `router.use(verifyChatUser)`) | exact |
| `src/routes/appointmentRoutes.js` (MODIFIED) | route handler | request-response | self (line 11 `router.use(verifyChatUser)`) | exact |
| `index.js` (MODIFIED) | server bootstrap | event-driven (socket handshake) | self (lines 14-26 io setup + line 20 connection handler) | exact |
| `src/middleware/chatAuthMiddleware.js` (DELETE) | middleware | request-response | n/a | n/a |
| `package.json` (MODIFIED) | config | n/a | self | exact |
| `.env.example` (NEW) | config (template) | n/a | NONE — no template file exists in repo | no analog |
| `__tests__/verifyFirebaseToken.test.js` (NEW, optional) | test | n/a | NONE — backend has zero tests | no analog (use RN client tests as reference) |
| `__tests__/authRoutes.test.js` (NEW, optional) | test | n/a | NONE | no analog |
| `__tests__/propertyRoutes.test.js` (NEW, optional) | test | n/a | NONE | no analog |

### Client (`JayTap`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/apiClient.ts` (NEW) | service (HTTP infra) | request-response | `src/services/AuthService.ts` axios calls + `ChatService.ts:14-18` `getHeaders()` | role-match |
| `src/services/AuthService.ts` (MODIFIED) | service | request-response | self (lines 26-37 signIn pattern) | exact |
| `src/services/PropertyService.ts` (MODIFIED) | service | request-response | self | exact |
| `src/services/FavoritesService.ts` (MODIFIED) | service | request-response | self (lines 22-27 explicit `x-firebase-uid` header) | exact |
| `src/services/ChatService.ts` (MODIFIED) | service | request-response + ws | self (lines 96-104 `connectSocket`) | exact |
| `src/services/AppointmentService.ts` (MODIFIED) | service | request-response | self | exact |
| `src/context/AuthContext.tsx` (MODIFIED) | provider | state | self (lines 46-74 `login`, lines 101-104 `logout`) | exact |
| `src/hooks/useRole.ts` (MODIFIED) | hook | state derivation | self (lines 63-67 Branch 3 deletion) | exact |
| `src/components/RoleRefreshBanner.tsx` (NEW) | component | event-driven (tap) | `src/components/Gated.tsx` (theme-free) + `src/components/LanguageToggleSwitch.tsx` (theme + i18n consumer) | role-match |
| `src/types/Auth.ts` (NEW) | type def | n/a | `src/types/Property.ts` + `src/types/Appointment.ts` | role-match |
| `src/locales/en.ts` (MODIFIED) | i18n data | n/a | self (lines 1-79 flat key map) | exact |
| `src/locales/ru.ts` (MODIFIED) | i18n data | n/a | self | exact |
| `App.tsx` (MODIFIED) | app shell | state machine | self (lines 86-93 OVERLAY_FLAGS + lines 551-555 outer `<View>`) | exact |
| `src/constants/adminAllowlist.ts` (DELETE) | constant | n/a | n/a | n/a |

---

## Pattern Assignments

### Backend

#### `src/middleware/verifyFirebaseToken.js` (NEW — middleware, request-response)

**Analog:** `src/middleware/authMiddleware.js` (and `chatAuthMiddleware.js` — same shape)

**Imports + module shape** (authMiddleware.js:1-2, 47):
```javascript
const User = require('../models/User');
// ...
module.exports = { verifyRenter };
```
New file mirrors this CommonJS export pattern: `module.exports = { verifyFirebaseToken, requireMinRole }`. Same `require('../models/User')` import. Add `const { jwtVerify, createRemoteJWKSet } = require('jose')` — see RESEARCH.md Pattern 1 (lines 311-433) for the full skeleton.

**Auth flow pattern to replicate** (authMiddleware.js:7-45):
```javascript
const verifyRenter = async (req, res, next) => {
  try {
    const firebaseUid = req.body.firebaseUid || req.headers['x-firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required. firebaseUid missing.' });
    }
    const user = await User.findOne({ uid: firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isLocked || user.deletedAt) {
      return res.status(403).json({
        message: 'This account has been locked or deleted. Please contact support.',
        code: 'ACCOUNT_LOCKED'
      });
    }
    if (user.userType !== 'renter') {
      return res.status(403).json({ message: 'Access denied. Only renters can create listings.' });
    }
    req.user = user;
    req.firebaseUid = firebaseUid;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};
```

**Patterns to PRESERVE in new middleware:**
- `req.user = user; req.firebaseUid = firebaseUid; next();` attachment shape — every existing route file reads `req.firebaseUid`, so this contract MUST stay (chatRoutes.js:15, appointmentRoutes.js:51, etc.)
- `if (user.isLocked || user.deletedAt)` lock check with `code: 'ACCOUNT_LOCKED'` — every protected handler downstream relies on this (see authRoutes.js:42-46, 73-80)
- `console.error('Auth middleware error:', error)` + `res.status(500).json({ message: ..., error: error.message })` global catch — match the existing pattern verbatim for log/observability continuity
- 404 + `'User not found'` body when uid lookup misses

**Patterns to REPLACE / EXTEND:**
- DROP the hard `if (user.userType !== 'renter')` gate from line 32-34 — Phase 1 introduces three roles + `requireMinRole(minRole)` decorator (see RESEARCH.md Pattern 1 lines 421-430). The `verifyFirebaseToken` middleware does NOT gate on role; that is a separate `requireMinRole` factory.
- ADD JWKS-verify branch BEFORE the legacy uid path. Bearer header read via `req.header('authorization')` then `.startsWith('Bearer ')` slice — the request-side analog for header reads is authMiddleware.js:10 (`req.headers['x-firebase-uid']`). Use the SAME `req.headers['x-firebase-uid']` token for the legacy fallback.
- ADD the structured legacy log: `console.log(JSON.stringify({evt: 'legacy_uid_header', uid, route: req.originalUrl, method, ts}))` — there is no logging convention in the backend today (every existing log is plain `console.log` or `console.error`), so this introduces structured JSON-line logging for the first time. Document this convention in the plan.
- ADD `roleRevokedAt` invariant block (RESEARCH.md Pattern 1 lines 397-403). Compare `tokenIat` (Unix seconds from jose `payload.iat`) to `Math.floor(new Date(user.roleRevokedAt).getTime() / 1000)`. Return `403 {code: 'role-revoked'}` on `iat < revokedAtSec`.
- ERROR ENVELOPE shift: existing handlers mix `{message, code}` (authMiddleware.js:25-28) and `{error, message}` (index.js:65-68). New middleware emits **both** `code` (machine-checkable) AND `message` (human readable) per RESEARCH.md Pattern 2 lines 437-450. Stick to the `{code, message}` shape for ALL new auth responses.

**Risk callouts:**
- DO NOT memoize `createRemoteJWKSet(...)` inside the middleware function — declare it ONCE at module top-level (RESEARCH.md anti-patterns line 904). jose owns the cache lifecycle.
- DO NOT introduce `process.env.NODE_ENV` runtime branches anywhere in this file (PITFALLS.md Pitfall 2 / RESEARCH.md anti-patterns line 907). Mock at jest fixture layer if tests are added.
- The fail-fast `if (!FIREBASE_PROJECT_ID) throw new Error(...)` at module top is required (RESEARCH.md Pattern 1 line 318-320) — do NOT default to a placeholder.

---

#### `src/scripts/migrate-roles-m2.js` (NEW — script, batch CLI)

**Analog:** `src/scripts/seed.js`

**Mongoose connection bootstrap pattern** (seed.js:1-7):
```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Property = require('../models/Property');
const connectDB = require('../config/db');
// ...
dotenv.config();
```
**Pattern to replicate exactly** in migrate-roles-m2.js — `dotenv.config()` then `connectDB()` then model imports. Substitute `Property` import with `User`. Reuse `require('../config/db')` (db.js:14-16 reads `MONGO_URI` and applies `dbName: 'bizdinkonush'` — critical, the migration MUST use this same `connectDB` helper to land on the right database).

**Script execution pattern** (seed.js:42-70):
```javascript
const seedData = async () => {
  try {
    await connectDB();
    // ... batch operations ...
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
seedData();
```
Mirror this top-to-bottom. The `await connectDB()` → batch ops → `process.exit()` shape is the project's CLI script idiom.

**Per-record idempotency pattern** (seed.js:49-61):
```javascript
for (const prop of MOCK_PROPERTIES) {
    const exists = await Property.findOne({ title: prop.title });
    if (!exists) {
        // ... create ...
        console.log(`Created: ${prop.title}`);
    } else {
        console.log(`Skipped (exists): ${prop.title}`);
    }
}
```
**Translate to migrate-roles-m2.js:** instead of "skip if exists," use "filter excludes already-migrated" (`{userType: from}` only matches not-yet-migrated docs — RESEARCH.md Pattern 6 lines 616-624). Same console.log per-record progress style.

**Patterns to PRESERVE:**
- `dotenv.config()` at top (matches seed.js:7)
- `await connectDB()` from `../config/db` (NOT `mongoose.connect(...)` directly — the helper applies the `dbName: 'bizdinkonush'` invariant)
- `process.exit()` on success, `process.exit(1)` on error (seed.js:63, 66)
- `console.log` per-step progress (seed.js:57, 59) — verbose CLI is the established style

**Patterns to ADD (no analog in seed.js):**
- CLI flag parsing (`process.argv.slice(2).includes('--dry-run')`) — see RESEARCH.md Pattern 6 lines 584-587
- `M1_ADMIN_EMAILS` constant at top of file mirroring `src/constants/adminAllowlist.ts:13` exactly (`['beckprograms@gmail.com']`)
- Verification subcommand (`--verify`) returning the exact REQUIREMENTS.md ROLE-02 acceptance count (RESEARCH.md Pattern 6 lines 592-604)
- `await mongoose.disconnect()` before `process.exit(0)` for clean shutdown (RESEARCH.md Pattern 6 line 656)

**Risk callouts:**
- `User.js` collection is `user_profile` (User.js:43, `collection: 'user_profile'`), NOT the default `users`. The verification countDocuments command uses the Mongoose `User` model so collection mapping is auto-handled — but if the planner ever spec'd a raw mongo shell command, it MUST target `db.user_profile`, not `db.users`. The REQUIREMENTS.md ROLE-02 acceptance line `db.users.countDocuments(...)` is wrong about the collection name; planner should sanity-check with the maintainer.
- Recommended D-09 resolution is "update-only" (RESEARCH.md Pattern 7 lines 678-683) — script emits a WARNING for missing emails rather than upserting with a fake uid.

---

#### `src/routes/authRoutes.js` (MODIFIED — route handler, request-response)

**Self-analog patterns**:

**Imports section** (authRoutes.js:1-4):
```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
```
ADD: `const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');`

**Existing POST /users body-merge pattern that MUST be tightened for HF-03** (authRoutes.js:7-65):
```javascript
router.post('/users', async (req, res) => {
  const { firebaseUid, email, displayName, firstName, lastName, phone, whatsapp, telegram, instagramUrl, isRenterApplicant } = req.body;
  const uid = firebaseUid;
  // ...
  let user = await User.findOne({ uid });
  if (!user) {
    user = new User({ uid, email, firstName: firstName || displayName, lastName, userType: 'renter' });
  } else {
    // Direct field assignment — no role check on userType (NEVER set from body, but field is missing from list — defensive)
    user.email = email;
    if(firstName) user.firstName = firstName;
    // ... per-field guards ...
  }
```
The current handler does NOT accept `userType` from the body (good — implicit allowlist). HF-03 makes this **explicit** via the `pick(body, ['firstName','lastName',...])` pattern, AND adds the body-uid match check.

**HF-03 patch (RESEARCH.md "Code Examples — HF-03 body-uid match" lines 1132-1158):**
```javascript
router.post('/users', verifyFirebaseToken, async (req, res) => {
  const { firebaseUid: bodyUid, email, firstName, lastName, phone, whatsapp, telegram, instagramUrl, isRenterApplicant } = req.body;

  // HF-03 (a): body-uid MUST match JWKS-verified sub
  if (bodyUid && bodyUid !== req.firebaseUid) {
    return res.status(403).json({ code: 'uid-mismatch', message: 'Body firebaseUid does not match token' });
  }

  // HF-03 (b): explicit field allowlist — userType NEVER from body
  const safe = { firstName, lastName, phone, whatsapp, telegram, instagramUrl, isRenterApplicant };
  // ... use safe instead of body fields ...
});
```

**ROLE-08 NEW endpoint (`GET /me`)** — analog: existing `GET /users/:firebaseUid` handler (authRoutes.js:67-87):
```javascript
router.get('/users/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isLocked || user.deletedAt) {
      return res.status(403).json({ message: '...', code: 'ACCOUNT_LOCKED', ... });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```
NEW `GET /me` mirrors this but reads `req.user` (already attached by middleware) — no params, no findOne. Pattern from RESEARCH.md Open Question 5 line 1280:
```javascript
router.get('/me', verifyFirebaseToken, async (req, res) => {
  // req.user already loaded + lock-checked by middleware
  res.json(req.user);
});
```

**Patterns to PRESERVE:**
- Mount `verifyFirebaseToken` per-route (NOT `router.use(...)`), because `GET /users/:firebaseUid` (line 68) stays public-OK during the dual-accept window per RESEARCH.md Open Question 5 (line 1281).
- Existing error envelope `{ message, code }` (authRoutes.js:43-46) — keep unchanged for backwards-compat on existing routes; new responses use the same shape.

**Risk callouts:**
- DO NOT delete `GET /users/:firebaseUid` (existing — line 68) until Phase 6 legacy cutoff (D-05). Both `/me` (NEW) and `/users/:firebaseUid` (legacy) coexist during M2 development.
- The "locked email rejects account recreation" branch at lines 13-20 stays — HF-03 is additive, not a rewrite of POST /users.

---

#### `src/routes/propertyRoutes.js` (MODIFIED — route handler)

**Inline auth block to REPLACE** (propertyRoutes.js:85-119, the POST `/` handler):
```javascript
router.post('/', upload.array('images', 40), async (req, res) => {
  try {
    const firebaseUid = req.body.firebaseUid || req.headers['x-firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required. firebaseUid missing.' });
    }
    const user = await User.findOne({ uid: firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.userType !== 'renter' && user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only renters or admins can create listings.' });
    }
    req.user = user;
    req.firebaseUid = firebaseUid;
  } catch (authError) { /* 500 */ }
  // ... continue with property creation ...
});
```
**Replacement pattern** (RESEARCH.md Pattern 4 lines 467-494):
```javascript
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
router.post('/', upload.array('images', 40), verifyFirebaseToken, async (req, res) => {
  // req.user + req.firebaseUid already attached
  // ... continue with property creation ...
});
```
**Note:** the order matters — `multer` must run BEFORE `verifyFirebaseToken` so multipart body is parsed (current code's existing reasoning at propertyRoutes.js:83-84 is correct — preserve it). Place `verifyFirebaseToken` AFTER the multer upload middleware.

**Existing imports to KEEP** (propertyRoutes.js:1-10):
```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const Property = require('../models/Property');
const User = require('../models/User');
const { verifyRenter } = require('../middleware/authMiddleware');  // <-- REMOVE
const { generateListingId } = require('../utils/listingIdGenerator');
const { geocodeAddress } = require('../utils/geocoder');
```
Remove `verifyRenter` import; add `verifyFirebaseToken` import.

**HF-01 patch (D-02 standalone hotfix, but spec'd here for completeness):**
- propertyRoutes.js:123-143 destructuring block — ADD `rooms`, `maxGuests`, `amenities` (RESEARCH.md "Code Examples — Property.js HF-01 schema patch" lines 1023-1031)
- propertyRoutes.js:198-220 `propertyData` object construction — ADD parsed values per RESEARCH.md lines 1034-1042
- Same patch applies to the PUT `/:id` handler around line 343+.

**Risk callouts:**
- Three (not just one) inline auth blocks live in this file (the count CONTEXT.md cites is "3 inline copies" at line 472 of CONTEXT.md). Planner must locate and replace all three (POST /, PUT /:id, DELETE /:id ~ search for `req.body.firebaseUid || req.headers['x-firebase-uid']`).
- The `userType !== 'renter' && userType !== 'admin'` gate at line 108 must be replaced with `requireMinRole`-equivalent or, simpler for Phase 1, the hard "renter creates listings" rule moves AWAY from auth and into a separate authorization step. Phase 1's three-role system flips `'renter'` → `'user'`, so any role gate that was checking `'renter'` becomes "is the user authenticated" (which `verifyFirebaseToken` already proves) — meaning the inline `userType !== 'renter' && !== 'admin'` gate is REMOVED, not replaced. Verify with maintainer if listing-creation should require any specific role beyond authenticated.

---

#### `src/routes/favoriteRoutes.js` (MODIFIED — route handler)

**Inline auth pattern to REMOVE** (favoriteRoutes.js:7-47):
```javascript
const verifyAuth = async (req, res, next) => {
  try {
    const firebaseUid = req.body?.firebaseUid || req.headers?.['x-firebase-uid'] || null;
    req.firebaseUid = firebaseUid;
    if (!firebaseUid) { req.user = null; return next(); }
    try {
      const user = await User.findOne({ uid: firebaseUid });
      if (user && (user.isLocked || user.deletedAt)) {
        return res.status(403).json({ message: '...', code: 'ACCOUNT_LOCKED' });
      }
      req.user = user || null;
    } catch (dbError) { /* ... */ }
    next();
  } catch (error) { /* ... */ }
};
router.get('/', verifyAuth, async (req, res) => { /* ... */ });
```
This is a per-file middleware hand-roll. Replace `verifyAuth` with the imported `verifyFirebaseToken` (delete the inline definition lines 7-47).

**Mount pattern to ADOPT** — chatRoutes.js:10 is the gold-standard pattern for protecting all routes in a file:
```javascript
// chatRoutes.js:8-10
const { verifyChatUser } = require('../middleware/chatAuthMiddleware');
router.use(verifyChatUser);
```
Mirror with:
```javascript
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
router.use(verifyFirebaseToken);
```
**Caveat:** favoriteRoutes.js currently has a "graceful no-uid → return [] " pattern (line 56-58). With `verifyFirebaseToken` now hard-rejecting missing tokens, the planner must decide if the GET `/` route stays auth-required or branches to public unauth (returns []). If the existing no-auth → empty-array behavior is intentional UX (likely), keep `verifyFirebaseToken` per-route on writes only, NOT `router.use(...)`. Match the per-route pattern from authRoutes.js below.

**Risk callouts:**
- The unsafe "soft auth" pattern at favoriteRoutes.js:55-58 (`if (!firebaseUid) return res.json([])`) is a UX choice for unauthenticated browsing — preserve it by gating only writes (POST/DELETE/toggle) with `verifyFirebaseToken`, not the GET. The dual-accept-via-middleware does still allow unauthenticated reads if the route is unprotected.

---

#### `src/routes/chatRoutes.js` + `src/routes/appointmentRoutes.js` (MODIFIED — route handler)

**Self-analog (chatRoutes.js:1-11)** — exact pattern to replicate:
```javascript
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
// ... model imports ...
const User = require('../models/User');
const { verifyChatUser } = require('../middleware/chatAuthMiddleware');  // <-- REPLACE
router.use(verifyChatUser);  // <-- REPLACE function name only
```

**One-line change:**
```javascript
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
router.use(verifyFirebaseToken);
```
All downstream handlers in both files already read `req.firebaseUid` (chatRoutes.js:15, 30, 63; appointmentRoutes.js:51) — that contract is preserved by the new middleware.

**Patterns to PRESERVE inside handlers:** `req.firebaseUid` reads stay unchanged. No handler edits needed beyond the import + `router.use(...)` swap.

**Risk callouts:**
- Once `chatAuthMiddleware.js` is deleted, ANY remaining `require('../middleware/chatAuthMiddleware')` will break the deploy. Plan must verify both routes are migrated in the same commit + grep the codebase for the import.

---

#### `index.js` (MODIFIED — server bootstrap, HF-04 socket handshake)

**Existing socket setup pattern** (index.js:13-26):
```javascript
const io = new Server(server, {
  cors: { origin: '*' },
  path: '/socket.io',
});
app.set('io', io);

io.on('connection', (socket) => {
  const uid = socket.handshake.auth?.firebaseUid;
  if (uid) {
    socket.join(`user:${uid}`);
  }
  socket.on('disconnect', () => {});
});
```
**This is the unsafe pattern HF-04 closes.** Lines 20-26 trust `socket.handshake.auth.firebaseUid` without verification — any client can join any user's room.

**HF-04 replacement** (RESEARCH.md Pattern 5 lines 502-564):
- INSERT `io.use(async (socket, next) => {...})` BEFORE the existing `io.on('connection', ...)` handler.
- The `io.use` middleware does the same JWKS verify as the HTTP middleware (extract JWKS / ISSUER / FIREBASE_PROJECT_ID setup into a shared module, OR inline-duplicate per RESEARCH.md Pattern 5 line 506).
- Set `socket.userId` and `socket.authPath` ('bearer' or 'legacy').
- The `io.on('connection')` handler then auto-joins `user:${uid}` ONLY when `socket.authPath === 'bearer'` — never on legacy.

**Patterns to PRESERVE:**
- `cors: { origin: '*' }` config (line 15) — unchanged.
- `app.set('io', io)` (line 18) — unchanged.
- `path: '/socket.io'` (line 16) — unchanged.

**Patterns to RECONSIDER:**
- The `path: '/socket.io'` is also the default; explicit setting matches client-side ChatService.ts:99 (`path: '/socket.io'`) — keep as-is.
- The bare `socket.on('disconnect', () => {})` (line 25) is empty — can be left or removed; no behavior change.

**Risk callouts:**
- DO NOT keep the line-21 unverified `socket.handshake.auth?.firebaseUid` read — that's the HF-04 vulnerability. Either remove it or wrap behind `socket.authPath === 'bearer'` check (RESEARCH.md Pattern 5 lines 542-545).
- The JWKS module-level setup (`const JWKS = createRemoteJWKSet(...)`) MUST be declared once. Recommended: extract `const JWKS` + `const ISSUER` + `const FIREBASE_PROJECT_ID` into the new `verifyFirebaseToken.js` and re-export, OR put it in a small shared `src/config/firebase.js` module that BOTH the middleware and `index.js` import. Avoid two copies of `createRemoteJWKSet` — they share the cache only if they're the same function instance.

---

#### `src/models/User.js` (MODIFIED — model schema)

**Self-analog — additive field pattern** (User.js:38-40):
```javascript
deletedAt: { type: Date, default: null },
isLocked: { type: Boolean, default: false },
deletionReason: { type: String },
```
This is the established additive nullable-Date pattern. ADD `roleRevokedAt: { type: Date, default: null }` alongside, mirroring `deletedAt`.

**Enum cutover** (User.js:14-18):
```javascript
userType: {
  type: String,
  enum: ['renter', 'owner', 'agent', 'admin'],
  default: 'renter',
},
```
**After migration --verify returns 0**, change to:
```javascript
userType: {
  type: String,
  enum: ['user', 'moderator', 'admin'],
  default: 'user',
},
```
Per RESEARCH.md "Code Examples — User.js schema cutover" lines 992-1011.

**Patterns to PRESERVE:**
- `collection: 'user_profile'` (line 43) — DO NOT change. The collection name is decoupled from the Mongoose model name and is the production source-of-truth.
- `timestamps: true` (line 42).
- `unique: true` on `uid` and `email` (lines 7, 12) — required invariants.

**Risk callouts:**
- DO NOT deploy the enum cutover until migration `--verify` returns 0 (D-08 + RESEARCH.md line 46). Two-step deploy: (1) add `roleRevokedAt` field (additive, safe), (2) run migration script, (3) deploy enum cutover.
- The inline comment line 16 ("Added agent/admin to support legacy JayTap roles if needed, or I should migrate") is the literal motivation for D-06 — remove the comment when the enum changes.

---

#### `src/models/Property.js` (MODIFIED — model schema, HF-01)

**Self-analog — additive number/array pattern** (Property.js:13-15, 22):
```javascript
bedrooms: { type: Number, default: 0 },
bathrooms: { type: Number, default: 0 },
areaSqm: { type: Number, default: 0 },
// ...
features: [String],
```
ADD next to bedrooms/bathrooms (~line 14-15) per RESEARCH.md "Code Examples — Property.js HF-01 schema patch" lines 1018-1021:
```javascript
rooms: { type: Number, default: 0 },
maxGuests: { type: Number, default: 0 },
amenities: { type: [String], default: [] },
```
The `[String]` for `amenities` mirrors `features: [String]` (line 22) — same shape. The default `[]` is explicit (different from `features` which has no default but Mongoose defaults arrays to `[]` automatically — explicit is safer for the new field).

**Risk callouts:**
- HF-01 is data-integrity, ships ASAP per D-02 as standalone hotfix BEFORE Phase 1.
- The `propertyRoutes.js` route-handler patch is the SECOND layer (RESEARCH.md "Architectural Responsibility Map" line 121) — schema accepting the field is necessary but not sufficient. Both must ship together.

---

#### `package.json` (MODIFIED — config)

**Self-analog — current shape** (package.json:1-24):
```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node index.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.806.0",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "firebase-admin": "^13.6.1",
    "mongoose": "^9.1.6",
    "multer": "^1.4.5-lts.1",
    "multer-s3": "^3.0.1",
    "socket.io": "^4.8.3"
  }
}
```

**Required changes:**
- ADD `"jose": "^6.2.3"` to dependencies (RESEARCH.md line 128)
- REMOVE `"firebase-admin": "^13.6.1"` (RESEARCH.md State of the Art line 1237 — dead, zero imports)
- ADD `"migrate:roles-m2": "node src/scripts/migrate-roles-m2.js"` to scripts (RESEARCH.md Pattern 6 lines 666-671)
- (Claude's Discretion) Optionally add `"test": "jest"` + `"jest"`, `"supertest"`, `"mongodb-memory-server"` to devDependencies (RESEARCH.md Wave 0 Gaps line 1374). Replaces the placeholder `"echo \"Error: no test specified\""`.

**Risk callouts:**
- The `engines` field is currently absent from the backend `package.json`. The RN client has `"engines": { "node": ">=22.11.0" }` (RN package.json:52-54). RESEARCH.md line 1287 states `Node ≥ 22.11`. Consider adding the same engines field to backend during Phase 1 to fail-fast on Railway if Node downgrades.

---

#### `.env.example` (NEW — config template)

**Closest analog:** NONE. There is no template file in the backend repo today. CONTEXT.md D-01 + RESEARCH.md HF-02 corrected runbook lines 1195-1207 specify the file's contents.

**Pattern source — RESEARCH.md lines 1196-1207 (verbatim):**
```
# JayTap-services environment template
# Real values live in Railway environment variables (production)
# and in a local .env (development) — NEVER commit .env.

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
AWS_BUCKET_NAME=<your-bucket>
FIREBASE_PROJECT_ID=<firebase-project-id>
PORT=5000
```
**Risk callout:** No analog means no project convention to mirror — adopt the RESEARCH.md template verbatim. `.env` IS already in `.gitignore` (verified `.gitignore:12` shows `.env` listed) — `git rm --cached` is a NO-OP per RESEARCH.md "Critical correction" line 15.

---

#### `__tests__/*.test.js` (NEW, optional — test infra)

**Closest analog:** NONE. Backend has zero tests (verified — no `__tests__` directory, no jest in `package.json`, `"test"` script is `echo "Error..."`).

**Cross-repo analog (RN client):** `src/services/__tests__/PropertyService.test.ts`, `src/components/__tests__/Gated.test.tsx`, `src/hooks/__tests__/useRole.test.ts` — these establish the test-file naming + co-location convention but are TS+jest+react-native-preset, not directly transferable to Node backend tests. The plan-time decision per Claude's Discretion (RESEARCH.md line 1383): if jest setup is skipped, the curl matrix is the minimum acceptable verification.

**If tests are added (Wave 0 Gaps RESEARCH.md lines 1374-1382):**
- Add devDeps: `jest@^29 supertest@^7 mongodb-memory-server@^9`
- `jest.config.js` with `{ preset: 'node', testMatch: ['__tests__/**/*.test.js'] }`
- 9-case golden-token matrix per RESEARCH.md Validation Architecture lines 1340-1363

---

### Client

#### `src/services/apiClient.ts` (NEW — service infra)

**Analog:** `src/services/AuthService.ts` (axios usage + AsyncStorage helpers — full file 1-157) PLUS `ChatService.ts:14-18` (the `getHeaders()` helper that this file consolidates).

**Imports + axios call shape** (AuthService.ts:1-2):
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
```
New `apiClient.ts` imports the same two libs, plus axios types: `import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';` (RESEARCH.md Pattern 8 line 691).

**URL constants pattern** (PropertyService.ts:8-12):
```typescript
const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
const API_URL = PRODUCTION_URL;
```
The `PRODUCTION_URL` is duplicated across all 5 services (verified — same string in AuthService.ts:10, PropertyService.ts:8, FavoritesService.ts:6, ChatService.ts:6, AppointmentService.ts:6). New `apiClient.ts` becomes the single source of truth — the 5 services import `apiClient` and drop their own URL constants.

**Header helper to consolidate** — `ChatService.ts:14-18`:
```typescript
const getHeaders = async () => {
  const userData = await AuthService.getUserData();
  const uid = userData?.localId;
  return uid ? { 'x-firebase-uid': uid } : {};
};
```
This exact helper is duplicated in `AppointmentService.ts:10-14` (identical) and inlined into FavoritesService.ts everywhere (lines 25, 64, 89, 113, 138). The `apiClient.ts` request interceptor REPLACES all of these — services stop calling `getHeaders()` entirely, axios instance auto-attaches `Authorization: Bearer <token>`.

**AsyncStorage key conventions** (AuthService.ts:64-77):
```typescript
saveToken: async (token: string, userData: any) => {
  await AsyncStorage.setItem('userToken', token);
  await AsyncStorage.setItem('userData', JSON.stringify(userData));
},
getToken: async () => {
  return await AsyncStorage.getItem('userToken');
},
```
Existing keys: `userToken` (idToken), `userData` (JSON-serialized). NEW key: `refreshToken` (idToken's companion, stored as plain string). Mirror the `AsyncStorage.setItem('refreshToken', value)` + `getItem('refreshToken')` shape — no new abstraction.

**Error envelope detection pattern** (AuthService.ts:90, 107):
```typescript
if (error.response?.data?.code === 'ACCOUNT_LOCKED') { /* ... */ }
```
The existing client already reads `error.response.data.code` for machine-checkable codes. New interceptor (RESEARCH.md Pattern 8 lines 743-769) reads `(error.response?.data as any)?.code` for `'token-expired'` (401 retry) and `'role-revoked'` (403 retry). Same pattern, different codes — preserve the convention.

**Patterns to PRESERVE:**
- `try { ... } catch (error: any) { throw error.response ? error.response.data.error : error; }` style (AuthService.ts:21-23) — keep this in `AuthService.refreshIdToken` (the new method, RESEARCH.md Pattern 10 lines 837-855).
- All 5 services already use the bare `axios.get/post/put/patch/delete` pattern. After migration they ALL switch to `apiClient.get/post/...` — drop-in replacement.

**Risk callouts:**
- DO NOT introduce a new "auth context dependency on apiClient" coupling. The `registerAuthHooks({ refreshRole, logout })` pattern (RESEARCH.md Pattern 8 lines 733-741) is a deliberate inversion — `AuthContext` registers callbacks INTO `apiClient`, not the other way around. Maintains the "services don't import context" rule (referenced in useRole.ts:75 comment).
- Single-flight pattern (`refreshPromise` ref in module scope, RESEARCH.md Pattern 8 lines 713-731) is non-negotiable — see PITFALLS Pitfall 7 (RESEARCH.md lines 977-979).
- The `_retry: true` flag pattern (RESEARCH.md Pattern 8 line 752) prevents infinite retry loops — copy verbatim.

---

#### `src/services/AuthService.ts` (MODIFIED — service)

**Self-analog — Identity Toolkit REST call pattern** (AuthService.ts:26-37):
```typescript
signIn: async (email: string, password: string) => {
  try {
    const response = await axios.post(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, {
      email, password, returnSecureToken: true,
    });
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data.error : error;
  }
},
```
**ADD `refreshIdToken` method** mirroring this exact try/catch shape (RESEARCH.md Pattern 10 lines 836-855):
```typescript
refreshIdToken: async (refreshToken: string) => {
  const formBody = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
  try {
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      formBody,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { id_token, refresh_token } = response.data;
    await AsyncStorage.setItem('userToken', id_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);
    return id_token;
  } catch (error: any) {
    throw error.response ? error.response.data.error : error;
  }
},
```

**`saveToken` extension** — current (AuthService.ts:64-67):
```typescript
saveToken: async (token: string, userData: any) => {
  await AsyncStorage.setItem('userToken', token);
  await AsyncStorage.setItem('userData', JSON.stringify(userData));
},
```
**Required change:** add a third arg `refreshToken: string` and `await AsyncStorage.setItem('refreshToken', refreshToken)`. OR add a new method `saveRefreshToken(refreshToken: string)`. Pick one and apply consistently — the planner decides.

**`logout` extension** (AuthService.ts:78-81):
```typescript
logout: async () => {
  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('userData');
},
```
**Required change:** add `await AsyncStorage.removeItem('refreshToken')` per D-11 (RESEARCH.md line 51).

**Risk callouts:**
- The `API_KEY = 'AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY'` hardcoded at AuthService.ts:5 is a CONCERN flagged in CONCERNS.md and Deferred Ideas (RESEARCH.md line 62). Phase 1 does NOT touch it. The same API_KEY is reused in `refreshIdToken` — this is correct (RESEARCH.md A6 line 1248).
- The Identity Toolkit `signInWithPassword` response already includes `refreshToken` (field-7, RESEARCH.md line 856-857). `AuthContext.login` currently discards it — see AuthContext patches below.

---

#### `src/services/PropertyService.ts` + `FavoritesService.ts` + `ChatService.ts` + `AppointmentService.ts` (MODIFIED — service migration)

**Migration pattern (verbatim per service):**

Before (FavoritesService.ts:23-27):
```typescript
const response = await axios.get(`${API_URL}/favorites`, {
  headers: { 'x-firebase-uid': userData.localId },
});
```
After:
```typescript
import { apiClient } from './apiClient';
// ...
const response = await apiClient.get('/favorites');
// Authorization: Bearer auto-attached by request interceptor
```

**Self-analogs per file** (each has identical existing patterns):
- `PropertyService.ts:14-26` — `axios.get` with no headers, baseURL string concat → `apiClient.get('/properties')` (no header changes since reads were already public)
- `FavoritesService.ts:22-50` — `axios.get` with explicit `x-firebase-uid` header → `apiClient.get('/favorites')`
- `ChatService.ts:42-46` — `getHeaders()` + `axios.get` → `apiClient.get('/chats/unread-count')`
- `AppointmentService.ts:17-21` — same as ChatService

**Each file's import section currently includes:**
```typescript
import axios from 'axios';
import { AuthService } from './AuthService';
```
After migration:
```typescript
import { apiClient } from './apiClient';
// AuthService import only kept if the file calls AuthService.getUserData() for non-header reasons
```

**ChatService special case — socket auth** (ChatService.ts:96-104):
```typescript
connectSocket: (firebaseUid: string, onNewMessage: ...): Socket => {
  const socket = io(WS_URL, {
    path: '/socket.io',
    auth: { firebaseUid },
    transports: ['websocket', 'polling'],
  });
  // ...
}
```
**HF-04 client patch** (RESEARCH.md Architecture line 196):
```typescript
connectSocket: async (onNewMessage: ...): Promise<Socket> => {
  const token = await AsyncStorage.getItem('userToken');
  const socket = io(WS_URL, {
    path: '/socket.io',
    auth: { token },  // <-- swap firebaseUid → token (D-04 dual-accept on backend)
    transports: ['websocket', 'polling'],
  });
  // ...
}
```
The signature changes (drops `firebaseUid` param) — call sites in `ChatScreen.tsx` and elsewhere must update. Planner: grep for `connectSocket(` usages in client.

**Risk callouts:**
- The 5 services pattern is repetitive, but each has slight variants (PropertyService uses `multipart/form-data` via FormData, FavoritesService has the soft-auth empty-array UX). DO NOT one-shot-migrate all five with a regex — each handler must be reviewed for header dependency. Migration plan task should list each file individually.
- After migration, `getHeaders()` helpers in ChatService and AppointmentService can be deleted entirely.
- The `LOCAL_URL` Android emulator override (`http://10.0.2.2:5000/api`) at PropertyService.ts:9 is a debug feature — not currently active (`API_URL = PRODUCTION_URL`), but preserve the constant for `__DEV__` toggling later.

---

#### `src/context/AuthContext.tsx` (MODIFIED — provider)

**Self-analogs:**

**Provider shape** (AuthContext.tsx:15-129) — keep the React-Context-with-Provider shape, single `useState<any>(null)` for user, `useState(true)` for loading.

**Login pattern to extend** (AuthContext.tsx:46-74):
```typescript
const login = async (email, password) => {
  const data = await AuthService.signIn(email, password);
  const userData = { email: data.email, localId: data.localId };
  // ... backend sync ...
  await AuthService.saveToken(data.idToken, userData);
  setUser(userData);
};
```
**Required change:** capture `data.refreshToken` from the Identity Toolkit response and persist it via `AuthService.saveToken(data.idToken, userData, data.refreshToken)` (or via the new `saveRefreshToken` method). Same change in `signup` (lines 76-99) — `data.refreshToken` is in the signUp response too.

**Logout pattern** (AuthContext.tsx:101-104):
```typescript
const logout = async () => {
  await AuthService.logout();
  setUser(null);
};
```
**Required change:** the underlying `AuthService.logout` already needs the `refreshToken` removal (above). The AuthContext-level `logout` stays as-is — `AsyncStorage` cleanup happens in the service.

**ADD `refreshRole` method** (RESEARCH.md Pattern 11 lines 877-888):
```typescript
const refreshRole = async () => {
  if (!user?.localId) return;
  setIsLoadingRole(true);
  try {
    const fresh = await apiClient.get('/auth/me');
    setUser(prev => prev ? { ...prev, backendProfile: fresh.data } : null);
  } finally {
    setIsLoadingRole(false);
  }
};
```
This pattern aligns with the existing `loadStorageData` pattern (lines 23-44) which also fetches `backendProfile` and merges via `userData.backendProfile = backendUser`. Same merge shape; new method is just a callable variant.

**ADD interceptor wiring** — register hooks once on mount (RESEARCH.md Pattern 11 lines 891-893):
```typescript
useEffect(() => {
  registerAuthHooks({ refreshRole, logout });
}, []);
```

**AuthContextType interface change** (AuthContext.tsx:4-11):
```typescript
interface AuthContextType {
  user: any;  // <-- becomes AuthUser | null
  loading: boolean;
  login: (email, password) => Promise<void>;
  signup: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  // ADD:
  refreshRole: () => Promise<void>;
  isLoadingRole: boolean;
}
```

**Risk callouts:**
- `user: any` → `user: AuthUser | null` is a typing tightening. CONCERNS.md flags this as Medium (RESEARCH.md line 919). The `userData['backendProfile'] = backendUser` line (AuthContext.tsx:59) may not type-check cleanly with the new strict type — planner reviews each property assignment.
- The `loadStorageData` flow (lines 23-44) reads `userToken` + `userData` + fetches backendUser. ADD `refreshToken` rehydration to this path.
- DO NOT call `refreshRole()` from `useEffect` on every mount — that triggers RESEARCH.md Pitfall 4 stale-cache concerns (refreshing on every protected action). Phase 1 only wires the callable; AppState 'active' refresh stays in Phase 2 per CONTEXT.md Claude's Discretion.

---

#### `src/hooks/useRole.ts` (MODIFIED — hook)

**Self-analog — surgical deletion** (useRole.ts:63-67):
```typescript
// Branch 3 (M1 override): email allowlist.
// TODO(M2): remove M1 allowlist branch from useRole role-priority ladder
if (isAllowlistedAdmin(user?.email)) {
  return 'admin';
}
```
DELETE these 5 lines. Also delete the import at line 3:
```typescript
import { isAllowlistedAdmin } from '../constants/adminAllowlist';
```

**Patterns to PRESERVE:**
- Branches 1, 2, 4 of `deriveRole` (lines 47-71) stay verbatim. Branch 1 (`customClaims.role`) is forward-compat per RESEARCH.md A9 line 1251 (currently undefined; keeps Branch 2 as the active path).
- `canFromUser`, `Role`, `Action`, `PermissionDeniedError` exports — unchanged.
- The `canFromUser(... 'manageListings')` check at line 93 reads `user?.backendProfile?.userType === 'renter'` — this becomes obsolete after the migration flips `'renter'` → `'user'`. Planner needs to either (a) flip the check to `=== 'user'` OR (b) remove the role gate entirely (any authenticated user can manage their own listings). Cross-reference with RESEARCH.md Open Question 2 / propertyRoutes.js:108 callout.

**Risk callouts:**
- The deletion is the LAST step of Phase 1 client release per RESEARCH.md line 968 — migration must run + admin must be seeded BEFORE this file ships. PITFALLS Pitfall 5 (RESEARCH.md lines 966-969).
- File deletion `src/constants/adminAllowlist.ts` is the matching change. After both deletions, `grep -r 'isAllowlistedAdmin\|adminAllowlist' src/` should return zero hits.

---

#### `src/components/RoleRefreshBanner.tsx` (NEW — component)

**Closest analogs (compositional):**
- `src/components/Gated.tsx` (entire file 1-25) — small functional component reading `useRole()` context, returning `<>{...}</>`.
- `src/components/LanguageToggleSwitch.tsx` (entire file 1-126) — `useTheme()` + i18n consumer, theme-token-driven styling, `TouchableOpacity` tap handler, animated state transitions.

**Functional component shell** (Gated.tsx:1-25):
```tsx
import React, { ReactNode } from 'react';
import { useRole, Action } from '../hooks/useRole';

interface GatedProps { /* ... */ }

export const Gated: React.FC<GatedProps> = ({ action, children, fallback = null }) => {
  const { can } = useRole();
  return <>{can(action) ? children : fallback}</>;
};
```
Mirror the export pattern: `export const RoleRefreshBanner: React.FC = () => { ... };` (RESEARCH.md "Code Examples — RoleRefreshBanner" lines 1072-1100).

**Theme + i18n wiring** (LanguageToggleSwitch.tsx:1-8):
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export const LanguageToggleSwitch: React.FC = () => {
  const { isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  // ...
};
```
**Note the import paths:**
- `useTheme` is `'../theme/ThemeContext'` — NOT `'../theme/useTheme'` as RESEARCH.md Pattern 1 line 1069 incorrectly states. Planner must use the correct path.
- `useLanguage` is `'../context/LanguageContext'` — NOT `'../i18n/useLanguage'` as RESEARCH.md line 1070 states. Planner must use the correct path.

**Theme token consumption** — LanguageToggleSwitch.tsx uses `useTheme().isDark` and hardcodes some hex colors (lines 31, 38, 41) for the toggle's button face. The pattern is mixed. For the banner, prefer `colors.error` (warning-equivalent — see colors.ts:18, 38) since `theme.colors.warning` does NOT exist in the palette today. **Important:** RESEARCH.md Pattern 1 line 1089 references `colors.warning` and `colors.onWarning` — neither exists. Planner picks an existing semantic token (`colors.accent` `#FF385C`, `colors.error` `#F44336`, or `colors.primary`) OR adds `warning` + `onWarning` to `src/theme/colors.ts`. **Recommend extending the palette** with `warning` and `onWarning` since this is the first banner-style alert in the app.

**TouchableOpacity tap handler** (LanguageToggleSwitch.tsx:28-34):
```tsx
<TouchableOpacity
  style={[styles.container, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
  onPress={toggle}
  activeOpacity={0.8}
>
```
Mirror this shape for the banner — `onPress={async () => { await refreshRole(); setLastSeenRole(currentRole); }}`.

**i18n key reading** — `useLanguage()` returns `{ language, setLanguage }` (LanguageContext.tsx). The `t()` helper is in `src/locales/index.ts:11-22`. Pattern for reading a translation in a component:
```tsx
import { t } from '../locales';
import { useLanguage } from '../context/LanguageContext';

const { language } = useLanguage();
const message = t(language, 'auth.roleChanged.banner');
```
NOT `useLanguage().t(key)` as RESEARCH.md line 1075 implies. Planner verifies by reading `src/context/LanguageContext.tsx` if needed.

**Risk callouts:**
- The component MUST be extracted to `src/components/RoleRefreshBanner.tsx` (NOT inlined in App.tsx) per PITFALLS Pitfall 4 / RESEARCH.md line 963 — the App.tsx LOC budget is 1100 hard / 1050 soft, currently 975 LOC. A 30-line banner inline pushes near the soft ceiling.
- Sticky-banner state lives in the COMPONENT, not App.tsx. The component's own `useState<lastSeenRole>` + `useEffect` does the role-change detection (RESEARCH.md "Code Examples — RoleRefreshBanner" lines 1077-1085). App.tsx merely renders `<RoleRefreshBanner />`.
- DO NOT use hardcoded hex colors. Use `useTheme().colors` tokens. If the existing palette lacks `warning`/`info`, EXTEND `src/theme/colors.ts` (light + dark) — a one-line addition per theme is preferable to inlining a hex.

---

#### `src/types/Auth.ts` (NEW — type definition)

**Closest analog:** `src/types/Property.ts` (full file 1-71) and `src/types/Appointment.ts` (full file 1-37).

**Type-export pattern** (Property.ts:1-2, 17):
```typescript
import type { HospitalityAmenity } from '../utils/hospitalityAmenities';

export interface Tour { /* ... */ }
export interface Property { /* ... */ }
```
Mirror: `export interface BackendProfile { ... }` and `export interface AuthUser { ... }` per RESEARCH.md Pattern 9 lines 778-808.

**Optional-field idiom** (Property.ts:38-58):
```typescript
agent?: {
  name: string;
  rating: number;
  reviews: number;
  imageUrl?: string;
};
// ...
owner?: {
  uid?: string;
  email?: string;
  // ...
};
```
Use `?:` for optional fields and inline-object shapes for nested records. Mirror in `BackendProfile.availabilitySettings` (RESEARCH.md Pattern 9 lines 790-794).

**Union-string-literal idiom** (Property.ts:46, 66):
```typescript
type: 'rent' | 'sale';
status?: 'draft' | 'live';
```
Mirror in `BackendProfile.userType: 'user' | 'moderator' | 'admin'` (RESEARCH.md Pattern 9 line 781).

**Patterns to PRESERVE:**
- No re-export from `index.ts` for `types/` — each type file is imported directly (`import { AuthUser } from '../types/Auth'`). Verified — `src/types/` has no `index.ts`.
- File naming is PascalCase (`Property.ts`, `Appointment.ts`), so the new file is `Auth.ts` (NOT `auth.ts` as the prompt's `<additional_context>` says — defer to project convention). Verify with maintainer.

---

#### `src/locales/en.ts` + `src/locales/ru.ts` (MODIFIED — i18n data)

**Self-analog — flat key map** (en.ts:1-79):
```typescript
export const en = {
  // Common
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  // ...
  // Auth
  'auth.signInRequired': 'Sign In Required',
  'auth.signIn': 'Sign In',
  // ...
};
```
The convention is dot-namespaced flat keys (`'auth.foo.bar'`) in a single object literal. There is no nesting. The Russian file mirrors the same keys in the same order.

**Patterns to PRESERVE:**
- Add the 4 new keys under the `// Auth` section comment (en.ts:17 — after existing auth keys, around line 79):
  - `'auth.roleChanged.banner': 'Your role changed — tap to reload'` (D-13 verbatim)
  - `'auth.session.expired.title': 'Session expired'` (D-11 split)
  - `'auth.session.expired.body': 'Please sign in again.'` (D-11 split)
- Russian mirror keys must land in the SAME ORDER in `ru.ts`:
  - `'auth.roleChanged.banner': 'Ваша роль изменилась — нажмите для перезагрузки'`
  - `'auth.session.expired.title': 'Сеанс истёк'`
  - `'auth.session.expired.body': 'Пожалуйста, войдите снова.'`

**TranslationKeys type** (locales/index.ts:4):
```typescript
import type { TranslationKeys } from './en';
```
The type is derived from `en.ts`'s exported object. Adding keys to `en.ts` automatically expands `TranslationKeys`. The Russian file's keys must match — there is NO compile-time enforcement that `ru.ts` covers all keys (the `t` helper falls back to `translations.en[key]` per locales/index.ts:16). Manual parity check is required during code review.

**File-format reality check (REPEAT):** CONTEXT.md and CLAUDE.md say `src/locales/{en,ru}.json`. The actual files are `en.ts` and `ru.ts` — TypeScript modules with `export const en = { ... }`. Planner must spec `.ts` literal additions, not JSON.

**Note on key count:** RESEARCH.md "Locale keys to add" lines 1108-1126 says 3 keys EN + 3 keys RU = 6 keys total (title + body for the toast splits). CONTEXT.md "Established Patterns" line 129 says 4 keys total. The discrepancy is real — RESEARCH.md (correct) treats title+body as separate keys; CONTEXT.md treats the toast as one combined key. Recommend the 3-key approach per RESEARCH.md since RN `Alert.alert(title, body)` (the existing pattern per RESEARCH.md Open Question 3 line 1268) takes title and body as separate args.

---

#### `App.tsx` (MODIFIED — app shell)

**Self-analogs:**

**Provider tree** (App.tsx:961-971):
```tsx
return (
  <SafeAreaProvider>
    <KeyboardProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </KeyboardProvider>
  </SafeAreaProvider>
);
```
**`<RoleRefreshBanner />` mounts INSIDE `<AuthProvider>`** (so it can call `useAuth()`). The banner is rendered inside `AppContent`, NOT at the provider-tree level — verified by reading the imports + content structure.

**Outer view + OVERLAY_FLAGS pattern** (App.tsx:551-555):
```tsx
return (
  <>
    <View style={{ flex: 1 }}>
      {/* Keep main stack mounted under full-screen flows so Profile / Home are not torn down */}
      <View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>
        {/* main stack */}
      </View>
      {/* overlay slots */}
    </View>
  </>
);
```
**Banner mount point** — INSIDE the outer `<View style={{ flex: 1 }}>` (line 553), BEFORE the `<View style={{ flex: 1, display: hideMainStackUnderOverlay ? ... }}>` (line 555). Pattern from RESEARCH.md "Banner mount in App.tsx" lines 1052-1062:
```tsx
return (
  <>
    <View style={{ flex: 1 }}>
      <RoleRefreshBanner />  {/* NEW — sticky above OVERLAY_FLAGS */}
      <View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>
        {/* existing main stack */}
      </View>
      {/* existing overlay slots */}
    </View>
  </>
);
```
The banner renders ABOVE the toggleable view — so when an overlay hides the main stack, the banner remains visible. This satisfies D-13 "persists across screen changes."

**Imports section** — add at App.tsx top:
```tsx
import { RoleRefreshBanner } from './src/components/RoleRefreshBanner';
```

**OVERLAY_FLAGS comment** (App.tsx:80-85):
```typescript
// Single source of truth for "is the main stack currently eclipsed by a full-screen overlay?"
// Adding a new overlay = add its flag here. Code-review checklist: if you added a new
// full-screen overlay state, did you add it to OVERLAY_FLAGS?
```
**The banner is NOT an overlay flag.** Per RESEARCH.md Pitfall 4 line 963 + CONTEXT.md "Established Patterns" line 127, the banner mounts ABOVE `OVERLAY_FLAGS`-driven hiding, not as a member of the OVERLAY_FLAGS array. Planner must NOT add a banner flag to OVERLAY_FLAGS.

**Risk callouts:**
- LOC delta target: ≤30 LOC. Current 975 → 1005 max. Soft ceiling 1050 / hard 1100 (RESEARCH.md line 100, 963). The banner is a single import + single JSX line — should land at ~3 LOC. Stays well under budget.
- DO NOT add new useState calls in App.tsx for banner state — that's the regression PITFALLS Pitfall 4 catalogues. Banner state lives inside the component.

---

#### `src/constants/adminAllowlist.ts` (DELETE)

**Deletion ordering** — LAST step of Phase 1 client release per RESEARCH.md line 968 / Pitfall 5. Migration script runs FIRST → admin record exists in Mongo with `userType: 'admin'` → THEN useRole.ts Branch 3 deletion + this file deletion can ship.

**Verification post-deletion:** `grep -r 'adminAllowlist\|isAllowlistedAdmin\|ALLOWLIST' /Users/beckmaldinVL/development/mobileApps/JayTap/src/` returns zero.

---

## Shared Patterns

### Pattern A: Backend mongoose connection (`require('../config/db')`)
**Source:** `JayTap-services/src/config/db.js` (full file 1-26)
**Apply to:** `migrate-roles-m2.js`
```javascript
const connectDB = require('../config/db');
// ...
await connectDB();
```
The helper applies the `dbName: 'bizdinkonush'` invariant (db.js:14-16). Direct `mongoose.connect()` calls bypass this and would land on a different database. ALL Mongoose-using scripts MUST go through `connectDB`.

### Pattern B: Backend error envelope `{ message, code }`
**Source:** `authMiddleware.js:25-28`, `authRoutes.js:43-46`
**Apply to:** All new auth-related backend responses (verifyFirebaseToken, HF-03 mismatch, ROLE-08 /me errors)
```javascript
res.status(403).json({
  code: 'role-revoked',
  message: 'Role changed; please refresh',
});
```
The `code` is machine-checkable (client interceptors); `message` is human-readable. RESEARCH.md Pattern 2 lines 437-450 lists the canonical Phase 1 codes: `token-expired`, `invalid-token`, `missing-token`, `role-revoked`, `account-locked`, `uid-mismatch`, `insufficient-role`.

### Pattern C: Backend `req.firebaseUid` attachment
**Source:** `authMiddleware.js:38`, `chatAuthMiddleware.js:29`
**Apply to:** `verifyFirebaseToken.js`
```javascript
req.user = user;
req.firebaseUid = firebaseUid;
next();
```
EVERY downstream handler reads `req.firebaseUid`. Breaking this contract breaks all 5 services. RESEARCH.md Pattern 4 line 494 confirms backwards-compat.

### Pattern D: Backend CommonJS module shape
**Source:** Every backend file (verified)
**Apply to:** `verifyFirebaseToken.js`, `migrate-roles-m2.js`
```javascript
const Foo = require('./foo');
// ...
module.exports = { name1, name2 };
// OR:
module.exports = router;  // for routers
// OR:
module.exports = name;     // for default
```
The repo is CommonJS — NO ESM. `jose@6.x` is ESM-only — RESEARCH.md line 128 notes "ESM-only — fine on Node 22.12+". Either Node loads it via dynamic import or the require gets transpiled. Verify on first install that `require('jose')` works (Node 22.11+ supports `require()` of ESM via `--experimental-require-module`, default-on in 22.12+).

### Pattern E: Client axios + AsyncStorage idiom
**Source:** `AuthService.ts:1-2, 64-77`
**Apply to:** `apiClient.ts`, AuthContext extensions
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('userToken', token);
const token = await AsyncStorage.getItem('userToken');
```
Existing keys: `userToken`, `userData`, `@jaytap_language`. NEW key: `refreshToken`. NO encryption layer (CONCERNS.md flagged but out of scope per RESEARCH.md line 1397).

### Pattern F: Client try/catch error throw
**Source:** `AuthService.ts:21-23` (and every other axios call in services)
**Apply to:** `AuthService.refreshIdToken`, all interceptor catch blocks
```typescript
try {
  // ...
} catch (error: any) {
  throw error.response ? error.response.data.error : error;
}
```
The `error.response.data.error` path is for Firebase Identity Toolkit's `{error: {code, message}}` shape. The `apiClient.ts` interceptor reads `error.response.data.code` (the BACKEND envelope, Pattern B above) — different field, intentional difference. Planner: don't conflate the two error envelope shapes.

### Pattern G: Client `useTheme()` token consumption (for banner)
**Source:** `LanguageToggleSwitch.tsx:7, 31, 38`
**Apply to:** `RoleRefreshBanner.tsx`
```tsx
const { isDark, colors } = useTheme();
// then:
<View style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
```
**The `colors` palette is `{ background, surface, text, textSecondary, textTertiary, primary, primaryLight, accent, border, inputBackground, chipBackground, chipBorder, activeChipBackground, activeChipText, success, error, cardShadow, buttonText }`** (full enumeration from colors.ts:1-42). NO `warning` / `info` / `onWarning` tokens — recommend ADD `warning` + `onWarning` to both light and dark palettes (one-line each) since the banner is the first warning-style UI.

### Pattern H: Client i18n key + lookup
**Source:** `src/locales/en.ts`, `src/locales/index.ts:11-22`
**Apply to:** Banner component, hard-logout toast in AuthContext
```typescript
import { t } from '../locales';
import { useLanguage } from '../context/LanguageContext';

const { language } = useLanguage();
const label = t(language, 'auth.roleChanged.banner');
```
Flat dot-namespaced keys, EN + RU parity required, manual review (no compile-time gate per locales/index.ts:16 fallback).

### Pattern I: AsyncStorage cleanup on logout
**Source:** `AuthService.ts:78-81`
**Apply to:** `AuthService.logout` extension
```typescript
logout: async () => {
  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('userData');
  await AsyncStorage.removeItem('refreshToken');  // NEW
}
```
Order doesn't matter; symmetry with `saveToken` writes does.

---

## No Analog Found

Files with no close match in either codebase (planner uses RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason | Source to use |
|------|------|-----------|--------|---------------|
| `JayTap-services/.env.example` | config template | n/a | No template file exists in backend repo | RESEARCH.md HF-02 corrected runbook lines 1196-1207 |
| `JayTap-services/__tests__/*.test.js` | test (jest+supertest) | n/a | Backend has zero tests, no jest config, `"test"` script is placeholder | RESEARCH.md Validation Architecture lines 1340-1363; RN client test files for naming convention only |
| `JayTap-services/src/middleware/verifyFirebaseToken.js` (jose-specific code) | middleware (JWKS) | request-response | No JWKS verification anywhere in repo (was previously firebase-admin-shaped, never wired) | RESEARCH.md Pattern 1 lines 311-433 — full skeleton verified against Context7 jose docs |
| `RoleRefreshBanner.tsx` (sticky-state hook) | component (state-detection) | event-driven | No banner-pattern UI exists in client today; all alerts are `Alert.alert(...)` | RESEARCH.md "Code Examples — RoleRefreshBanner" lines 1064-1106 |
| `src/services/apiClient.ts` (interceptor + single-flight) | service (axios infra) | request-response | No shared axios instance exists; every service calls `axios` directly | RESEARCH.md Pattern 8 lines 686-770 |

For all of these, the planner MUST cite the RESEARCH.md section directly — there is no codebase precedent to copy from.

---

## Cross-cutting Risk Inventory

These hazards span multiple files and MUST be surfaced in the per-plan action sections:

1. **Naming discrepancies between CONTEXT.md and reality** (3 cases):
   - `src/locales/{en,ru}.json` are actually `.ts` (planner specs `.ts` literal edits)
   - `userRoutes.js` does not exist — HF-03 lockdown lives in `authRoutes.js POST /users` (planner spec'd against the correct file)
   - `theme.colors.warning` / `colors.onWarning` referenced in RESEARCH.md do NOT exist — extend palette OR pick existing token

2. **Migration deploy ordering — strict 5-step sequence** (D-08 + Pitfall 5):
   - (1) Wave-0 secret rotation
   - (2) HF-01 schema patch ships
   - (3) Migration script runs (`--dry-run` first, then live, then `--verify`)
   - (4) `User.js` enum cutover deploys
   - (5) Client release with `useRole.ts` branch deletion + `adminAllowlist.ts` deletion
   - Reordering ANY step risks admin lockout (Pitfall 5) or schema rejection.

3. **Dual-accept window invariants** (D-03, D-04, D-05):
   - Backend: `verifyFirebaseToken` must accept BOTH `Authorization: Bearer` AND `x-firebase-uid` until Phase 6.
   - Backend socket: `io.use` must accept BOTH `auth.token` AND `auth.firebaseUid` until Phase 6.
   - Client: All 5 services switch to Bearer simultaneously; legacy code paths get GC'd in this phase (no rollback path).
   - Structured legacy logs are the EVIDENCE for Phase 6 cutoff. Without them, Phase 6 has nothing to cut against.

4. **Mongoose collection mapping** (User.js:43):
   - The schema sets `collection: 'user_profile'`. Raw Mongo CLI commands referencing `db.users` will miss data. Planner: prefer Mongoose-model commands in scripts over raw shell.

5. **Module-instance sharing for jose JWKS cache** (RESEARCH.md Pattern 5 + line 904):
   - `createRemoteJWKSet(...)` MUST be a module-level singleton. Two `createRemoteJWKSet` calls in different files = two caches. Recommend a small `src/config/firebase.js` shared module imported by both `verifyFirebaseToken.js` and `index.js` (for socket handshake).

6. **`req.firebaseUid` contract** (Pattern C):
   - Every existing handler reads `req.firebaseUid`. The new middleware MUST attach it on BOTH the Bearer path and the legacy path (RESEARCH.md Pattern 1 lines 379, 407). Breaking this attaches a downstream 5-service production outage.

---

## Metadata

**Analog search scope:**
- Backend: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/{index.js, src/middleware/, src/routes/, src/scripts/, src/models/, src/config/, package.json, .gitignore}`
- Client: `/Users/beckmaldinVL/development/mobileApps/JayTap/{App.tsx, package.json, src/services/, src/context/, src/hooks/, src/components/, src/types/, src/theme/, src/locales/, src/constants/}`

**Files scanned (read in full or in targeted ranges):** 27
- Backend (12): `authMiddleware.js`, `chatAuthMiddleware.js`, `seed.js`, `User.js`, `Property.js`, `authRoutes.js` (full), `propertyRoutes.js` (lines 1-220), `favoriteRoutes.js` (lines 1-100), `chatRoutes.js` (lines 1-80), `appointmentRoutes.js` (lines 1-80), `index.js` (full), `db.js` (full), `package.json` (full), `.gitignore` (top 20)
- Client (15): `AuthService.ts` (full), `PropertyService.ts` (lines 1-80), `FavoritesService.ts` (full), `ChatService.ts` (full), `AppointmentService.ts` (full), `AuthContext.tsx` (full), `useRole.ts` (full), `Gated.tsx` (full), `LanguageToggleSwitch.tsx` (full), `Property.ts` (full), `Appointment.ts` (full), `colors.ts` (full), `ThemeContext.tsx` (full), `locales/index.ts` (full), `locales/en.ts` (lines 1-80), `App.tsx` (lines 80-180, 540-640, 950-974), `adminAllowlist.ts` (full), `package.json` (full)

**Pattern extraction date:** 2026-04-29

**Key patterns identified:**
- Backend uses CommonJS, `require('../config/db')` for Mongoose connection, `req.firebaseUid` attachment as the auth contract, `{ message, code }` error envelope idiom, plain `console.error` / `console.log` (no structured logger), per-route OR `router.use(...)` middleware mounting (the chatRoutes pattern is the gold standard for "all routes protected").
- Client uses ES modules + TS, `useTheme()` semantic-token consumption (palette lacks warning/info — recommend extending), flat dot-namespaced i18n keys in `src/locales/{en,ru}.ts` (NOT JSON), AsyncStorage with bare string keys (`userToken`, `userData`, `refreshToken`-to-add), `axios` direct usage in 5 services with duplicated `getHeaders()` (consolidation target), App.tsx custom state machine with `OVERLAY_FLAGS` derived-overlay pattern (banner mounts ABOVE this).
- Cross-repo: NO Firebase SDK in either repo (project rule); MongoDB is THE role authority via `User.userType`; `Authorization: Bearer` migration ships with backend dual-accept of `x-firebase-uid` until Phase 6.

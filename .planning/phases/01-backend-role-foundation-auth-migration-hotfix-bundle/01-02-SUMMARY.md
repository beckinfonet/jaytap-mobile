---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 02
subsystem: backend (JayTap-services)
tags: [hotfix, hospitality, schema, property-routes, mongoose, HF-01]
requires:
  - "M1 Phase 6 client already sending rooms/maxGuests/amenities (PropertyService.ts:83-85, 154-156)"
provides:
  - "Property Mongoose schema declaring rooms, maxGuests, amenities — Mongoose strict mode no longer silently drops them at write time"
  - "POST /api/properties handler reads + persists rooms/maxGuests/amenities (multipart/form-data + application/json)"
  - "PUT /api/properties/:id handler updates rooms/maxGuests/amenities on edit (multipart/form-data + application/json)"
affects:
  - "Hospitality listings created or edited via the live RN client now round-trip rooms/maxGuests/amenities once Railway redeploys with this commit"
tech-stack:
  added: []
  patterns: ["Mongoose schema additive number/array fields", "multipart/form-data triple-branch parser (string|array|fallback) mirroring features parser"]
key-files:
  created: []
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js (+3 lines: rooms, maxGuests, amenities)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js (+22 lines: POST destructure + propertyData; PUT amenities parse + rooms/maxGuests parseInt)"
decisions:
  - "PUT handler used spread (...req.body) not destructuring — mirrored existing features parser as a guarded post-spread parsing block per Rule 3 (blocking issue: amenities arrives as JSON string from FormData, would fail mongoose validation if persisted as string into [String])"
  - "Added explicit parseInt coercion for updateData.rooms / updateData.maxGuests in PUT handler (multipart delivers numeric fields as strings) — mirrors POST handler's parseInt(rooms) pattern"
metrics:
  duration: "~10 minutes"
  completed-date: "2026-04-29"
  tasks: 2
  files-modified: 2
  commits-backend: 2
---

# Phase 01 Plan 02: HF-01 Hospitality Round-Trip Hotfix Summary

One-liner: Patches the M1 Phase 6 round-trip data-loss bug — `rooms`/`maxGuests`/`amenities` were silently dropped at write time because the `Property` Mongoose schema never declared them; this plan adds the three fields to the schema and wires both POST and PUT route handlers to read, parse, and persist them across multipart/form-data and application/json bodies.

## What Was Built

### Task 1 — Schema additions (`src/models/Property.js`)

Added three field declarations adjacent to the existing `bedrooms`/`bathrooms`/`areaSqm` block:

```javascript
rooms: { type: Number, default: 0 }, // hospitality: number of rooms in hostel/hotel
maxGuests: { type: Number, default: 0 }, // hospitality: max guests per stay
amenities: { type: [String], default: [] }, // hospitality: 12-amenity multi-select
```

The `[String]` array shape mirrors `features: [String]` (line 22). Explicit `default: []` for safety on the new field. No existing fields touched. `collection: 'listings'`, `timestamps: true`, virtuals all preserved.

Verification: `node --check src/models/Property.js` → exit 0. All four required grep patterns matched.

Commit: `23ced02` — `feat(properties): add rooms/maxGuests/amenities to Property schema [HF-01]` (1 file changed, 3 insertions).

### Task 2 — Route handler wiring (`src/routes/propertyRoutes.js`)

**POST `/` handler** (around lines 122-225):
- Added `rooms`, `maxGuests`, `amenities` to the `req.body` destructuring.
- Added three assignments to `propertyData`:
  ```javascript
  rooms: parseInt(rooms) || 0,
  maxGuests: parseInt(maxGuests) || 0,
  amenities: typeof amenities === 'string' ? JSON.parse(amenities) : (Array.isArray(amenities) ? amenities : []),
  ```
- The triple-branch on `amenities` handles BOTH multipart/form-data (string-encoded JSON via FormData → arrives as JSON string) and application/json (already-parsed array). `propertyRoutes.js` uses `multer.array('images', 40)`, so non-file array fields arrive as JSON strings.

**PUT `/:id` handler** (around lines 374-505):
- The PUT handler uses `const updateData = { ...req.body };` rather than explicit destructuring, so the three new fields pass through automatically — but `amenities` arrives as a JSON string from FormData and would fail Mongoose `[String]` validation, and `rooms`/`maxGuests` arrive as strings.
- Added a guarded `amenities` parser block immediately after the existing `features` parser (mirroring its triple-branch shape):
  ```javascript
  if (updateData.amenities !== undefined) {
    updateData.amenities = typeof updateData.amenities === 'string'
      ? JSON.parse(updateData.amenities)
      : (Array.isArray(updateData.amenities) ? updateData.amenities : []);
  }
  ```
- Added `parseInt` coercion for `updateData.rooms` and `updateData.maxGuests` (mirrors how `availableDate` is converted to `Date` in the same code path).

Verification: `node --check src/routes/propertyRoutes.js` → exit 0. `grep -c "rooms"` returned 9 (≥ 4 required). `grep "maxGuests"` matched in BOTH POST (lines 137, 218) and PUT (lines 479-484) handlers. `grep "amenities"` matched in BOTH POST (lines 138, 219) and PUT (lines 471, 473-476). `grep "JSON.parse(amenities)"` matched at line 219. POST handler also has `JSON.parse(updateData.amenities)` at line 475 (slightly different exact string but the parser is present).

Commit: `19c1c2b` — `fix(properties): persist rooms/maxGuests/amenities for hospitality listings [HF-01]` (1 file changed, 22 insertions).

## Backend Repo State

- HEAD before plan: `fec64f2`
- HEAD after Task 1: `23ced02`
- HEAD after Task 2 (final): `19c1c2b`
- Branch: `main`
- Working tree: clean after both commits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Plan said "apply the SAME destructuring addition" to the PUT handler, but the PUT handler uses spread (`...req.body`), not destructuring**

- **Found during:** Task 2.
- **Issue:** The plan instructed mirroring the POST handler's destructuring + propertyData additions in the PUT handler. The PUT handler at line 393 uses `const updateData = { ...req.body };` and `Object.assign(property, updateData);` at line 503 — there is no field-by-field destructuring in this handler. Adding destructuring would have changed the existing handler's shape (out of scope), and not adding any code would have left a different bug: `amenities` arriving as a JSON string from `FormData` would fail Mongoose `[String]` validation, and `rooms`/`maxGuests` would persist as strings into `Number` fields (Mongoose may coerce, but `parseInt` is the existing handler's pattern for `bedrooms`/`bathrooms`/etc. when written; here it's not done in PUT for any numeric field, but the existing PUT handler also doesn't write to `bedrooms`/`bathrooms`/`areaSqm` explicitly — it relies on the spread, and Mongoose silently coerces.).
- **Fix:** Added a guarded `amenities` parser block immediately after the existing `features` parser (mirroring its triple-branch shape and `if-undefined`-guard idiom). Also added `parseInt` coercion guards for `updateData.rooms` and `updateData.maxGuests` to be explicit and to mirror the POST handler's `parseInt(rooms) || 0` pattern. This keeps the spread-based PUT handler's existing structure intact while ensuring the three new fields are parsed correctly across both content types.
- **Files modified:** `src/routes/propertyRoutes.js` (one edit, lines 471-486 of the resulting file)
- **Commit:** `19c1c2b` (combined with the POST handler changes)
- **Why it's still HF-01-additive:** No existing field's shape was changed. No existing handler was touched. All additions are guarded with `if (updateData.X !== undefined)` so they only run when the new fields are present.

## Authentication Gates

None. This plan is purely additive route-handler + schema work. The existing inline `req.body.firebaseUid || req.headers['x-firebase-uid']` auth checks were NOT touched — those are scheduled for replacement in Plan 06 via the JWKS `verifyFirebaseToken` middleware migration. HF-01 is independent of HF-02..HF-04 and the role-foundation work.

## Threat Surface Scan

Plan 01-02 has `threat_refs: []` in its frontmatter, and the plan's own threat register declares the new fields non-sensitive (room count, guest count, amenity list). No new endpoints, no new auth paths, no new file-access patterns, no schema changes at trust boundaries. The new fields are read from the same already-authenticated request body that `bedrooms`/`bathrooms`/`features` already pass through. No threat flags raised.

## Known Stubs

None. All three new fields are wired end-to-end in both schema and routes, with parsing for both content types.

## Manual Verification (Deferred to User)

After Wave 0 plan 01-01 redeploys Railway (the secret-rotation hotfix) and Railway picks up commit `19c1c2b` from the backend repo, the user should perform a live smoke test from the RN client:

1. Open the app, sign in, create a Hospitality (Hostel or Hotel) listing.
2. Set non-zero `rooms` (e.g., 4), non-zero `maxGuests` (e.g., 8), and select 3+ amenities from the 12-amenity picker.
3. Save the listing.
4. Re-fetch the listing (background out + back, or pull-to-refresh).
5. Confirm all three fields display populated values (not 0 / not empty array).
6. Edit the listing, change `rooms` to a different value (e.g., 5), save, re-fetch, confirm the change persisted.

Expected: PASS — both POST (create) and PUT (edit) round-trips preserve all three fields. Record the result in `01-VALIDATION.md` "Manual-Only Verifications".

If any of the three fields revert to 0 or empty after re-fetch, the most likely cause is that Railway has not yet redeployed with commits `23ced02 + 19c1c2b` (Mongoose evaluates schema at first model use; restart required). Confirm Railway deploy status before opening a new bug.

## Self-Check: PASSED

- File exists: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — FOUND (verified via prior Read)
- File exists: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — FOUND (verified via prior Read)
- Commit exists in backend repo: `23ced02` — FOUND (verified via `git log --oneline`)
- Commit exists in backend repo: `19c1c2b` — FOUND (verified via `git log --oneline`)
- `node --check` on Property.js — PASSED
- `node --check` on propertyRoutes.js — PASSED
- All four task verification grep checks — PASSED
- RN client repo working tree — CLEAN (no accidental edits)

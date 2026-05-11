---
phase: 01-schema-reshape-backend-route-shape-cutover
fixed_at: 2026-05-05T00:00:00Z
review_path: /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report — Schema Reshape + Backend Route Shape Cutover

**Fixed at:** 2026-05-05T00:00:00Z
**Source review:** `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (Critical: 2, Warning: 5)
- Fixed: 7
- Skipped: 0

All in-scope critical and warning findings were applied as 7 atomic commits in
the backend repo (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`).
Info findings (IR-01..IR-04) were out of scope per the `critical_warning` filter
and remain open in REVIEW.md.

The four backend test files in scope ran green after each fix (`nvm use 24`,
node 22.20+) and the full Phase 1 test set is now **138/138 green** (5 new
regression tests added under WR-04, baseline was 133/133). No source files
were left in a broken state and no fixes were rolled back.

REVIEW-FIX.md is intentionally not committed by the fixer — the orchestrator
workflow owns that commit per `gsd-code-review-fix` contract.

---

## Fixed Issues

### CR-01: Owner-side PUT `/api/properties/:id` is missing the 21-key mass-assignment strip

**Files modified:** `src/routes/propertyRoutes.js` (in JayTap-services backend repo)
**Commit:** `faa308f`
**Applied fix:** Added the 21-key forbidden-key strip immediately after `const updateData = { ...req.body };` in the PUT handler. Strip ordering follows IR-04's defense-in-depth nit (runs FIRST, before the platformVerifications guard / archived-readonly 409 / D-22 sanitizer). The list mirrors the mod-side PUT in `moderationRoutes.js`: 5 standard (ownerUid, _id, id, createdAt — status is left for the existing D-22 sanitizer to handle so admin-as-owner still works), 11 SCHEMA-04 audit fields (submittedAt, approvedAt, approvedByUid, rejectedAt, rejectedByUid, rejectionReasonCode, rejectionReasonNote, archivedAt, archivedByUid, archivedReasonCode, archivedReasonNote), 2 defensive HF-03 anti-spoofing keys (actorUid, firebaseUid). The existing admin-only platformVerifications gate is left untouched so admin-as-owner can still include them in the same PUT.

The rejected→pending auto-flip block re-stamps `submittedAt` from `new Date()` after the strip — that path is unaffected because it writes after the strip.

**Regression test:** `src/__tests__/propertyRoutes.test.js` "PUT /:id (CR-01) owner mass-assignment strip — 21 forbidden keys cannot be forged" (added under WR-04, commit `09fc5ce`).

---

### CR-02: Nested-subtree PUT performs destructive shallow replace on `Object.assign`

**Files modified:**
- `src/routes/propertyRoutes.js` (owner PUT — backend repo)
- `src/routes/moderationRoutes.js` (mod edit-on-behalf PUT — backend repo)

**Commit:** `d3b22ff`
**Applied fix:** Implemented Option A from REVIEW.md (per-subtree merge before the bottom write). For each of `['location', 'basics', 'conditionAndAmenities', 'content', 'terms', 'media']`, when the body contains a partial subtree object, snapshot the existing subtree and spread caller-supplied keys on top, then let the bottom write apply.

Owner PUT (propertyRoutes.js): merges into `property[key]` before the trailing `Object.assign(property, updateData)`. Existing subtree captured via `toObject()` for Mongoose subdocs.

Mod edit-on-behalf PUT (moderationRoutes.js): merges into `updateData[key]` using the `original` snapshot already loaded above (line 495) — `original` is the pre-update lean read used for the audit diff, so merging on top of it is the cleanest path. The diff computation continues to compare `original[k]` vs `updateData[k]` at the field level, so the audit log accurately reflects post-merge keys.

Top-level scalars retain shallow-replace semantics. Arrays bypass the merge (`!Array.isArray(incoming)` guard) so `media.photos[]` and similar are overwritten as-is.

**Regression tests:** Five tests added under WR-04 (commit `09fc5ce`):
- `propertyRoutes.test.js`:
  - "PUT /:id (CR-02) partial-basics body preserves untouched basics fields"
  - "PUT /:id (CR-02) partial-location body preserves untouched location fields"
- `moderationRoutes.test.js`:
  - "PUT /listings/:id (CR-02) partial-basics body preserves untouched basics fields on mod-edit"
  - "PUT /listings/:id (CR-02) partial-content body preserves untouched description + language on mod-edit"

These exercise the exact scenarios from the REVIEW.md fix-suggestion code block (`{ basics: { price: 600 } }` preserves areaSqm/currency/rooms; `{ location: { city: 'Almaty' } }` preserves coordinates/district).

---

### WR-01: Migration coerces missing `areaSqm` and `price` to literal `0`

**Files modified:** `src/scripts/migrate-listings-m3.js` (backend repo)
**Commit:** `bc5a4fd`
**Applied fix:** Replaced the `|| 0` coercion in `buildNestedShape()` for both `areaSqm` and `price`. New logic:
- `areaSqm`: only retains the value when it's a finite number > 0; otherwise undefined.
- `price`: retains finite-number values; falls back to `parseFloat` of strings only when the result is finite; otherwise undefined.

The schema allows undefined for both fields, so Phase 2's UI placeholder vs "explicit zero" distinction is preserved. A future "no free listings" rule can rely on price=0 being legitimate, not migrated-from-missing.

The existing helper unit tests in `migrate-listings-m3.test.js` use fixtures with valid numeric `areaSqm`/`price` values, so they continue to pass without modification.

---

### WR-02: `mapCurrency` silently coerces unknown currencies to `KGS`

**Files modified:** `src/scripts/migrate-listings-m3.js` (backend repo)
**Commit:** `f1d1581`
**Applied fix:** Split the catch-all return into two branches:
- Known KGS values (`'KGS'`, `'сом'`, `null`, `''`) fall through quietly with `return 'KGS'`.
- Anything else logs a `console.warn` with the offending value and still returns 'KGS' so the migration completes.

Operators can now grep `mapCurrency: unrecognized` across migration output to spot 'GBP', 'RUB', or any other unexpected legacy currencies. The existing unit tests for 'USD', 'EUR', '$', '€', 'KGS', 'сом', and `null` continue to pass — only the previously-undefined "unknown" path now emits a warning.

---

### WR-03: POST validator misses `basics.price === null` and malformed coordinates

**Files modified:** `src/routes/propertyRoutes.js` (backend repo)
**Commit:** `5c136e7`
**Applied fix:** Replaced the loose `!content?.title || !location?.coordinates || basics?.price === undefined` check with three explicit predicates:
- `titleOk`: `typeof content?.title === 'string'` AND `.trim().length > 0`.
- `coordsOk`: `location?.coordinates` exists AND `lat`/`lng` are both finite numbers.
- `priceOk`: `basics?.price` is a finite number (catches null, NaN, strings).

Same `M3_NESTED_BODY_REQUIRED` error code preserved so existing client error handling stays compatible. The error message is updated to reflect the tightened rules ("non-empty", "(numbers)").

The existing happy-path POST tests use proper numeric coords and prices, so they continue to pass. The "partial-nested body (missing basics.price) returns 400" test still covers the missing-price case.

---

### WR-04: Test coverage gap — owner PUT mass-assignment + partial-subtree-merge

**Files modified:**
- `src/__tests__/propertyRoutes.test.js`
- `src/__tests__/moderationRoutes.test.js`

**Commit:** `09fc5ce`
**Applied fix:** Added 5 regression tests covering the exact gaps called out in REVIEW.md:

`propertyRoutes.test.js` (3 new tests):
1. "PUT /:id (CR-01) owner mass-assignment strip — 21 forbidden keys cannot be forged" — sends every forbidden key (5 standard + 11 audit + 2 defensive + 3 trust signals = 21) and asserts each is unchanged from seed/default after persist. Legitimate `content.title` edit still lands.
2. "PUT /:id (CR-02) partial-basics body preserves untouched basics fields" — sends `{ basics: { price: 600 } }` and asserts areaSqm/currency/rooms/bathroom survive.
3. "PUT /:id (CR-02) partial-location body preserves untouched location fields (coordinates, district)" — sends `{ location: { city: 'Almaty' } }` and asserts district/coordinates/showExactAddress survive (the load-bearing fields for deep-link 404 + map pins).

`moderationRoutes.test.js` (2 new tests):
1. "PUT /listings/:id (CR-02) partial-basics body preserves untouched basics fields on mod-edit" — same partial-basics scenario, on the moderator edit-on-behalf path. Asserts D-12 status flip still applies.
2. "PUT /listings/:id (CR-02) partial-content body preserves untouched description + language on mod-edit" — partial-content body preserves description/language siblings.

Test seed enum value adjusted from `'separate'` (rejected by Property schema enum) to `'private'` (valid per the `bathroom: enum: ['private', 'none', 'shared']` definition). Initial test run failed with a Mongoose ValidationError; correction was made and tests now pass.

Final state: `npx jest src/__tests__/Property.test.js src/__tests__/migrate-listings-m3.test.js src/__tests__/propertyRoutes.test.js src/__tests__/moderationRoutes.test.js` runs **138/138 green** (was 133/133 pre-fix).

---

### WR-05: Migration `--dry-run` biased samples may misrepresent dataset

**Files modified:** `src/scripts/migrate-listings-m3.js` (backend repo)
**Commit:** `20ef76a`
**Applied fix:** Added a new `getBucketCounts(filter)` helper that returns `{apartmentHouse, officeCommercial, hotelHostel, other, total}` via four parallel `countDocuments` calls. The dry-run main path now prints the distribution before listing samples and emits a `console.warn` when any of the 3 primary buckets is empty:

```
=== propertyType bucket distribution (filter: location $exists false) ===
  apartment/house : 1000
  office/commercial: 0
  hotel/hostel    : 0
  other propertyType: 0
  total            : 1000
NOTE: at least one propertyType bucket is empty — samples may not represent the full dataset shape.
```

Pure observability — sample-selection logic in `collectBiasedSamples()` is unchanged. The existing dry-run integration test "dry-run modifies 0 docs and prints sample preview" still passes (it only asserts `=== DRY RUN ===`, `--- Sample 1`, etc., none of which moved).

The "tail sample" alternative suggested in REVIEW.md was not adopted to avoid scope creep in a warning-level fix; the bucket-distribution annotation is the lower-cost half of the suggestion and addresses the reviewer's primary concern (operator's mental model of the spread).

---

## Out-of-Scope (Info findings — not addressed)

Per the `critical_warning` fix scope, the following Info findings remain open in REVIEW.md and are deferred to a future iteration or follow-up fix request:

- **IR-01:** `Property.js` `dealType` comment misleading about D-04 backfill (style — comment-only change).
- **IR-02:** `LEGACY_FLAT_FIELDS_TO_UNSET` includes `period`/`agent`/etc. with no integration test asserting the live migration removes them (would add one defense test).
- **IR-03:** `Property.ts` (RN client repo, JayTap) audit-field types declared `string` but values can be `null` — TypeScript strict-null mismatch.
- **IR-04:** Strip-ordering nit on PUT — implicitly addressed by CR-01's commit (the strip now runs FIRST per IR-04's recommendation), but no separate ordering test was added.

---

_Fixed: 2026-05-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

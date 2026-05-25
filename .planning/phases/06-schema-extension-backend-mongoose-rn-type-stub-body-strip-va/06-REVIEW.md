---
phase: 06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va
reviewed: 2026-05-25T23:00:00Z
depth: deep
verdict: CONCERNS
files_reviewed: 10
files_reviewed_list:
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/utils/stripResidentialOnlyFields.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/stripResidentialOnlyFields.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md
findings:
  blocker: 0
  warning: 2
  info: 5
  total: 7
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-25T23:00:00Z
**Depth:** deep (cross-file analysis — commit chain traced across 4 backend commits + 4 RN client commits)
**Files Reviewed:** 10 (8 backend + 2 RN client)
**Verdict:** CONCERNS — no blockers; 2 warnings, 5 info items. Safe to merge with warnings noted for Phase 7 planning.

## Summary

Phase 6 adds `basics.bedrooms` (integer 0–10, residential-only) and `basics.bathroomCount` (0.5-step 0–10, all 6 types) to the backend Mongoose schema, mirrors them in the RN client TypeScript type stub, and introduces the `stripResidentialOnlyFields` helper plus route-layer 400 blocks at all three write paths (POST + owner PUT + moderation PUT). Commit chain: `cf97bfa → 174a185 → dfab993 → 0272cda` (backend); `bc0fa94 → c3a4972 → d5aa7e3 → eed041e` (RN client).

The implementation is **functionally correct** for its stated Phase 6 scope. Core invariants verified clean:

- D-09 ordering (strip before merge): `549 < 561` in propertyRoutes.js, `918 < 928` in moderationRoutes.js — correct.
- D-08 silent strip: zero `console.*` calls in `stripResidentialOnlyFields.js` — correct.
- D-02 strip set: exactly `{hotel, hostel, office, commercial}`, no `land` — correct.
- D-06 float-safe check: `Number.isInteger(v * 2)` present in both schema and route-layer — correct.
- D-11 error codes: `M4_BATHROOM_STEP_INVALID` and `M4_BEDROOMS_INVALID` present at all 3 write sites — correct.
- Fallback propertyType: `property.propertyType` (owner PUT) / `original.propertyType` (moderation PUT) — correct.
- Helper mutation semantics: returns same object reference — correct, verified in test suite.
- M3 `M3_NESTED_BODY_REQUIRED` 400 check: byte-identical, untouched — correct.
- M3 audit fields (Property.js lines 164–177 post-change): all 11 fields verbatim, untouched — correct.
- Pre-existing `runValidators: true` at moderationRoutes.js line 276 (media-add): unchanged — correct.
- RN Property.ts: purely additive (2 new fields alongside 8 existing) — correct.
- REQUIREMENTS.md doc-bug fixes: SCHEMA-01, SCHEMA-02, SCHEMA-04 corrected — correct.

Two warnings concern a stale cross-commit comment and a plan-spec ambiguity with behavioral consequence for Phase 7. Neither is a security issue or data-loss risk.

---

## Warnings

### WR-01: Property.js bedrooms comment states moderationRoutes does NOT pass `runValidators` — now false after Plan 02

**File:** `src/models/Property.js:63-67`

**Issue:** The bedrooms field comment, written in commit `cf97bfa` (Plan 01), explicitly states:

> `moderationRoutes.js PUT /api/moderation/listings/:id (line 938) does NOT pass { runValidators: true }, so on that path the route-layer 400 + Plan 02 helper carry the validation load.`

Plan 02 (commit `0272cda`) subsequently added `runValidators: true` to that findOneAndUpdate at `moderationRoutes.js:974`. The comment was not updated. Any developer reading `Property.js` will believe the moderation route bypasses schema validators — this is now false. The moderation route DOES fire the schema validator as defense-in-depth, meaning `basics.bedrooms` and `basics.bathroomCount` Mongoose validators run on the `findOneAndUpdate` path.

**Fix:** Update the comment at `Property.js:63-67`:
```js
// Mongoose `findOneAndUpdate` caveat: validators do NOT run on findOneAndUpdate by
// default. moderationRoutes.js PUT /api/moderation/listings/:id NOW passes
// `{ runValidators: true }` at line 974 (added in Phase 6 Plan 02) — so the
// schema validators DO fire on that path as defense-in-depth. The route-layer 400
// is still the primary validation gate; schema is the backstop for direct DB writes.
// (PUT /api/properties/:id uses `.save()`, which also fires this validator.)
```

---

### WR-02: Plan spec ambiguity causes behavioral mismatch for hospitality + invalid bedrooms

**File:** `src/routes/propertyRoutes.js:158-165` (same pattern at line 535-542 and `moderationRoutes.js:903-910`)

**Issue:** Plan 02 `must_have` #5 specifies:

> `POST + PUT + moderation PUT each return 400 with code: M4_BEDROOMS_INVALID when basics.bedrooms survives the strip (i.e., propertyType is residential or unset) AND fails ...`

The phrase "survives the strip" explicitly makes the strip a precondition for the bedrooms 400 check. However, the Plan 02 Task 2 action steps describe the opposite ordering: `400 checks AFTER the M3_NESTED_BODY_REQUIRED check but BEFORE the strip call`. The executor followed the action steps (not the must_have).

**Resulting behavior:** A hospitality listing body (e.g., `propertyType: 'hotel'`) that includes `basics.bedrooms: 2.5` (a non-integer) currently returns `400 M4_BEDROOMS_INVALID` instead of silently stripping the field. This is internally inconsistent: a hotel sending `bedrooms: 3` (valid) gets a silent strip; a hotel sending `bedrooms: 2.5` (invalid) gets a 400 error.

**Impact on Phase 7:** If the Phase 7 RN client hospitality form can submit a body where bedrooms is present with an invalid value (e.g., via a stepper that hasn't been validated client-side yet), and the backend is a hotel listing, the client will receive an unexpected `M4_BEDROOMS_INVALID` 400 error. The client's error handling, which discriminates on `M4_BEDROOMS_INVALID`, will surface a "bedrooms invalid" toast on a hospitality form that doesn't show bedrooms — confusing UX.

No test covers the `hotel + bedrooms: invalid value` case, so this gap is invisible to the current test suite.

**Fix:** Move the `basics.bedrooms` 400 check to AFTER the strip call (or add a propertyType guard so the 400 only fires when the effective type is residential/unset):
```js
// In all 3 route handlers — apply strip FIRST, then check bedrooms:
stripResidentialOnlyFields(updateData, property.propertyType);

// M4_BEDROOMS_INVALID only fires when bedrooms was NOT stripped (residential or unset):
if (updateData.basics?.bedrooms !== undefined) {
  const br = updateData.basics.bedrooms;
  if (typeof br !== 'number' || !Number.isInteger(br) || br < 0 || br > 10) {
    return res.status(400).json({
      message: 'basics.bedrooms must be an integer in [0, 10]',
      code: 'M4_BEDROOMS_INVALID',
    });
  }
}
```
The `bathroomCount` check ordering is unaffected (no strip applies to bathroomCount).

---

## Info

### IN-01: Mongoose ValidationError from `runValidators` on moderation PUT returns HTTP 500, not 400 with M4_ code

**File:** `src/routes/moderationRoutes.js:1016-1018`

**Issue:** The moderation PUT catch block returns `res.status(500).json({ message: err.message })`. If the `findOneAndUpdate` with `runValidators: true` triggers a Mongoose `ValidationError` (the defense-in-depth path when the route-layer 400 is somehow bypassed), the client receives HTTP 500 with a raw Mongoose error message instead of 400 with the `M4_BEDROOMS_INVALID` or `M4_BATHROOM_STEP_INVALID` code. The route-layer 400 is the primary path, so this only fires in direct-API-call scenarios that bypass the route guard, but it means Phase 7's error-code discrimination would not receive the expected codes in that edge case.

The `propertyRoutes.js` PUT catch block (line 580-582) returns `res.status(400)`, which is more appropriate for a `ValidationError`.

**Fix:** Either document explicitly that the schema-layer error path returns 500 (acceptable for defense-in-depth), or add Mongoose `ValidationError` detection in the moderation catch block:
```js
} catch (err) {
  console.error('Error in edit-on-behalf:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, code: 'SCHEMA_VALIDATION_ERROR' });
  }
  return res.status(500).json({ message: err.message });
}
```

---

### IN-02: REQUIREMENTS.md SCHEMA-02 bathroomCount validation expression not updated to match implementation

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md:35`

**Issue:** SCHEMA-02 still reads:

> `Mongoose validate rejects values that aren't a 0.5-step multiple (e.g. bathroomCount * 2 === Math.trunc(bathroomCount * 2) AND within [0, 10])`

The implementation uses `Number.isInteger(v * 2)` — not `Math.trunc`. The two expressions are functionally equivalent for the `[0, 10]` domain, but the docs describe a different expression than what is implemented. Future Phase 7/8 developers consulting REQUIREMENTS.md to understand the constraint will find a `Math.trunc` comparison that doesn't appear anywhere in the codebase.

**Fix:** Update the SCHEMA-02 wording to match:
> `e.g. Number.isInteger(bathroomCount * 2) AND within [0, 10]`

---

### IN-03: No test for `bathroomCount: 0` (falsy-but-valid) in route-level tests

**File:** `src/__tests__/propertyRoutes.test.js`, `src/__tests__/moderationRoutes.test.js`

**Issue:** The strip helper test suite correctly covers `bedrooms: 0` (falsy but valid, must still be stripped on hotel). But neither the propertyRoutes nor the moderationRoutes test suite includes a case for `bathroomCount: 0` (which is a valid value that the route-layer 400 check must pass, not reject). The test suite proves `bathroomCount: 1.5` persists and `bathroomCount: 1.3` is rejected, but does not confirm that `bathroomCount: 0` is accepted as valid.

The route check `bc < 0` correctly allows `0`, but a test would prevent a future regression if someone tightens the check to use truthy semantics.

**Fix:** Add one test case: `POST apartment + basics.bathroomCount: 0 returns 201`.

---

### IN-04: No test covering `PUT` owner-edit with invalid `bedrooms` value (`M4_BEDROOMS_INVALID` via PUT path)

**File:** `src/__tests__/propertyRoutes.test.js:1296` (end of describe block)

**Issue:** The test suite covers `POST apartment + bedrooms: 2.5 → 400 M4_BEDROOMS_INVALID` and `PUT with bathroomCount: 1.3 → 400 M4_BATHROOM_STEP_INVALID`, but does not include a `PUT` case for invalid bedrooms (`PUT apartment + bedrooms: 2.5 → 400 M4_BEDROOMS_INVALID`). The PUT bedrooms-validation code path is untested by a dedicated test case.

**Fix:** Add one test case in the M4 Phase 6 describe block:
```js
it('PUT owner edit with basics.bedrooms: 2.5 returns 400 M4_BEDROOMS_INVALID', async () => {
  // fixture: apartment listing, owner auth
  // PUT body: { basics: { bedrooms: 2.5 } }
  // assert 400, response.body.code === 'M4_BEDROOMS_INVALID'
});
```

---

### IN-05: No test proving `runValidators: true` schema-layer defense fires on moderation PUT (the backstop path)

**File:** `src/__tests__/moderationRoutes.test.js`

**Issue:** The four new moderation route tests all exercise the route-layer 400 path (which correctly fires before `findOneAndUpdate`). No test proves that the Mongoose schema validator fires via `runValidators: true` if the route-layer check were absent or bypassed. This is the defense-in-depth path that Plan 02 Task 3 added.

The gap is acceptable (schema validators ARE covered by the 8 `Property.test.js` test cases on the `.save()` path), but a test against the `findOneAndUpdate` + `runValidators` combination would provide complete coverage of the Plan 01 + Plan 02 integration.

**Fix (optional):** Add a test that calls `Property.findOneAndUpdate` directly with `{ runValidators: true }` and an invalid bathroomCount, asserting that a ValidationError is thrown. This would live in `Property.test.js` as a schema-level test, not a route test.

---

## Verifier-vs-Reviewer Callout

Per memory `gsd-verifier-misses-regressions.md`: the GSD verifier said PASS (311/311 tests) while this code review found:

- **WR-02** (behavioral mismatch for hospitality + invalid bedrooms): the test suite has no test for `hotel + bedrooms: invalid value`, so the verifier could not catch this. A hotel-body test with an invalid bedrooms value would have exposed the inconsistency between the plan must_have spec and the actual 400-before-strip ordering. The verifier's goal-backward "did the req get touched" lens missed this because all D-10 cases pass and the 400 path is exercised on residential types.

- **WR-01** (stale comment): no test can catch a comment describing behavior that was changed in a later commit. This is exactly the class of documentation debt that the GSD verifier cannot surface.

Both findings required walking the actual route handler execution paths (strip ordering logic, cross-commit comment context) rather than running tests.

---

## Cross-Repo Commit Chain Integrity

| Repo | Commits | HEAD | Pushed to Remote |
|------|---------|------|-----------------|
| backend (`JayTap-services`) | cf97bfa → 174a185 → dfab993 → 0272cda | 0272cda | Yes (`origin/main == HEAD` per SUMMARY) |
| RN client (`JayTap`) | bc0fa94 → c3a4972 → d5aa7e3 → eed041e | eed041e (8d1008c+4) | Yes (main branch, clean status) |

Commit chain is intact. No gaps detected. All four backend commits carry `feat(06):` prefix per project convention. All four RN client commits are present in `git log 8d1008c..HEAD`. Commit SHAs match what is documented in 06-01-SUMMARY.md and 06-02-SUMMARY.md.

**Backend test result at commit chain head (0272cda):** 12 suites / 311 tests / 0 regressions (per SUMMARY — run confirmed by executor).

---

## Sign-Off

**Would I merge this to main / the release branch?**

Yes, with the warnings tracked for Phase 7. The two warnings (WR-01, WR-02) do not introduce data loss, security holes, or incorrect DB writes in any scenario present in production today. WR-02 creates a behavioral inconsistency that Phase 7 should be aware of before wiring the hospitality form: if a hospitality listing's form body can contain `basics.bedrooms` with an invalid value (e.g., mid-input stepper state), the server will return `M4_BEDROOMS_INVALID` instead of silently stripping. WR-01 should be fixed in the next backend commit to prevent misleading future maintainers about the moderation route's schema-validator coverage.

The five info-level findings (IN-01 through IN-05) are test gaps and doc inconsistencies with no runtime consequence.

---

_Reviewed: 2026-05-25T23:00:00Z_
_Reviewer: Claude (gsd-code-reviewer, adversarial depth: deep)_
_Depth: deep — cross-file, cross-commit, cross-repo analysis_
_Commit range reviewed: backend 84016d4..0272cda (4 commits); RN client 8d1008c..HEAD (4 commits)_

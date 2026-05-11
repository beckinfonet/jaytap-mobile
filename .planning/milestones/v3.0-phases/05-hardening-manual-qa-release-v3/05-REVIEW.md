---
phase: 05-hardening-manual-qa-release-v3
reviewed: 2026-05-10T00:00:00Z
depth: deep
files_reviewed: 14
files_reviewed_list:
  - package.json
  - ios/JayTap.xcodeproj/project.pbxproj
  - android/app/build.gradle
  - src/services/PropertyService.ts
  - src/services/__tests__/PropertyService.test.ts
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/types.ts
  - App.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - backend: src/routes/moderationRoutes.js
  - backend: src/routes/propertyRoutes.js
  - backend: src/scripts/migrate-landlord-app-uid-mismatch.js
  - backend: src/scripts/seed-locations-m3.js
findings:
  critical: 0
  high: 0
  medium: 1
  low: 3
  total: 4
status: issues_found
verdict: GREEN
---

# Phase 5: Code Review Report — Hardening + Manual QA + Release v3.0.0

**Reviewed:** 2026-05-10
**Depth:** deep (cross-file, cross-repo)
**Files Reviewed:** 14 (10 RN client, 4 backend)
**Status:** issues_found
**Verdict:** GREEN — zero CRITICAL, zero HIGH. One MEDIUM (M2 PUT `/listings/:id` INVALID_ID gap — same-family as Phase 4 MD-02) and three LOWs, all M4-backlog candidates.

---

## Summary

Phase 5's commit chain across two repos delivered: REL-01/REL-02 atomic v3.0.0 / build 28 / versionCode 31 bump; Plan 05-01 backend hardening (MEDIUM-01 verify-PASS hoist, MEDIUM-02 INVALID_ID guards on 5 handlers, seed-locations env-var/dbName fallback); QA-MATRIX scaffold; and three Plan 05-05 walk regression fixes (PropertyService create/update JSON-body cutover, editAsModerator JSON-body cutover, edit-on-behalf banner ownerName fallback chain).

**Aggregate-verdict gates all PASS:**

- `bash scripts/check-i18n-parity.sh` → exit 0 (key sets identical between en.ts + ru.ts)
- `bash scripts/check-create-listing-screen-removed.sh` → exit 0 (FLOW-14 atomic-deletion sentinel)
- Backend: `check-no-actoruid-spoofing.sh`, `check-no-landlord-uid-spoofing.sh`, `check-property-routes-media-stripped.sh` all exit 0
- Version markers consistent: package.json `3.0.0`, pbxproj `MARKETING_VERSION=3.0.0` + `CURRENT_PROJECT_VERSION=28` (Debug+Release), build.gradle `versionName "3.0.0"` + `versionCode 31`
- `npx tsc --noEmit` → 17 errors (matches Phase 4 + Plan 05-03 baseline — no regression; all errors live in pre-existing flat-Property consumers untouched by Phase 5)
- `PropertyService.test.ts` → 6 passed (3 new from a3ba754 + 2 new from a3625e7 + 1 D-17 admin-guard); 2 pre-existing M2-baseline failures preserved (`patchPlatformVerifications` tests mock `axios.patch` while service uses `apiClient.patch` — known stale; not introduced in Phase 5)

The three Plan 05-05 walk fixes are correct. `PropertyService.createProperty`/`updateProperty` now POST/PUT the SPEC-shaped nested payload as JSON via `apiClient` — matching the Phase 1 commit 6f815f5 `M3_NESTED_BODY_REQUIRED` contract at `propertyRoutes.js:129-139` (which demands `content.title` + `location.coordinates.{lat,lng}` + `basics.price` numeric). `editAsModerator` strips the 4 identity/status keys client-side before PUT, riding `reason` as a top-level JSON field — backend's 21-key forbidden-list at `moderationRoutes.js:771-796` is the authoritative strip and remains intact. The banner fallback chain `ownerName → ownerEmail → ownerFallback` never falls through to the raw uid (the previous `editingOwnerUid` fallback was removed in `ContextualListingFlow/index.tsx:284-287`); i18n template variable renamed `{ownerEmail}` → `{owner}` in both locales.

Plan 05-01 backend MEDIUM-01 is correctly hoisted: `migrate-landlord-app-uid-mismatch.js:198-215` runs the `--verify=PASS` probe BEFORE the cursor walk at line 221, with `process.exit` short-circuiting before any write. Plan 05-01 MEDIUM-02 added `mongoose.Types.ObjectId.isValid(req.params.id)` guards to 5 sibling handlers (approve, listings POST media, reject, archive, restore) — bringing the total to 6 `:id` handlers with INVALID_ID 400, all with router-level `requireMinRole('moderator')` still in front (so unauth callers continue to get 401, not 400). The PUT `/listings/:id` editAsModerator handler at line 757 is the only remaining `:id` handler without an INVALID_ID guard — see MEDIUM-01 below.

---

## Critical Issues

None.

---

## High Issues

None.

---

## Medium Issues

### MD-01: PUT `/moderation/listings/:id` (editAsModerator endpoint) still leaks CastError 500 on malformed ObjectId

**File:** `backend: src/routes/moderationRoutes.js:757`

**Issue:** Plan 05-01 MEDIUM-02 added `mongoose.Types.ObjectId.isValid()` guards to 5 sibling handlers (lines 83, 211, 363, 448, 545, 653 — 6 total counting the pre-existing DELETE). The PUT `/listings/:id` editAsModerator endpoint at line 757 is the seventh `:id` handler in the file and is the one most directly hit by Phase 5 commit a3625e7 (the editAsModerator JSON-body cutover). It has NO INVALID_ID guard.

A malformed ObjectId on this PUT (e.g., `PUT /api/moderation/listings/banana`) reaches `Property.findById(propertyId).lean()` at line 810, which throws CastError, which falls to the generic catch block and returns `res.status(500).json({ message: "Cast to ObjectId failed for value \"banana\" at path \"_id\"..." })` — same leak pattern that MEDIUM-02 fixed for the other 5 handlers.

This is NOT a regression introduced in Phase 5 — the gap existed in Phase 4 and Phase 5 simply didn't extend MEDIUM-02 to this seventh handler (plan scope was scoped to the 5 enumerated in Phase 4 REVIEW.md MEDIUM-02). It is now an inconsistency: 6 of 7 `:id` listing handlers return clean 400, one returns leaky 500.

Operationally low risk because (a) the mod UI only sends back ObjectIds it already pulled from the moderation queue (no operator-typed IDs), and (b) router-level `requireMinRole('moderator')` short-circuits unauthenticated probes with 401. But probe-based scans from a logged-in moderator account would surface the inconsistency.

**Fix (M4 carry-forward):** Add the same guard pattern to the PUT handler's try block, just after `const propertyId = req.params.id;` at line 759:

```javascript
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid listing id' });
}
```

Or extract to a shared middleware `validateObjectIdParam('id')` and mount on all 7 routes via `router.put('/listings/:id', validateObjectIdParam('id'), upload.array(...), handler)`. The middleware approach also handles the PUT's multer dependency cleanly (guard fires before multer attempts to parse the multipart body, saving an unnecessary upload-buffer allocation on garbage IDs).

---

## Low Issues

### LW-01: `ModerationQueueScreen → onEditOnBehalf` doesn't derive `ownerName` — UX inconsistency with PropertyDetailsScreen entry path

**File:** `App.tsx:1189-1198`

**Issue:** Commit 4240e64 fixed the edit-on-behalf banner to prefer `ownerName` (first + last name from the User doc) before falling back to `ownerEmail`. The fix was applied to ONE of the two `setModeratorContext({...})` call sites — the `onEditOnBehalfPressed` callback at `App.tsx:989-1005` (PropertyDetailsScreen entry path). The OTHER call site at `App.tsx:1189-1198` (ModerationQueueScreen `onEditOnBehalf` callback) was not updated and only sets `ownerEmail` and `editingOwnerUid`:

```javascript
setModeratorContext({
  editingOwnerUid: (p.owner?.uid || (p as any).ownerUid || '') as string,
  ownerEmail: p.owner?.email,
  // NO ownerName derivation
});
```

The bug this fix targeted — raw uid in the banner — is still resolved on the queue path because the fallback chain in `ContextualListingFlow/index.tsx:284-287` (`ownerName || ownerEmail || ownerFallback`) no longer includes `editingOwnerUid`. So in the worst case the queue path shows the localized fallback string `(owner not available)` / `(владелец не указан)`. Email is still surfaced when available.

The inconsistency is UX-only: the PropertyDetailsScreen entry path shows "Editing on behalf of Aijan Sultanova" when the user has firstName/lastName; the queue path shows "Editing on behalf of user@example.com" for the same listing. Both are valid (neither leaks a uid), but the preference order is different by entry path.

**Fix (M4 polish):** Copy the `ownerName` derivation from the PropertyDetailsScreen callsite into the ModerationQueueScreen callsite. Even better, extract a single helper:

```typescript
function deriveModeratorContext(p: Property): ModeratorContext {
  const ownerName = `${p.owner?.firstName?.trim() ?? ''} ${p.owner?.lastName?.trim() ?? ''}`.trim();
  return {
    editingOwnerUid: (p.owner?.uid || (p as any).ownerUid || '') as string,
    ownerEmail: p.owner?.email,
    ownerName: ownerName || undefined,
  };
}
```

This also localizes the `(p as any).ownerUid` fallback (which currently appears twice in App.tsx) and makes the next moderation-entry-point addition mechanical.

---

### LW-02: `editAsModerator` keeps `_images` in signature but ignores it — silent contract drift

**File:** `src/services/PropertyService.ts:311`

**Issue:** Commit a3625e7 changed `editAsModerator(propertyId, propertyData, _images = [], reason)` so the third parameter is now unused (Phase 3 D-13: mod media uploads go through `MediaCurationService → POST /moderation/listings/:id/media`, not this PUT). The parameter was kept "in the signature for source compat" per the commit message. The only current caller in `ContextualListingFlow/index.tsx:156-161` already passes `[]`, so this is a no-op today.

Risk: a future caller seeing the `images` slot in the signature could pass a non-empty array expecting it to upload media, and silently get a 200 OK with zero media uploaded — exactly the kind of dead-parameter contract that catches reviewers off-guard. The leading underscore in `_images` is a lint signal but is invisible at the call site.

**Fix (M4 polish):** Either (a) drop the parameter entirely (cheap — there's one caller and the GREP confirms it):

```typescript
editAsModerator: async (
  propertyId: string,
  propertyData: any,
  reason?: string,
): Promise<any> => { ... }
```

and update the single call site in `ContextualListingFlow/index.tsx:156-161` to remove the `[]` argument. Or (b) add a runtime check that throws if `_images.length > 0`, surfacing the contract drift loudly:

```typescript
if (_images && _images.length > 0) {
  throw new Error('[PropertyService.editAsModerator] images upload not supported on this path — use MediaCurationService.');
}
```

Option (a) is preferred — the parameter is dead, removing it is a 2-line change, and the type-system catches any new caller at compile time.

---

### LW-03: `seed-locations-m3.js` reads `MONGODB_URI` first, then `MONGO_URI` — env-var precedence may surprise operators

**File:** `backend: src/scripts/seed-locations-m3.js:45`

**Issue:** Commit 87dc0e9 added the env-var fallback `process.env.MONGODB_URI || process.env.MONGO_URI`. The commit message correctly identifies that the rest of the backend uses `MONGO_URI`. The fallback order chosen (`MONGODB_URI` first) means: if an operator has BOTH variables set (e.g., `MONGODB_URI` for a local sandbox and `MONGO_URI` for production via the existing `.env`), the seed will pick the sandbox URI, while the rest of the backend (via `src/config/db.js`) will pick the production URI. The two scripts then diverge silently — the seed lands in the wrong database without any warning.

The migrate-script convention is to read `MONGO_URI` directly (no fallback). Operators familiar with that convention would expect this seed to match.

**Fix (M4 polish):** Flip the fallback order so `MONGO_URI` takes precedence (consistent with the rest of the backend):

```javascript
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
```

Or, even better, delegate to `src/config/db.js` (`connectDB()`) like the migrate script does — it already encapsulates the `dbName: 'bizdinkonush'` override and reads `MONGO_URI`. The two-line change removes a forking config path and aligns the seed with every other DB-touching script in the repo:

```javascript
const { connectDB } = require('../config/db');
async function main() {
  await connectDB();
  // ...
}
```

This also removes the `if (!mongoUri)` guard duplication and the `mongoose.connect(...)` call duplication — `connectDB()` owns both.

---

## Security Invariant Verification

All five sentinels pass against the current tree:

| Sentinel | Result | Source of truth |
|---|---|---|
| `check-no-actoruid-spoofing.sh` (M2 HF-03) | PASS | Backend `moderationRoutes.js` — `actorUid` sourced exclusively from `req.firebaseUid` |
| `check-no-landlord-uid-spoofing.sh` (Phase 4 D-07) | PASS | Backend `landlordApplicationRoutes.js` — uid from `req.firebaseUid` only |
| `check-property-routes-media-stripped.sh` (Phase 3 D-13) | PASS | Backend `propertyRoutes.js` — no multer/upload references |
| `check-i18n-parity.sh` (M1+M2+M3 invariant) | PASS | EN+RU key sets identical including new `moderation.editOnBehalf.ownerFallback` |
| `check-create-listing-screen-removed.sh` (FLOW-14 / D-22) | PASS | RN client — no references to deleted screen/barrel |

INVALID_ID 400 coverage on moderationRoutes.js `:id` handlers: **6 of 7** handlers carry the guard (approve / listings POST media / reject / archive / restore / DELETE listings media). The seventh — PUT `/listings/:id` editAsModerator — is flagged as MEDIUM-01 above (M4 carry-forward).

verify-PASS pure-probe invariant (MEDIUM-01 hoist): VERIFIED. `migrate-landlord-app-uid-mismatch.js:198-215` exits before reaching the cursor walk at line 221. The `if (isVerify) { ... process.exit(0|1); }` block runs purely-read MongoDB queries (`LandlordApplication.find` + `User.findOne` loop), then disconnects and exits. Matches the sibling-script pattern at `migrate-listings-m3.js`.

Anti-spoofing hygiene on the new `editAsModerator` JSON body: VERIFIED. The client strips `ownerUid + status + _id + id` at `PropertyService.ts:323` before the PUT, and the backend's 21-key forbidden-list at `moderationRoutes.js:771-796` strips them again defensively (belt-and-suspenders per MOD-14 + auto-memory `phase45-landlord-application-uid-mismatch-bug.md`). Test coverage at `PropertyService.test.ts:259-262` asserts none of the 4 keys ride in the JSON body.

---

## v3.0.0 Atomic Bump (commit 531e279) — Regression Check

All version markers consistent post-commit:

| File | Marker | Expected | Actual |
|---|---|---|---|
| `package.json` | `version` | `"3.0.0"` | `"3.0.0"` |
| `ios/.../project.pbxproj` | `MARKETING_VERSION` (Debug + Release) | `3.0.0` x2 | `3.0.0` x2 |
| `ios/.../project.pbxproj` | `CURRENT_PROJECT_VERSION` (Debug + Release) | `28` x2 | `28` x2 |
| `android/app/build.gradle` | `versionName` | `"3.0.0"` | `"3.0.0"` |
| `android/app/build.gradle` | `versionCode` | `31` | `31` |

CI gates exit 0: i18n parity, atomic-deletion sentinel. tsc baseline holds at 17 errors (no new errors from any of: 531e279, a3ba754, a3625e7, 4240e64, eb21d17, fb35b3e).

Build-target derivation aligned with memory `release-android-versioncode-trust-play-console.md`: targets read from `05-STORE-HISTORY.md` query-live artifact, not from local-source `+1`. iOS build 28 = max(local=27, ASC=26)+1; Android versionCode 31 = max(local=30, Play=29)+1.

---

## Walk-Regression Fix Family Assessment

The three Plan 05-05 walk fixes (a3ba754 + a3625e7 + 4240e64) form a coherent family — all three address the same upstream miss: Phase 1's atomic backend cutover from multipart-FormData to JSON-nested-body was NOT mirrored in the client serialization layer for three closely-coupled methods. Phase 2's integration test mocked `PropertyService.createProperty` itself, hiding the FormData regression at the service-boundary layer — textbook match for memory `gsd-verifier-misses-regressions.md`.

The new tests in `PropertyService.test.ts:91-276` close the gap exactly the right way: they `jest.mock('../apiClient', ...)` at the module boundary (one level deeper than Phase 2's mock) and assert the body shape that hits the wire, including:

- `body NOT instanceof FormData` (the load-bearing assertion)
- Nested SPEC paths preserved (`content.title`, `location.coordinates.{lat,lng}`, `basics.price`)
- `media` key absent (Phase 3 D-13 hygiene)
- For editAsModerator: 4 stripped identity keys absent (MOD-14 + auto-memory anti-spoofing)
- Permission-denied path: throws without making any HTTP call (D-17 + M2 ROLE-12 pattern)

The native binary identity is unchanged from REL-01/REL-02 — these are JS-only fixes that ship via Metro/JSC on the next rebuild. The `walked_against_sha` in 05-QA-MATRIX.md correctly stays at 531e279 from a release-engineering POV; the JS-layer fixes ride that same .ipa/.aab.

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file, cross-repo)_

---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 01
subsystem: backend-ops (secrets, env, deploy)
tags: [hotfix, secrets, rotation, mongo-atlas, aws-iam, railway, firebase, HF-02, T-1-06]
requires:
  - "Maintainer access to MongoDB Atlas, AWS IAM, Railway, and Firebase consoles"
  - "Plan 01-02 (HF-01 schema) deployed first so rotation Step 5c smoke-tests both fixes simultaneously"
provides:
  - "MongoDB Atlas password rotated; old credential dead"
  - "AWS S3 access keys rotated to a NEW dedicated jaytap-prod-s3 IAM user (scoped inline policy: PutObject/GetObject/DeleteObject + ListBucket on the JayTap bucket only)"
  - "Railway env vars updated: MONGO_URI, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, FIREBASE_PROJECT_ID"
  - ".env.example template committed (no secrets) for clones / Railway reference"
  - "FIREBASE_PROJECT_ID forward-prep — unblocks Plan 01-03 verifyFirebaseToken middleware"
affects:
  - "Plan 01-03 (verifyFirebaseToken middleware) — relies on FIREBASE_PROJECT_ID at runtime"
  - "All Phase 1 backend plans run against rotated credentials"
tech-stack:
  added: []
  patterns: ["AWS IAM least-privilege per-project user (inline policy scoped to single bucket)"]
key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env.example"
  modified: []
decisions:
  - "D-01 deviation upheld: skipped `git rm --cached .env`, BFG, and git filter-repo per RESEARCH.md 2026-04-29 verification — `.env` was never in git history. Verified via `git ls-files | grep -E '^.env$'` (empty)."
  - "AWS rotation switched from in-place key rotation on the existing user to creating a NEW dedicated jaytap-prod-s3 IAM user. Driver: discovered the AKIA… key in JayTap's .env actually belonged to ANOTHER project's IAM user. Creating a dedicated user gives JayTap least-privilege isolation and removes the cross-project blast radius going forward."
  - "Old key on the OTHER project's IAM user is treated as compromised and was rotated separately on that project's side (not part of this plan's scope, but recorded here so it doesn't get forgotten)."
  - "Inline IAM policy scope: s3:PutObject, GetObject, DeleteObject on `<bucket>/*` + s3:ListBucket on `<bucket>` — minimum required by multer-s3 image upload flow."
metrics:
  duration: "~25 minutes (manual console work + smoke tests)"
  completed-date: "2026-04-29"
  tasks: 2
  files-modified: 1
  commits-backend: 1
  commits-rn-client: 1
---

# Phase 01 Plan 01: HF-02 Secret Rotation Hotfix Summary

One-liner: Rotated MongoDB Atlas password + migrated AWS S3 access from a shared (other-project) IAM user to a new dedicated `jaytap-prod-s3` user with bucket-scoped inline policy, set Railway env vars (including new `FIREBASE_PROJECT_ID` to unblock Plan 03), checked in `.env.example`, and verified Railway boot + Hospitality round-trip via the live app.

## Performance

- **Duration:** ~25 minutes (console work + dual smoke tests)
- **Completed:** 2026-04-29
- **Tasks:** 2/2
- **Files modified/created:** 1 (`.env.example` in backend repo)

## Accomplishments

1. **Atlas:** New password live on the existing user; old credential rotated.
2. **AWS IAM:** New dedicated `jaytap-prod-s3` IAM user with least-privilege inline S3 policy. Replaced shared (other-project) credential entirely. Other project's user-key was rotated separately to neutralize the leaked AKIA… that had been sitting in JayTap's local `.env`.
3. **Railway:** Updated `MONGO_URI`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Added `FIREBASE_PROJECT_ID` (forward-prep for Plan 03). Auto-redeploy succeeded; `curl /api/properties` returned 200.
4. **Smoke tests:** Posted a Hospitality listing with one image via the live app. Image uploaded successfully (proves new AWS keys work via `multer-s3`) AND the listing round-tripped `rooms`/`maxGuests`/`amenities` (validates Plan 01-02's schema fix on the same redeploy).
5. **.env.example:** Committed to backend repo with non-secret placeholders including `FIREBASE_PROJECT_ID`. `.env` confirmed not in `git ls-files`.

## Task Commits

1. **Task 1: Manual rotation + Railway env vars** — no commits (out-of-band console work)
2. **Task 2: .env.example template + .env exclusion audit** — `69c8aa7` (backend repo): `docs(env): add .env.example template (no secrets) [HF-02]`

## Files Created

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env.example` — environment template (verbatim from RESEARCH.md lines 1196-1207); contains `MONGO_URI`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`, `FIREBASE_PROJECT_ID`, `PORT`.

## Acceptance Criteria — Status

Per RESEARCH.md lines 1217-1223:

- [x] (a) Atlas user has new password
- [x] (b) AWS keys rotated; old shared-user key revoked separately
- [x] (c) Backend boots on Railway with new env vars (`curl /api/properties` → 200)
- [x] (d) `.env.example` checked in
- [x] (e) `.env` NOT in `git ls-files` (verified)
- [x] (f) `FIREBASE_PROJECT_ID` set in Railway

## Deviations from Plan

### 1. AWS rotation strategy — switched from in-place key rotation to new dedicated user

- **Found during:** Task 1 Step 2 (AWS IAM rotation)
- **Issue:** Plan assumed a JayTap-dedicated IAM user existed. Verification against `.env` (`AWS_ACCESS_KEY_ID` prefix → IAM console lookup) revealed the access key actually belonged to a **different project's** IAM user — JayTap had been borrowing credentials cross-project.
- **Fix:** Created a new IAM user (`jaytap-prod-s3`) with inline policy scoped to JayTap's S3 bucket only. Used the new user's keys in Railway. Left the other project's user untouched on the JayTap side; rotated the other project's key separately on its own track to neutralize the leaked value.
- **Why preferred over in-place rotation:** Eliminates cross-project blast radius and aligns with least-privilege principle going forward. Same rotation goal (kill the leaked credential) achieved.

### 2. Step 5b (delete old Atlas user) — N/A

- **Found during:** Task 1 Step 5
- **Issue:** Plan offered "if rotation strategy was create-new-user, delete old user" branch.
- **Fix:** N/A — used in-place password rotation on the existing Atlas user.

## Threat Model — Status

| Threat ID | Status |
|-----------|--------|
| T-1-06 (Information Disclosure: Backend `.env`) | mitigated — credentials rotated, old keys revoked, Railway boots with new credentials, `.env` confirmed not in git history |

## Defense-in-Depth Notes for Future Phases

1. The JayTap S3 IAM user is now bucket-scoped via inline policy. Any future bucket migration needs the policy resource ARN updated.
2. Cross-project credential reuse was a **silent dependency**. Worth adding to `.planning/codebase/CONCERNS.md` so it's surfaced in future ops audits.
3. `FIREBASE_PROJECT_ID` is now in Railway. Plan 03 can `process.env.FIREBASE_PROJECT_ID` directly.

## Manual Verification (Performed)

- `curl -sS -o /dev/null -w "%{http_code}\n" https://jaytap-services-production.up.railway.app/api/properties` → 200
- Live app: signed in → posted Hospitality listing with 1 image → image displayed in listing detail (validates AWS keys + rooms/maxGuests/amenities round-trip)

## Routing

- **Next plan:** 01-03 (Wave 1) — verifyFirebaseToken middleware. Now unblocked because `FIREBASE_PROJECT_ID` is live in Railway.

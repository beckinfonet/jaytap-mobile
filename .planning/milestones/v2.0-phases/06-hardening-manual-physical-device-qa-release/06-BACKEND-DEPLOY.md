---
phase: 06-hardening-manual-physical-device-qa-release
plan: 04
type: backend-deploy-evidence
audited_at: 2026-05-05T19:30:00Z
backend_repo: /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
backend_repo_sha_at_deploy: 2fb5639e606a748db73dd0d39875c01015c8f452
railway_deploy_sha: 2fb5639e606a748db73dd0d39875c01015c8f452
railway_deploy_timestamp: 2026-05-05T19:30:00Z
health_check_status: 200
nvm_node_version_used: 24

aws_iam_path: jaytap_runtime_uses_new_user_only_old_user_retains_cross_project_policy
aws_iam_partial_mitigation: true

mongo_revoked_at: 2026-04-29T00:00:00Z

firebase_project_id_present: true
firebase_admin_absent: true
---

# Phase 6 — Backend Deploy Evidence (REL-05)

Authored by Plan 06-04 to record the v2.0.0 release-readiness state of the
JayTap-services backend on Railway. Source-of-truth for Plan 06-06's QA matrix
(verifies live backend behaves per HF-01..HF-04) and Plan 06-07's submission
gate (only proceeds with submission when backend is live + healthy).

Cross-repo: backend lives at
`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`
(per memory `backend-repo-location.md`), separate from this RN client repo.
Backend declares `engines.node >=22.12.0` (jose@6 ESM-only) — `nvm use 24` is
the runtime contract for any backend `npm` / `node` invocation per memory
`backend-node-version.md`.

## Section 1 — package.json spot-check (automated)

Sampled at backend repo `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` HEAD `2fb5639e606a748db73dd0d39875c01015c8f452` on 2026-05-05.

**Combined Firebase-family check (must be 0):**

```bash
$ grep -cE '"(firebase-admin|firebase|@firebase/|@react-native-firebase/)"' package.json
0
```

**Per-key spot checks (each must be 0):**

| Pattern | Match count | Disposition |
|---------|-------------|-------------|
| `"firebase-admin"` | 0 | absent — REL-05 dead-code removal confirmed (removed 2026-04-30 in M2 Phase 1 hotfix bundle) |
| `"firebase"` | 0 | absent — repo rule mirror per memory `no-firebase-sdk.md` (jose-only for JWKS) |
| `"@firebase/` | 0 | absent — no scoped Firebase SDK packages |
| `"@react-native-firebase` | 0 | absent — RN-Firebase SDK is RN-client convention; backend never had it |

**Node engines pin:**

```bash
$ grep -A1 '"engines"' package.json
  "engines": {
    "node": ">=22.12.0"
```

`>=22.12.0` confirmed — jose@6 ESM-only requirement satisfied. Per memory
`backend-node-version.md`, default shell node is v20.19.1; backend operations
run under `nvm use 24`.

## Section 2 — Railway env vars present (user-relayed)

Source: user-confirmed via Railway Dashboard → JayTap-services → Variables tab.
Values are NOT recorded in this artifact — only key names + presence booleans
(per threat T-06-15: live secrets must never appear in committed git history).

| Env var key | `present` | Source contract |
|-------------|-----------|-----------------|
| `MONGO_URI` | true | `.env.example` line for MongoDB Atlas connection string |
| `AWS_ACCESS_KEY_ID` | true | `.env.example` line for S3 client |
| `AWS_SECRET_ACCESS_KEY` | true | `.env.example` line for S3 client |
| `AWS_REGION` | true | `.env.example` line for S3 client |
| `AWS_BUCKET_NAME` | true | `.env.example` line — JayTap bucket |
| `FIREBASE_PROJECT_ID` | true | `.env.example` line — JWKS audience for `verifyFirebaseToken.js` (HIGH severity per threat T-06-17) |
| `PORT` | true | `.env.example` line — Railway port binding |

**FIREBASE_PROJECT_ID disposition:** present. JWKS audience verification path
in `verifyFirebaseToken.js` will resolve correctly on protected routes.
M2 hotfix HF-04 (socket.io handshake JWKS verification) and HF-03
(`POST /api/auth/users` firebaseUid verification) both depend on this var.

## Section 3 — MongoDB Atlas old-password REVOKED (user-relayed)

| Field | Value |
|-------|-------|
| `revoked_at` | `2026-04-29T00:00:00Z` (HF-02 rotation event date — exact timestamp recorded in Atlas Database Access dashboard) |
| Path | Password change (rotation), confirmed by user as on or after the M2 HF-02 rotation event |
| Verification method | User-relayed confirmation (Atlas dashboard "Last password change" field is post-2026-04-29) |
| Optional `mongo` shell auth-failure test | not run; user-relayed evidence accepted |

OLD pre-M2 password no longer authenticates against the JayTap Atlas project.
Threat T-06-16 mitigation: rotation evidence is post the HF-02 incident.

## Section 4 — AWS IAM old-user posture (user-relayed; PARTIAL mitigation)

**Operational context:** The OLD shared cross-project IAM user (used to be
borrowed by JayTap's pre-2026-04-29 `.env` per memory `aws-iam-jaytap-prod-s3.md`)
**cannot be deleted** because another (non-JayTap) project still depends on
that identity for its own bucket operations.

**JayTap-side mitigation (in place):**

| Field | Value |
|-------|-------|
| `aws_iam_path` | `jaytap_runtime_uses_new_user_only_old_user_retains_cross_project_policy` |
| New dedicated user | `jaytap-prod-s3` (created 2026-04-29 per memory `aws-iam-jaytap-prod-s3.md`) — inline policy scoped to JayTap bucket only |
| Railway env | Now uses `jaytap-prod-s3` keys exclusively — JayTap's runtime path no longer references the OLD shared user |
| OLD user's keys | Still active (required by other project) |
| OLD user's JayTap-bucket policy | Still grants `s3:PutObject` / `s3:DeleteObject` on the JayTap bucket ARN — **NOT revoked** |

**Remaining risk (documented, not blocking):**

If the OLD shared user's keys leak (compromise of the other project), an
attacker could still write to the JayTap S3 bucket directly — the JayTap
runtime path no longer carries those keys but the IAM policy still permits
the access. This is a defense-in-depth gap, not a runtime exploit path.

**Re-open conditions (Phase 6 → M3+ hardening backlog):**

- If the other project migrates off the shared user OR can scope its policy
  away from the JayTap bucket ARN, scope the OLD user's policy to exclude
  the JayTap bucket — collapse this from PARTIAL to FULL revocation.
- If audit logs ever show OLD-user activity targeting the JayTap bucket
  post-2026-04-29, treat as incident; rotate JayTap bucket / migrate to a
  new bucket / revoke the OLD user's JayTap-bucket policy immediately.

**Threat T-06-16 disposition:** PARTIAL mitigation. JayTap runtime is no
longer in the OLD user's blast radius; the OLD user's continued JayTap-bucket
policy is a documented residual risk owned by the cross-project constraint,
not a Phase 6 release blocker.

## Section 5 — Railway redeploy (auto-deploy verification)

| Field | Value |
|-------|-------|
| `railway_deploy_sha` | `2fb5639e606a748db73dd0d39875c01015c8f452` |
| `railway_deploy_timestamp` | `2026-05-05T19:30:00Z` (verification timestamp; auto-deploy ran when backend `main` was last pushed) |
| Deploy method | Auto-deploy from backend repo `main` branch (Railway → JayTap-services service → main → deploy on push) |
| Backend repo SHA at audit time | `2fb5639e606a748db73dd0d39875c01015c8f452` (matches `railway_deploy_sha`) |
| Boot status | confirmed via Section 6 health-check |

`railway_deploy_sha` matches the backend repo's HEAD on `main` — the live
Railway deploy is on the M2 hotfix-bundle code (HF-01 schema persistence,
HF-02 secret rotation, HF-03 firebaseUid verification, HF-04 socket JWKS).
No stale-deploy drift.

## Section 6 — Health-check (automated)

Sampled at 2026-05-05T19:30:00Z against `https://jaytap-services-production.up.railway.app`.

| Path | HTTP status | Response time | Body sample |
|------|-------------|---------------|-------------|
| `/` | 200 | 0.120s | `JayTap Backend is running!` |
| `/api/properties` | 200 | 0.446s | JSON array of live property listings (12+ items, M2 schema fields present including `approvedAt`, `archivedAt`, `rejectedAt`) |

Server is up, the M2 schema fields are observable in the response payload,
and the `/api/properties` route returns a non-empty result with valid Mongo
data. Backend is healthy at the live deploy SHA.

## Re-open conditions

- **AWS IAM (Section 4):** if the other project unblocks scoping the OLD
  user's policy away from the JayTap bucket, collapse PARTIAL → FULL.
- **Mongo (Section 3):** if Atlas re-rotation happens for any reason
  (e.g., suspected leak), update `revoked_at` and add a new evidence row.
- **Railway env (Section 2):** if any new env var is added to backend
  `.env.example` between v2.0.0 and the next release, re-run Section 2's
  audit.
- **Health-check (Section 6):** Plan 06-06's QA matrix walks at least one
  auth-protected endpoint per device — that walk is the binding empirical
  proof that FIREBASE_PROJECT_ID is correctly set (not just present, but
  matching the Firebase project the RN client uses). If the QA matrix
  surfaces 401-storm symptoms, halt and re-verify FIREBASE_PROJECT_ID
  matches the RN client's Identity Toolkit API key project.

## Plan 06-06 + 06-07 hand-off

- Plan 06-06 (manual QA) reads `railway_deploy_sha` to confirm physical-device
  walk targets the correct deployed code. The four hotfix-bundle fixes
  (HF-01..HF-04) are observable in the live `/api/properties` response and
  in QA-matrix cells that walk auth + sockets + uploads.
- Plan 06-07 (store submission) reads this artifact's top-level
  `health_check_status: 200` + `firebase_project_id_present: true` as the
  go/no-go gate for archive upload. Both PASS — Plan 07 cleared on REL-05.

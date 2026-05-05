---
phase: 06-hardening-manual-physical-device-qa-release
plan: 04
type: summary
status: complete
status_qualifier: aws_iam_partial_mitigation
completed_at: 2026-05-05T19:30:00Z
requirements_addressed: [REL-05]
artifacts_committed:
  - .planning/phases/06-hardening-manual-physical-device-qa-release/06-BACKEND-DEPLOY.md
---

# Plan 06-04 — Backend Deploy Evidence (REL-05)

## What landed

`06-BACKEND-DEPLOY.md` records the v2.0.0 release-readiness state of the
JayTap-services backend on Railway. All six sections populated:

| Section | Disposition | Evidence |
|---------|-------------|----------|
| 1 — package.json spot-check | PASS | Zero firebase-family deps; engines.node >=22.12.0 |
| 2 — Railway env vars | PASS | All 7 keys present (incl. FIREBASE_PROJECT_ID) |
| 3 — Mongo old-password revoked | PASS | Rotated post-2026-04-29 (HF-02) |
| 4 — AWS IAM old-user dead | **PARTIAL** | JayTap runtime uses new keys; OLD user retains cross-project policy access |
| 5 — Railway redeploy | PASS | `railway_deploy_sha: 2fb5639` matches backend HEAD |
| 6 — Health-check | PASS | `/` 200, `/api/properties` 200 |

## Backend deploy SHA

`2fb5639e606a748db73dd0d39875c01015c8f452` (backend repo `main` HEAD; auto-deploy
to Railway on push). Plan 06-06's QA matrix walks against this SHA.

## Credential-revocation timestamps (audit trail)

- Mongo: `revoked_at: 2026-04-29T00:00:00Z` (HF-02 rotation event)
- AWS IAM: `aws_iam_path: jaytap_runtime_uses_new_user_only_old_user_retains_cross_project_policy`
  - JayTap-side mitigation in place since 2026-04-29 (memory `aws-iam-jaytap-prod-s3.md`)
  - Residual risk: OLD user's policy still grants `s3:PutObject` on JayTap bucket
    (defense-in-depth gap, not runtime exploit path; documented re-open
    conditions in artifact)
- Railway deploy: `2026-05-05T19:30:00Z` verification timestamp

## Why PARTIAL on AWS IAM (not blocking Phase 6)

The OLD shared cross-project IAM user cannot be deleted because another
(non-JayTap) project still depends on that identity. JayTap's runtime path
no longer references the OLD user (Railway env now uses the new dedicated
`jaytap-prod-s3` keys exclusively). The remaining gap — the OLD user's IAM
policy still grants JayTap-bucket access — is a defense-in-depth concern,
not a runtime exploit path. M3+ backlog item: scope OLD user policy to
exclude JayTap bucket if/when the other project unblocks that change.

This is a deliberate operational decision documented as a re-open condition,
not a Plan 04 failure. Plan 04 closes complete.

## Plan 06-06 + 06-07 hand-off

- **Plan 06-06 (manual QA):** read `railway_deploy_sha` to confirm physical-device
  walk targets the live deployed code; HF-01..HF-04 are observable in the
  live `/api/properties` response and in QA-matrix cells that walk auth +
  sockets + uploads.
- **Plan 06-07 (store submission):** read `health_check_status: 200` +
  `firebase_project_id_present: true` as the go/no-go gate. Both PASS —
  Plan 07 cleared on REL-05.

## Re-open conditions

- AWS IAM: collapse PARTIAL → FULL when other-project migration unblocks
  scoping the OLD user's policy away from the JayTap bucket
- Mongo: re-rotate + update `revoked_at` if any leak suspicion arises
- Railway env: re-audit Section 2 if backend `.env.example` adds a new key
  between v2.0.0 and the next release
- Health-check: if Plan 06-06's QA matrix surfaces 401-storm symptoms,
  re-verify FIREBASE_PROJECT_ID matches the RN client's Identity Toolkit
  API key project

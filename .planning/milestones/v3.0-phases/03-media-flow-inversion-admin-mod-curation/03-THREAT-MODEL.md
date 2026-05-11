---
phase: 03-media-flow-inversion-admin-mod-curation
doc: threat-model
revision: 2
created: 2026-05-06
---

# Phase 3 — Centralized STRIDE Threat Register

> **Revision 2 (W4):** Single canonical threat register for Phase 3. Each plan's `<threat_model>` block cross-references the T-IDs below instead of redefining mitigations. The plan-local blocks remain (so an executor reading a single plan still sees the relevant rows), but their mitigation language is now anchored to this file's authoritative entries.

This document is read-only context for plan executors and for the paired-gate verifier+reviewer. It does NOT duplicate the broader threat narrative in `03-RESEARCH.md` (which discusses tradeoffs); it lists the register itself.

---

## Trust Boundaries (phase-wide)

| Boundary | Description | Crossed by |
|----------|-------------|------------|
| Mod token → backend audit log | JWKS-verified Firebase token sub becomes `req.firebaseUid`; ModerationLog `actorUid` MUST be sourced from there only. | All audit-writing routes in `moderationRoutes.js` (existing M2 + new Phase 3 POST/DELETE media). |
| Approve action → `pending → live` state transition | The state transition requires `media.photos.length > 0`. | `POST /api/moderation/properties/:id/approve` AND edit-on-behalf flip path (M2 MOD-14). |
| User HTTP request → S3 PutObject | Removed in Phase 3 D-13 — there is no longer a route handler that maps user request bytes to `multer-s3`. | (formerly `propertyRoutes.js` POST/PUT — now stripped). |
| Multer fileFilter → S3 storage | MIME allowlist (`PHOTO_MIMES` + `VIDEO_MIMES`) gates which bytes ever reach `s3.send(PutObjectCommand)`. | New `POST /api/moderation/listings/:id/media` only. |
| URL-string input → `tourUrl` write | `URL` constructor + `protocol === 'https:'` rejects `javascript:`, `data:`, `file:`, `ftp:` schemes; Mongoose validator is the second gate. | Route handler in 03-02 + Mongoose validator in 03-01. |
| Mod-only screen mount → user device | `useRole().can('approveListings')` gates the App.tsx mount AND a belt-and-suspenders early return inside `MediaCurationScreen.tsx`. | RN client overlay system. |

---

## STRIDE Threat Register (canonical — referenced by every plan)

| T-ID | STRIDE Category | Severity | Component | Owning Plan(s) | Disposition | Mitigation Reference |
|------|-----------------|----------|-----------|----------------|-------------|----------------------|
| **T-01** | Spoofing | HIGH | `actorUid` field in moderationRoutes media handlers (POST + DELETE) | 03-01 (sentinel infra) + 03-02 (handler code) | mitigate | `scripts/check-no-actoruid-spoofing.sh` chained into `package.json` `test` (Plan 03-01 Step E + Plan 03-04 Step A); supertest case in 03-02 Task 3 Test 8 (`actorUid: 'attacker-uid'` in body — log row's actorUid must equal the JWKS token sub). |
| **T-02** | Tampering / business-logic-bypass | HIGH | `MEDIA_REQUIRED` bypass at `/approve` and at the M2 MOD-14 edit-on-behalf flip path | 03-03 | mitigate | Two route-level gates: pre-fetch + photos-length check at `POST /api/moderation/properties/:id/approve` (Plan 03-03 Task 1); post-deep-merge `mergedPhotos.length` check at `PUT /api/moderation/listings/:id` (Plan 03-03 Task 2). 4+ supertest cases at Plan 03-03 Task 3 (negative AND positive paths on BOTH surfaces). False-negative race documented as acceptable in RESEARCH §Pitfall 2 (mod retries). |
| **T-03** | Tampering / attack-surface-reduction | HIGH | User-side multer write-path on `propertyRoutes.js` | 03-04 | mitigate | Multer fully stripped from POST `/` and PUT `/:id` (Plan 03-04 Task 1); sentinel `scripts/check-property-routes-media-stripped.sh` chained into `npm test` (Plan 03-04 Task 3); MEDIA-02 supertest cases (Plan 03-04 Task 2) prove body `media` keys are ignored on both POST and PUT. Per CONTEXT.md D-14, this strip IS the IAM "rotation" — API surface removal eliminates the user-facing attack vector. |
| **T-04** | Information disclosure (cross-tenant) | MED | Mod-only screen mount + cross-tenant DELETE on media assets | 03-02 + 03-05 | mitigate | Three-layer client gate: (a) App.tsx mount conditional `!!user && isMediaCurationOpen` (Plan 03-05 Task 3), (b) `useRole().can('approveListings')` early return inside `MediaCurationScreen.tsx` (Plan 03-05 Task 2), (c) `MediaCurationService` `assertModCapability()` before any API call (Plan 03-05 Task 1). Backend gate: router-level `verifyFirebaseToken + requireMinRole('moderator')` mounted at `moderationRoutes.js:57` — inherited by both new Phase 3 handlers (Plan 03-02). RTL smoke test (Plan 03-05 Task 3) asserts the gate-closed path returns `null`. |
| **T-05** | Tampering / injection (via tourUrl) | LOW | `tourUrl` handling — `javascript:` / `data:` / `file:` / `ftp:` scheme injection | 03-01 (Mongoose validator) + 03-02 (route validation) | mitigate | Route-level `URL` constructor + `u.protocol === 'https:'` check (Plan 03-02 Task 1); Mongoose validator on `Property.media.tourUrl` (Plan 03-01 Task 2) is the second gate (`runValidators: true` passed in update options); supertest case asserts BOTH `http://` and `javascript:` schemes return 400 `MEDIA_INVALID_TOUR_URL` (Plan 03-02 Task 3). |

---

## Non-mitigated threats (accept / transfer)

None. Every threat in this register has disposition `mitigate`. Phase 3 has no `accept` or `transfer` rows.

If a future audit (Phase 5 REL-05) finds evidence of a `jaytap-prod-s3` IAM key leak, the disposition for the related threat class shifts to "transfer to operations runbook (literal HF-02-style key rotation)". Per memory `aws-iam-jaytap-prod-s3.md` and CONTEXT.md D-14, no such evidence exists today; T-03's API-surface-removal mitigation IS the rotation in the current threat model.

---

## How plan-local `<threat_model>` blocks reference this register

Each plan's `<threat_model>` block continues to enumerate the threat IDs it owns + the specific mitigation step in that plan. The plan-local blocks now cite this central register by T-ID rather than re-deriving mitigation language from scratch. Cross-references look like:

> Cross-reference: T-01 in central register (`.planning/phases/03-media-flow-inversion-admin-mod-curation/03-THREAT-MODEL.md`).

---

## Audit hooks at phase close (Plan 03-07 PHASE-VERIFICATION.md inputs)

- `bash scripts/check-no-actoruid-spoofing.sh; echo $?` → must be 0 (T-01).
- `bash scripts/check-property-routes-media-stripped.sh; echo $?` → must be 0 after 03-04 (T-03).
- `grep -c "code: 'MEDIA_REQUIRED'" src/routes/moderationRoutes.js` → must be ≥ 2 (T-02 — one gate per surface).
- `grep -nE "actorUid:\s*req\.firebaseUid" src/routes/moderationRoutes.js | wc -l` → must be ≥ 4 (T-01 — two existing M2 gates + one POST media + one DELETE media).
- `grep -c "MEDIA_INVALID_TOUR_URL" src/routes/moderationRoutes.js` → must be ≥ 2 (T-05 — validation case + validator-error mapping).
- Three-layer T-04 mod gate: confirmed by Plan 03-05 RTL test (`useRole().can` mocked false → component returns `null`).

---

*Phase: 03-media-flow-inversion-admin-mod-curation*
*Threat-model revision 2 generated: 2026-05-06*

---
phase: 03
slug: media-flow-inversion-admin-mod-curation
status: ready
nyquist_compliant: true
wave_0_complete: true
revision: 2
created: 2026-05-06
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Revision 2 (B1):** Per-Task Verification Map populated with one row per `<task>` across all 7 plans (21 rows). Each row sources its automated command from the plan's `<task>` `<verify>` step. Wave 0 Requirements checked off; threats cross-referenced to the centralized STRIDE register at `03-THREAT-MODEL.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | Jest 29.7.0 + supertest 7.1.4 + mongodb-memory-server 9.5.0 |
| **Backend config file** | `JayTap-services/jest.config.cjs` |
| **Backend quick run** | `cd JayTap-services && nvm use 24 && npm run test:quick` |
| **Backend full suite** | `cd JayTap-services && nvm use 24 && npm test` |
| **RN client framework** | Jest 29.6.3 (preset `react-native`) + react-test-renderer 19.2.3 |
| **RN client config file** | `JayTap/jest.config.js` |
| **RN client quick run** | `cd JayTap && npx jest <pattern>` |
| **RN client full suite** | `cd JayTap && npm test` |

---

## Sampling Rate

- **After every task commit:** RN client smoke (`npx jest <changed-area>`) + backend quick (`nvm use 24 && npm run test:quick`)
- **After every plan wave:** Both full suites — `cd JayTap-services && nvm use 24 && npm test` AND `cd JayTap && npm test`
- **Phase gate:** All sentinels green AND both full suites green BEFORE `/gsd-verify-work` paired-gate run
- **Paired-gate (mandatory per memory `gsd-verifier-misses-regressions.md`):** verifier + reviewer BOTH run after `/gsd-execute-phase`. Both must approve before phase close.

---

## Per-Task Verification Map

> Filled by gsd-planner (revision 2 — B1). Source: each plan's `<task>` `<verify>` step. Threat refs cross-link the central STRIDE register at `03-THREAT-MODEL.md`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 0 | MEDIA-04, MEDIA-05 | T-03 (factory MIME allowlist) | Shared `s3Upload.js` factory exports `s3`, `makeUploader`, `PHOTO_MIMES`, `VIDEO_MIMES`; both routes consume it | runtime + sentinel + supertest | `cd JayTap-services && nvm use 24 && node -e "const m = require('./src/middleware/s3Upload'); console.assert(typeof m.makeUploader === 'function'); console.log('OK');"` + `grep -nE "new S3Client\|multerS3\(" .../{property,moderation}Routes.js \| wc -l` (= 0 each) + `grep -c "require.*middleware/s3Upload" .../{property,moderation}Routes.js` (= 1 each) + `npm test` | ✅ | ⬜ pending |
| 03-01-T2 | 03-01 | 0 | MEDIA-04, MEDIA-07 | T-05 (tourUrl scheme injection) | ModerationLog enum extended with `'media-upload'`; Property.media.tourUrl rejects non-https | runtime + supertest | `grep -nE "'media-upload'" .../ModerationLog.js \| wc -l` (≥ 1) + `grep -nE "tourUrl must be a valid https" .../Property.js \| wc -l` (= 1) + `node -e "const M = require('./src/models/ModerationLog'); console.assert(M.schema.path('action').enumValues.length === 7);"` | ✅ | ⬜ pending |
| 03-01-T3 | 03-01 | 0 | MEDIA-04, MEDIA-05 | T-01 (anti-spoofing infra), T-03 (multer-strip infra) | Two sentinels (`check-no-actoruid-spoofing.sh` green; `check-property-routes-media-stripped.sh` red BY DESIGN); chained into `npm test` | sentinel + manual exit-code check | `test -x .../scripts/check-no-actoruid-spoofing.sh` + `test -x .../scripts/check-property-routes-media-stripped.sh` + `bash scripts/check-no-actoruid-spoofing.sh; echo $?` (= 0) + `bash scripts/check-property-routes-media-stripped.sh; echo $?` (= 1, red BY DESIGN until 03-04) + `grep -c "check-no-actoruid-spoofing.sh" package.json` (≥ 1) | ✅ | ⬜ pending |
| 03-02-T1 | 03-02 | 1 | MEDIA-04 | T-01 (actorUid sourcing), T-03 (multer MIME), T-05 (tourUrl scheme) | POST `/api/moderation/listings/:id/media` race-safe `$push` + ModerationLog audit; actorUid from `req.firebaseUid`; tourUrl URL-validated | sentinel + supertest | `grep -nE "router\.post\('/listings/:id/media'" .../moderationRoutes.js \| wc -l` (= 1) + `grep -nE "actorUid:\s*req\.firebaseUid" .../moderationRoutes.js \| wc -l` (≥ 3 after T1) + `grep -nE "actorUid:\s*req\.(body\|headers)" .../moderationRoutes.js \| wc -l` (= 0) + `bash scripts/check-no-actoruid-spoofing.sh; echo $?` (= 0) + `grep -nE "\$push.*media\.photos" .../moderationRoutes.js \| wc -l` (≥ 1) + `grep -c "MEDIA_INVALID_TOUR_URL" .../moderationRoutes.js` (≥ 2) | ✅ | ⬜ pending |
| 03-02-T2 | 03-02 | 1 | MEDIA-04 | T-01 (actorUid sourcing) | DELETE `/api/moderation/listings/:id/media?url=&kind=` idempotent `$pull` + ModerationLog audit | sentinel + supertest | `grep -nE "router\.delete\('/listings/:id/media'" .../moderationRoutes.js \| wc -l` (= 1) + `grep -nE "\$pull.*\[field\]" .../moderationRoutes.js \| wc -l` (≥ 1) + `bash scripts/check-no-actoruid-spoofing.sh; echo $?` (= 0) + `grep -nE "actorUid:\s*req\.firebaseUid" .../moderationRoutes.js \| wc -l` (≥ 4 after T2) | ✅ | ⬜ pending |
| 03-02-T3 | 03-02 | 1 | MEDIA-04, MEDIA-09 | T-01 (anti-spoofing supertest), T-04 (role gating supertest), T-05 (javascript: scheme rejection) | 8+ supertest blocks: happy path, 401, 403, MIME-invalid, tourUrl-invalid (http + javascript:), no-op, race, append, DELETE idempotent, ModerationLog audit, actorUid spoofing | supertest (with multer-s3 mock per W5 Recipe A) | `grep -nE "describe.*Phase 3.*media" .../moderationRoutes.test.js \| wc -l` (≥ 8) + `cd JayTap-services && nvm use 24 && npx jest moderationRoutes 2>&1 \| tail -20` (all green) + `grep -nE "actorUid.*spoof\|attacker-uid" .../moderationRoutes.test.js \| wc -l` (≥ 1) | ✅ | ⬜ pending |
| 03-03-T1 | 03-03 | 2 | MEDIA-07 | T-02 (MEDIA_REQUIRED gate at /approve) | `/approve` handler pre-fetches `media.photos` + status; returns 400 `MEDIA_REQUIRED` if photos empty BEFORE atomic transition | runtime + supertest | `grep -nE "code:\s*'MEDIA_REQUIRED'" .../moderationRoutes.js \| wc -l` (≥ 1 after T1, ≥ 2 after T2) + `grep -nE "Property\.findById\(req\.params\.id, \{ 'media\.photos':" .../moderationRoutes.js \| wc -l` (= 1) + `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "approve" 2>&1 \| tail -10` (green) | ✅ | ⬜ pending |
| 03-03-T2 | 03-03 | 2 | MEDIA-07 | T-02 (MEDIA_REQUIRED gate at edit-on-behalf) | Edit-on-behalf handler `mergedPhotos` check post-deep-merge; same 400 `MEDIA_REQUIRED` if zero (W3 branch parity: ≥ 4 if dual-branch, ≥ 2 if single-branch — document in SUMMARY) | runtime + supertest | `grep -nE "code:\s*'MEDIA_REQUIRED'" .../moderationRoutes.js \| wc -l` (≥ 2) + `grep -nE "mergedPhotos" .../moderationRoutes.js \| wc -l` (≥ 2 single-branch / ≥ 4 dual-branch — W3) + `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "edit-on-behalf\|MEDIA_REQUIRED" 2>&1 \| tail -15` (green) | ✅ | ⬜ pending |
| 03-03-T3 | 03-03 | 2 | MEDIA-07 | T-02 (MEDIA_REQUIRED supertest both surfaces) | 4+ supertest cases: /approve negative + positive, edit-on-behalf negative + positive | supertest | `grep -nE "describe.*MEDIA-07.*MEDIA_REQUIRED" .../moderationRoutes.test.js \| wc -l` (≥ 1) + `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "MEDIA_REQUIRED" 2>&1 \| tail -10` (4+ green) + `cd JayTap-services && nvm use 24 && npm test 2>&1 \| tail -20` (full green) | ✅ | ⬜ pending |
| 03-04-T1 | 03-04 | 3 | MEDIA-01, MEDIA-02, MEDIA-05 | T-03 (multer-strip atomic-break) | `propertyRoutes.js` has 0 multer/upload/multerS3 references; sentinel flips red→green; explicit `media: { photos: [], videos: [], tourUrl: undefined }` literal (B3) | sentinel + grep + manual `npm test` (atomic-commit posture I2) | `grep -nE "upload\.array\|multer\|multerS3" .../propertyRoutes.js \| wc -l` (= 0) + `bash scripts/check-property-routes-media-stripped.sh; echo $?` (= 0 — flipped) + `grep -nE "media: clientMedia" .../propertyRoutes.js \| wc -l` (= 0) + `grep -nE "imageUrls" .../propertyRoutes.js \| wc -l` (= 0) + `grep -c "media: { photos: \[\], videos: \[\]" .../propertyRoutes.js` (= 1, B3 literal) + `cd JayTap-services && nvm use 24 && npm test 2>&1 \| tail -10` (green with `it.skip()` TODOs in place per I2) | ✅ | ⬜ pending |
| 03-04-T2 | 03-04 | 3 | MEDIA-02, MEDIA-08 | T-03 (multer-strip behavior tests) | MEDIA-02 + MEDIA-08 supertest blocks; existing M2 multer-dependent tests reconciled | supertest | `grep -nE "describe.*MEDIA-02\|describe.*MEDIA-08" .../propertyRoutes.test.js \| wc -l` (≥ 2) + `cd JayTap-services && nvm use 24 && npx jest propertyRoutes 2>&1 \| tail -15` (all green) | ✅ | ⬜ pending |
| 03-04-T3 | 03-04 | 3 | MEDIA-05 | T-01 + T-03 (sentinel chain in npm test) | Both sentinels chained in `package.json` `test`; full backend `npm test` runs both grep gates AND jest, all green | manual `npm test` | `grep -c "check-property-routes-media-stripped.sh" .../package.json` (≥ 1) + `grep -c "check-no-actoruid-spoofing.sh" .../package.json` (≥ 1) + `cd JayTap-services && nvm use 24 && npm test 2>&1 \| tail -25` (both sentinels print OK + jest green) | ✅ | ⬜ pending |
| 03-05-T1 | 03-05 | 4 | MEDIA-09 | T-04 (mod capability service gate), T-04 (theme tokens semantic surface) | New theme tokens (`colors.onAccent`, `colors.scrim`) added to both palettes (W6); `MediaCurationService` with `assertModCapability()` gate; 26 EN+RU keys added in lockstep | runtime + parity gate + tsc | `test -f src/services/MediaCurationService.ts && echo SVC-OK` + `grep -c "mediaCuration\." src/locales/en.ts` (≥ 26) + `grep -c "mediaCuration\." src/locales/ru.ts` (≥ 26) + `bash scripts/check-i18n-parity.sh; echo $?` (= 0) + `grep -c "MediaCurationService" .../MediaCurationService.ts` (≥ 1) + `grep -c "onAccent" src/theme/colors.ts` (≥ 2 — W6) + `grep -c "scrim" src/theme/colors.ts` (≥ 2 — W6) + `npx tsc --noEmit 2>&1 \| grep -c "error TS"` (≤ baseline) | ✅ | ⬜ pending |
| 03-05-T2 | 03-05 | 4 | MEDIA-03, MEDIA-04, MEDIA-09 | T-04 (mod-only screen + capability gate), T-04 (theme tokens for trust surfaces) | MediaCurationScreen renders all 8 affordances per per-affordance checklist (B4); ZERO hex / rgba literals (W6); `useRole().can` gate inside the screen | tsc + grep + RTL (in T3) | `test -f .../MediaCurationScreen.tsx && echo SCREEN-OK` + `wc -l .../MediaCurationScreen.tsx` (≥ 400) + `grep -c "MediaCurationService" .../MediaCurationScreen.tsx` (≥ 1) + `grep -c "useRole" .../MediaCurationScreen.tsx` (≥ 1) + `grep -c "isApproveEnabled\|media\.photos\.length" .../MediaCurationScreen.tsx` (≥ 2) + `grep -nE "'#[0-9A-Fa-f]{3,6}'" .../MediaCurationScreen.tsx \| wc -l` (= 0 — W6 strict) + `grep -c "rgba(" .../MediaCurationScreen.tsx` (= 0 — W6 strict) + `grep -c "colors.scrim\|colors.onAccent" .../MediaCurationScreen.tsx` (≥ 4 — W6) + `cd JayTap && npx tsc --noEmit 2>&1 \| tail -20` (no new errors) | ✅ | ⬜ pending |
| 03-05-T3 | 03-05 | 4 | MEDIA-03 | T-04 (App.tsx mount conditional + RTL gate-closed assertion) | App.tsx state flags + OVERLAY_FLAGS + import + mount block (style-form pointerEvents); RTL smoke test passes 3 cases (Approve disabled when photos empty / enabled when present / mod-gate-closed renders null) | RTL + tsc + parity | `grep -c "isMediaCurationOpen" App.tsx` (≥ 4) + `grep -c "currentMediaCurationListingId" App.tsx` (≥ 4) + `grep -nE "MediaCurationScreen.*listingId.*currentMediaCurationListingId" App.tsx \| wc -l` (≥ 1) + `grep -nE "pointerEvents:\s*'auto'" App.tsx \| wc -l` (≥ 1) + `test -f src/screens/__tests__/MediaCurationScreen.test.tsx && echo TEST-OK` + `cd JayTap && npx jest MediaCurationScreen 2>&1 \| tail -10` (≥ 3 green) + `cd JayTap && npx tsc --noEmit 2>&1 \| grep -c "error TS"` (≤ baseline) | ✅ | ⬜ pending |
| 03-06-T1 | 03-06 | 5 | MEDIA-03, MEDIA-06, MEDIA-09 | T-04 (mod-only banner render), T-02 (client UX disable) | 6 EN+RU i18n keys; NeedsMediaBanner uses `colors.onAccent` (W6 zero hex); ModerationQueueScreen filter chip row + W2 conditional row-tap branch | parity + tsc + grep | `grep -c "moderation\.needsMediaBanner\.\|moderation\.filter\." src/locales/en.ts` (≥ 6) + same in ru.ts + `bash scripts/check-i18n-parity.sh; echo $?` (= 0) + `test -f src/components/NeedsMediaBanner.tsx && echo BANNER-OK` + `grep -c "activeFilter\|all-pending\|needs-media\|has-media" .../ModerationQueueScreen.tsx` (≥ 6) + `grep -c "onOpenMediaCuration" App.tsx` (≥ 2) + `grep -c "photoCount === 0" .../ModerationQueueScreen.tsx` (≥ 1 — W2 branch, distinct from filter predicate; B-NEW-1 tightened gate) + `grep -c "photos?.length ?? 0" .../ModerationQueueScreen.tsx` (≥ 2 — filter predicate use + W2 row-tap branch use; B-NEW-1 tightened gate) + `grep -nE "'#[0-9A-Fa-f]{3,6}'" .../NeedsMediaBanner.tsx \| wc -l` (= 0 — W6) + `grep -c "colors.onAccent" .../NeedsMediaBanner.tsx` (≥ 1 — W6) + `cd JayTap && npx tsc --noEmit 2>&1 \| grep -c "error TS"` (≤ baseline) | ✅ | ⬜ pending |
| 03-06-T2 | 03-06 | 5 | MEDIA-03, MEDIA-07 | T-02 (client UX disable defense-in-depth), T-04 (mod-only banner) | NeedsMediaBanner renders when conditions met; Approve button disabled+muted when photos empty; hint text above 3-button row; App.tsx callback wired to both ModerationQueueScreen + PropertyDetailsScreen | tsc + grep + parity | `grep -c "NeedsMediaBanner" .../PropertyDetailsScreen.tsx` (≥ 2) + `grep -c "showNeedsMediaBanner\|media\.photos\.length" .../PropertyDetailsScreen.tsx` (≥ 2) + `grep -c "moderation\.mediaCuration\.approve\.disabled\.hint" .../PropertyDetailsScreen.tsx` (≥ 1) + `grep -c "onOpenMediaCuration" App.tsx` (≥ 3) + `cd JayTap && npx tsc --noEmit 2>&1 \| grep -c "error TS"` (≤ baseline) + `bash scripts/check-i18n-parity.sh; echo $?` (= 0) | ✅ | ⬜ pending |
| 03-06-T3 | 03-06 | 5 | MEDIA-03, MEDIA-06 | T-04 (filter predicate boundary) | RTL test — 3+ chip-predicate cases (all-pending shows 3, needs-media shows 2, has-media shows 1; tourUrl-only-no-photos = needs-media); row-tap callback assertion | RTL | `test -f src/screens/__tests__/ModerationQueueScreen.test.tsx && echo TEST-OK` + `cd JayTap && npx jest ModerationQueueScreen 2>&1 \| tail -15` (≥ 3 green) + `cd JayTap && npm test 2>&1 \| tail -25` (full suite green) | ✅ | ⬜ pending |
| 03-07-T1 | 03-07 | 6 | MEDIA-01, MEDIA-08, MEDIA-09 | (cross-plan audit) | All 4 sentinels green + both test suites green; 03-PHASE-VERIFICATION.md ≥ 60 lines with full requirement/decision/discretion mapping (I1 precise grep); paired-gate handoff signal | sentinel × 4 + manual `npm test` × 2 | `test -f .../03-PHASE-VERIFICATION.md && echo VERIF-OK` + `wc -l .../03-PHASE-VERIFICATION.md` (≥ 60) + `bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh; echo $?` (= 0) + `bash scripts/check-i18n-parity.sh && bash scripts/check-create-listing-screen-removed.sh; echo $?` (= 0) + `grep -oE "D-(0[1-9]\|1[0-6])" .../03-PHASE-VERIFICATION.md \| sort -u \| wc -l` (= 16 — I1) + `grep -oE "Discretion #[1-8]" .../03-PHASE-VERIFICATION.md \| sort -u \| wc -l` (= 8 — I1) + `grep -c "MEDIA-0" .../03-PHASE-VERIFICATION.md` (≥ 9) | ✅ | ⬜ pending |
| 03-07-T2 | 03-07 | 6 | (manual gate) | (cross-plan audit) | Human reviews 03-PHASE-VERIFICATION.md, types "approved" OR routes to fix plan; orchestrator runs `/gsd-verify-work 3` AND `/gsd-review-work 3` paired gate post-approval | manual checkpoint:human-verify | (no automated — checkpoint:human-verify; resume-signal "approved") | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Filled by gsd-planner (revision 2 — B1). All 9 items confirmed: Plan 03-01 (Wave 0) creates them.

- [x] `JayTap-services/scripts/` (NEW directory) — Plan 03-01 Task 3 Step A
- [x] `JayTap-services/scripts/check-property-routes-media-stripped.sh` (NEW sentinel) — Plan 03-01 Task 3 Step B
- [x] `JayTap-services/scripts/check-no-actoruid-spoofing.sh` (NEW sentinel — D-15) — Plan 03-01 Task 3 Step C
- [x] `JayTap-services/src/middleware/s3Upload.js` (NEW shared module — Discretion #3) — Plan 03-01 Task 1 Step A
- [x] `JayTap-services/src/__tests__/moderationRoutes.test.js` extension (~9 new test groups) — Plan 03-02 Task 3 (W5 mock recipe)
- [x] `JayTap-services/src/__tests__/propertyRoutes.test.js` extension (multer-stripped behavior + MEDIA-02 + MEDIA-08) — Plan 03-04 Task 2
- [x] `JayTap/src/screens/__tests__/` (NEW directory) — Plan 03-05 Task 3 Step F
- [x] `JayTap/src/screens/__tests__/MediaCurationScreen.test.tsx` (NEW RTL smoke) — Plan 03-05 Task 3 Step G
- [x] `JayTap/src/screens/__tests__/ModerationQueueScreen.test.tsx` (NEW or extend) — Plan 03-06 Task 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mod media-curation walk on iPhone 15 Pro Max + Moto G XT2513V | MEDIA-04, MEDIA-06, MEDIA-07 | Native picker + S3 round-trip + camera permissions (CONTEXT.md `<deferred>` says "deferred to Phase 5 REL-03") | Per Phase 5 REL-03 manual QA matrix |
| Dark/light parity walks (MediaCurationScreen + NeedsMediaBanner + filter chips + Approve disabled state) | MEDIA-03, MEDIA-06, MEDIA-09 | Visual perception of token rendering across both modes; not jest-testable | Per Phase 5 REL-03 manual QA matrix |
| EN+RU copy parity perception (cap-overflow toasts at runtime; tour URL hint truncation on small screens) | MEDIA-09 | RTL asserts the keys exist; EN+RU sentence-flow review is human-only | Per Phase 5 REL-03 manual QA matrix |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (revision 2 — B1: 21/21 tasks mapped; only 03-07-T2 is checkpoint:human-verify and explicitly N/A)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the only N/A is Plan 03-07's terminal human-verify checkpoint)
- [x] Wave 0 covers all MISSING references (revision 2 — B1: all 9 Wave 0 items mapped to specific Plan 03-01 task steps + downstream Plan 03-02 / 03-04 / 03-05 / 03-06 extensions)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (RN smoke) / < 90s (backend quick) per RESEARCH.md
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Centralized STRIDE register (revision 2 — W4) at `03-THREAT-MODEL.md` cross-references each task's threat ID

**Approval:** ready (revision 2 — B1 + W3 + W4 + W5 + W6 + B3 + B4 + I1 + I2 + B2 applied)

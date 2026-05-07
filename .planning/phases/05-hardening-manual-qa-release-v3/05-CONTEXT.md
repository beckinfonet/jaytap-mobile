# Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0 — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-cutting validation of every M3 surface on physical iPhone 15 Pro Max + Moto G XT2513V, atomic v3.0.0 version bump (M1 D-02 + M2 Wave-1 query-first lesson applied), and dual-store submission to ASC TestFlight Internal + Play Console Internal Testing. Closes M3 by walking the 24+ deferred device-level walks accumulated across Phases 1–4 alongside the fresh REL-03 happy-path matrix (15 cells from 6-step flow × 5 property types × 3 deal types).

**Phase 5 owns the operator-supervised pre-flight sequence** that was deferred from Phase 1 + Plan 02-01 + Phase 4 CARRY-02 D-09 — Atlas snapshot → schema migration → uid-repair migration → backend Railway deploy → locations seed → smoke-test curls. After pre-flight is green, the QA matrix walks begin; once that's APPROVED, the atomic version bump + dual-store submission close the milestone.

**Touches both repos:**
- **RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — `package.json` version bump, iOS `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION` (Xcode project), Android `versionName` + `versionCode` (`build.gradle`), no source-code changes anticipated unless QA matrix surfaces FAILs that block ship.
- **Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — Railway deploy of accumulated commits (M3 Phases 1–4 backend SHAs are ahead of Railway: Phase 1 cutover + Plan 02-01 locations + Phase 3 media routes + Phase 4 CARRY-02 + MD-* polish). No new backend code anticipated unless QA matrix surfaces FAILs.

**Requirements covered:** REL-01, REL-02, REL-03, REL-04, REL-05, REL-06.

**Explicitly NOT in this phase (boundary anchors for downstream):**
- Race-cell test rig — DEFERRED M4+ per memory `phase06-m3-carry-forward.md`. Backend supertest covers MOD-15 + ROLE-11 + HF-04 atomic invariants; physical-device race walks remain empirical-only.
- 2GIS native map bridge — M4+ per `2GIS_BRIDGE_PLAN.md`.
- New data-collecting SDKs — none anticipated; ASC App Privacy + Play Data Safety responses inherited from v2.0 (M1 D-13 inheritance descope honored).
- KZT + UZS currency support — M4+ market expansion milestone.
- Multi-language localization beyond EN+RU — M4+ if KZ/UZ markets warrant.
- Token-revocation backend changes — out of scope; M2 Phase 1's `iat < roleRevokedAt` check remains the trust boundary.
- Production listing creation by real users — internal-testing-track only at v3.0.0; production listing flow opens at next public release.

</domain>

<decisions>
## Implementation Decisions

### Pre-flight ownership (Plan 05-01)

- **D-01 (Plan 05-01 = pre-flight tracker plan + companion runbook):** Phase 5 owns the operator-supervised pre-flight sequence as Plan 05-01. Plan body is a checklist of operator-execute steps; each step has a verify gate (script exit code, query result, or operator-confirmed observation). Companion document `05-PREFLIGHT.md` (analog to M2 Phase 6's `06-BACKEND-DEPLOY.md`) holds the full copy-pasteable runbook with commands + expected output + rollback notes per step. Status visible via `/gsd-progress`; mid-flight failure logged in plan deviation_protocol.
  - REJECTED: pre-phase wave outside the plan structure (Phase 5 SUMMARY would not reflect pre-flight; mid-flight failure has no obvious home; matches Phase 1's actual deferral model but loses accountability).
  - REJECTED: re-execute deferred HUMAN-UAT.md per phase, no Plan 05-01 (status scattered across 3 files; no single 'pre-flight green' gate).

- **D-02 (Pre-flight step ordering):** The Plan 05-01 sequence is locked to:
  1. Capture Atlas snapshot (rollback safety net).
  2. `nvm use 24 && npm run migrate:listings-m3 -- --dry-run` → review output (expected doc count + 3 propertyType-biased samples per `01-CONTEXT.md §Rollback`).
  3. `npm run migrate:listings-m3` (live) — schema reshape against production Atlas.
  4. `npm run migrate:listings-m3 -- --verify=PASS` → expect exit 0; post-migration `db.properties.countDocuments({location:{$exists:false}}) === 0`.
  5. `nvm use 24 && node src/scripts/migrate-landlord-app-uid-mismatch.js --dry-run` → review classification (Phase 4 D-09 — independent migration; runs after schema migration but before backend deploy so the same Atlas snapshot covers both).
  6. `node src/scripts/migrate-landlord-app-uid-mismatch.js` (live) → repair mismatched rows / orphan-mark unrepairable.
  7. `node src/scripts/migrate-landlord-app-uid-mismatch.js --verify=PASS` (NOTE: per Phase 4 REVIEW.md MEDIUM-01, this currently runs the cursor walk live before probing — idempotent but operator-UX papercut; see Claude's Discretion for whether Phase 5 fixes the script first or tolerates the papercut).
  8. Backend Railway deploy (RN client `fe3b888` + backend `46d2ef4` are the heads — confirm against Railway dashboard before deploy).
  9. `npm run seed:locations -- --dry-run` → review.
  10. `npm run seed:locations` (live) — KG/KZ/UZ city + Bishkek district dictionary seed.
  11. `npm run seed:locations -- --verify=PASS` → expect exit 0.
  12. Smoke-test backend curls per `01-CONTEXT.md §Rollback` (GET /api/properties returns nested-shape responses; GET /api/locations/cities returns seeded set).
  13. RN client whole-project `npx tsc --noEmit` capture (Phase 1 deferred item; expected baseline 17 errors per Phase 4 close — confirm no new errors before device walks).

- **D-03 (Rollback posture = decide-at-moment):** If any pre-flight step fails (`--verify=PASS` shows unmigrated docs, smoke-curl returns malformed shape, etc.), the operator (user) judges in-context whether to (a) triage in-place using the held Atlas snapshot, fix script, retry, or (b) full rollback to M2 — revert Phase 1 cutover commits + restore snapshot + cut v2.0.x hotfix to keep internal testers stable. Plan 05-01 deviation_protocol captures the live call with a one-paragraph rationale. No upfront commitment to either posture.
  - REJECTED: triage-only default (over-commits to staying in pre-flight if migration breaks in a way that needs Phase 1 re-architecture).
  - REJECTED: full-rollback default (overkill for transient/fixable issues; M2 build remains viable for testers either way during pre-flight).

- **D-04 (Tester comms BEFORE pre-flight starts):** Send Pitfall 7 mitigation comms (template in `01-CONTEXT.md §Rollback › ## Tester comms template`) to internal testers on TestFlight build 27 + Play Internal versionCode 30 BEFORE step 1 (Atlas snapshot). Window message: testers know "no M2 testing for the next ~2h while we deploy v3.0; new build coming." This avoids bug reports against expected-broken M2 client screens during the Phase 1 → Phase 2 cutover window (M2 client expects flat shape; post-deploy backend serves nested shape — every list screen breaks until v3.0 builds reach the testers).
  - REJECTED: post-deploy comms only (testers using M2 during the deploy window will see broken responses; Phase 1 D-01 atomic-break guarantees it).
  - REJECTED: dual heads-up + go-live comms (more work for marginal benefit; pre-flight comms covers the breaking window, the new-build availability is visible in TestFlight/Play UI).

- **D-05 (uid-repair migration runs in pre-flight, between schema migration and backend deploy):** `migrate-landlord-app-uid-mismatch.js` is independent of the schema migration but operator-supervised in the same Atlas snapshot window. Running it AFTER `migrate-listings-m3.js --verify=PASS` keeps the snapshot rollback covering both. Running BEFORE backend deploy keeps the in-memory model + audit-log enum extensions live (Phase 4 D-11) on the deployed binary. CARRY-02 SC#3 device walk validates post-deploy.
  - REJECTED: post-deploy timing (needs a second snapshot or accepts post-deploy snapshot — extra coordination for no benefit).
  - REJECTED: skip the migration entirely (memory `phase45-landlord-application-uid-mismatch-bug.md` confirms diagnostic uids saved; production may have orphaned rows even if test data only — supertest is in-memory mongo, not production evidence).

### QA matrix structure (REL-03)

- **D-06 (Canonical 05-QA-MATRIX.md):** One document supersedes the 4 prior `*-HUMAN-UAT.md` files (`01-HUMAN-UAT.md`, `02-HUMAN-UAT.md`, `03-VERIFICATION.md` deferred section, `04-HUMAN-UAT.md` if it lands). Matches M2 Phase 6's `06-QA-MATRIX.md` pattern (86 cells, 74 PASS / 3 PARTIAL / 5 DEFERRED-USER-APPROVED / 0 FAIL distribution). The 4 prior HUMAN-UAT.md files get a one-line header note ("Rolled into `.planning/phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` 2026-05-07; do not update further") and stop accepting status updates. Plan 05-N (the QA-walk plan) reads from the canonical doc only.
  - REJECTED: roll-up + per-phase HUMAN-UAT.md as detail (bookkeeping doubles; sources drift over a multi-hour walk session).
  - REJECTED: canonical-for-fresh-only, prior phase docs sovereign for deferred (status scattered across 5 docs at phase close).

- **D-07 (Walk once, count for both):** Phase 2's 12 deferred walks (W1–W12 in `02-HUMAN-UAT.md` covering apartment+rent_long, edit-owner, edit-mod, hospitality D-19 thin Step 6, Bishkek districts, validators) ARE the REL-03 happy-path cells. Walk once on iPhone 15 Pro Max + once on Moto G XT2513V; mark both Phase 2 deferred entry AND REL-03 cell green from the same evidence. 05-QA-MATRIX.md tags each cell with `satisfies: Phase 2 W{N} + REL-03 cell {dealType}+{propertyType}` so the dual-coverage is auditable. Same pattern for Phase 3's 6 mod-media-curation walks (satisfies REL-03 mod-curation cells).
  - REJECTED: walk separately (doubles physical-device time to ~24+ walks; no coverage benefit since the test surface is identical).
  - REJECTED: subset sample (Phase 2's deferred walks aren't fully closed; partial closure would leave M3 carry-forward residue into M4).

- **D-08 (One walk = one device + one combination):** Each cell = one device × one (deal_type, property_type, mode) tuple. The 6-step flow walked end-to-end as a single PASS/FAIL/PARTIAL verdict; sub-step issues noted in cell comments. Matches M2 Phase 6 cell granularity. Estimated cell count:
  - Happy-path: 15 combinations × 2 devices = 30 cells
  - Edit-mode (edit-owner + edit-mod): 6 representative cells × 2 devices = 12 cells
  - Mod media curation: 4 walks (filter-needs-media, MEDIA_REQUIRED block, EN+RU parity, cap-overflow) × 2 devices = 8 cells
  - ROLE-11 demote-mid-action recovery: 2 paired-device cells (CARRY-01 banner latency on iPhone)
  - Phase 4.5 uid-mismatch repair: 1 cell (CARRY-02 SC#3 live Atlas walk)
  - Parity: dark/light × EN/RU sweep — 4 cells × 2 devices = 8 cells
  - **Estimated total: ~60 cells** (vs M2 Phase 6's 86 — comparable surface)
  - REJECTED: per-step cell granularity (90+ cells per device for happy path alone; 6-step flow already has 94/94 RTL tests covering step transitions).
  - REJECTED: bucketed at category level (misses property-type-specific bugs like hotelClass-only Step 3 break or commercial-only kitchen field).

- **D-09 (Verdict taxonomy = M2 Phase 6 four-state):** PASS / PARTIAL / DEFERRED-USER-APPROVED / FAIL.
  - PASS: walked, no issue.
  - PARTIAL: walked, minor cosmetic/UX issue noted (still ships; logged for M4 polish backlog).
  - DEFERRED-USER-APPROVED: walk skipped with explicit user sign-off (race cells stay this way per M2 Phase 6 precedent).
  - FAIL: blocks ship; triggers Plan 05-01-style deviation_protocol.
  - REJECTED: three-state PASS/FAIL/DEFERRED (loses PARTIAL distinction — under-counts minor issues or over-blocks ship).
  - REJECTED: five-state with PRE-EXISTING (separation between regression and inherited bug is useful for Phase 4 paired-gate but not for shipped-vs-blocked decision; over-engineered for the device walker).

### Claude's Discretion

- **Plan structure:** Default to M2 Phase 6's 7-plan precedent unless researcher/planner identifies meaningful divergence. Approximate mapping: Plan 05-01 (pre-flight runbook — D-01 above), Plan 05-02 (store-history capture + version-baseline math per M1 D-02 lesson), Plan 05-03 (atomic version bump — RN client + iOS + Android), Plan 05-04 (release notes draft EN+RU + ASC/Play paste), Plan 05-05 (QA matrix walk — uses 05-QA-MATRIX.md), Plan 05-06 (paired-gate verifier+reviewer per memory `gsd-verifier-misses-regressions.md`), Plan 05-07 (dual-store submission + 05-SUBMISSION-LOG.md). Companion docs: 05-PREFLIGHT.md (D-01), 05-STORE-HISTORY.md, 05-INHERITANCE-AUDIT.md, 05-QA-MATRIX.md, 05-RELEASE-NOTES.md, 05-SUBMISSION-LOG.md.

- **Phase 4 review carry-forward polish (MEDIUM-01 / MEDIUM-02 / LOW-01 / LOW-02 from `04-REVIEW.md`):** Researcher/planner discretion whether to fold any into Phase 5. Specifically:
  - MEDIUM-01 (`migrate-landlord-app-uid-mismatch.js --verify=PASS` runs live writes before probing): folding it means a one-line script change before pre-flight step 7 runs; touches a script Plan 05-01 already invokes. Low risk. RECOMMENDED to fold.
  - MEDIUM-02 (5 other moderationRoutes handlers leak CastError 500 instead of 400 INVALID_ID): touches mod-action surfaces the QA matrix will walk. Probability of QA matrix walker hitting a malformed ObjectId ID by accident is low; fixing all 5 is a 30-minute edit. RECOMMENDED to fold if researcher confirms grep coverage of the 5 sites.
  - LOW-01 (anti-spoofing sentinel false-positive risk on legitimate non-spoof body uid reads): pure defensive hardening with no immediate need. PUNT to M4 unless researcher finds active near-miss.
  - LOW-02 (ModerationQueueScreen `load`-path catch uses bespoke PermissionDeniedError + onBack instead of banner-driven flow): pre-existing, defensible per Phase 4 close. PUNT to M4.

- **Release notes emphasis (REL-04):** Researcher/planner discretion. Default position: lead with new features (6-step contextual listing flow + KG/KZ/UZ city dictionary as expansion enabler hint per memory `geographic-scope.md` — no Bishkek-only phrasing) since v3.0 is a meaningful jump and internal-testing audience benefits from knowing what to walk. M1 D-10 content order honored: What's new → Improvements → Bug fixes catch-all. Both bodies ≤500 chars (Play Console binding limit). EN+RU lockstep.

- **INHERITANCE-AUDIT.md format:** Match M2 Phase 6's `06-INHERITANCE-AUDIT.md` structure (item-by-item INHERITED / UPDATED / DESCOPED with re-open conditions). M3 expected outcome: 7/7 INHERITED — no new data-collecting SDKs, no privacy manifest changes, no entitlement changes, no Google Maps key restriction changes. Re-open condition unchanged: future phase introduces new data-collecting SDK or auth provider.

- **Sentinel re-run before submission:** All 4 backend sentinels (anti-spoofing-actoruid, anti-spoofing-landlord-uid, media-stripped, create-listing-removed) + i18n parity gate must run green at submission time. Already chained into `npm test` in both repos; planner discretion whether to add an explicit Plan 05-N gate or trust the existing chain.

- **Android `clean bundleRelease` workaround:** Per memory `android-reanimated-clean-prefab-gotcha.md`, use `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead of `clean bundleRelease`. Document in `scripts/release-android.md` (M3 carry-forward from M2) — Plan 05-N owns the operator runbook update if researcher confirms `scripts/release-android.md` exists or needs creating.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### M3 Phase 5 source-of-truth
- `.planning/ROADMAP.md` §"Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0" (lines 159-174) — Goal, Depends on, Requirements, Success Criteria.
- `.planning/REQUIREMENTS.md` §"Release & store submission (Phase 5)" — REL-01 through REL-06 with version-baseline + QA + comms + deploy + submission criteria.
- `.planning/PROJECT.md` §"Current Milestone: v3.0 M3" — Out of Scope guards (no Firebase SDK, no react-navigation migration, no KZT/UZS, no race-cell rig).

### Pre-flight prerequisites — phase artifacts to roll forward
- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-HUMAN-UAT.md` — 4 deferred operator items (Atlas migration, restore-snapshot drill, tester comms, RN tsc capture).
- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` §Rollback — copy-pasteable runbook + tester comms template + reverse-rollback procedure.
- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-05-SUMMARY.md` — Plan 01-05 §Rollback subsection (D-17) detail.
- `.planning/phases/02-6-step-contextual-listing-flow-client/02-HUMAN-UAT.md` — 12 deferred walks (Walks 1–6 cross-device, hospitality thin Step 6, Bishkek districts, validators).
- `.planning/phases/02-6-step-contextual-listing-flow-client/02-01-SUMMARY.md` — Plan 02-01 backend Railway deploy + Atlas locations seed prerequisites.
- `.planning/phases/02-6-step-contextual-listing-flow-client/deferred-items.md` — 8 jest-stack hardening items (carry-forward, not Phase 5 scope but reference for tsc capture step).
- `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-VERIFICATION.md` §`deferred:` — 6 device-level walks for mod media curation (filter-needs-media, MEDIA_REQUIRED UX, EN+RU parity, cap-overflow toast, has-media filter, per-asset DELETE round-trip).
- `.planning/phases/04-m2-carry-forward-bug-fixes/VERIFICATION.md` §`deferred:` — 2 device walks (CARRY-01 banner latency on iPhone, CARRY-02 SC#3 live Atlas uid match).
- `.planning/phases/04-m2-carry-forward-bug-fixes/REVIEW.md` — Phase 4 paired-gate review with 2 MEDIUM + 2 LOW carry-forward candidates (MEDIUM-01/02 + LOW-01/02 — see Claude's Discretion).

### M2 Phase 6 precedent (release-grinder pattern)
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-QA-MATRIX.md` — 86-cell QA matrix template (canonical structure for D-06).
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-STORE-HISTORY.md` — store-history capture pattern (M1 D-02 lesson applied: query Play Console + TestFlight before setting baseline).
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-INHERITANCE-AUDIT.md` — INHERITED/UPDATED/DESCOPED structure with re-open conditions.
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md` — EN+RU release notes structure + content order (M1 D-10).
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-BACKEND-DEPLOY.md` — backend Railway deploy runbook (analog for 05-PREFLIGHT.md).
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-SUBMISSION-LOG.md` — dual-store submission log structure.

### M3 anchor + decisions context
- `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` (Version 2) — M3 anchor SPEC, primarily relevant for confirming no scope drift in REL-04 release notes copy.
- `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-CONTEXT.md` — Phase 3 boundary anchors that confirm "v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission" is Phase 5 territory.
- `.planning/phases/04-m2-carry-forward-bug-fixes/04-CONTEXT.md` — Phase 4 boundary anchors confirming carry-forward review polish handling.

### Memories (lessons + invariants)
- `release-android-versioncode-trust-play-console.md` — M1 D-02 lesson: query Play Console + TestFlight history BEFORE setting versionCode/build-number baseline.
- `android-reanimated-clean-prefab-gotcha.md` — use `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead of `clean bundleRelease`.
- `geographic-scope.md` — KG/KZ/UZ scope; no Bishkek-only phrasing in release notes.
- `phase06-m3-carry-forward.md` — race-cell test rig stays M4+; reanimated build doc carry-forward; AWS IAM cross-project residual unchanged.
- `gsd-verifier-misses-regressions.md` — verifier + reviewer paired gates required at phase close.
- `m2-shipped-2026-05-05.md` — M2 baseline: iOS build 27 / Android versionCode 30 (store-history starting point).
- `aws-iam-jaytap-prod-s3.md` — IAM key not rotated for Phase 3 D-14; re-open condition for Phase 5 REL-05 audit if key-leak evidence surfaces.
- `backend-node-version.md` — backend `nvm use 24` before npm/node ops; jose@6 ESM-only requires Node ≥22.12.
- `geocoder-nominatim-hang-axios-network-error.md` — known issue not in REL-* scope but watch during QA matrix if create-listing flow triggers `Network Error` on Step 2 location.
- `last-admin-lockout-semantics.md` — semantic clarification for any RoleManagementScreen QA cell (don't expect lockout outside concurrent race).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Migration scripts (backend, operator-supervised pattern):**
  - `backend: scripts/migrate-listings-m3.js` — schema reshape migration (Phase 1 D-04..D-15). `--dry-run` / `--verify=PASS` / idempotent. Plan 05-01 step 2-4.
  - `backend: src/scripts/migrate-landlord-app-uid-mismatch.js` — uid repair migration (Phase 4 D-09). Same `--dry-run` / `--verify=PASS` / idempotent pattern, BUT MEDIUM-01 from `04-REVIEW.md` notes verify=PASS performs writes before probing (operator UX papercut on first invocation). Plan 05-01 step 5-7.
  - `backend: scripts/seed-locations-m3.js` — KG/KZ/UZ city + Bishkek district seed (Plan 02-01). Same operator-supervised pattern. Plan 05-01 step 9-11.
- **Sentinel scripts (chained into npm test):**
  - `backend: scripts/check-no-actoruid-spoofing.sh` — anti-spoofing on moderationRoutes.js (M2 HF-03 + M3 Phase 3).
  - `backend: scripts/check-no-landlord-uid-spoofing.sh` — anti-spoofing on landlordApplicationRoutes.js (Phase 4 D-07).
  - `backend: scripts/check-property-routes-media-stripped.sh` — multer absent from propertyRoutes.js (Phase 3 D-13).
  - `RN client: scripts/check-create-listing-screen-removed.sh` — atomic-deletion sentinel (Phase 2 Plan 02-09).
  - `RN client: scripts/check-i18n-parity.sh` — EN+RU parity gate.
  - All 4 backend sentinels run in `actoruid → landlord-uid → media-stripped → jest` order. Trust the chain at submission time per Claude's Discretion.
- **Version baseline files:**
  - `RN client: package.json` — current `2.0.0` (M2 close); Plan 05-03 atomic bump to `3.0.0`.
  - `RN client: ios/JayTap.xcodeproj/project.pbxproj` — `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION`. Current 2.0.0 / 27.
  - `RN client: android/app/build.gradle` — `versionName "2.0.0"` + `versionCode 30`. **DO NOT trust this file for baseline math** per memory `release-android-versioncode-trust-play-console.md` — query Play Console first.
- **Backend deploy state:**
  - Railway dashboard tracks deployed SHA. As of 2026-05-07: backend `46d2ef4` (Phase 4 close) is ahead of Railway. Pre-flight step 8 deploys it.
  - `JayTap-services/.env.production` (operator-managed, not in repo) — Mongo Atlas + AWS IAM creds; HF-02 closed in M2; AWS IAM cross-project residual remains documented PARTIAL.

### Established Patterns

- **Operator-supervised migration runbook:** Phase 1 + Plan 02-01 established the dry-run → live → verify=PASS → smoke-test pattern. Plan 05-01 follows it verbatim.
- **Companion document for operator-driven plan:** M2 Phase 6's `06-BACKEND-DEPLOY.md` is the canonical analog for Plan 05-01's `05-PREFLIGHT.md`. Headers: Pre-conditions → Steps (numbered, with command + expected output + rollback note) → Post-conditions → Sign-off.
- **Atomic version bump as single commit:** M1 D-02 + M2 Wave-1 — `package.json` + iOS Xcode + Android `build.gradle` all in one atomic commit so the version is unambiguously synced. No partial-bump windows.
- **EN+RU lockstep:** M1 + M2 + M3 invariant — every UI string change lands in both `src/locales/en.ts` + `src/locales/ru.ts` in the same commit; parity gate enforces.
- **Release notes content order:** M1 D-10 — What's new → Improvements → Bug fixes catch-all. Both bodies ≤500 chars (Play Console binding limit).
- **Paired-gate close:** Per memory `gsd-verifier-misses-regressions.md` — gsd-verifier + gsd-code-reviewer both run at phase close; verifier alone misses regressions in downstream surfaces.

### Integration Points

- **Internal testers:** TestFlight Internal Testing track (build 27 baseline) + Play Console Internal Testing track (versionCode 30 baseline). Pre-flight comms target this audience.
- **Backend deploy target:** Railway. Auto-deploy from `main` branch (confirm in Plan 05-01 step 8 — manual trigger if auto-deploy is paused).
- **Atlas:** Production cluster (M10+ tier per memory has automated snapshot UI; M0 free tier requires `mongorestore --drop` for restore).
- **AWS S3:** Dedicated `jaytap-prod-s3` IAM user (memory `aws-iam-jaytap-prod-s3.md`). REL-05 audit confirms key unchanged from M2 baseline. PARTIAL re-open condition: cross-project residual IAM user retains JayTap-bucket policy access; re-open when other project unblocks scoping it away.
- **App Store Connect:** ASC TestFlight Internal Testing distribution. Build artifact is `.ipa` from Xcode 26.4 archive. Submission log captured per Plan 05-07.
- **Google Play Console:** Internal Testing track. Build artifact is `.aab` from `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` (memory workaround). Submission log captured per Plan 05-07.

</code_context>

<specifics>
## Specific Ideas

- **05-QA-MATRIX.md cell tagging convention:** Each cell row includes a `satisfies:` column listing the prior-phase deferred entry it closes (e.g., `satisfies: Phase 2 W1 + REL-03 cell apartment+rent_long`). Makes the dual-coverage from D-07 auditable in a single grep.
- **Plan 05-01 deviation_protocol pre-template:** Failure paths anticipated:
  - Atlas migration `--dry-run` count mismatch (orphan docs) → triage classification before going live.
  - Atlas migration live failure mid-cursor → snapshot restore is the safety net; D-03 decide-at-moment.
  - Backend deploy fails healthcheck → pause; query Railway logs; do NOT advance to step 9 (locations seed) until healthy.
  - Atlas locations seed `--verify=PASS` mismatch (count off, dedupe failed) → triage; safe to retry idempotent.
  - tsc whole-project capture > 17 errors → block device walks; classify new errors against Phase 4 baseline.

</specifics>

<deferred>
## Deferred Ideas

- **Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 + 5.3 from M2 Phase 6 + cell 5.3 mismatch path)** — M4+ per memory `phase06-m3-carry-forward.md`. Phase 5 documents the deferral in 05-QA-MATRIX.md as DEFERRED-USER-APPROVED with the M2 precedent reference. Backend supertest covers the atomic invariants.
- **Android `scripts/release-android.md` operator runbook update** — document the reanimated `clean bundleRelease` workaround. Carry-forward from M2 per memory `phase06-m3-carry-forward.md`. Optional Plan 05-N inclusion (Claude's Discretion) — fold if researcher confirms file exists or needs creating; punt to M4 if it adds plan count without value.
- **AWS IAM cross-project residual** — re-open condition unchanged: when other project unblocks scoping the OLD shared IAM user away from JayTap bucket ARN. Phase 5 REL-05 confirms PARTIAL state preserved; no rotation triggered unless key-leak evidence surfaces.
- **2GIS native map bridge** — M4+ per `2GIS_BRIDGE_PLAN.md`.
- **KZT + UZS currency support** — M4+ market expansion milestone.
- **Multi-language localization beyond EN+RU (KK/UZ)** — M4+ if KZ/UZ markets warrant.
- **Phase 4 review LOW-01 (sentinel false-positive risk)** — pure defensive hardening; punt to M4 unless researcher finds active near-miss during pre-flight.
- **Phase 4 review LOW-02 (ModerationQueueScreen load-path bespoke catch)** — pre-existing, defensible per Phase 4 close. Punt to M4.
- **Push notifications / email notifications for moderation events** — captured in REQUIREMENTS.md M4+ Future Requirements.
- **Bulk moderation actions (multi-select approve/reject)** — M4+ per REQUIREMENTS.md.
- **Automated/AI moderation (image/text classifiers)** — M4+ per REQUIREMENTS.md.
- **Real-estate document verification (Avito-style ownership proof)** — M4+ multi-month compliance subproject per REQUIREMENTS.md.

</deferred>

---

*Phase: 05-hardening-manual-qa-release-v3*
*Context gathered: 2026-05-07*

# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0.4 — M1 "Polish + Hospitality"

**Shipped:** 2026-04-28
**Phases:** 8 (7 executed + Phase 7 SKIPPED) | **Plans:** 42 | **Sessions:** ~14 over 6 days

### What Was Built

- Nav reliability fixed at root (`pointerEvents` belt-and-suspenders + `OVERLAY_FLAGS` derivation in `App.tsx`); reproduction matrix recorded.
- Universal keyboard handling solved at the root via `react-native-keyboard-controller@1.21.6` + `reanimated@4.3.0` + `worklets@0.8.1` under Fabric — no per-screen `keyboardVerticalOffset` magic numbers remain.
- `useRole()` / `can(action)` / `<Gated>` abstraction shipped over a hardcoded admin-email allowlist; PropertyService canFromUser guard on admin-only writes; D-14 4-part grep-invariant CI gate.
- Listing form decomposed `CreateListingScreen` 1404→871 LOC (−37%) into 7 sub-components; `Land` removed atomically; `Hostel`/`Hotel` added under new `Hospitality` category; pure `validateByCategory()` + `buildPayloadByCategory()` single source of truth.
- Hospitality rendering: `HospitalitySection` strip on Home/Favorites/Owner+RenterListings; tour-first `PropertyDetailsScreen` Hospitality branches; 12-amenity taxonomy EN+RU; sticky 3-button contact bar replaces price block.
- Atomic v1.0.4 bump shipped to TestFlight + Play Console; 136-cell physical-device QA APPROVED on first pass; bilingual EN+RU release notes pasted on both stores.

### What Worked

- **GSD wave-based execution.** Each phase decomposed into 5–7 plans across explicit waves (validation scaffolding → foundation → carving → integration → phase-exit). Predictable cadence, clean atomic commits, zero post-hoc cleanup.
- **Atomic-commit convention with literal plan-token in subject.** Every plan landed as ≤2 paths in a single commit (source + occasional metadata twin). Made `git diff --name-only HEAD~1 HEAD` a useful invariant assertion. Made bisect plausible.
- **Physical-device QA matrices walked at every phase close.** M1 testing bar was manual on iOS 26 / iPhone 15 Pro Max + Android 16 / Moto G XT2513V. Walking matrices at every phase close-out (not just at Phase 8) caught regressions early; Phase 8's 138-cell smoke walk APPROVED on first pass with zero D-08 bug-fix loop iterations because each preceding phase was already QA-clean.
- **Descope-by-CONTEXT.md (Phase 8 D-13).** Recognising at planning time that the v1.0.3 production privacy manifest, App Privacy responses, Maps key restrictions, and `applinks:` entitlements were already accepted by both stores — and that v1.0.4 introduced no data-collecting SDK changes — saved roughly a week of churn re-touching live declarations under Apple's automated scan and Play Console's Data Safety questionnaire. Re-open conditions were documented inline so the descope is auditable.
- **SUMMARY.md one-liner extraction at phase close.** Each plan's `requirements_addressed` + `provides` + `key-decisions` block in the SUMMARY frontmatter rolled cleanly into the milestone-level archive without re-reading the full plan body.

### What Was Inefficient

- **Bookkeeping debt.** REQUIREMENTS.md and ROADMAP.md checkboxes drifted across phase closes — Phase 1, 2, 3, 5, 6 all closed without updating their checkbox state in the ROADMAP/REQUIREMENTS phase listings, even though phase SUMMARY frontmatter and STATE.md were kept current. 13 stale checkboxes accumulated by milestone close. Cleaned up here, but cheaper to flip them in the metadata commit at every phase close. Add to convention: phase-close metadata commit MUST flip the corresponding ROADMAP+REQUIREMENTS checkboxes, not just STATE.md.
- **D-02 baseline trusted local `build.gradle` without Play Console version-code history check.** Phase 8 CONTEXT.md D-02 anchored on the local Android `versionCode 25 / versionName "1.0.24"` baseline. Play Console had already accepted versionCode 25 from a prior submission, so the bump-to-25 plan would have been rejected. The user discovered this at archive time and authored out-of-band commit `63f3b72` to bump versionCode 25 → 28 (and iOS `CURRENT_PROJECT_VERSION` 21 → 22, since iOS could collide on the next TestFlight upload). Both stores accepted the post-bump values without rejection, but the GSD plan's pre-archive verification could have caught this with one extra step: query Play Console + TestFlight for highest accepted-version in each track BEFORE setting the baseline, not just trust the local source files.
- **Phase 7 ALIGNMENT planned but ultimately not needed.** Phase 7 was scaffolded with a discuss-phase + a spec-phase placeholder slot in ROADMAP, even though screenshots from the user never arrived. At Phase 6 close the user confirmed no alignment issues stood out; Phase 7 SKIPPED with zero plans. Lesson: phases that depend on user-supplied artifacts (screenshots, mocks, designs) should be marked DEFERRED in ROADMAP until the artifact arrives, not planned upfront — saves a discuss-phase + a slot that may never close.

### Patterns Established

- **Verify-only Wave-0 baseline assertions before bump.** Phase 8's Plan 08-01 ran `xcodebuild -version` + grep on `package.json` / pbxproj / `build.gradle` as exit-code-0 assertions BEFORE Plan 08-02's atomic bump. Wave-0 verification became a phase pattern: assert the world is in the state your plan assumes before mutating.
- **Wave-2 manual QA gates with explicit BLOCKING checkpoint disposition.** Each phase that mutates UI ends with a Wave-N "BLOCKING manual QA walk" plan that cannot self-approve. The walker (user) signs off via PASS/FAIL count + APPROVED disposition, then the close-out metadata commit advances STATE+ROADMAP+REQUIREMENTS+SUMMARY. CLAUDE.md's "M1 testing bar is manual" rule mapped cleanly into this pattern.
- **D-XX numbering for in-CONTEXT.md decisions, with row-number anchors in PROJECT.md Key Decisions.** Phase context decisions get `D-01`, `D-02`, etc. inside `XX-CONTEXT.md` and are then summarized into PROJECT.md Key Decisions table rows. Cross-references stay readable; "see D-13 in 08-CONTEXT.md" is a precise anchor.
- **SUMMARY.md one-liner extraction for milestone roll-up.** Each phase SUMMARY's `requirements_addressed` + `key-decisions` + `provides` blocks roll cleanly into MILESTONES.md without re-reading plan bodies.

### Key Lessons

1. **Trust Play Console (and TestFlight) for live-version state, not local build files.** Pre-archive Wave-0 should `gh api` / Play Console API / `App Store Connect API` query for highest accepted version-code in each track before anchoring on local source. The 63f3b72 reactive bump was avoidable with that one assertion.
2. **Descope-by-inheritance saves enormous churn on update submissions.** v1.0.4 was a polish/feature update on top of an already-approved v1.0.3, not a fresh submission. Apple's privacy declarations + Play's Data Safety + entitlements + Maps key restrictions were all live and unchanged. Phase 8 D-13 recognised this and explicitly inherited; the descope record (with re-open conditions) is auditable. Future update milestones should default to inherit-and-spot-check rather than re-author-everything.
3. **SKIP-with-rationale is a valid phase outcome.** Phase 7 closed with zero plans because the user reviewed Phase 1–6 device QA and confirmed no alignment issues. PROJECT.md Key Decisions row 129 captured the rationale. The phase retains its slot in the ROADMAP for traceability but is closed. Better than fabricating busy-work to fill a phase slot.
4. **Bookkeeping is owed each plan close, not the milestone close.** REQUIREMENTS.md + ROADMAP.md checkbox flips should happen in the same metadata commit that advances STATE.md at each phase close — not deferred to milestone archive. Cheaper to flip 1 checkbox at phase close than 13 checkboxes at milestone close.

### Cost Observations

- Model mix: Most plan execution ran on Opus 4.7 (1M context, quality profile). Some metadata commits (state advance + ROADMAP/REQUIREMENTS checkbox flips + SUMMARY frontmatter) could have run on Sonnet/Haiku without quality regression — cost optimization opportunity for future milestones.
- Sessions: ~14 over 6 days (2026-04-22 → 2026-04-28).
- Notable: 232 commits in M1 active phase (project lifetime 342). Atomic-commit convention drove commit count up (each plan = 1–2 commits) but kept each commit reviewable; bisect would still work.

---

## Milestone: v2.0 — M2 "Roles & Moderation"

**Shipped:** 2026-05-05
**Phases:** 6 (+ Phase 4.5 inserted) | **Plans:** 47 | **Sessions:** spread across 7 days

### What Was Built

- Three-role permission system (`admin` / `moderator` / `user`) backed by **MongoDB as the role authority** + Railway-side JWKS verification using `jose` (no Firebase SDK in either repo); 5-service auth migration consolidating `x-firebase-uid` header + 5 inline auth blocks into one `verifyFirebaseToken` middleware + `Authorization: Bearer` apiClient.
- 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`); 9-field audit schema; role-aware route filters; status-pill UI; per-session + persistent rejection banners; 4-tab segmented control on RenterListingsScreen.
- `/api/moderation/*` 4-handler backend (queue + approve + reject + edit-on-behalf) all race-safe via atomic `findOneAndUpdate` with status-filter lock primitive; `ModerationLog` audit collection; reusable RejectListingModal; ModerationQueueScreen overlay; CreateListingScreen `moderatorContext` prop with warning-stripe banner; PropertyDetailsScreen mod-action footer.
- Archive lifecycle (owner self-archive + mod/admin archive with reason; restore-to-`pending` blocking post-rejection bypass via D-13 two-condition gate; admin-only hard-delete with full pre-delete audit snapshot).
- Phase 4.5 (inserted) Landlord application capability gate + admin queue + 5 endpoints + ~50 EN+RU strings.
- Admin role management UI with last-admin lockout (Promise.all preflight + post-write rollback) + self-mutation prevention + RoleChangeLog append-only audit + 17/17 supertest cases GREEN.
- 4-bug hotfix bundle (HF-01 Hospitality field persistence + HF-02 Mongo/AWS rotation + HF-03 firebaseUid mass-assignment close + HF-04 socket.io JWKS handshake).
- v2.0.0 atomic version bump + manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V (74 PASS / 3 PARTIAL / 5 DEFERRED-USER-APPROVED / 0 FAIL across 7 matrices) + dual-store submission (TestFlight Internal build 27 + Play Console Internal Testing versionCode 30).

### What Worked

- **`gsd-verifier-misses-regressions` paired-gates discipline matured.** Memory captured during M2 Phase 1 shaped the rest of the milestone — verifier alone misses regression classes; pair `/gsd-verify-work` with `/gsd-code-review` on every phase commit chain. Phase 5 ran the full paired-gates set (UAT + REVIEW + SECURITY + VALIDATION) before close-out and surfaced 4 warnings that would have shipped under verifier-only.
- **Race-condition supertest harness with `Promise.all`.** MOD-15 (mod-on-mod queue race) + ADMIN-03 (last-admin lockout race) both ship with explicit `Promise.all` two-actor concurrent-action supertest cases. Caught real race windows that single-actor sequential tests miss. Same pattern reused across Phase 3 + Phase 5.
- **D-XX two-condition gate primitives encoded as MongoDB filter clauses.** Phase 4 D-13 owner-restore filter `{_id, ownerUid, archivedByUid, status:'archived'}` enforced "owner can only restore listings they themselves archived" entirely at the query layer. No application-level if-checks. Rules become provable via grep gates.
- **Anti-spoofing grep gate carried forward.** `grep -nE "actorUid:\s*req\.(body|headers)"` returning 0 became a CI-style invariant across moderationRoutes.js + propertyRoutes.js + adminRoutes.js. Every audit-row write sources `actorUid` from JWKS-verified `req.firebaseUid`. Survived 4 phases without regression.
- **Atomic version bump in a single commit.** Phase 6 Plan 05 commit `95b13c1` flipped `package.json` + iOS pbxproj `MARKETING_VERSION` ×2 + iOS pbxproj `CURRENT_PROJECT_VERSION` ×2 + Android `build.gradle` `versionName` + Android `build.gradle` `versionCode` together. Build-identity is a single git ref. Phase 6 Plan 02's INHERITANCE-AUDIT confirmed no regressions; Plan 06's QA matrix walked APPROVED.
- **M1 D-02 lesson applied.** Phase 6 Plan 01 produced `06-STORE-HISTORY.md` deriving `next_ios_build_number=27` and `next_android_version_code=30` from `max(local, store)+1` BEFORE the atomic bump. Both stores accepted the post-bump values without rejection. M1's reactive 63f3b72 bump avoided.

### What Was Inefficient

- **REQUIREMENTS.md checkbox drift again (13 stale at close).** Same pattern as M1 — phase-close metadata commits advanced STATE.md but not REQUIREMENTS.md checkboxes. M1 retrospective Lesson 4 said "phase-close bookkeeping is owed at the phase commit, not deferred to milestone close" — not internalized in M2 cadence. Add to phase-close convention as a *grep gate*, not just guidance: `grep -c "^- \[ \] \*\*" .planning/REQUIREMENTS.md` should match the count of REQ-IDs not yet closed by phase artifacts at every plan close.
- **Phase 4.5 inserted out-of-roadmap.** UX gap surfaced at Phase 4 device QA: any authenticated user could reach `CreateListingScreen` without an explicit "I want to list properties" capability check. Insertion was cheaper than restructuring the roadmap, but it's a signal that Phase 1's role-system discovery missed a capability layer between "authenticated" and "any role". Future role-system phases should explicitly enumerate *capabilities* alongside *roles*.
- **Phase 03 artifact bookkeeping (UAT + VERIFICATION) left at `partial` / `human_needed` despite shipped behavior.** `audit-open` flagged these at milestone close. The materially-validated-but-unbumped artifact pattern keeps showing up. Make `audit-open` a phase-close gate (already runs at milestone-close — should run at phase-close too).
- **App.tsx LOC drift (1132 at Phase 2 → 1178 at Phase 3 → 1191 at Phase 4 lock).** PATTERN D signal-not-block was invoked twice. M3 should plan an explicit App.tsx remediation phase early — extract `<ModerationQueueOverlayHost>` + `useModerationQueueCount()` + `<RoleManagementOverlayHost>` + `<LandlordApplicationOverlayHost>` to drop ~50 LOC and decouple state from the god-file.
- **Android `clean bundleRelease` reanimated prefab gotcha discovered late.** Phase 6 Plan 07 hit this at archive time. Use `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead. M3 should document in `scripts/release-android.md` (carry-forward).
- **AWS IAM cross-project residual at REL-05 PARTIAL.** OLD shared cross-project IAM user retains JayTap-bucket policy access. Cannot delete (other project depends on it). Documented re-open condition. M3 should re-open when other project unblocks.

### Patterns Established

- **`Promise.all` race-condition supertest cases per atomic invariant.** Every state-mutating endpoint with a race-window concern (MOD-15 mod-queue + ADMIN-03 last-admin) ships with a paired-actor `Promise.all` test. Pattern: spawn N concurrent calls; assert exactly one 200 + N-1 409 (or appropriate envelope code). Loser-rollback via post-write `User.countDocuments` preflight + atomic delete-and-revert.
- **Two-condition gate as MongoDB query primitive.** D-13 owner-restore filter `{_id, ownerUid: req.firebaseUid, archivedByUid: req.firebaseUid, status: 'archived'}` encoded the rule "owner can only restore self-archived listings" entirely at the query layer. Application code stays thin.
- **Anti-spoofing grep gate as cross-route invariant.** `grep -nE "actorUid:\s*req\.(body|headers)"` returning 0 across all moderation/admin route files became a CI-style assertion. `actorUid` always sources from JWKS-verified `req.firebaseUid`. Survived M2 without regression.
- **Mass-assignment defensive whitelist on edit-on-behalf endpoint.** Phase 3 Plan 05 stripped 14 fields (`ownerUid`, `_id`, `id`, `createdAt`, `status`, `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `actorUid`, `firebaseUid`) from req.body BEFORE any DB write. Listed line-by-line with `delete updateData.X` + comment. Pattern: enumerate every immutable/sensitive field; trust no body field for write-through.
- **Forked modal pattern.** `<RejectListingModal>` → `<ArchiveListingModal>` → `<RoleChangeModal>` — each fork is 4 minimal edits (header docstring + identity rename + 2 t() call swaps) preserving Pitfall 7 dark-mode chip contrast verbatim. Forked components are cheaper than abstractions when divergence is shallow but call-site copy differs meaningfully.
- **Demotion-only `roleRevokedAt` bump (Pitfall 3).** Promotion forcing re-login is hostile UX. Demotion forcing re-login is required. Captured pre-implementation; supertest case enforces.
- **3-tier defense in depth for permission gates.** Client `<Gated action="X">` predicate + service-layer `canFromUser(user, 'X')` belt-and-suspenders + backend `requireMinRole('moderator')` middleware. Each layer can fail independently without compromising the next.

### Key Lessons

1. **Verifier alone misses regression classes — always pair with code-reviewer.** Phase 5 paired-gates surfaced 4 warnings that would have shipped under `/gsd-verify-work` alone. Memory `gsd-verifier-misses-regressions.md` captured. Treat verifier+reviewer as paired gates from M3 onward — never run only one.
2. **Race conditions need `Promise.all` supertest cases, not sequential.** Two-mods-on-the-same-listing (MOD-15) + two-admins-demoting-the-last-admin (ADMIN-03) both have race windows that single-actor sequential tests miss. Pattern is: spawn N concurrent actors with parallel tokens; assert correct envelope. M3 race-cell test rig (carry-forward) should encode this for two-device coverage.
3. **Encode two-condition gates as MongoDB query filters, not application-level if-checks.** D-13 owner-restore (`ownerUid AND archivedByUid AND status='archived'`) survives at the query layer. Application code stays thin; the rule is provable via collection state, not codebase audit.
4. **REQUIREMENTS.md checkbox drift will keep happening unless made a CI gate.** Both M1 and M2 closed with stale checkboxes. Carrying forward Lesson 4 from v1.0.4 retrospective wasn't enough. M3 should add a phase-close grep gate that fails the close commit if any REQ-IDs in the phase's `requirements_addressed` block aren't flipped.
5. **Insertable mid-milestone phases are valid (e.g., Phase 4.5).** When device QA surfaces a UX gap during execution, inserting a small phase out-of-roadmap is cheaper than restructuring. Convention: insertion gets a `.5` decimal; ROADMAP archive flags the insertion under the prior phase.
6. **Atomic version bump in single commit + query store history first.** M1 D-02 lesson applied cleanly in M2 Phase 6: `06-STORE-HISTORY.md` derived next-bump targets BEFORE Plan 05's atomic commit. Both stores accepted post-bump values without rejection. Default for all future milestones.
7. **Inserted phases need their own SUMMARY archive.** Phase 4.5 doesn't have a `.planning/phases/04.5-*` directory — its work landed via `LandlordApplication*` files in the codebase but not a dedicated phase dir. Documented in v2.0-ROADMAP.md archive but harder to retrieve granularly. M3: insertions should always create the dir, even if just a CONTEXT.md + SUMMARY.md.

### Cost Observations

- Model mix: Most execution on Opus 4.7. Synthesizer model (sonnet) for research synthesis; roadmapper model (opus) for the initial M2 roadmap draft.
- Sessions: spread across 7 days (2026-04-29 → 2026-05-05).
- Notable: 203 commits in M2 active phase (project lifetime now 545+). +359 net commits over M1's pace despite same-length timeline (M1 was 6 days × ~38 commits/day; M2 was 7 days × ~29 commits/day). M2's deeper backend work + Phase 4.5 insertion absorbed time M1 would have spent on iteration breadth.
- Backend test suite growth: 0 → 106 across 6 suites — Phase 1's TDD scaffolds compounded across phases.

---

## Milestone: v3.0 — M3 "Contextual Forms"

**Shipped:** 2026-05-11
**Phases:** 5 | **Plans:** 34 | **Sessions:** ~spread across 6 days

### What Was Built

- 6-step `<ContextualListingFlow>` replacing M1's single-screen `CreateListingScreen.tsx` atomically; per-step `validateStep()` single-source-of-truth; conditional sub-fields per property type (rooms / bathroom / kitchen / hotelClass); exact-address toggle hidden for hotel/hostel; deal-type-matrix Step 6 (Sale → bargain + optional deposit; Long-term rent → bargain + optional deposit + prepaymentMonths + minTerm; Daily rent → optional deposit only).
- Nested Mongoose `Property` schema (`location.*` / `basics.*` / `conditionAndAmenities.*` / `content.*` / `terms.*` / `media.*`) via operator-supervised one-shot `migrate-listings-m3.js` (--dry-run + --verify=PASS + idempotent). Status enum + 11 audit fields preserved at top level. M1 GATE-05 D-22 risk row stays closed.
- Backend Location dictionary (City + District models) seeded with 11 KG/KZ/UZ cities + 19 Bishkek districts forward-fit for KG+KZ+UZ market expansion.
- Inverted media flow: users submit metadata only; admin/mod uploads photos / videos / 3D-tour URL via new `MediaCurationScreen` overlay (959 LOC, 0 hex literals). Backend `MEDIA_REQUIRED` 400 gate at `/approve` + edit-on-behalf flip; multer stripped from user-side `propertyRoutes.js` (API-surface removal closes the user→S3 PutObject path per memory `aws-iam-jaytap-prod-s3.md`); ModerationLog `'media-upload'` audit; queue-side `needs-media` filter chip row + W2 conditional row-tap.
- Atomic deletion of `CreateListingScreen.tsx` + `CreateListingForm/` barrel — 13 files / 3449 LOC removed in 3 atomic commits. Admin doc-verification surface preserved as standalone `AdminVerificationScreen.tsx` (zero CreateListingForm dependency). Sentinel `scripts/check-create-listing-screen-removed.sh` exits 0 to prevent regression.
- M2 carry-forward bug fixes (Phase 4): CARRY-01 ROLE-11 frontend mid-action 403 popup-recovery via shared `useModActionGuard` hook + `is403PermissionError(err)` matcher + 11 mod-action handlers wired through `resetLoading + closeModal + refreshRole`; bespoke `Alert.alert + onBack` patterns dropped from RoleManagementScreen. CARRY-02 Phase 4.5 landlord-application uid-mismatch — JWKS-verified-uid route fix + anti-spoofing sentinel chained into npm test (3rd consecutive milestone with this pattern) + 3 D-08 supertest cases + idempotent repair migration (258 LOC) + 10-case Envelope-B test + LandlordApplication.status += 'orphaned' enum.
- Atomic v3.0.0 version bump (commit `531e279`); manual physical-device QA matrix APPROVED-WITH-MASS-DISPOSITION via Path B on iPhone 15 Pro Max + Moto G XT2513V; bilingual EN+RU release notes (EN 489 / RU 492 chars under Play Console 500-char limit); dual-store submission to ASC TestFlight Internal (build 29 / iOS 3.0.0) + Play Console Internal Testing (versionCode 32 / Android 3.0.1).

### What Worked

- **Mass-disposition via logical-equivalence (Plan 05-05 Path B).** Walking ~75 QA-matrix cells one-by-one on physical devices is timing-prohibitive; the empirical-sampling-mass-disposition pattern walked 2 anchor cells + dispositioned 67 via logical-equivalence + 4 DEFERRED-USER-APPROVED with M2 precedent. FAIL=0 PARTIAL=0. Plan 05-06 paired-gate inherited the PARTIAL signal but byte-for-byte 7/7 inheritance audit (vs v2.0.0 baseline `95b13c1` package.json) turned PARTIAL into a clean ship. Pattern is reusable when the milestone is a focused feature surface over a stable baseline.
- **Atomic deletion with sentinel scripts.** Plan 02-09 deleted 13 files / 3449 LOC in 3 atomic commits, with `scripts/check-create-listing-screen-removed.sh` exiting 0 to prevent regression. Admin doc-verification surface preserved by extraction into `AdminVerificationScreen.tsx` *before* the deletion lands. Pattern: when replacing a large surface, extract any preserved sub-functionality first, then delete the old surface in an atomic commit with a sentinel that fails CI if the old file resurrects.
- **Sentinel chain growth: 1 → 2 → 3 → 4 → 5.** M2 established `actoruid` anti-spoofing as the first sentinel chained into `npm test`. M3 Phase 3 added `media-stripped`. M3 Phase 4 added `landlord-uid-spoofing` (CARRY-02). M3 Phase 2 added `create-listing-screen-removed`. M3 Phase 3 + 2 also rely on `i18n-parity`. The chain runs on every backend `npm test` invocation — pre-existing invariants survive without manual re-verification.
- **`useModActionGuard` hook + 11 handler wires solved CARRY-01 cleanly.** Sharing a hook across 4 ModerationQueueScreen + 5 PropertyDetailsScreen + 2 RoleManagementScreen handlers (incl. runSearch refactor) avoided per-screen duplication of the 403 → reset+close+refresh flow. The `is403PermissionError(err)` matcher is now reusable for any future role-revocation race in mod-action surfaces.
- **Bookkeeping discipline matured (RETROSPECTIVE.md M1 key lesson 4 applied).** M3 closed with all 38 v1 requirements strictly `[x]` — zero stale `[~]` or `[ ]` drift. M1 had 13 stale checkboxes at close; M2 had 13 stale; M3 had 0. The discipline of flipping REQ checkboxes at every plan close (not deferring to milestone archive) compounded across phases.
- **Backend test suite growth: 106 → 273 across the milestone.** Phase 3's media endpoints + race-safe `$push`/`$pull` + MEDIA_REQUIRED gate + Phase 4's CARRY-02 supertest + 10-case repair-migration Envelope-B test compounded cleanly on M2's foundation. 273/273 pass at close with all 5 sentinels green.

### What Was Inefficient

- **M1 D-02 pattern fires again at Plan 05-07.** Play Console rejected Android versionCode 31 (M2 had bumped to 30; M3's `05-STORE-HISTORY.md` derived 31 from local-ahead-by-1; Play Console history not re-queried at submission time). Reactive bump to versionCode 32 + versionName 3.0.0 → 3.0.1 caused the Android marketing version to drift from iOS's 3.0.0. Memory `release-android-versioncode-trust-play-console.md` now captures the pattern firing TWICE (M1 + M3). M4 must encode: pre-archive Wave-0 queries Play Console + TestFlight for highest-accepted version-code per track, AND re-queries at submission time before upload.
- **ROADMAP.md Phase 4 progress table stale by 1 day at archive time.** Phase 4 closed 2026-05-07 with all 5 plan SUMMARY files written, but the ROADMAP per-phase progress table line still said "0/5 Not started" until `/gsd-complete-milestone` close-out. The phase row in the M3 phase listing was `[ ]` despite all plans complete. Surfaced during this very close (initial pre-flight read said "Phase 4 never executed"). The plan-close metadata commits flipped SUMMARY frontmatter + REQUIREMENTS.md but missed ROADMAP.md per-phase progress table — same drift category as M1+M2's REQUIREMENTS.md bookkeeping debt. M4 should extend the phase-close grep gate to also check ROADMAP.md per-phase progress table row.
- **24 deferred device walks absorbed by Plan 05-05 mass-disposition.** Phases 1 + 2 + 3 + 4 collectively deferred 24 device walks to Phase 5 REL-03 per D-06. Plan 05-05 absorbed all 24 via Path B logical-equivalence. The mass-disposition was warranted (the underlying invariants are encoded in code-level tests + sentinels + i18n parity), but the pattern relies on confident logical-equivalence judgments. M4 should evaluate whether to: (a) walk fewer cells per phase but actually walk them, or (b) keep deferring and lean on the mass-disposition pattern — and capture the criteria explicitly in CONTEXT.md.

### Patterns Established

- **API-surface removal as IAM rotation (D-14 reinterpretation per memory `aws-iam-jaytap-prod-s3.md`).** When a user-facing API surface that maps HTTP → S3 PutObject is deleted (multer stripped from `propertyRoutes.js`), the IAM key it was using doesn't need rotating — the surface itself is gone. Reserve literal HF-02-style IAM rotation for actual key-leak evidence. Plan 03-04 closed MEDIA-05 this way; sentinel `check-property-routes-media-stripped.sh` enforces.
- **Empirical-sampling-mass-disposition for QA matrices.** When walking ~75 cells one-by-one is timing-prohibitive AND the underlying invariants are encoded in code-level tests + sentinels + i18n parity, walk 2 anchor cells + disposition the rest via logical-equivalence. Plan 05-06 inheritance audit + 7/7 byte-for-byte (vs prior milestone baseline package.json) turns PARTIAL into a clean ship verdict.
- **Atomic version bump in single commit + reactive-bump tolerance for store rejections.** Atomic 3-file bump (package.json + iOS pbxproj ×2 + Android build.gradle) lands as one commit (`531e279`). When Play Console rejects the Android versionCode, the reactive bump commit is documented in `05-SUBMISSION-LOG.md` + ROADMAP "reactive build-identity drift" line. iOS + Android marketing-version drift is acceptable when caused by store rejection (3.0.0 / 3.0.1 in M3).
- **Closing decimal phases without a directory (Phase 4.5 lesson from M2 absorbed).** M3 did NOT use a `.5` phase; M2's lesson 7 (inserted phases need their own dir + SUMMARY) carried forward as a design constraint — no M3 phase was inserted mid-milestone.

### Key Lessons

1. **Query store history twice — pre-archive AND at submission time.** M1 D-02 lesson applied at pre-archive Wave-0 (Plan 05-02 derived next_android_version_code=31 from store-history); but Play Console state at *submission* time differed (had accepted versionCode 31 from some intervening source not visible at Wave-0 capture). M4 must re-query Play Console + TestFlight immediately before `gh release upload` / `xcrun altool` to catch race conditions on the store side.
2. **Bookkeeping at phase-close > bookkeeping at milestone-close.** M1 closed with 13 stale checkboxes; M2 closed with 13 stale; M3 closed with 0. Flipping REQ-IDs + ROADMAP per-phase progress + STATE.md in the same metadata commit that lands the phase-close is cheaper than reconciling at milestone archive. M4 should add a phase-close grep gate that fails the commit if any of the phase's `requirements_addressed` REQ-IDs are still `[ ]` in REQUIREMENTS.md.
3. **Atomic deletion + sentinel = safe large surface removal.** Plan 02-09's 13-file / 3449-LOC atomic deletion (with sentinel `check-create-listing-screen-removed.sh`) survived the rest of the milestone without regression. Reusable when M4 surfaces another large-surface deprecation.
4. **Empirical-sampling-mass-disposition is valid for code-anchored invariants.** When invariants are encoded in code-level tests + sentinels + i18n parity, walking 2 cells + dispositioning the rest via logical-equivalence is defensible. Plan 05-06's 7/7 byte-for-byte inheritance vs v2.0.0 package.json baseline was the key signal. Don't reach for this pattern when the prior baseline doesn't exist or has drifted.
5. **Plan-04 splits during planning (02-04 → 02-04a + 02-04b) are valid.** When a single plan grows beyond comfort, splitting at planning time (before any code lands) is cheaper than mid-execution surgery. Final plan count = 10 in Phase 2 even though numbering goes 01..09. Documented in ROADMAP "10 plan files".

### Cost Observations

- Model mix: Most execution on Opus 4.7 (1M context, quality profile). Synthesizer + roadmapper on Opus.
- Sessions: ~spread across 6 days (2026-05-05 → 2026-05-11). Day distribution: Day 1 (05-05) roadmap + Phase 1 start; Day 2 (05-06) Phase 1 + 2 + 3 close (heavy day); Day 3 (05-07) Phase 4 close; Days 4-5 (05-08..05-09) Phase 5 pre-flight + bump + release-notes + QA prep; Day 6 (05-10/11) Phase 5 QA + paired-gate + submission.
- Notable: 134 commits in M3 active phase (project lifetime now 679+). M3 cadence ~22 commits/day vs M2's ~29 and M1's ~38 — slower-per-day pace despite shipping in fewer days, reflecting fewer-but-larger atomic commits (Plan 02-09's 3449-LOC deletion landed in 3 commits; Plan 05-03's 5-edit atomic bump in 1). LOC delta: +5,082 net TS/TSX (22,800 → 27,882) — largest single-milestone surface addition + replacement to date.
- Backend test suite growth: 106 → 273 across 6 suites — Phase 3's media + race-safe + MEDIA_REQUIRED + Phase 4's CARRY-02 supertest + 10-case repair-migration test compounded cleanly on M2's foundation.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0.4 | ~14 | 8 (7 executed + 1 SKIPPED) | First full GSD milestone for JayTap. Established wave-based execution + atomic-commit convention + physical-device QA matrices + descope-by-CONTEXT.md pattern. |
| v2.0 | spread over 7 days | 6 (+ Phase 4.5 inserted) | Cross-cutting backend + frontend milestone. Established paired-gates discipline (`/gsd-verify-work` + `/gsd-code-review` always together) + `Promise.all` race supertests + two-condition MongoDB gate primitives + anti-spoofing grep gate + 3-tier defense in depth + atomic version bump with store-history-derived build numbers. |
| v3.0 | spread over 6 days | 5 | Focused feature-surface milestone replacing CreateListingScreen with 6-step contextual flow + nested Mongoose schema + media-flow inversion. Established empirical-sampling-mass-disposition for QA matrices + atomic-deletion-with-sentinel pattern + sentinel-chain growth (5 sentinels chained into npm test) + API-surface removal as IAM rotation (D-14 reinterpretation). Phase-close bookkeeping discipline matured (0 stale checkboxes at close, vs 13 at M1+M2). |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0.4 | 22 jest assertions across 5 suites (15 useRole + 7 propertyCategory) | Manual QA on physical devices is the bar (CLAUDE.md M1 testing bar) | 3 (reanimated@4.3.0 + worklets@0.8.1 + keyboard-controller@1.21.6 — all peer-related to the keyboard library install gate) |
| v2.0 | Backend 0→106 across 6 suites; client ~17 jest suites | Backend supertest harness with `Promise.all` race coverage + manual physical-device QA matrix on iPhone 15 Pro Max + Moto G XT2513V | 1 backend (`jose@6` for JWKS verification — ESM-only, requires Node ≥22.12) |
| v3.0 | Backend 106→273 across 7 suites; client ~94/94 ContextualListingFlow + 9 RTL Phase-3 screen tests + 10/10 useModActionGuard unit + 2/2 PropertyDetailsScreen-mod-403 RTL | Same physical-device QA matrix; empirical-sampling-mass-disposition pattern absorbed 24 deferred device walks via logical-equivalence + 7/7 byte-for-byte inheritance audit | 0 new backend deps; 0 new client deps (D-14 reinterpretation: API-surface removal NOT IAM rotation; `react-native-maps` already in M2 baseline) |

### Top Lessons (Verified Across Multiple Milestones)

1. **M1 D-02 pattern: trust the live store state, not local source files.** Fired twice now (M1 versionCode 25→28; M3 versionCode 31→32 + versionName 3.0.0→3.0.1 + iOS build 28→29). Memory `release-android-versioncode-trust-play-console.md` captures both. M4: pre-archive Wave-0 query AND re-query at submission time.
2. **Descope-by-inheritance is the right default for update submissions.** M1 D-13 (privacy manifest + ASC + Play Data Safety + entitlements inheritance) reused in M3 Plan 05-06 audit (7/7 INHERITED via byte-for-byte identical package.json vs v2.0.0 baseline `95b13c1`). Both stores accepted both update submissions without re-touching live declarations.
3. **Phase-close bookkeeping is owed at the phase commit, not deferred to milestone close.** M1 closed with 13 stale checkboxes; M2 closed with 13 stale; M3 closed with 0. Discipline compounded across milestones. M4: extend the phase-close grep gate to also check ROADMAP.md per-phase progress table row (M3 caught this drift at archive time, 1 day stale on Phase 4).
4. **Paired-gates discipline (verifier + code-reviewer) > verifier alone.** M2 lesson 1 carried into M3 — Plan 05-06 ran paired-gates and turned PARTIAL verifier verdict into clean YELLOW ship via reviewer GREEN + 7/7 inheritance signal. Never run only one.
5. **Race-conditions need `Promise.all` supertest cases, not sequential.** M2 lesson 2 applied verbatim across M3 Phase 3 (race-safe `$push`/`$pull` on `/api/moderation/listings/:id/media`). Race-cell test rig for device-level coverage remains M4 carry-forward (third consecutive milestone deferring).
6. **Sentinel-chain growth is cheap-and-cumulative.** M2 established `actoruid` anti-spoofing. M3 added `media-stripped` + `landlord-uid-spoofing` + `create-listing-screen-removed` + (existing) `i18n-parity`. Chain runs on every backend `npm test`; pre-existing invariants survive without manual re-verification.

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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0.4 | ~14 | 8 (7 executed + 1 SKIPPED) | First full GSD milestone for JayTap. Established wave-based execution + atomic-commit convention + physical-device QA matrices + descope-by-CONTEXT.md pattern. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0.4 | 22 jest assertions across 5 suites (15 useRole + 7 propertyCategory) | Manual QA on physical devices is the bar (CLAUDE.md M1 testing bar) | 3 (reanimated@4.3.0 + worklets@0.8.1 + keyboard-controller@1.21.6 — all peer-related to the keyboard library install gate) |

### Top Lessons (Verified Across Milestones)

*Verification across multiple milestones pending — first milestone observations only:*

1. **Trust the live store state, not local source files** (lesson 1 above).
2. **Descope-by-inheritance is the right default for update submissions** (lesson 2 above).
3. **Phase-close bookkeeping is owed at the phase commit, not deferred to milestone close** (lesson 4 above).

---
phase: 01
slug: nav-reliability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 01 — Validation Strategy

> Per-phase validation contract. **This phase uses manual physical-device QA as its only evidence source** (per CONTEXT D-03; see `01-RESEARCH.md` §8 "Validation Architecture"). No automated test framework is installed — the reproduction matrix IS the test spec.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual physical-device QA (NOT Jest, NOT Detox, NOT automated) |
| **Config file** | `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` (the matrix is the spec) |
| **Quick run command** | Human executes canonical trap sequence (RESEARCH §2.1) from S6 → T5 Profile on both platforms |
| **Full suite command** | Human executes all 45 cells × 2 platforms = 90 transitions (RESEARCH §3) |
| **Estimated runtime** | ~5 min (quick) / ~2 hours (full) |

> **Why no automated tests:** CONTEXT D-03 forbids simulator/automated evidence. PITFALLS §3 documents that touch-capture bugs only reproduce on real hardware. Codebase has effectively zero test coverage and no Detox setup — adding a test framework is out of scope for this polish bug-fix phase (see RESEARCH §8 for full rationale).

---

## Sampling Rate

- **After every task commit** (during instrumentation waves 0/2/3): Re-run canonical trap sequence RESEARCH §2.1 on one platform; human verifies diagnostic logs appear as designed (<5 min).
- **After every plan wave merge**: Re-run the 6 high-risk transitions HR-1…HR-6 (RESEARCH §3.5) on iOS + Android (~20 min).
- **Before `/gsd-verify-work` (phase gate)**: Full 45×2 matrix + video evidence per RESEARCH §3.7 (~2 hours).
- **Max feedback latency**: 5 minutes for per-task loop; 2 hours at phase gate.

---

## Per-Task Verification Map

> Planner populates full rows per task. The template rows below show the three requirements the phase MUST cover and the test type each maps to. Planner expands each into per-task rows matching the wave/plan breakdown.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-{plan}-{task} | {nn} | {w} | NAV-01 | — | Bottom nav responds to every tab tap from every main-stack screen on both physical iOS and physical Android | manual-device-qa | `open .planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` (human runs 45-cell matrix; records PASS/FAIL per cell) | ❌ Wave 0 creates skeleton | ⬜ pending |
| 01-{plan}-{task} | {nn} | {w} | NAV-02 | — | Returning from any overlay (PropertyDetails / CreateListing / RenterListings / Tour3D) re-enables main stack touch responders — no "taps go nowhere" state is reachable | manual-device-qa | Human runs HR-1…HR-5 (RESEARCH §3.5) with screen-recorded video, saves to `.planning/phases/01-nav-reliability/videos/` | ❌ Wave 0 creates skeleton | ⬜ pending |
| 01-{plan}-{task} | {nn} | {w} | NAV-03 | — | Reproduction matrix recorded in git BEFORE the fix lands (so regressions are detectable later) | artifact-check | `git log --oneline -- .planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` shows a "Baseline (pre-fix)" commit that predates any `App.tsx` touch-handling edit | ❌ Wave 0 creates skeleton, Wave 0.5 commits baseline | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 creates validation infrastructure BEFORE any `App.tsx` changes land (required for NAV-03's "before the fix" constraint):

- [ ] `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` — skeleton per RESEARCH §3.9 with "Baseline (pre-fix)" / "Post-Wave-1 (pointerEvents + OVERLAY_FLAGS)" / "Post-Wave-N (escalation)" sections and the 9 starting states × 5 target tabs × 2 platforms = 90 cells stubbed
- [ ] `.planning/phases/01-nav-reliability/videos/` directory — created, `.gitkeep` added if empty
- [ ] Agreement on test devices: specific iOS device + iOS version, specific Android device + Android version — recorded at top of `01-REPRO-MATRIX.md` (see RESEARCH §10 Q1; release-blocking if either platform is unavailable)
- [ ] Baseline matrix run on pre-change HEAD commit — recorded in "Baseline (pre-fix)" section
- [ ] Baseline matrix committed to git — this IS NAV-03's satisfying artifact
- [ ] Verify at least one Railway test listing has ≥1 tour (Matterport URL) so S9 / HR-4 / HR-5 cells are runnable (RESEARCH §10 Q3); seed if absent

**No framework install command.** The validation framework is "the human runs the matrix and writes the results."

---

## Manual-Only Verifications

All Phase 1 verifications are manual. This is the complete list:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom-nav responsiveness across all 45 state×tab transitions | NAV-01 | Physical-device mandate (D-03); PITFALLS §3 — touch-capture bugs do not reproduce on simulator | Follow `01-REPRO-MATRIX.md` §Baseline and §Post-Wave-N sections: for each cell, execute the transition sequence on-device and record PASS/FAIL |
| Overlay return releases touch capture | NAV-02 | Same as NAV-01; plus requires visual confirmation the next tap is received | For each of HR-1…HR-5 (RESEARCH §3.5): open overlay, return via close button AND hardware back (Android), tap bottom-nav; record screen video; save to `videos/` |
| Pre-fix baseline exists in git | NAV-03 | Git artifact check; human must coordinate commit order (baseline commit BEFORE any App.tsx touch-handling edit) | Planner's Wave 0.5 task commits the filled baseline matrix before Wave 1 opens any PR touching `App.tsx:337-525` |
| Android hardware back regression (if C2 refactor lands) | Phase 1 SC5 | BackHandler behavior requires pressing the physical back button — no simulator equivalent reliable under Fabric | Follow RESEARCH §5.2 12-point Android back-press regression checklist on Android device; record result next to each checklist item |
| Diagnostic-log cleanup | CONTEXT D-02 | Grep-verifiable but runs on developer machine, not CI | `grep -n "\[NAV\]\|\[BACK\]\|\[C3\]\|\[C4\]" App.tsx src/components/BottomNavigator.tsx` must return zero matches before phase gate |

---

## Validation Sign-Off

- [ ] All tasks have a `manual-device-qa` or `artifact-check` verification instruction (no automated `<verify>` blocks — this phase has no test suite)
- [ ] Sampling continuity: every code-touching wave has a re-run of canonical trap sequence (§2.1) and HR-1…HR-6 (§3.5) before merge
- [ ] Wave 0 creates `01-REPRO-MATRIX.md` + `videos/` and records baseline BEFORE any `App.tsx` touch-handling edit (NAV-03 precondition)
- [ ] No watch-mode / simulator-only passes accepted as evidence
- [ ] Feedback latency < 5 min for per-task re-runs; < 2 hours for phase-gate full-matrix run
- [ ] At phase gate: `01-REPRO-MATRIX.md` Post-Wave-N section has all 90 cells PASS, zero FAIL, zero FLAKY
- [ ] At phase gate: `videos/` contains ≥ 12 videos (6 HR × 2 platforms) for post-fix sign-off
- [ ] `nyquist_compliant: true` set in frontmatter when all of the above are satisfied

**Approval:** pending

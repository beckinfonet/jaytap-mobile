# Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `05-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 05-hardening-manual-qa-release-v3
**Areas discussed:** Pre-flight prereqs ownership, QA matrix structure
**Areas presented but not selected:** Phase 4 review carry-forwards, Release notes emphasis (both → Claude's Discretion in 05-CONTEXT.md)

---

## Pre-flight prereqs ownership

### Q1 — Where should the pre-flight runbook live?

| Option | Description | Selected |
|--------|-------------|----------|
| Plan 05-01 (Recommended) | Phase 5 owns it as Plan 05-01 = tracker plan with operator-execute steps + per-step verify gates. Companion 05-PREFLIGHT.md doc captures the runbook (analog to M2 Phase 6's 06-BACKEND-DEPLOY.md). | ✓ |
| Pre-phase wave outside plans | Operator executes 8 steps offline using existing Phase 1 + Plan 02-01 HUMAN-UAT.md as the runbook BEFORE invoking Phase 5 plans. Phase 5 starts at version-bump assuming green prod. | |
| Re-execute deferred HUMAN-UAT.md per phase | Walk each phase's existing HUMAN-UAT.md sequentially (01-HUMAN-UAT → 02-HUMAN-UAT → 04-HUMAN-UAT) and roll status into Phase 5. No new Plan 05-01. | |

**User's choice:** Plan 05-01 (Recommended)
**Notes:** Phase boundary contains the whole release; mid-flight failure is logged in plan deviation_protocol.

### Q2 — If Atlas migration fails mid-flight, what's the rollback posture?

| Option | Description | Selected |
|--------|-------------|----------|
| Triage in-place (Recommended) | Atlas snapshot is safe; backend deploy hasn't happened yet. Stop pre-flight, triage, fix, retry. M2 build remains live for testers. | |
| Full rollback to M2 + hotfix branch | Revert Phase 1 backend cutover commits + restore Atlas snapshot + cut v2.0.x hotfix to keep testers stable. Phase 5 pauses. | |
| Decide at the moment | Don't lock posture upfront. Operator judges based on what breaks. Phase 5 deviation_protocol captures the call live. | ✓ |

**User's choice:** Decide at the moment
**Notes:** No upfront commitment to either posture. D-03 in 05-CONTEXT.md keeps both paths viable.

### Q3 — When should pre-cutover tester comms go out?

| Option | Description | Selected |
|--------|-------------|----------|
| Before pre-flight starts (Recommended) | Send comms BEFORE step 1 (Atlas snapshot). Testers know the window. | ✓ |
| After backend deploy lands healthy | Send comms only when backend is green and new build is in TestFlight/Play. | |
| Both — heads-up + go-live | Two messages: pre-flight heads-up + post-deploy 'new build available'. | |

**User's choice:** Before pre-flight starts (Recommended)
**Notes:** Pitfall 7 mitigation — testers won't file bugs against the broken-by-design M2 cutover state during deploy window.

### Q4 — When does migrate-landlord-app-uid-mismatch.js run?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-flight after Atlas migration (Recommended) | Independent of schema migration but same operator-supervised pattern. Run after migrate-listings-m3.js verify=PASS but before backend deploy — same Atlas snapshot covers both. | ✓ |
| Post-deploy, before device walks | Run after backend redeploy is healthy. | |
| Never — supertest is enough | Skip the migration; only run if Phase 5 REL-03 device walk uncovers existing mismatched rows. | |

**User's choice:** Pre-flight after Atlas migration (Recommended)
**Notes:** Same Atlas snapshot covers both migrations. CARRY-02 SC#3 device walk validates post-deploy.

---

## QA matrix structure

### Q1 — Single source of truth or roll-up?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical 05-QA-MATRIX.md (Recommended) | One doc supersedes the 4 prior HUMAN-UAT.md files. Matches M2 Phase 6's pattern. Prior HUMAN-UAT.md files get a header note 'rolled into 05-QA-MATRIX.md' and stop being updated. | ✓ |
| Roll-up + per-phase HUMAN-UAT.md as detail | 05-QA-MATRIX.md holds the summary table; each row links to the relevant phase's HUMAN-UAT.md. Updates land in both. | |
| Canonical 05-QA-MATRIX.md + new fresh REL-03 cells only | 05-QA-MATRIX.md only holds the 15-cell happy path + parity walks fresh from REL-03. Prior phase HUMAN-UAT.md files stay sovereign. | |

**User's choice:** Canonical 05-QA-MATRIX.md (Recommended)
**Notes:** Single doc to scan; status visible at a glance. Prior HUMAN-UAT.md files get rolled-into header note and stop accepting updates.

### Q2 — Phase 2's 12 deferred walks heavily overlap with REL-03's 15-cell happy path matrix. How to handle the overlap?

| Option | Description | Selected |
|--------|-------------|----------|
| Walk once, count for both (Recommended) | Phase 2 deferred walks ARE the REL-03 happy-path cells — walk once, mark both green from the same evidence. 05-QA-MATRIX.md tags cells with satisfies. | ✓ |
| Walk separately | Treat Phase 2 deferred walks as their own pass, then walk the fresh REL-03 15-cell matrix. ~24+ walks. | |
| Subset — sample Phase 2, walk full REL-03 | Pick 2-3 representative Phase 2 deferred walks; walk the full 15-cell REL-03 fresh. | |

**User's choice:** Walk once, count for both (Recommended)
**Notes:** Cell tagging convention `satisfies: Phase 2 W{N} + REL-03 cell {dealType}+{propertyType}` makes dual-coverage auditable.

### Q3 — Cell granularity — what counts as one cell?

| Option | Description | Selected |
|--------|-------------|----------|
| One walk = one device + one combination (Recommended) | Each cell = one device × one (deal_type, property_type, mode) tuple. 6-step flow walked end-to-end as a single PASS/FAIL. Matches M2 Phase 6 pattern. | ✓ |
| Per-step cell (6 sub-cells per walk) | Each cell = one device × one combination × one of 6 steps. 90+ cells per device for happy path alone. | |
| Bucketed (category-level + ancillary) | Cells bucket by category (Residential, Commercial, Hospitality × deal type). ~9 happy-path cells × 2 devices. | |

**User's choice:** One walk = one device + one combination (Recommended)
**Notes:** Estimated ~60 cells total (vs M2 Phase 6's 86). Sub-step issues captured in cell comments.

### Q4 — Verdict taxonomy for cells?

| Option | Description | Selected |
|--------|-------------|----------|
| M2 Phase 6 pattern (Recommended) | PASS / PARTIAL / DEFERRED-USER-APPROVED / FAIL. PARTIAL = walked but issue noted (still ships). | ✓ |
| Three-state simpler | PASS / FAIL / DEFERRED. No PARTIAL distinction. | |
| Five-state with ROADMAP traceability | Add PRE-EXISTING (issue from M1/M2 baseline, not regression). | |

**User's choice:** M2 Phase 6 pattern (Recommended)
**Notes:** Known gradient (74/3/5/0 distribution from M2 Phase 6). Race cells stay DEFERRED-USER-APPROVED per precedent.

---

## Areas presented but not opened

### Phase 4 review carry-forwards
**Disposition:** Claude's Discretion in 05-CONTEXT.md.
**Recommended folding:** MEDIUM-01 (verify=PASS UX papercut on uid-repair script — touched by Plan 05-01 anyway), MEDIUM-02 (5 other CastError handlers — surfaces QA matrix walks). Punt LOW-01 + LOW-02 to M4.

### Release notes emphasis
**Disposition:** Claude's Discretion in 05-CONTEXT.md.
**Default position:** Lead with new features (6-step contextual flow + KG/KZ/UZ city dictionary as expansion enabler hint). M1 D-10 content order honored. Both bodies ≤500 chars EN+RU lockstep.

---

## Claude's Discretion (formalized in 05-CONTEXT.md)

- Plan structure: M2 Phase 6 7-plan precedent unless researcher finds divergence.
- Phase 4 review polish handling: fold MEDIUM-01/02; punt LOW-01/02.
- Release notes emphasis: features-first, geographic-scope-aware copy.
- INHERITANCE-AUDIT.md format: M2 Phase 6 pattern (7/7 INHERITED expected).
- Sentinel re-run gating: trust npm test chain or add explicit Plan 05-N gate (planner discretion).
- Android `scripts/release-android.md` reanimated workaround doc: fold into Plan 05-N if file exists/needs creating.

## Deferred Ideas (formalized in 05-CONTEXT.md `<deferred>`)

- Race-cell test rig — M4+
- `scripts/release-android.md` reanimated workaround — optional Phase 5 fold-in or M4
- AWS IAM cross-project residual — re-open conditionally
- 2GIS native bridge — M4+
- KZT/UZS currency — M4+
- KK/UZ localization — M4+
- Phase 4 review LOW-01 (sentinel false-positive) + LOW-02 (load-path bespoke catch) — M4+
- Push notifications, bulk mod actions, AI moderation, document verification — M4+

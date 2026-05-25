# Phase 6: Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va
**Areas discussed:** Property-type list confusion, Deploy style (cautious vs. quick), Bathroom rejection: friendly or strict, How much to lock vs. let the planner decide

---

## Initial gray-area selection

First round was rephrased after user feedback that the original wording was too jargon-heavy ("simplify without using terms and references to file names"). Memory `feedback-conversational-tone.md` invoked — second-round options used plain language.

| Option | Description | Selected |
|--------|-------------|----------|
| Property-type list confusion | Requirements doc mentions 'land' (dead 7th type) and uses `basics.propertyType` wording that doesn't match the actual schema (`propertyType` is top-level). | ✓ |
| Deploy style (cautious vs. quick) | M3 used careful operator-supervised deploy with snapshot + dry-run. Phase 6 only ADDS optional fields — nothing existing changes. | ✓ |
| Bathroom rejection: friendly or strict | Reject `1.3` etc. via generic Mongoose ValidationError OR custom 400 with a clear error code the frontend can show a nice message for. | ✓ |
| How much to lock vs. let the planner decide | Lock the test surface / strip-helper location / error codes / silent-strip behavior now, OR keep loose like M3 Phase 1 did. | ✓ |

**User's choice:** All four areas selected.

---

## Property-type list confusion

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, treat as typos | Lock strip rule to top-level `propertyType ∈ {hotel, hostel, office, commercial}`. Fix the requirements doc wording as part of Phase 6. | ✓ |
| Wait — 'land' should be re-added | Land is something we want back. Would need to think about Phase 6 scope (likely deferred). | |
| Something else | Different read on this. | |

**User's choice:** Yes, treat as typos.
**Notes:** Locked D-01 (top-level `propertyType`, not `basics.propertyType`) and D-02 (6-type set, no `land`). REQUIREMENTS.md SCHEMA-01 + SCHEMA-04 wording will be edited inline as part of Phase 6 (planner decides standalone-commit vs folded-with-schema-commit per Claude's Discretion).

---

## Deploy style (cautious vs. quick)

| Option | Description | Selected |
|--------|-------------|----------|
| Plain push + quick smoke (Recommended) | `git push` → Railway auto-deploys. Hit GET /api/properties to confirm existing listings still load. No DB snapshot, no operator runbook. | ✓ |
| Operator-supervised (M3 pattern) | Same careful pattern as M3 Phase 1: snapshot first, supervised deploy, smoke-test loop. | |
| Something in between | Skip snapshot but keep retry-loop smoke check, or feature-flag toggle, etc. | |

**User's choice:** Plain push + quick smoke.
**Notes:** Locked D-05. Additive change with zero migration risk justifies skipping the M3 operator-supervised pattern. Post-deploy smoke is two `curl` commands + one POST happy-path round-trip.

---

## Bathroom rejection: friendly or strict

| Option | Description | Selected |
|--------|-------------|----------|
| Both (Recommended) | Route-layer 400 with `M4_BATHROOM_STEP_INVALID` code (frontend-friendly) PLUS Mongoose schema-level validator (catches anything bypassing the route). Mirrors M3 `tourUrl` https-only pattern. | ✓ |
| Mongoose only | Schema-level only. Simpler but raw ValidationError text. | |
| Route-layer only | Explicit 400 + error code. Frontend-friendly but direct DB writes could insert invalid data. | |

**User's choice:** Both (defense in depth).
**Notes:** Locked D-06. Same posture extends to `basics.bedrooms` integer validation — both Mongoose `validate` + route-layer `M4_BEDROOMS_INVALID` 400. Float-precision: `Number.isInteger(v * 2)` is safe for `[0, 10]` step 0.5 (JS doubles represent these exactly).

---

## How much to lock vs. let the planner decide

| Option | Description | Selected |
|--------|-------------|----------|
| Lock all four (Recommended) | Helper file (`src/utils/stripResidentialOnlyFields.js`), `M4_BATHROOM_STEP_INVALID` error code, minimum 5 tests (2 schema + 3 route body-strip), silent strip. Planner can expand. | ✓ |
| Lock most, defer test scope | Lock helper + error code + silent strip. Test scope stays planner discretion (M3 Phase 1 pattern). | |
| Defer everything to the planner | Don't lock implementation specifics; planner reads CONTEXT.md and figures it out. | |
| Something else | Different defaults on one or more. | |

**User's choice:** Lock all four.
**Notes:** Locked D-07 (shared helper, not inline), D-08 (silent strip), D-10 (minimum 5 test cases), D-11 (error code constants `M4_BATHROOM_STEP_INVALID` + `M4_BEDROOMS_INVALID`).

---

## Claude's Discretion

The following micro-decisions were deferred to the planner (documented in CONTEXT.md `<decisions>` § Claude's Discretion):

- Exact form of `default: undefined` in Mongoose (omit `default` entirely vs explicit).
- Whether to promote the strip helper to Express middleware vs in-handler call (the "shared, not inline" constraint is locked; the express-mount form is open).
- Whether to also drop `basics.hotelRooms` on residential submissions (inverse strip — currently NOT in scope; planner can note as future cleanup).
- REQUIREMENTS.md doc-fix commit boundary (standalone vs folded with schema commit).
- Whether to add `{ runValidators: true }` to moderation `findOneAndUpdate` if not already present.

## Deferred Ideas

Recorded in CONTEXT.md `<deferred>`:

- Inverse-strip: drop `basics.hotelRooms` on residential submissions (M5+ consistency fix).
- Inverse-strip: drop `basics.bathroom` enum on residential submissions (same deferral).
- Express middleware wrapping (planner discretion within Phase 6; not load-bearing).
- `1½` Unicode glyph rendering for half-bathrooms (M5+ per REQUIREMENTS Future Requirements).
- Long-press accelerated increment on `<StepperInput>` (M5+; Phase 7 ships tap-only).
- Schema versioning bump `m3-nested-v1` → `m4-nested-v1` (NOT needed; additive change).
- Migration script for backfilling `bedrooms` / `bathroomCount` from existing `basics.rooms` / `basics.bathroom` (REQUIREMENTS Out of Scope).
- Race-cell test rig (M2 carry-forward; not Phase 6 surface).
- Android `gradlew clean bundleRelease` reanimated build doc (Phase 10 release territory).
- AWS IAM cross-project residual (re-open condition unchanged).
- i18n audit + property-type sentinel (Phase 9 in full).
- EN/RU label key additions (Phase 8 DISP-05).
- `<StepperInput>` component + Step 3 conditional rows (Phase 7 FORM-01..FORM-05).

## Process Notes

- User feedback on first-round question wording ("simplify without using terms and references to file names") triggered a rephrase of all four gray-area presentations into plain teammate language per memory `feedback-conversational-tone.md`.
- Decision walkthroughs were single-question turns with my recommendation called out as `(Recommended)`. User accepted all four recommendations without rejection or follow-up.
- No scope creep raised by user during discussion. All four areas stayed within Phase 6 boundary; cross-phase deferrals (Phase 7/8/9/10) were called out preemptively rather than user-initiated.

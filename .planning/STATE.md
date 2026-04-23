# STATE: JayTap

**Last updated:** 2026-04-22 (Phase 1 Plans 01-01 + 01-02 resolved; Plan 02 baseline deferred, zero-FAIL branch taken; Plan 03 code fix next)

## Project Reference

**Project:** JayTap — React Native real-estate app for Bishkek (iOS + Android)
**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.
**Current milestone:** M1 "Polish + Hospitality" (v1.0.4) — ship ASAP to iOS App Store + Google Play
**Milestone after this:** M2 "Roles & Moderation" — captured in REQUIREMENTS.md § v2, planned separately

## Current Position

**Phase:** Phase 1 — Nav Reliability (in progress)
**Plan:** 2/6 resolved — Plan 03 next (Wave 1: autonomous pointerEvents + OVERLAY_FLAGS refactor + [NAV] diagnostics in App.tsx)
**Status:** Wave 0 + Wave 0.5 both committed; Wave 0.5 took deferred-baseline branch (accepted risk). Wave 1 is the only fully-autonomous plan in the phase — ready to spawn executor.
**Progress:** [░░░░░░░░] 0/8 phases complete

### Phase pipeline

1. Nav Reliability — In progress (2/6 plans resolved; Plan 03 next = autonomous App.tsx code fix)
2. Universal Keyboard Handling — Not started
3. Role Gating Precursor — Not started
4. Listing Form Taxonomy & Decomposition — Not started
5. Listing Form Validation & Edit Flow — Not started
6. Hospitality Rendering — Not started
7. Alignment Pass — Not started (blocked on user screenshots)
8. Release & Store Submission — Not started

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements defined | 35 |
| v1 requirements mapped to phases | 35 |
| Phases planned | 1/8 |
| Plans completed | 2 |
| Code review passes | 0 |

## Accumulated Context

### Key decisions (from PROJECT.md, re-anchored here)

- **Build order is load-bearing.** Nav → Keyboard → Roles (parallel) → Form taxonomy → Form validation → Hospitality → Alignment → Release. All four research docs agree; deviating from this order creates ambiguous failures during debugging.
- **Navigation stays custom state machine.** No migration to `react-navigation` in M1. Fixes live inside `App.tsx`.
- **No schema-driven form engine.** M1 uses sub-component composition over `useState`; `react-hook-form` + `zod` are documented as M2+ viable fallbacks.
- **Hardcoded admin email allowlist in M1.** Replaced in M2 by custom-claims-backed roles. The `useRole()` / `can(action)` shape is forward-compatible.
- **Hospitality is showcase-only, no price.** No booking calendar, no per-night pricing. Contact drives offline booking.
- **Clean-slate data.** No production listings exist; schema changes (remove Land, add Hostel/Hotel) need no migration.

### Research flags carried into planning

- **Phase 1 (Nav): HIGH flag** — root cause unconfirmed. Plan must be diagnostic-first (C1 → C2 → C3 → C4) with go/no-go gates, not a guess-patch. Primary hypothesis: stale `hideMainStackUnderOverlay` flag in `App.tsx:508-509` → derive instead of store.
- **Phase 2 (Keyboard): `react-native-reanimated` install precondition.** If absent from `package.json`, must be installed (with Babel plugin as the LAST entry) BEFORE `react-native-keyboard-controller`. Budget 1–2 hours. Physical-device testing on both platforms is mandatory exit criteria under New Architecture.
- **Phase 3 (Roles): Backend enforcement is the real security boundary.** Client-side gating is UX only. The Railway backend must independently reject non-admin PATCH requests to `/properties/:id/verifications` and `/tours`. If it doesn't, that's a scope expansion or an explicit accepted risk — not silently left unaddressed.
- **Phase 4–5 (Form): zod pin to `^3.24`** if zod is ever adopted. zod v4 has an open bug (colinhacks/zod#4989) that breaks RHF submit on RN. M1 default is plain `useState` + `validateByCategory()`.
- **Phase 7 (Alignment): Screenshots pending from user.** Phase plan will be concretized when screenshots arrive; `/gsd-plan-phase 7` should surface this gap if they still haven't.
- **Phase 8 (Release): Xcode 26 / iOS 26 SDK mandatory** for new submissions after April 2026. Confirm on build machine before archive. Privacy manifest currently empty despite app collecting email/name/phone/photo/location — ASC automated scan will reject otherwise.

### Traceability — v1 REQ-ID → Phase

| Phase | Requirements |
|-------|--------------|
| 1. Nav Reliability | NAV-01, NAV-02, NAV-03 |
| 2. Universal Keyboard Handling | KBD-01, KBD-02, KBD-03, KBD-04 |
| 3. Role Gating Precursor | GATE-01, GATE-02, GATE-03, GATE-04, GATE-05 |
| 4. Listing Form Taxonomy & Decomposition | FORM-01, FORM-02, FORM-03, FORM-05, FORM-09 |
| 5. Listing Form Validation & Edit Flow | FORM-04, FORM-06, FORM-07, FORM-08 |
| 6. Hospitality Rendering | HOSP-01, HOSP-02, HOSP-03, HOSP-04, HOSP-05, HOSP-06 |
| 7. Alignment Pass | ALIGN-01, ALIGN-02 |
| 8. Release & Store Submission | REL-01, REL-02, REL-03, REL-04, REL-05, REL-06 |

**Coverage:** 35/35 ✓

### Todos carried forward

- [ ] User to provide screenshots that concretize Phase 7 alignment fixes
- [ ] Coordinate with Railway backend team in Phase 3 to confirm admin-endpoint enforcement
- [ ] Verify `react-native-reanimated` presence in `package.json` before Phase 2 planning begins
- [ ] Verify Xcode 26 / iOS 26 SDK on build machine before Phase 8 begins

### Blockers

- None active. Phase 7 is the only phase with an external dependency (user screenshots) and is parallelizable with other phases, so it does not block the release path.

## Session Continuity

**Last session:** Phase 1 plan — produced `01-RESEARCH.md` (C1→C4 diagnostic protocol, reproduction-matrix spec, RN 0.84/Fabric landmines, Validation Architecture), `01-PATTERNS.md` (analog code excerpts for every App.tsx edit site), `01-VALIDATION.md` (manual-device-QA only), and 6 plans `01-01..01-06-PLAN.md` in 5 waves. Research surfaced a load-bearing correction to CONTEXT D-08/D-09/D-10: no `isTour3DOpen` state exists in App.tsx — Tour3D renders via early-return at lines 461-478 using `activeTourUrl`/`activePhotosUrl` URL strings. CONTEXT.md amended (commit a8f45a3) and user resolved as "future-proof": OVERLAY_FLAGS now lists 5 entries including `!!activeTourUrl` and `!!activePhotosUrl`. Plan checker returned VERIFICATION PASSED on all 10 phase-specific checks — NAV-01/02/03 covered, D-04 gate encoded mechanically, diagnostic-log cleanup pairing correct, pointerEvents uses style form (not deprecated prop form), Plan 05 escalation `autonomous: false`.

**Resume with:** `/gsd-execute-phase 1` — orchestrator will run Plan 01 (Wave 0 scaffolding) first; Plan 02 is human-gated (baseline matrix run); Plan 03 lands the code changes; Plan 04's decision gate (A PROCEED / B ESCALATE / C PAUSE / D ZERO-BASELINE) drives whether Plan 05 or Plan 06 runs next.

**Resume file:** `.planning/phases/01-nav-reliability/01-01-PLAN.md`

**Key files to load first on resume:**
- `.planning/phases/01-nav-reliability/01-CONTEXT.md` (USER DECISIONS — D-08/D-09/D-10 amended)
- `.planning/phases/01-nav-reliability/01-RESEARCH.md` (§2 C1-C4 protocol; §3 matrix; §6 SC→evidence; §8 validation; §9 assumptions log)
- `.planning/phases/01-nav-reliability/01-PATTERNS.md` (verbatim current-code snippets for App.tsx:502-519 edit sites; all 6 `mainStackScreenStyle` callers enumerated)
- `.planning/phases/01-nav-reliability/01-VALIDATION.md` (manual-device-QA contract; Wave 0 infrastructure checklist)
- `.planning/phases/01-nav-reliability/01-0{1,2,3,4,5,6}-PLAN.md` (6 plans, 5 waves, dependency graph verified acyclic)

**Pre-execute check (raised by research):**
- Confirm access to both physical iOS and physical Android device (release-blocking per RESEARCH §11; Plan 01 Task 3 captures device IDs).
- Confirm at least one Railway test listing has ≥1 Matterport tour URL (required for S9 / HR-4 / HR-5 matrix cells; seed if absent).

---

*State initialized: 2026-04-22 after roadmap creation*
*Last updated: 2026-04-22 after Phase 1 plan session*

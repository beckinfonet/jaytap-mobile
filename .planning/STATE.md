# STATE: JayTap

**Last updated:** 2026-04-22 (Phase 2 planned — 6 plans across 4 waves; Wave 0 install precondition is `[BLOCKING]` and `autonomous: false`; v4 plugin name correction `'react-native-worklets/plugin'` encoded in 02-01 to prevent silent no-op. Next: /gsd-execute-phase 2.)

## Project Reference

**Project:** JayTap — React Native real-estate app for Bishkek (iOS + Android)
**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.
**Current milestone:** M1 "Polish + Hospitality" (v1.0.4) — ship ASAP to iOS App Store + Google Play
**Milestone after this:** M2 "Roles & Moderation" — captured in REQUIREMENTS.md § v2, planned separately

## Current Position

**Phase:** Phase 2 — Universal Keyboard Handling (Ready to execute)
**Plan:** 0/6 Phase 2 plans executed. Plan structure: Wave 0 (02-01 install — `autonomous: false` BLOCKING) → Wave 1 (02-02 KeyboardProvider wiring — `autonomous: false` boot smoke) → Wave 2 parallel [02-03 auth ×4, 02-04 settings + listing ×3, 02-05 chat ×2] → Wave 3 (02-06 matrix verify + sign-off — `autonomous: false`). All 4 KBD requirements covered; plan-checker returned VERIFICATION PASSED on 12/12 phase-specific anchors and all standard dimensions.
**Status:** Phase 2 planned 2026-04-22. RESEARCH surfaced load-bearing v4 correction (reanimated 4.x ships separately from `react-native-worklets@^0.8`; Babel plugin name is `'react-native-worklets/plugin'` NOT `'react-native-reanimated/plugin'`). Encoded in every plan that touches Babel. Phase 1 remains closed — bottom-nav reliable across Profile sub-screen surface on iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16 (see `01-CONTEXT.md` D-11..D-15).
**Progress:** [█░░░░░░░] 1/8 phases complete (1 executed + 1 planned)

### Phase pipeline

1. Nav Reliability — Complete (6/6 plans resolved; Plan 05 SKIPPED per D-15) — 2026-04-22
2. Universal Keyboard Handling — Planned (6 plans, 4 waves; ready to execute; reanimated NOT in package.json today — Wave 0 installs reanimated v4 + worklets + keyboard-controller per 02-01)
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
| Phases planned | 2/8 |
| Plans completed | 6 (5 implemented + 1 skipped per D-15) |
| Phase 2 plans created | 6 (0 executed) |
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
- [x] Verify `react-native-reanimated` presence in `package.json` before Phase 2 planning begins (confirmed ABSENT 2026-04-22 — Wave 0 of Phase 2 / Plan 02-01 installs reanimated v4 + worklets)
- [ ] Verify Xcode 26 / iOS 26 SDK on build machine before Phase 8 begins

### Blockers

- None active. Phase 7 is the only phase with an external dependency (user screenshots) and is parallelizable with other phases, so it does not block the release path.

## Session Continuity

**Last session:** Phase 2 plan — produced `02-RESEARCH.md` (§2 install-precondition deep-dive with v4-name correction, §3 per-screen mechanics for 9 input-bearing screens, §4 wave structure, §6 SC→evidence, §7 Validation Architecture, §8 RN 0.84/Fabric landmines, §9 assumptions log; commit `8870122`), `02-VALIDATION.md` (manual physical-device QA + grep-based mechanical gates per project M1 testing bar; commit `71b044a`), `02-PATTERNS.md` (verbatim BEFORE-state excerpts for App.tsx provider tree, 4 auth screens, AccountSettings, both CreateListing branches, both Chat KAV sites, HomeScreen workaround, and PasswordTextInput unchanged-claim), and 6 plans `02-01..02-06-PLAN.md` in 4 waves (commit `1eac961`). Research surfaced a load-bearing correction: reanimated v4 ships in TWO packages (`react-native-reanimated` + `react-native-worklets@^0.8`) and the Babel plugin name moved to `'react-native-worklets/plugin'`. v3 plugin name `'react-native-reanimated/plugin'` would silently no-op on v4 — encoded as a hard "must NOT appear" gate in 02-01 acceptance criteria. Plan checker returned VERIFICATION PASSED on 12/12 phase-specific anchors and all standard dimensions (KBD-01..04 covered, D-01..D-14 honored, install order fidelity confirmed, KeyboardProvider slot exact between SafeAreaProvider and ThemeProvider, chat KAV swap completeness, CreateListing both branches, mechanical exit gate, autonomous discipline, DAG, Wave-2 file disjointness, out-of-scope discipline, threat models present, read_first/acceptance_criteria density).

**Resume with:** `/gsd-execute-phase 2` — orchestrator will run Plan 02-01 (Wave 0 install) first; 02-01 Task 4 is human-gated (physical-device build verify on iPhone 15 Pro Max + Moto G XT2513V — both must pass before Wave 1 unblocks). Plan 02-02 wires `<KeyboardProvider>` into `App.tsx` between `SafeAreaProvider` and `ThemeProvider` with another human boot smoke check before Wave 2 unblocks. Plans 02-03/04/05 are parallelizable (disjoint file sets — auth / settings+listing / chat). Plan 02-06 is the manual matrix walk + phase sign-off.

**Resume file:** `.planning/phases/02-universal-keyboard-handling/02-01-PLAN.md`

**Key files to load first on resume:**
- `.planning/phases/02-universal-keyboard-handling/02-CONTEXT.md` (USER DECISIONS D-01..D-14)
- `.planning/phases/02-universal-keyboard-handling/02-RESEARCH.md` (§2 install w/ v4 name correction; §3 per-screen mechanics; §6 SC→evidence; §7 Validation Architecture; §8 landmines)
- `.planning/phases/02-universal-keyboard-handling/02-PATTERNS.md` (verbatim BEFORE-state excerpts inlined into every plan's `<interfaces>` block)
- `.planning/phases/02-universal-keyboard-handling/02-VALIDATION.md` (per-task verification map + manual matrix contract)
- `.planning/phases/02-universal-keyboard-handling/02-0{1,2,3,4,5,6}-PLAN.md` (6 plans, 4 waves, DAG verified acyclic)

**Pre-execute check (raised by research):**
- Confirm access to both physical iOS (iPhone 15 Pro Max / iOS 26.4) and physical Android (Moto G XT2513V / Android 16) per D-13. Same devices used in Phase 1 — already validated.
- Confirm `newArchEnabled=true` in `android/gradle.properties` (Reanimated v4 is Fabric-only — Wave 0 install will fail under Paper renderer).
- Confirm 1–2h budget for Wave 0 install precondition per RESEARCH §2 (reanimated install + Babel plugin + iOS pod install + clean Android rebuild + both-platform device verify).

---

*State initialized: 2026-04-22 after roadmap creation*
*Last updated: 2026-04-22 after Phase 2 plan session*

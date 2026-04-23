# STATE: JayTap

**Last updated:** 2026-04-23 (Phase 2 COMPLETE — 6 plans executed across 4 waves; 22/22 physical-device matrix cells PASS on iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16; verifier PASSED 34/34 must-haves. One gap-closure landed mid-walk: library `KeyboardAvoidingView` requires explicit `behavior="padding"` — disproved RESEARCH §9 A8. Next: /gsd-plan-phase 3 — Role Gating Precursor.)

## Project Reference

**Project:** JayTap — React Native real-estate app for Bishkek (iOS + Android)
**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.
**Current milestone:** M1 "Polish + Hospitality" (v1.0.4) — ship ASAP to iOS App Store + Google Play
**Milestone after this:** M2 "Roles & Moderation" — captured in REQUIREMENTS.md § v2, planned separately

## Current Position

**Phase:** Phase 3 — Role Gating Precursor (Ready to plan)
**Plan:** Phase 2 complete at HEAD (18 commits since `2c10056`). Verifier PASSED 34/34 must-haves. All 4 KBD requirements delivered on physical devices.
**Status:** Phase 2 closed 2026-04-23. Shipped: reanimated@4.3.0 + worklets@0.8.1 + keyboard-controller@1.21.6 installed with v4 Babel plugin name; `<KeyboardProvider>` at App.tsx root between SafeAreaProvider and ThemeProvider; KASV wraps 4 auth screens + AccountSettings + CreateListing (both branches); library KAV drop-in on ChatThread + ChatCompose with `behavior="padding"`; HomeScreen workaround comment removed. RESEARCH §9 A8 disproven (library `KeyboardAvoidingView` has no default `behavior`; fix committed as `47a52b7`). Phase 1 still closed.
**Progress:** [██░░░░░░] 2/8 phases complete

### Phase pipeline

1. Nav Reliability — Complete (6/6 plans resolved; Plan 05 SKIPPED per D-15) — 2026-04-22
2. Universal Keyboard Handling — Complete (6/6 plans executed; gap-closure `47a52b7` added `behavior="padding"` after matrix walk disproved RESEARCH §9 A8; 22/22 matrix cells PASS on both devices; verifier PASSED 34/34) — 2026-04-23
3. Role Gating Precursor — Not started (next — `/gsd-plan-phase 3`; parallelizable with Phase 4+; backend enforcement is the real security boundary per Phase 3 research flag)
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
| Phases complete | 2/8 |
| Plans completed | 12 (5 Phase-1 implemented + 1 Phase-1 skipped per D-15 + 6 Phase-2 executed) |
| Phase 2 gap closures | 1 (`47a52b7` — chat KAV `behavior="padding"` after A8 disproven) |
| Code review passes | 0 (M1 testing bar is manual physical-device QA per CLAUDE.md) |

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
- [x] Verify `react-native-reanimated` presence in `package.json` before Phase 2 planning begins (confirmed ABSENT 2026-04-22; installed 2026-04-23 via Wave 0 / Plan 02-01 as reanimated@4.3.0 + worklets@0.8.1)
- [ ] Verify Xcode 26 / iOS 26 SDK on build machine before Phase 8 begins
- [ ] Decide: commit or revert `android/app/build.gradle` versionCode 25→26 / versionName 1.0.24→1.0.25 (unstaged from Phase 2 walk; belongs to Phase 8 release-prep scope)

### Blockers

- None active. Phase 7 is the only phase with an external dependency (user screenshots) and is parallelizable with other phases, so it does not block the release path.

## Session Continuity

**Last session:** Phase 2 execution (18 commits `2c10056` → `a3cc03b`). Wave 0 install precondition landed atomically (`8ea02cf` reanimated+worklets+Babel; `0fa3d20` keyboard-controller+pod+gradle; `f46773a` SUMMARY). Wave 1 KeyboardProvider wiring (`935697a` App.tsx; `33d52f4` SUMMARY). Wave 2 parallel screen wrappers across 3 plans: 02-03 auth×4 (5 commits `857bd05`..`b5b904e`), 02-04 settings + listing×3 sites (3 commits `092caf7`..`8af9e3b`), 02-05 chat×2 (3 commits `f728b3b`..`0b81112`). Wave 3 matrix scaffold `0c271ca` → device walk surfaced chat KAV failure → gap-closure `47a52b7` added `behavior="padding"` (disproves RESEARCH §9 A8, annotated in RESEARCH) → re-walk 22/22 PASS → HomeScreen workaround comment removed + 02-VALIDATION.md flipped + 02-06-SUMMARY.md written (`a3cc03b`). Verifier returned `status: passed, 34/34 must-haves verified`. Phase-wide grep gate `grep -rn "keyboardVerticalOffset" src/` returns 0.

**Resume with:** `/gsd-plan-phase 3` — Role Gating Precursor (GATE-01..GATE-05). Research flag from Phase 3: backend enforcement is the real security boundary — client-side gating is UX only. Railway backend must independently reject non-admin PATCH requests to `/properties/:id/verifications` and `/tours`. Parallelizable with Phase 4+ if desired.

**Phase 2 artifacts preserved:**
- `02-VERIFICATION.md` — verifier's 34/34 PASS report + accepted-override record for `47a52b7`
- `02-KEYBOARD-MATRIX.md` — 22-cell walk record + session metadata + all 12 grep gates filled
- `02-06-SUMMARY.md` — phase sign-off with decision log (REMOVE HomeScreen comment)
- `02-RESEARCH.md` — §9 A8 annotated DISPROVEN with resolution recipe for future maintainers

**Known unstaged drift:** `android/app/build.gradle` has versionCode 25→26 / versionName 1.0.24→1.0.25 from device-testing session. Out of Phase 2 scope; belongs to Phase 8 release-prep or a dedicated bump commit. Decision captured in todos above.

---

*State initialized: 2026-04-22 after roadmap creation*
*Last updated: 2026-04-23 after Phase 2 execution + verifier PASS*

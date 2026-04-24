# STATE: JayTap

**Last updated:** 2026-04-23 (Phase 3 CONTEXT captured — 25 decisions across 7 categories: scope-locked (D-01..07), Matterport/panoramic gating (D-08..10 — HIDE non-admin URL inputs entirely, preserve existing URLs on save), call-site migration (D-11..14 — all 4 CreateListingScreen isAdmin sites + PropertyDetailsScreen:178 + ProfileScreen:33 via new `manageListings` action; grep invariant as exit bar), service-layer defense (D-15..20 — `canFromUser` pure helper guards `patchPlatformVerifications` only, unit test raises M1 bar), backend coordination (D-21..23 — parallel task, accept as known risk if unconfirmed at ship), allowlist (D-24..25 — `beckprograms@gmail.com` only). Next: /gsd-plan-phase 3.)

## Project Reference

**Project:** JayTap — React Native real-estate app for Bishkek (iOS + Android)
**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.
**Current milestone:** M1 "Polish + Hospitality" (v1.0.4) — ship ASAP to iOS App Store + Google Play
**Milestone after this:** M2 "Roles & Moderation" — captured in REQUIREMENTS.md § v2, planned separately

## Current Position

**Phase:** Phase 3 — Role Gating Precursor (CONTEXT captured — ready for `/gsd-plan-phase 3`)
**Plan:** Phase 3 CONTEXT.md + DISCUSSION-LOG.md committed `c1518cf`. 25 decisions locked across 7 categories. No research/plan artifacts yet.
**Status:** Phase 3 discuss complete 2026-04-23. Key decisions: HIDE Matterport + panoramic URL sections from non-admins (behavior change, preserve existing URLs on save); migrate all 4 CreateListingScreen `isAdmin` sites + PropertyDetailsScreen:178 + ProfileScreen:33 (via new `manageListings` action) to `useRole()`; grep invariant + `useRole()` unit test is the exit bar; service-layer gate scoped to `patchPlatformVerifications` only (pure `canFromUser(user, action)` helper, throws `E_PERMISSION_DENIED`, unit-tested); backend-enforcement coordination runs parallel — accept as documented risk in PROJECT.md Key Decisions if unconfirmed at M1 ship (D-22). Allowlist seeds with `beckprograms@gmail.com` only. Phase 1 + 2 still closed.
**Progress:** [██░░░░░░] 2/8 phases complete

### Phase pipeline

1. Nav Reliability — Complete (6/6 plans resolved; Plan 05 SKIPPED per D-15) — 2026-04-22
2. Universal Keyboard Handling — Complete (6/6 plans executed; gap-closure `47a52b7` added `behavior="padding"` after matrix walk disproved RESEARCH §9 A8; 22/22 matrix cells PASS on both devices; verifier PASSED 34/34) — 2026-04-23
3. Role Gating Precursor — CONTEXT captured 2026-04-23 (`c1518cf`) — next `/gsd-plan-phase 3`; parallelizable with Phase 4+; backend enforcement coordination runs parallel with implementation per D-21/D-22
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

**Last session:** Phase 3 discuss-phase — 1 commit `c1518cf` capturing `03-CONTEXT.md` + `03-DISCUSSION-LOG.md` (429 insertions). User selected 3 of 4 gray areas to discuss interactively (Matterport/panoramic semantics, call-site migration scope, service-layer defense-in-depth) + confirmed backend-enforcement default + allowlist contents as follow-up questions. 25 decisions locked (D-01 through D-25). No code changes this session.

**Resume with:** `/gsd-plan-phase 3` — Role Gating Precursor (GATE-01..GATE-05). CONTEXT.md captures all implementation decisions; planner should focus on wave structure + task decomposition, NOT re-asking decided questions. Key downstream consumer notes:
- Six call-site migrations across three screens + one service method + four new files (`src/hooks/useRole.ts`, `src/components/Gated.tsx`, `src/constants/adminAllowlist.ts`, `src/hooks/__tests__/useRole.test.ts`)
- Exit bar: 4-part grep invariant (D-14) + `useRole()` priority-ladder unit test + service-guard unit test (D-19, D-20 — planner must check Jest config during Wave 0)
- Backend coordination runs in parallel — NOT a serial dependency (D-23); failure-to-confirm fallback is a PROJECT.md Key Decisions row (D-22)
- Behavior change callout: non-admin listers lose Matterport + panoramic URL inputs (D-08 — by design; existing URLs preserved on save per D-09)

**Phase 2 artifacts preserved:**
- `02-VERIFICATION.md` — verifier's 34/34 PASS report + accepted-override record for `47a52b7`
- `02-KEYBOARD-MATRIX.md` — 22-cell walk record + session metadata + all 12 grep gates filled
- `02-06-SUMMARY.md` — phase sign-off with decision log (REMOVE HomeScreen comment)
- `02-RESEARCH.md` — §9 A8 annotated DISPROVEN with resolution recipe for future maintainers

**Known unstaged drift:** `android/app/build.gradle` has versionCode 25→26 / versionName 1.0.24→1.0.25 from device-testing session. Out of Phase 2 scope; belongs to Phase 8 release-prep or a dedicated bump commit. Decision captured in todos above.

---

*State initialized: 2026-04-22 after roadmap creation*
*Last updated: 2026-04-23 after Phase 3 CONTEXT capture (`c1518cf`)*

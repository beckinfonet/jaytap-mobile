# Phase 1: Nav Reliability - Context

**Gathered:** 2026-04-22
**Last amended:** 2026-04-22 (D-04 reassessment after Post-Wave-1 partial device run — see D-11..D-15)
**Status:** Mid-execute — root-cause model revised; fix scoped, device re-verify pending

<domain>
## Phase Boundary

Reproduce, root-cause, and fix the bottom-nav unresponsiveness bug in `App.tsx`. Apply a `pointerEvents` belt-and-suspenders mitigation to all keep-alive screens and full-screen overlays so the class of bug cannot recur as M2 adds screens. Deliver a documented reproduction matrix (NAV-03) before the fix lands. Navigation stays a custom `App.tsx` state machine — no `react-navigation` migration.

Requirements: NAV-01, NAV-02, NAV-03.

</domain>

<decisions>
## Implementation Decisions

### Diagnostic approach (C1 → C2 → C3 → C4)
- **D-01:** Sequential investigation with go/no-go gates. Instrument C1 first, reproduce on device, fix only if confirmed; otherwise advance to C2 (23-dep BackHandler stale closure), C3 (absolute-positioned wrapper touch capture), C4 (idle-touchable retention). Cheapest path when C1 is the actual cause; avoids conflating multiple fixes.
- **D-02:** All diagnostic `console.log` instrumentation is temporary and MUST be stripped before commits land. The reproduction matrix (NAV-03) is the only artifact retained in the repo.
- **D-03:** The human user runs all physical-device reproduction passes (iOS + Android). Claude patches code and re-instruments between passes. Simulator passes do not satisfy exit criteria (PITFALLS §3: touch-capture bugs only reproduce on real hardware).
- **D-04:** Hard 0% repro bar across the full 32+ state×tab transition matrix is required to ship Phase 1. A fix reducing repro from 100% → 20% is treated as evidence that the root-cause model is wrong (not as a partial win) — pause, reassess, re-discuss if this happens.

### Belt-and-suspenders `pointerEvents` mitigation
- **D-05:** Apply `pointerEvents={visible ? 'auto' : 'none'}` to keep-alive and overlay wrappers UP FRONT, before the root-cause fix lands — per PITFALLS §3, "this alone may fix the trap" and is the highest-leverage/lowest-risk change. If it eliminates the user-visible bug, C1→C4 diagnosis continues in parallel to confirm the actual cause (per D-04 we don't ship a masked-symptom fix).
- **D-06:** Scope of the `pointerEvents` wrapper: (a) all 5 keep-alive main-stack tabs — Home, Favorites, Chat, Profile, Listings (per `App.tsx:70-76` `tabEverMounted`); (b) all 4 full-screen overlays — PropertyDetails, CreateListing, Tour3D, RenterListings. Auth modals (`zIndex:1000` at `App.tsx:864`) and `<Modal>` instance audits are EXPLICITLY OUT OF SCOPE for the up-front mitigation — they become C3 investigation territory only if the 0% repro bar isn't met after C1/C2.
- **D-07:** Document the convention in `.planning/codebase/CONVENTIONS.md`: new keep-alive or full-screen overlay screens MUST wrap in a `<View pointerEvents={visible ? 'auto' : 'none'}>`. No reusable `<KeepAliveScreen>` component abstraction in this phase — comment/doc convention only; enforcement via code review.

### Tour3D & overlay inventory
- **D-08 (amended 2026-04-22 after phase research, commit d0db26d):** Research surfaced that no `isTour3DOpen` state variable exists in `App.tsx`. Tour3D is driven by `activeTourUrl` / `activePhotosUrl` (URL strings, declared at `App.tsx:37-38`) and renders via **early return** at `App.tsx:461-478`, which replaces the entire render tree — so while Tour3D is active the main stack is already unmounted and cannot trap touches via the `display:none` keep-alive mechanism. D-08's original "Tour3D overlay is missing from hideMainStackUnderOverlay" premise was therefore empirically incorrect, but the future-proofing concern it articulated remains valid.
- **D-09 (amended):** Canonical overlay inventory — the complete set of overlay-flag conditions that belong in `OVERLAY_FLAGS`:
  - `!!selectedProperty` (PropertyDetails)
  - `!!user && isCreateListingOpen` (CreateListing — only when authenticated; matches current code)
  - `isRenterListingsOpen` (RenterListings)
  - `!!activeTourUrl` (Tour3D via Matterport URL — currently uses early-return, included for future-proofing)
  - `!!activePhotosUrl` (Tour3D via panoramic photos URL — currently uses early-return, included for future-proofing)
- **D-10 (amended):** Refactor the derivation to a single source of truth: an `OVERLAY_FLAGS` array combined via `.some(Boolean)`, e.g.:
  ```typescript
  const OVERLAY_FLAGS = [
    !!selectedProperty,
    isRenterListingsOpen,
    !!user && isCreateListingOpen,
    !!activeTourUrl,
    !!activePhotosUrl,
  ];
  const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);
  ```
  Greppable, review-friendly, and new overlays (including any future refactor that replaces Tour3D's early-return with a zIndex overlay) get added to the array alongside their state declaration — guards against future omissions. Planner MUST still include a short code-read sub-task in Wave 1 to reconfirm this list against the current `App.tsx` state variables before the `hideMainStackUnderOverlay` edit lands; if new overlay flags have been added since 2026-04-22, add them to the array too.

### D-04 reassessment (amended 2026-04-22 after Post-Wave-1 partial device run)

- **D-11 (new, D-04-triggered):** Post-Wave-1 device runs on iOS + Android of the S1–S5 × T1–T5 tab-to-tab transitions surfaced a tight, localized FAIL pattern (S6–S9 overlay rows are structurally `— N/A`, not untested — full-screen overlays eclipse the `BottomNavigator` rendered inside the main-stack wrapper at `App.tsx:673`, so no user-reachable tab-tap path exists from overlay states):
  - S1 Home, S2 Favorites, S3 Chat, S4 Profile → any tab: all PASS on both platforms.
  - **S5 Appointments → Home / Chat / Profile: FAIL on both iOS + Android.**
  - S5 Appointments → Favorites: PASS on both platforms.
  - S5 Appointments → Add: PASS (opens CreateListing overlay which eclipses the main stack).
- **D-12 (new, C1 RULED OUT):** C1's predicted failure mode was a uniform "tap-ignored-after-overlay-dismiss" across non-overlay starting states. The actual signal is uniform PASS from S1–S4 and FAIL localized to S5 (a Profile sub-screen), with S5 → Favorites PASSing via a different render path. This pattern is not consistent with a stale `hideMainStackUnderOverlay` flag. Plan 03's `pointerEvents` + `OVERLAY_FLAGS` work remains correct as prophylactic hardening but was not the actual bug driver.
- **D-13 (new, actual root cause):** The tab-change handler at `App.tsx:678–735` omits `setIsAppointmentsOpen(false)` and `setIsAccountSettingsOpen(false)` in every branch. The `show*` priority ladder at `App.tsx:360–389` gates `showHome`, `showChat`, `showProfile` on `!isAppointmentsOpen && !isAccountSettingsOpen`. So a tab tap from S5 Appointments updates the target tab's flag, but the Appointments screen keeps rendering because `isAppointmentsOpen` is never cleared — user perceives "tap ignored". `showFavorites` has no `!isAppointmentsOpen` guard (higher priority in the ladder), which is exactly why S5 → Favorites PASSes. The model fits every cell in the matrix.
- **D-14 (new, fix spec):** User's spec, verbatim: "anytime user sees the bottom nav and clicks on it, that click should take precedence and take the user to that clicked section." Implementation: a `resetProfileSubScreens()` helper, declared adjacent to `OVERLAY_FLAGS` (same convention as D-09/D-10 — greppable, inline with state declarations), that clears `isFavoritesOpen`, `isAppointmentsOpen`, `isAccountSettingsOpen`, `isProfileOpen`, `isChatOpen`, `isScheduleViewingOpen`, `propertyToSchedule`, and both `returnToProfileAfter*` flags. Every `onTabChange` branch (`home`, `favorites`, `profile`, `chat`, `add`) calls it first, then sets its single target flag. Scope stays inside `App.tsx` — no other files touched.
- **D-15 (routing consequence):** Plan 05 (C2/C3/C4 escalation sequence) is SKIPPED entirely. D-04 fired as designed — root-cause model was wrong, we paused, reassessed, and the new model is well-specified and bounded (single function, one atomic commit). Plan 04's full-matrix device protocol is collapsed to a focused re-verify: on both devices, test Profile → Appointments → tap Home/Chat/Profile (all should succeed) and Profile → Account Settings → tap Home/Chat/Profile (same). Video capture is dropped — the bug is now a deterministic code defect with a readable fix, not a timing-sensitive touch-capture symptom; D-03's physical-device QA bar is retained but evidence form is reduced to "human confirms behavior matches spec on both platforms". Plan 06 (strip [NAV]/[BACK]/[C3]/[C4] diagnostics + finalize) runs after device verify.

### Claude's Discretion
- Exact variable names / file location for the `OVERLAY_FLAGS` array (inline in `App.tsx` vs extracted to a helper).
- Exact log format and per-candidate instrumentation (the planner/executor can pick what's cheapest).
- Wording of the new `CONVENTIONS.md` entry for the keep-alive/pointerEvents convention.
- Whether to preemptively refactor the 23-dep `BackHandler` `useEffect` (`App.tsx:184-297`) to the ref-pattern, or defer that until C2 is confirmed. Default: defer — don't refactor without diagnostic evidence.
- Android hardware-back regression testing approach within the device QA pass (D-03 scope).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 1 definition and 5 Success Criteria
- `.planning/REQUIREMENTS.md` — NAV-01 (bottom-nav responds on every transition), NAV-02 (root-cause fix for `display: none` keep-alive), NAV-03 (reproduction matrix recorded BEFORE fix)
- `.planning/STATE.md` — "Research flags carried into planning" entry for Phase 1: HIGH flag, diagnostic-first C1→C2→C3→C4 with go/no-go gates

### Root-cause analysis & fix patterns
- `.planning/research/ARCHITECTURE.md` §2 "Bottom-Nav Fix Architecture" — C1/C2/C3/C4 candidate root causes, diagnostic order, recommended fix patterns (derive-not-store, ref-pattern BackHandler, `pointerEvents="box-none"`, unmount-on-idle)
- `.planning/research/PITFALLS.md` §Pitfall 1 — "Treating the bottom-nav bug as a `BottomNavigator` issue instead of an `App.tsx` state-machine issue" (warning signs, avoidance, 100% vs 80% repro anti-pattern)
- `.planning/research/PITFALLS.md` §Pitfall 3 — "`display: none` keep-alive screens still capture touches" (the `pointerEvents` belt-and-suspenders rationale)

### Codebase concerns & known fragility
- `.planning/codebase/CONCERNS.md` "High: App.tsx god-file (941 lines)" + "High: No navigation library" + "High: Manual tab keep-alive via booleans" + "Medium: Android back-handler useEffect with 19 dependencies" — enumerates the state-machine fragility this phase works within
- `.planning/codebase/ARCHITECTURE.md` — existing provider tree and navigation state machine (read before proposing any structural change)
- `.planning/codebase/CONVENTIONS.md` — target file for the new keep-alive/`pointerEvents` convention entry (D-07)

### Project-level constraints
- `.planning/PROJECT.md` "Out of Scope" — "Rewriting custom state-machine navigation to `react-navigation`": fixes must stay within the existing pattern
- `.planning/PROJECT.md` "Constraints" — iOS + Android parity required; physical-device QA is the testing bar (informs D-03)

### Concrete code anchors (source files, not docs)
- `App.tsx:508-509` — current `hideMainStackUnderOverlay` derivation (the D-08/D-09/D-10 target)
- `App.tsx:184-297` — 23-dep Android BackHandler `useEffect` (C2 candidate, deferred refactor target)
- `App.tsx:70-76` — `tabEverMounted` keep-alive bookkeeping (D-06 scope anchor)
- `App.tsx:337-388` — `show*` boolean cascade (diagnostic instrumentation site)
- `App.tsx:502-506` — `mainStackScreenStyle(visible)` (current `display:none` pattern — D-06 wrap site)
- `App.tsx:864` — auth modal wrapper (`zIndex:1000`; out-of-scope-for-now per D-06, C3 fallback)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hideMainStackUnderOverlay` at `App.tsx:508-509` is already DERIVED (not `useState`). The research assumption that C1's fix is "derive it instead of store it" is partially already done — the remaining D-08 gap (missing `isTour3DOpen`) is the actionable part of C1.
- `mainStackScreenStyle(visible)` at `App.tsx:502-506` is the existing `display: 'flex' | 'none'` helper per-screen. It's the right extension point for the `pointerEvents` wrapper (D-05/D-06) — one edit lands on every consumer.
- `tabEverMounted` record (`App.tsx:70-76`) is the canonical list of keep-alive screens — driving a loop over this record is how the D-06 scope gets applied uniformly.

### Established Patterns
- Keep-alive via `display: 'none'` is the codebase-wide convention for tab screens. Do NOT replace it with unmount-on-hidden for tabs (would lose tab state on nav); DO add `pointerEvents` on top of it.
- Full-screen overlays use `position: 'absolute' + zIndex` wrappers (`fullScreenOverlayWrap` at `App.tsx:511-519`). These also need the `pointerEvents` belt-and-suspenders per D-06.
- All overlay visibility booleans (`selectedProperty`, `isRenterListingsOpen`, `isCreateListingOpen`, `isTour3DOpen`) are declared near the top of `AppContent` alongside other `useState` calls — the D-10 `OVERLAY_FLAGS` array should live adjacent to these declarations so "add a new overlay → add to array" is one visual unit.

### Integration Points
- `App.tsx` is the only file changed by this phase. No other screens, services, or contexts are touched.
- `.planning/codebase/CONVENTIONS.md` gets one new entry per D-07.
- NAV-03 reproduction matrix document: TBD location; planner should choose (likely `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` for colocation).

</code_context>

<specifics>
## Specific Ideas

- "Treat partial success as diagnostic evidence that our root cause model is wrong" — the D-04 escalation rule is stronger than a bug-triage default; planner should bake a pause-and-reassess checkpoint into the plan, not just a pass/fail gate.
- The `OVERLAY_FLAGS` array pattern (D-10) is the specific shape preferred — not a helper function, not extracted to another file by default. Inline array adjacent to state declarations is the target.
- Physical-device QA is the ONLY acceptable evidence for NAV-01/NAV-02. Automated tests or simulator passes do not satisfy Phase 1 exit criteria.

</specifics>

<deferred>
## Deferred Ideas

- 23-dep `BackHandler` `useEffect` refactor to ref-pattern (`App.tsx:184-297`): only applied if C2 investigation confirms it as the cause. Deferring prevents a pre-emptive refactor from destabilizing Phase 1's diagnostic signal.
- Auth modal (`zIndex:1000`) `pointerEvents` audit and `<Modal>` instance conditional-rendering audit: out of scope unless the 0% repro bar isn't met after C1/C2, at which point they become C3 investigation territory.
- Reusable `<KeepAliveScreen visible={...}>` component that enforces `display + pointerEvents` together by construction: considered, rejected for Phase 1 (M1 polish, not infrastructure work). Revisit if M2 adds enough new screens to justify.
- Migration to `react-navigation`: explicitly out of scope per PROJECT.md. Not a future M1 option; possibly an M3+ conversation.
- Crash reporter (Sentry/Crashlytics) to detect field regressions of nav traps: belongs in Phase 8 or a later polish milestone, not Phase 1.

</deferred>

---

*Phase: 01-nav-reliability*
*Context gathered: 2026-04-22*

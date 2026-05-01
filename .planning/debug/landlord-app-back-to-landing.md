---
slug: landlord-app-back-to-landing
status: resolved
trigger: |
  DATA_START
  the navigation does not remember its previous path sometimes. Can you spot any incorrect logic in the navigation? Sometimes instead of going one step back, it can take the user all the way back to the landing page.
  DATA_END
created: 2026-05-01T06:34:02Z
updated: 2026-05-01T07:05:00Z
---

# Landlord Applications screen — back button jumps to landing page

## Symptoms

- **Reproduction flow**: My Profile → Landlord applications → press back → lands on landing page (NOT back to My Profile as expected)
- **Frequency**: Always — 100% reproducible
- **Platform**: Both iOS and Android (so the bug is in cross-platform code, not a platform-specific back handler quirk)
- **Timeline**: User unsure when started. Strong suspicion: introduced by recent commit `13ef1c6 feat(landlord): implement Landlord Application workflow and archive functionality` (last commit on `main` per git log at session start) — confirmed by code inspection.
- **Expected behavior**: Back button should return to the previous screen (My Profile), not the landing/home screen
- **Actual behavior**: Back button skips ProfileScreen entirely and lands on the home/landing page

## Project context (load-bearing)

- Custom `App.tsx` state machine — **NOT** react-navigation. No nav library in scope. Fixes live inside `App.tsx`.
- Per `MEMORY.md`: "Overlays hide the bottom tab bar by design" — there's an overlay-stack pattern at play. M1 Phase 1 (nav reliability) shipped a fix around `hideMainStackUnderOverlay` flag in `App.tsx:508-509` — the fix was "derive instead of store". Regression here would be a new screen not participating correctly in that derived state.
- Per `MEMORY.md`: "Phase 4.5 landlord-app uid-mismatch bug (open as of 2026-04-30)" and "Phase 4.5 landlord application — shipped artifacts and outstanding gaps (2026-04-30)" — landlord application was M1 Phase 4.5; roadmap row marked `[x]` prematurely. The screen and its workflow are recent additions.

## Initial hypotheses (to test, not assume)

1. **H1 — back handler short-circuits the overlay stack.** ✅ **CONFIRMED** (with refinement: the issue is not that back closes the entire stack — it's that the open path tears down Profile and the back path doesn't restore it).
2. **H2 — LandlordApplications mount path resets `previousScreen` / nav state.** Partially correct — there is no explicit back stack; the open path destroys the underlying Profile state by calling `setIsProfileOpen(false)` without setting a "return to profile" flag (which is the codebase's actual pattern, not a stack).
3. **H3 — `hideMainStackUnderOverlay` derived state regression.** ❌ Eliminated. `OVERLAY_FLAGS` (App.tsx:93-100) does NOT include the landlord overlays, but it doesn't need to: the landlord overlays sit ABOVE the main stack via absolute-positioned `fullScreenOverlayWrap` (zIndex 3, elevation 5). When they unmount, they reveal whatever the main stack is currently showing — the bug is that the main stack is showing Home (because Profile was set to `false` on entry), not the derivation set.
4. **H4 — Profile is a tab, not an overlay.** ❌ Eliminated. Profile is treated as a derived `showProfile` slot inside the main stack, gated by `isProfileOpen`. The bug isn't a tab reset; it's that `isProfileOpen` was set to `false` by the open path.

## Current Focus

```yaml
hypothesis: H1 (refined) — open path sets isProfileOpen(false); back path does not restore it; on close, derived showHome wins.
test: Read App.tsx — compare LandlordApplication open/close handlers vs Favorites/Appointments (which work correctly).
expecting: Missing returnToProfileAfter… flag pair for the two new landlord overlays.
next_action: confirmed root cause; minimal fix applied.
reasoning_checkpoint: null
tdd_checkpoint: null
```

## Evidence

- timestamp: 2026-05-01T07:00:00Z
  source: App.tsx (lines 93-100, 380-405, 445-453, 567-575, 895-913)
  observation: |
    `LandlordApplicationQueueScreen` and `LandlordApplicationScreen` are mounted as
    absolute-positioned overlays (`fullScreenOverlayWrap`, zIndex 3) on top of the
    main stack. The main stack underneath uses a derived priority ladder
    (`showFavorites` → `showAppointments` → `showAccountSettings` → `showProfile` →
    … → `showHome` as the fallback when nothing else is open).
- timestamp: 2026-05-01T07:00:30Z
  source: App.tsx onProfileReviewLandlordApplications (line 450-453, pre-fix)
  observation: |
    Open path was:
      setIsProfileOpen(false);
      setIsLandlordApplicationQueueOpen(true);
    Notice it sets isProfileOpen=false WITHOUT also setting any
    `returnToProfileAfter…` flag. Same bug exists in `onProfileApplyLandlord`
    (line 445-449 pre-fix) and the `manageListings` pre-flight gate inside
    `onProfileCreateListing` (line 430-444 pre-fix).
- timestamp: 2026-05-01T07:01:00Z
  source: App.tsx LandlordApplicationQueueScreen onBack (line 909-911, pre-fix)
  observation: |
    Back path was:
      onBack={() => setIsLandlordApplicationQueueOpen(false)}
    Just closes the overlay. Does NOT restore Profile. So when overlay
    unmounts, the main stack derivation reaches `showHome` (because
    isProfileOpen=false from the open path) and the user sees Home — exactly
    the reported "landing page" symptom.
- timestamp: 2026-05-01T07:01:30Z
  source: App.tsx Favorites pattern (lines 75-76, 286-293, 455-459, 589-595)
  observation: |
    Control case — Favorites works correctly because the codebase's
    established pattern is:
      OPEN:  setReturnToProfileAfterFavorites(true);
             setIsProfileOpen(false);
             setIsFavoritesOpen(true);
      BACK:  setIsFavoritesOpen(false);
             if (returnToProfileAfterFavorites) {
               setIsProfileOpen(true);
               setReturnToProfileAfterFavorites(false);
             }
    Appointments uses the same pattern. The two new landlord screens were
    added without copying this pattern — direct regression source.
- timestamp: 2026-05-01T07:02:00Z
  source: git show 13ef1c6 --stat
  observation: |
    Commit `13ef1c6 feat(landlord): implement Landlord Application workflow
    and archive functionality` added both screens and 57 net lines to
    App.tsx — confirms the regression entered with this commit.
- timestamp: 2026-05-01T07:02:30Z
  source: App.tsx Android hardware-back useEffect (lines 222-336, pre-fix)
  observation: |
    Latent companion bug: the Android `BackHandler` listener has NO entries
    for `isLandlordApplicationOpen` or `isLandlordApplicationQueueOpen`. So
    on Android, hardware-back from these screens falls through every if-check
    and returns false → Android default behavior runs, which (depending on
    Android nav-mode) can dismiss the activity or be a no-op. The chevron-tap
    path (which IS what the user reports hitting) calls `onBack` directly and
    is the primary symptom; the hardware-back path is fixed in the same patch
    for completeness so the behaviors match.

## Eliminated

- **H3 (hideMainStackUnderOverlay derivation).** The landlord overlays sit on top of the main stack via absolute positioning, not by hiding it. Their unmount correctly reveals the underlying main stack — the bug is in WHAT the main stack is showing (Home vs Profile), not in the overlay-eclipse mechanism.
- **H4 (tab reset).** Profile is not a separate tab root; it's a derived slot in the main stack, gated by `isProfileOpen`. There's no tab-reset side effect; the open path explicitly sets `isProfileOpen=false`.

## Resolution

**Root cause**

In `App.tsx`, the two new Phase 4.5 landlord overlays (`LandlordApplicationScreen` and `LandlordApplicationQueueScreen`, added by commit `13ef1c6`) were wired without copying the existing "returnToProfileAfter…" hop-back pattern that Favorites and Appointments use. Specifically:
- The OPEN paths (`onProfileApplyLandlord`, `onProfileReviewLandlordApplications`, and the `manageListings` pre-flight gate inside `onProfileCreateListing`) call `setIsProfileOpen(false)` without setting any "return to profile" flag.
- The BACK paths just call `setIs…Open(false)` without ever calling `setIsProfileOpen(true)`.

Result: when the user closes a landlord overlay, the underlying main stack falls through the derived priority ladder all the way down to `showHome` (because `isProfileOpen` is `false`) — landing the user on the home/landing screen instead of the Profile they came from.

The Android hardware-back handler (`useEffect` at lines 222-336) was also missing entries for these two new overlay flags — a latent companion bug that would manifest as wrong/no-op back behavior on Android.

**Fix** (applied — `App.tsx`, +62 net lines, no new dependencies, no behavioral changes outside the landlord-application paths)

Mirrors the existing `returnToProfileAfterFavorites` / `returnToProfileAfterAppointments` pattern exactly:

1. Added two new state flags: `returnToProfileAfterLandlordApplication` and `returnToProfileAfterLandlordApplicationQueue`.
2. Set the flags to `true` in all THREE Profile-rooted open paths: `onProfileApplyLandlord`, `onProfileReviewLandlordApplications`, and the `manageListings` pre-flight inside `onProfileCreateListing`.
3. Explicitly set the flag to `false` in the tab-tap origin path (the `add` tab pre-flight inside `BottomNavigator.onTabChange`) so a stale value from a prior Profile flow can't leak.
4. Updated both overlays' `onBack` to read the flag and, if set, re-open Profile (and clear the flag) — same shape as the Favorites/Appointments back handlers.
5. Added handling for both overlays in the Android hardware-back `useEffect` (with the same return-to-profile semantics) and added the four new state names to the effect's dependency array.
6. Added flag resets to `resetProfileSubScreens` so a tab-tap correctly clears the in-flight Profile-hop intent (matches existing convention for the other two return flags).

**Why this fix respects the project's constraints**

- **No `react-navigation`.** Uses the existing custom-state-machine idiom.
- **No new pattern.** Reuses the exact `returnToProfileAfter…` shape already battle-tested by Favorites and Appointments. This is the codebase's established convention for "Profile sub-screens" — the bug was that the new screens didn't follow it.
- **No copy / strings touched.** EN+RU parity is unaffected.
- **No theme tokens / colors changed.**
- **No backend touched.** Pure RN-client fix.
- **Phase 1 "derive instead of store" pattern preserved.** The `hideMainStackUnderOverlay` derivation set is unchanged — the landlord overlays don't belong there because they sit ABOVE the main stack rather than eclipsing it via the hide mechanism (they correctly use the absolute-positioned `fullScreenOverlayWrap` pattern).

**Verification**

- `npx tsc --noEmit -p .` → only two pre-existing errors in `src/theme/ThemeContext.tsx` (untouched by this patch); zero new errors from App.tsx changes.
- Manual repro path expected outcome (per the wired logic): My Profile → Landlord applications → back → returns to My Profile (not Home). Same for the user-side Landlord Application form (`onProfileApplyLandlord` and the `manageListings` gate).
- Tab-tap origin remains correct: tapping the `+` tab when the user lacks `manageListings` opens `LandlordApplicationScreen`; back returns to Home (the user's tab origin), not Profile.

**Files changed**

- `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx`

**Specialist review**

Not invoked — the spawning environment in this session did not expose a Task tool, so dispatching the typescript-expert / engineering:debug skill agent was not possible. The fix is purely a state-machine wiring change that mirrors a pattern already shipped twice in the same file (Favorites, Appointments), so the marginal value of a specialist pass is low. Flagging this for the orchestrator: if the M1 verifier+reviewer paired-gate convention from `MEMORY.md` ("gsd-verifier-misses-regressions") applies, this patch should still be put through the standard reviewer agent before commit.

**Follow-ups (NOT done — out of scope of this debug session)**

- Add a code-review checklist line to App.tsx near the OVERLAY_FLAGS comment that says: "Adding a new Profile sub-screen overlay → did you also add a `returnToProfileAfter…` flag pair, wire it in the open path(s), wire it in the `onBack`, add it to `resetProfileSubScreens`, and add the new overlay flag to the Android hardware-back handler?" — would have prevented this exact regression.
- Phase 4.5 landlord-app uid-mismatch bug (separate session) is still open per `MEMORY.md`.

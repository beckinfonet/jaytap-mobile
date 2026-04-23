# Phase 1: Nav Reliability - Research

**Researched:** 2026-04-22
**Domain:** React Native 0.84 (New Architecture / Fabric) custom `App.tsx` state-machine navigation — bottom-nav unresponsiveness bug-fix + `pointerEvents` belt-and-suspenders mitigation
**Confidence:** HIGH for diagnostic protocol specificity (grounded in actual `App.tsx` lines), MEDIUM for C1 being root cause (must be confirmed on device), HIGH for `pointerEvents` implementation pattern (official RN + RNav Issue #12824 concordance)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Diagnostic approach (D-01 → D-04):**
- **D-01:** Sequential investigation C1 → C2 → C3 → C4 with go/no-go gates. Instrument C1 first, reproduce on device, fix only if confirmed; otherwise advance to C2 (23-dep BackHandler stale closure), C3 (absolute-positioned wrapper touch capture), C4 (idle-touchable retention).
- **D-02:** All diagnostic `console.log` instrumentation is temporary and MUST be stripped before commits land. The reproduction matrix (NAV-03) is the only artifact retained in the repo.
- **D-03:** The human user runs all physical-device reproduction passes (iOS + Android). Claude patches code and re-instruments between passes. Simulator passes do not satisfy exit criteria.
- **D-04:** Hard 0% repro bar across the full 32+ state×tab transition matrix is required to ship. A fix reducing repro from 100% → 20% is treated as evidence that the root-cause model is wrong (pause, reassess, re-discuss).

**Belt-and-suspenders `pointerEvents` mitigation (D-05 → D-07):**
- **D-05:** Apply `pointerEvents={visible ? 'auto' : 'none'}` to keep-alive and overlay wrappers UP FRONT, before the root-cause fix lands. If it eliminates the user-visible bug, C1→C4 diagnosis continues in parallel (don't ship a masked-symptom fix).
- **D-06:** Scope: (a) all 5 keep-alive main-stack tabs — Home, Favorites, Chat, Profile, Listings — per `App.tsx:70-76`; (b) all 4 full-screen overlays — PropertyDetails, CreateListing, Tour3D, RenterListings. Auth modals (`zIndex:1000` at `App.tsx:864`) and `<Modal>` instance audits are EXPLICITLY OUT OF SCOPE up front; they become C3 territory only if 0% repro isn't met after C1/C2.
- **D-07:** Document the convention in `.planning/codebase/CONVENTIONS.md`. No reusable `<KeepAliveScreen>` component abstraction in this phase.

**Tour3D & overlay inventory (D-08 → D-10):**
- **D-08:** `isTour3DOpen`'s omission from `hideMainStackUnderOverlay` (`App.tsx:508-509`) is treated as a bug. Tour3DScreen must gate the main stack like the other three overlays. May itself BE the root cause if the bug reproduces from a Tour3D-open state.
- **D-09:** Canonical overlay inventory — the complete set of overlay-flag conditions that must hide the main stack: `!!selectedProperty`, `!!user && isCreateListingOpen`, `isRenterListingsOpen`, `isTour3DOpen`.
- **D-10:** Refactor to a single source of truth: an inline `OVERLAY_FLAGS` array combined via `.some(Boolean)`, adjacent to the state declarations (not a helper file, not a hook).

### Claude's Discretion
- Exact variable names / file location for the `OVERLAY_FLAGS` array (inline in `App.tsx` vs extracted helper).
- Exact log format and per-candidate instrumentation.
- Wording of the new `CONVENTIONS.md` entry for the keep-alive/`pointerEvents` convention.
- Whether to preemptively refactor the 23-dep `BackHandler` `useEffect` to the ref-pattern, or defer until C2 is confirmed. Default: defer.
- Android hardware-back regression testing approach within the device QA pass (D-03 scope).

### Deferred Ideas (OUT OF SCOPE)
- 23-dep `BackHandler` `useEffect` refactor to ref-pattern (`App.tsx:184-297`): only applied if C2 investigation confirms it as the cause.
- Auth modal (`zIndex:1000`) `pointerEvents` audit and `<Modal>` instance conditional-rendering audit: out of scope unless 0% repro isn't met after C1/C2.
- Reusable `<KeepAliveScreen visible={...}>` component.
- Migration to `react-navigation`.
- Crash reporter (Sentry/Crashlytics).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Bottom navigation responds to every tab tap from inside every main-stack screen (Home, Chat, Profile, Favorites, Listings, Appointments), verified on physical iOS and Android devices | Diagnostic Protocol §2 identifies the four candidate root causes and the evidence each must produce to be confirmed or ruled out. `pointerEvents` implementation §4 defines the belt-and-suspenders change that prevents the symptom regardless of which candidate proves primary. Validation Architecture §8 defines the per-transition pass/fail predicate. |
| NAV-02 | Screens pushed over the tab bar release touch capture when returning to the main stack (root-cause fix for `display: none` keep-alive) | Diagnostic Protocol C1 addresses the `hideMainStackUnderOverlay` source-of-truth refactor (D-08/D-09/D-10); §4 applies `pointerEvents` to the 4 overlays so touch capture is gated by two independent mechanisms. |
| NAV-03 | Reproduction matrix for the nav bug is recorded (which transitions trigger it, on which platforms) before the fix lands | §3 Reproduction Matrix Specification defines the full 32+ state×tab transition matrix, evidence format (video), and the pre-fix recording protocol. |
</phase_requirements>

## 1. Executive Summary

The bottom-nav unresponsiveness is almost certainly a state-machine bug in `App.tsx`, not a `BottomNavigator` component bug. Four candidate root causes exist; the planner must build the plan as a **diagnostic protocol with explicit go/no-go gates**, not a predetermined fix. The highest-probability cause (C1) is the `hideMainStackUnderOverlay` flag at `App.tsx:508-509` missing `isTour3DOpen` (and, per CONTEXT D-09, `activeTourUrl` / `activePhotosUrl` equivalents — see §2.1) — while the flag is already derived, the derivation is incomplete. C2 is a stale-closure in the 23-dep `BackHandler` `useEffect` at `App.tsx:184-297`. C3 is a transparent absolute-positioned wrapper capturing taps. C4 is long-idle touchable degradation (RN Issue #36710).

Regardless of which candidate confirms, apply the `pointerEvents` belt-and-suspenders (D-05) **up front**, before C1 diagnosis begins. It is a ~6-line change to `mainStackScreenStyle()` + `fullScreenOverlayWrap`, and it prevents this class of bug from recurring as M2 adds screens. It must NOT be treated as the fix itself — per D-04, "100% → 20% repro" is evidence the root-cause model is wrong, not a partial win.

**Primary recommendation:** Plan as 5 waves: (W0) add reproduction matrix document skeleton and instrument `App.tsx` with diagnostic logs; (W1) apply `pointerEvents` belt-and-suspenders + fix `hideMainStackUnderOverlay` via `OVERLAY_FLAGS` array (D-10); (W2) human runs device repro pass — if bug persists, advance to C2 diagnosis; (W3) escalation-only waves for C2/C3/C4 with their own gates; (W4) strip all diagnostic logs, update CONVENTIONS.md, verify Android back regression, final device QA pass. Each wave between device passes must leave the app compilable and functional — the human is the test loop.

## 2. Diagnostic Protocol (C1 → C2 → C3 → C4)

### 2.1 C1 — Stale `hideMainStackUnderOverlay` / incomplete overlay inventory

**Hypothesis:** The main stack stays `display: 'none'` after an overlay closes because the flag that hides it is derived from an incomplete set of conditions. When an overlay outside that set opens/closes, the flag doesn't toggle → `BottomNavigator` sits under an invisible-but-still-`display:flex` ancestor that somehow remains in the responder chain, OR taps on the nav hit a hidden intermediate view.

**Evidence this is the likely cause [VERIFIED: App.tsx:508-509]:**
```typescript
// Current derivation (line 508-509):
const hideMainStackUnderOverlay =
  !!selectedProperty || isRenterListingsOpen || (!!user && isCreateListingOpen);
```
Four full-screen overlay-producing states exist in the code; only three are in the derivation. `activeTourUrl` / `activePhotosUrl` are not in it — but they use **early return** at `App.tsx:461-478` so they replace the entire render tree, so they don't need to be in `hideMainStackUnderOverlay`. This matters for CONTEXT D-08 interpretation:

> **Interpretation note on "isTour3DOpen" (CONTEXT D-08):** No state variable named `isTour3DOpen` currently exists in `App.tsx`. The existing flags that drive Tour3D are `activeTourUrl` and `activePhotosUrl` (lines 37-38), and they render Tour3D via **early return** at lines 461-478, which replaces the entire app tree — so they are NOT semantically overlays over the main stack. The D-08 "bug" is therefore either (a) conceptual shorthand for "introduce a consistent flag and add it to the array for future-proofing," or (b) the user's mental model lags behind the current code. The planner's Wave 1 task must begin with a 5-minute code-read confirming which of the four states listed in D-09 actually cover every case where the main stack should be hidden. Recommended resolution: add `!!activeTourUrl` and `!!activePhotosUrl` to `OVERLAY_FLAGS` even though Tour3D currently returns early — this future-proofs against a refactor that stops using early-return and makes the array the single source of truth for "is the main stack currently eclipsed by something."
> `[ASSUMED]` — logged in §9 Assumptions Log.

#### Instrumentation (temporary — strip per D-02)

Add these logs AT THESE EXACT LINES. All use the `[NAV]` tag so they can be grepped and stripped at Wave 4.

At `App.tsx:509` (immediately after the `hideMainStackUnderOverlay` line):
```typescript
console.log('[NAV] overlay-flags', {
  selectedProperty: !!selectedProperty,
  isRenterListingsOpen,
  isCreateListingOpen,
  activeTourUrl: !!activeTourUrl,
  activePhotosUrl: !!activePhotosUrl,
  hide: hideMainStackUnderOverlay,
});
```

At `App.tsx:525` (immediately inside the `<View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>`), wrap the JSX block and add:
```typescript
console.log('[NAV] mainStack render, hide=', hideMainStackUnderOverlay);
```

In `BottomNavigator.tsx` — find the tab `onPress` handler and add at the top:
```typescript
console.log('[NAV] tab tap received', { tab, ts: Date.now() });
```

On each tab callback in `App.tsx` (the `onTabChange` callbacks at `App.tsx:697-712` region), before the state setters:
```typescript
console.log('[NAV] tab handler entered', tab);
```

#### Repro trigger

The human follows a canonical trap sequence on device:
1. Cold-start app, land on Home
2. Tap a property card → PropertyDetailsScreen opens (zIndex:2 overlay at `App.tsx:715-778`)
3. Tap back arrow → return to Home
4. Immediately tap Profile tab in `BottomNavigator`
5. Observe whether Profile renders, whether the tap logs, whether `hideMainStackUnderOverlay` stays `false`

Then permute: replace step 2 with (a) Open tour → Tour3D via `handleOpenTours`; (b) Open RenterListings from Profile → `isRenterListingsOpen = true`; (c) Open CreateListing; (d) Nested: open PropertyDetails, then from it open Tour3D, then close Tour3D, then close PropertyDetails, then tap a tab.

#### Confirmed predicate

- `[NAV] tab tap received` fires (BottomNavigator received the tap)
- `[NAV] tab handler entered` does NOT fire (state-setter was never called), OR fires but `[NAV] overlay-flags` shows `hide: true` when no overlay is visible
- OR `[NAV] overlay-flags` shows a flag stuck `true` after the user visually returned to the main stack

→ C1 is the cause.

#### Ruled-out predicate

- `[NAV] tab tap received` → `[NAV] tab handler entered` → `[NAV] overlay-flags` logs show `hide: false` and correct state transitions, but the visible render does not change (the bug still reproduces)

→ C1 is not the cause; advance to C2.

#### Fix if C1 confirmed

Implement D-10 as-written, adjacent to the state declarations around `App.tsx:75-76` (right after `tabEverMounted`), replacing lines 508-509:

```typescript
// Single source of truth for "is the main stack currently eclipsed by a full-screen overlay?"
// Adding a new overlay = add its flag here. Review checklist: if you added a new full-screen
// overlay state, did you add it to OVERLAY_FLAGS?
const OVERLAY_FLAGS = [
  !!selectedProperty,
  isRenterListingsOpen,
  !!user && isCreateListingOpen,
  !!activeTourUrl,
  !!activePhotosUrl,
];
const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);
```

Place this block **after** line 76 (the end of the `useState` declarations) so TypeScript sees all the state variables; the current line 508-509 derivation is deleted and the `hideMainStackUnderOverlay` reference at `App.tsx:525` continues to work unchanged.

#### Fallback if ruled out

Remove the `[NAV] overlay-flags` log (keep the tab-tap logs through at least C2). Advance to §2.2 C2 with the planner triggering escalation wave.

**Confidence:** HIGH (that this is the most likely cause) / MEDIUM (that the fix above cleans it — physical-device confirmation is the only decider). `[CITED: .planning/research/ARCHITECTURE.md §2]` + `[VERIFIED: App.tsx:508-509]`.

---

### 2.2 C2 — 23-dep `BackHandler` `useEffect` stale closure

**Hypothesis:** The `useEffect` at `App.tsx:184-297` re-registers the `hardwareBackPress` listener on every render because its 20-entry dependency array changes often. During the re-register window, or because a stale closure returns `true` when it should return `false`, back presses or tab taps get swallowed. The listener is Android-only (`Platform.OS !== 'android'` early-returns), so iOS-only bug reproductions rule this out.

**Evidence [VERIFIED: App.tsx:184-297, dep array lines 277-297]:** The effect's cleanup at line 276 removes the subscription; the body at line 275 registers a new one. If `hardwareBackPress` ever fires during the React batch between these two sub-steps, it either (a) has no listener at all (unlikely on iOS because of the early-return), (b) hits a stale listener with values from the previous render, returning `true` where it should return `false`. `[CITED: BackHandler docs — subscriptions called in reverse-registration order, return true to prevent further handlers](https://reactnative.dev/docs/backhandler)`.

**iOS-only reproductions immediately rule out C2.** Record iOS-vs-Android split during Wave 2 device pass.

#### Instrumentation

At `App.tsx:184` (immediately after the `useEffect(() => {`):
```typescript
const __backEffectCount = (window as any).__backEffectCount = ((window as any).__backEffectCount ?? 0) + 1;
console.log('[BACK] effect register #', __backEffectCount);
```

At `App.tsx:186` (inside `onBackPress = () => {`):
```typescript
console.log('[BACK] handler called, deps snapshot:', {
  showResetPasswordModal, showForgotPasswordModal, showLoginModal, showSignupModal,
  showAuthPrompt, propertyForTourSelection: !!propertyForTourSelection,
  activeTourUrl: !!activeTourUrl, activePhotosUrl: !!activePhotosUrl,
  isRenterListingsOpen, ownerListingsUid: !!ownerListingsUid,
  isCreateListingOpen, selectedProperty: !!selectedProperty,
  isScheduleViewingOpen, isFavoritesOpen, isAppointmentsOpen,
  isProfileOpen, isChatOpen,
  effectCount: __backEffectCount,
});
```

At `App.tsx:276` (immediately before `return () => sub.remove()`):
```typescript
console.log('[BACK] effect cleanup #', __backEffectCount);
```

#### Repro trigger

On Android only:
1. Cold-start, land on Home
2. Open Profile tab (changes state → re-register expected)
3. Open Favorites from Profile (changes state → re-register expected)
4. Observe `[BACK] effect register #` count — should increment on every state change
5. Tap a bottom-nav tab rapidly (3 taps in <500 ms) while the screen is transitioning
6. If the tab fails to change: inspect the last `[BACK] handler called` log immediately before the miss — compare `effectCount` there to the current `__backEffectCount`. If they differ, the back-handler fired with a stale closure AND the nav tap happened to collide with the re-register window.

Tab taps don't route through `BackHandler`, so C2 only fires the log if the sequence happens to coincide with a back-press (e.g., a gesture on Android 10+ that the OS interprets as back). To accelerate repro: open the system keyboard in any text input, then tap BACK, then tap a bottom-nav tab in quick succession.

#### Confirmed predicate

- Repro fires only on Android (iOS unaffected)
- `[BACK] effect register #` increments >5× per user session (expected for a 20-dep effect, but note frequency)
- A `[BACK] handler called` log appears with `effectCount` lower than the current `__backEffectCount` — proves the handler referenced stale state
- The stale call returned `true` when the visible state would have called `false` — proves the back was swallowed

→ C2 is the cause.

#### Ruled-out predicate

- Bug reproduces on iOS (C2 is Android-only — ruled out)
- OR Android-only repro but `[BACK] handler called` never fires during the miss (the tap didn't go through BackHandler)
- OR the handler fires with fresh state and returns `false` correctly but the nav still traps

→ C2 is not the cause; advance to C3.

#### Fix if C2 confirmed

Ref-pattern refactor of `App.tsx:184-297`. Keep the entire current logic; swap the effect shape to read state from a `ref`:

```typescript
// Adjacent to other state declarations, replace the current effect with:
const backStateRef = useRef({
  showResetPasswordModal, showForgotPasswordModal, showLoginModal, showSignupModal,
  showAuthPrompt, propertyForTourSelection, activeTourUrl, activePhotosUrl,
  isRenterListingsOpen, ownerListingsUid, isCreateListingOpen, selectedProperty,
  isScheduleViewingOpen, isFavoritesOpen, isAppointmentsOpen, isProfileOpen, isChatOpen,
  returnToProfileAfterFavorites, returnToProfileAfterAppointments,
});

// Mirror effect — runs every render, updates ref
useEffect(() => {
  backStateRef.current = {
    showResetPasswordModal, showForgotPasswordModal, showLoginModal, showSignupModal,
    showAuthPrompt, propertyForTourSelection, activeTourUrl, activePhotosUrl,
    isRenterListingsOpen, ownerListingsUid, isCreateListingOpen, selectedProperty,
    isScheduleViewingOpen, isFavoritesOpen, isAppointmentsOpen, isProfileOpen, isChatOpen,
    returnToProfileAfterFavorites, returnToProfileAfterAppointments,
  };
});

// Register-once effect — empty deps
useEffect(() => {
  if (Platform.OS !== 'android') return;
  const onBackPress = () => {
    const s = backStateRef.current;
    if (s.showResetPasswordModal) { setShowResetPasswordModal(false); setResetPasswordInitialOobCode(null); setShowLoginModal(true); return true; }
    if (s.showForgotPasswordModal) { setShowForgotPasswordModal(false); setShowLoginModal(true); return true; }
    // ... rest of the handler body, all reads from `s.*`, all setter calls unchanged ...
    return false;
  };
  const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
  return () => sub.remove();
}, []); // empty deps — listener attached once at mount
```

`[CITED: https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/]` — canonical ref-pattern for stale closures in hooks. Same pattern recommended by `.planning/research/ARCHITECTURE.md §2` recommended-fix-for-C2.

**Warning: this is a non-trivial refactor. Do NOT apply without C2 being confirmed** (per CONTEXT Claude's Discretion: "defer without diagnostic evidence").

#### Fallback if ruled out

Remove all `[BACK] ...` logs. Advance to §2.3 C3.

**Confidence:** HIGH that the ref-pattern is the correct fix if C2 confirms. MEDIUM-LOW that C2 is actually reproducing in the user's repro matrix (requires a narrow timing-collision window).

---

### 2.3 C3 — Absolute-positioned wrapper captures touches invisibly

**Hypothesis:** A `position: 'absolute'` `View` rendered as a wrapper around an overlay (or auth modal at `App.tsx:864`, zIndex:1000) stays in the responder chain above `BottomNavigator` even when the overlay's inner content is closed. `zIndex` alone does not gate touch; only `pointerEvents` does. `[CITED: https://github.com/react-navigation/react-navigation/issues/12824]` confirms this same failure mode in React Navigation's own `tabBarStyle: { display: 'none' }` bug: "an invisible clickable area still remains at the bottom of the screen."

**Evidence [VERIFIED: App.tsx:715-778 (PropertyDetails wrapper), 779-796 (RenterListings), 797-819 (CreateListing), 857-921 (auth modal)]:** Each overlay uses `position: 'absolute'` wrappers with explicit `zIndex` but no `pointerEvents`. D-06 scopes the Wave 1 `pointerEvents` fix to the 4 full-screen overlays and the 5 keep-alive tabs. The auth modal at line 864 (zIndex:1000) is OUT OF SCOPE up front (D-06) and becomes C3 only if 0% repro isn't met after C1/C2.

#### Instrumentation (only run if reached)

The temporary diagnostic borders approach recommended by `.planning/research/ARCHITECTURE.md §2` fix-for-C3:

Patch `App.tsx:511-519` to add a bright-colored border:
```typescript
const fullScreenOverlayWrap = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 3,
  elevation: 5,
  borderWidth: 3,           // TEMP C3 diagnostic — strip per D-02
  borderColor: 'magenta',   // TEMP C3 diagnostic — strip per D-02
};
```

Similarly patch the `selectedProperty` wrapper at `App.tsx:716-725` and the auth modal at `App.tsx:857-867` with different-colored borders (cyan for PropertyDetails, yellow for auth modal). Reproduce the bug on device with the borders visible.

Add a touch log to each wrapper:
```typescript
<View
  style={...}
  onStartShouldSetResponder={() => {
    console.log('[C3] wrapper captured touch', 'PropertyDetails'); // or whichever wrapper
    return false;
  }}
>
```

#### Repro trigger

Same canonical sequence as C1/C2. With borders visible, reproduce the trap and observe whether a colored border is visible over the bottom nav when it should have been closed. If any wrapper's `[C3] wrapper captured touch` log fires when the user taps a bottom-nav tab, that wrapper is the culprit.

#### Confirmed predicate

- A visible colored border is drawn over `BottomNavigator` when the user is visually on the main stack (overlay should be gone)
- OR `[C3] wrapper captured touch` fires on bottom-nav taps with an overlay name — proving the wrapper swallowed the tap

→ C3 is the cause.

#### Ruled-out predicate

- No border visible over `BottomNavigator` when trap reproduces
- AND `[C3] wrapper captured touch` never fires during a trapped tap

→ C3 is not the cause; advance to C4.

#### Fix if C3 confirmed

The Wave 1 belt-and-suspenders (§4) already applies `pointerEvents` to the 4 scoped overlays. If C3 confirms and the trap is coming from an auth modal wrapper at line 857-867 (which is OUT OF SCOPE in Wave 1), apply:

```typescript
// Augment auth modal wrapper style:
<View
  style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
    pointerEvents: (showResetPasswordModal || showForgotPasswordModal || showLoginModal || showSignupModal) ? 'auto' : 'none',
  }}
>
```

This is only required if the current conditional-rendering guard at line 853-856 (`{(showResetPasswordModal || showForgotPasswordModal || showLoginModal || showSignupModal) && (…)}`) is somehow leaking — which is architecturally unlikely (the entire View is only in the tree when one of those flags is true). But under Fabric's New Architecture, view tree updates can lag behind state updates during fast transitions. Adding `pointerEvents` closes the remaining gap.

#### Fallback if ruled out

Strip borders and `[C3]` logs. Advance to §2.4 C4.

**Confidence:** HIGH that `pointerEvents` fixes the class of bug (confirmed by RNav #12824). MEDIUM that C3 is primary — if C1/C2 were both ruled out and the D-05/D-06 Wave 1 `pointerEvents` changes didn't already clear the bug, C3's remaining surface is the auth modal only.

---

### 2.4 C4 — Idle-touchable retention / keep-alive degradation

**Hypothesis:** Over extended use (~10 min per `[CITED: facebook/react-native#36710]`), touchables in keep-alive screens stop firing `onPress`. The keep-alive pattern at `App.tsx:70-76, 337-388, 502-506` keeps every main-stack tab mounted indefinitely, which is exactly the scenario #36710 describes. `BottomNavigator` itself is NOT inside the keep-alive (`tabEverMounted`), but if the tap is being captured by a keep-alive screen sitting above or adjacent in the render tree, C4 fits.

**Evidence [CITED: https://github.com/facebook/react-native/issues/36710]:** Issue is unresolved as of the last maintenance window reported; labeled "Resolution: PR Submitted" but no confirmed fix in RN 0.84. Fabric / New Architecture has NOT been reported as resolving it.

#### Instrumentation

Add to `BottomNavigator.tsx` on each tab's touchable (`TouchableOpacity` or equivalent):
```typescript
<TouchableOpacity
  onPressIn={() => console.log('[C4] bottomNav onPressIn', tab, Date.now())}
  onPressOut={() => console.log('[C4] bottomNav onPressOut', tab, Date.now())}
  onPress={() => { console.log('[C4] bottomNav onPress', tab, Date.now()); onTabChange(tab); }}
>
```

#### Repro trigger

**Time-dependent repro — run AFTER C1/C2/C3 have failed:**
1. Cold-start app, note start time
2. Use the app normally for 10 minutes: tap into tabs, scroll lists, open properties
3. Every 2 minutes, tap every bottom-nav tab and log results
4. Watch for the first "onPressIn fired, onPressOut fired within a few ms, but onPress did NOT fire" — this is the #36710 signature

#### Confirmed predicate

- `[C4] bottomNav onPressIn` and `onPressOut` fire within <50 ms of each other, but `onPress` does not fire
- Bug appears only after sustained usage (≥5 min on mid-range Android), not on cold start
- Hot-reload the app → bug resets (lifecycle-dependent)

→ C4 is the cause.

#### Ruled-out predicate

- Bug reproduces on cold start within seconds (not lifecycle-dependent)
- OR `onPress` fires but nav doesn't transition

→ C4 is not the cause; reassess per D-04 ("pause, reassess, re-discuss").

#### Fix if C4 confirmed

Per `.planning/research/ARCHITECTURE.md §2` fix-for-C4: `removeClippedSubviews={true}` on the outer `FlatList` in `HomeScreen`, + unmount keep-alive screens after N minutes backgrounded or on app foreground after long absence.

**Cautionary note:** This fix changes semantics of the keep-alive pattern — the user loses tab state (scroll position, chat draft, filter state) when the unmount timer fires. If C4 confirms, re-open discussion: D-04 applies ("pause, reassess"), because at this point Phase 1's scope has expanded beyond "bug fix" into "redesign the keep-alive model."

#### Fallback if ruled out

All four candidates ruled out → reassess per D-04. The 32+ transition matrix may be showing a bug that is neither C1/C2/C3/C4 — possibly a combination, or a fifth cause not yet surfaced. Per CONTEXT §specifics, treat partial success as evidence the root-cause model is wrong.

**Confidence:** LOW-MEDIUM that C4 is primary. Included for completeness; if reached, the response is discussion-mode, not patch-mode.

## 3. Reproduction Matrix Specification (NAV-03)

### 3.1 Structure

The reproduction matrix is a pre-fix snapshot of bug frequency across all meaningful (starting-state, target-tab) transitions. **It must be recorded BEFORE any fix (including the Wave 1 `pointerEvents` change) lands** — per NAV-03, it is the baseline against which "0% repro after fix" is measured.

Matrix document location: `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md`

### 3.2 Starting states (row axis) — 9 states

Derived from the 5 keep-alive tabs + 4 overlay states identified in D-06/D-09:

| # | Starting State | How to Get There |
|---|---------------|------------------|
| S1 | Home tab (main-stack root) | Cold-start → Home |
| S2 | Favorites tab | Home → tap Favorites in BottomNavigator |
| S3 | Chat tab | Home → tap Chat |
| S4 | Profile tab | Home → tap Profile |
| S5 | Appointments screen (kept alive via `tabEverMounted.appointments`) | Profile → Appointments |
| S6 | PropertyDetails overlay open (`selectedProperty != null`, zIndex:2) | Home → tap any property card |
| S7 | CreateListing overlay open (full-screen zIndex:3) | Profile → Create Listing |
| S8 | RenterListings overlay open (full-screen zIndex:3) | Profile → View My Listings |
| S9 | Tour3D active (early-return at `App.tsx:461-478`, `activeTourUrl != null`) | PropertyDetails → Open Tours → single tour |

> **Note on S9:** Tour3D replaces the entire render tree via early-return, so "tap a bottom-nav tab from S9" is architecturally nonsensical — Tour3D itself has no bottom nav visible. Row S9's purpose is to verify that closing Tour3D (which returns through the normal render path) correctly restores the main stack and does not leave a latent "hide" state.

### 3.3 Target tabs (column axis) — 5 tabs

From `BottomNavigator` (`TabId = 'home' | 'favorites' | 'add' | 'chat' | 'profile'`):

| T1 | T2 | T3 | T4 | T5 |
|----|----|----|----|----|
| Home | Favorites | Add (Create Listing) | Chat | Profile |

**Note:** "Add" opens `CreateListingScreen` (overlay), not a tab-switch — for matrix purposes, pass = "CreateListing overlay opens."

### 3.4 Transition count

9 starting states × 5 target tabs = **45 transitions per platform**. With iOS + Android, 90 total cells. Exceeds the CONTEXT D-04 minimum of "32+" comfortably.

### 3.5 High-risk transitions (PITFALLS §1 focus)

These transitions are empirically where the bug has been reported or where the state-machine logic in `App.tsx:337-388` is most fragile. They MUST be recorded first and video-evidenced:

| ID | From | To | Why High-Risk |
|----|------|-----|---------------|
| HR-1 | S6 (PropertyDetails overlay) | any tab | Closing the zIndex:2 overlay — C1 primary target |
| HR-2 | S7 (CreateListing overlay) | any tab | Closing zIndex:3 overlay — C1 with additional `!!user` gate |
| HR-3 | S8 (RenterListings overlay) | any tab | Closing zIndex:3 overlay via its conditional `display:'flex'\|'none'` + `tabEverMounted` path (lines 779-796) |
| HR-4 | S9 (Tour3D active) → (back) → tap tab | any tab | The Tour3D early-return re-render — does the main stack's pointerEvents/display state restore correctly? |
| HR-5 | Nested: S6 → Tour3D → back to S6 → back to main → tab | any tab | Double-overlay teardown — the most state-machine-stressing sequence |
| HR-6 | Any state immediately after Android hardware back | any tab | C2 stale-closure risk window |

### 3.6 Pass/fail predicate

**PASS** for transition `(Sn, Tm)`:
- Within 1 s of tapping tab Tm, the app visually shows tab Tm's content (or overlay opens for T3 "Add")
- `BottomNavigator` remains responsive (tap another tab succeeds)

**FAIL** for transition `(Sn, Tm)`:
- Tab Tm's content does NOT appear within 1 s
- OR the tap visually registers (ripple) but no state change occurs
- OR the tap appears ignored entirely (no ripple, no state change)

> **Ambiguous outcome:** If the tab appears but the previous overlay's content is still visible beneath it / the new tab can't scroll / taps pass through to the old overlay — mark as FAIL with note. This is the D-05/D-06 `pointerEvents` failure mode.

### 3.7 Evidence format

Each transition gets one of: `✅ PASS`, `❌ FAIL`, `— N/A` (e.g., S9 → T1 is architecturally inapplicable), `? FLAKY` (reproduces inconsistently).

**Video evidence required for:**
- Every FAIL (mandatory — stored as `.planning/phases/01-nav-reliability/videos/{platform}-{Sn}-{Tm}.mp4`)
- All 6 high-risk transitions HR-1…HR-6, regardless of pass/fail
- Any FLAKY result (3 recordings minimum per flaky cell)

**Note-only evidence acceptable for:**
- Passing non-high-risk transitions — one-word `PASS` in the matrix cell is sufficient

### 3.8 Pre-fix baseline recording protocol

1. On the HEAD commit BEFORE any Wave 1 code changes land, the human builds a release build for iOS and Android
2. Human runs the full 45-cell matrix on each platform, recording every FAIL as video per §3.7
3. Matrix is committed to `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` as "Baseline (pre-fix)" section — per NAV-03 requirement "before the fix lands"
4. Wave 1 changes land
5. Human re-runs the matrix; results are appended as "Post-Wave-1" section
6. If any cell regresses from PASS to FAIL: Wave 1 introduced a regression — revert and reassess
7. If all cells PASS: Wave 1 is complete, proceed to Wave 4 (strip instrumentation, doc update, final QA)
8. If any cell remains FAIL: advance diagnostic protocol per §2 C2 → C3 → C4

### 3.9 Matrix document skeleton (planner creates in Wave 0)

```markdown
# Phase 1: Bottom-Nav Reproduction Matrix

**Baseline captured:** {date}, commit {sha-pre-wave-1}
**Platforms:** iOS {device/ver}, Android {device/ver}

## Baseline (pre-fix)

### iOS
| From \ To | T1 Home | T2 Favs | T3 Add | T4 Chat | T5 Profile |
|-----------|---------|---------|--------|---------|------------|
| S1 Home   | N/A     | {P/F}   | {P/F}  | {P/F}   | {P/F}      |
| ...       |         |         |        |         |            |

### Android
{same table}

### High-risk transitions (HR-1…HR-6) — video-evidenced
- HR-1 iOS: {P/F} — video: videos/ios-S6-T1.mp4 — notes: ...
- ...

## Post-Wave-1 (pointerEvents + OVERLAY_FLAGS)
{re-run results}

## Post-Wave-N (if C2/C3/C4 escalation reached)
{re-run results}
```

## 4. pointerEvents Belt-and-Suspenders Implementation

### 4.1 Change shape

Two edits in `App.tsx` — one to the keep-alive helper, one to the overlay wrapper.

**Edit 1 — `mainStackScreenStyle` at `App.tsx:502-506`:**

Before:
```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({
    flex: 1,
    display: visible ? 'flex' : 'none',
  }) as const;
```

After:
```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({
    flex: 1,
    display: visible ? 'flex' : 'none',
    pointerEvents: visible ? 'auto' : 'none',
  }) as const;
```

This single edit propagates to all 5 keep-alive screens that use `mainStackScreenStyle(show*)`: Favorites (line 527), Appointments (line 545), AccountSettings (line 560), Profile, Schedule, Chat, Home — via the existing consumers D-06 scopes.

> **Verify at plan time:** Grep `mainStackScreenStyle(` in `App.tsx` and confirm every keep-alive wrapper uses it. Current code at lines 526-656 region shows uniform usage — confirmed at research time, re-confirm at plan time since the file is actively edited.

**Edit 2 — `fullScreenOverlayWrap` at `App.tsx:511-519`:**

The tricky part: `fullScreenOverlayWrap` is a single style object used by two different overlay call sites, but they have different visibility semantics:
- RenterListings at line 779-780 wraps with `{...fullScreenOverlayWrap, display: isRenterListingsOpen ? 'flex' : 'none'}` (kept mounted via `renterListingsEverMounted`)
- CreateListing at line 797-819 conditionally mounts — so when the wrap is rendered, it IS visible

The correct pattern is NOT to add `pointerEvents` to the base `fullScreenOverlayWrap` object (that would apply the same value to both), but to augment each call site:

For RenterListings at line 780:
```typescript
<View style={[
  fullScreenOverlayWrap,
  { display: isRenterListingsOpen ? 'flex' : 'none' },
  { pointerEvents: isRenterListingsOpen ? 'auto' : 'none' },
]}>
```

For CreateListing at line 798 (always visible when rendered — conditional mount):
```typescript
<View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
```

For PropertyDetails wrapper at line 716-725 (conditional mount — no keep-alive):
```typescript
<View
  style={{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 2, elevation: 4,
    pointerEvents: 'auto',
  }}
>
```

For Tour3D: early-return at lines 461-478 replaces the entire tree, so there is no "wrapper" to gate. The `TourSelectionScreen` render at line 823-829 is a conditional mount and requires no change.

### 4.2 Prop vs style.pointerEvents — RN 0.84 / Fabric decision

`[VERIFIED: React Native docs, 2025]`: Both `<View pointerEvents="none">` (prop form) and `<View style={{ pointerEvents: 'none' }}>` (style form) work on RN 0.84 native (iOS + Android Fabric).

`[CITED: https://github.com/expo/expo/issues/33290, https://github.com/react-navigation/react-navigation/issues/12441]`: The **prop form is deprecated** (deprecation warning on web; native warnings expected in future RN releases). The style form is the forward-looking shape.

**Recommendation:** Use the **style form** (`style={{ ..., pointerEvents: 'auto'|'none' }}`) throughout this phase. It is:
- Not deprecated
- Consistent with RN web / cross-platform expectations
- Already used elsewhere in the codebase in style objects (e.g., `src/components/TourHeroCard.tsx:39` uses the prop form, which works but is dated)

Values used: `'auto'` (receive events) and `'none'` (do not receive or propagate events). The other two values (`'box-none'`, `'box-only'`) are not needed for this phase.

### 4.3 Fabric / New Architecture interaction with `display: 'none'` + `pointerEvents: 'none'`

`[CITED: https://reactnative.dev/blog/2025/08/12/react-native-0.81]`: On Fabric, accessibility sets `isClickable=true` by default or based on `pointerEvents` value — so explicitly setting `pointerEvents: 'none'` propagates to native `isClickable=false`, eliminating both touch capture AND accessibility focus on hidden screens.

`[CITED: RNav Issue #12824]`: The `display: 'none'` + responder-live bug is confirmed in React Navigation itself; adding `pointerEvents: 'none'` is the standard workaround and works on both old and new architecture.

No Fabric-specific caveats apply to this implementation. The combination `display: 'none'` + `pointerEvents: 'none'` is redundant-safe-by-design (belt + suspenders per D-05).

### 4.4 CONVENTIONS.md update (D-07)

Add to `.planning/codebase/CONVENTIONS.md` under a new `## Keep-alive and overlay screens` subsection. Placement: after the existing `## Styling Approach` section (around line 257 of the current file), before the trailing `---`:

```markdown
## Keep-alive and overlay screens

Keep-alive (tab) screens and full-screen overlays in `App.tsx` MUST use BOTH `display`
and `pointerEvents` to gate visibility, not either one alone.

**Keep-alive tab pattern:**
```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({ flex: 1, display: visible ? 'flex' : 'none', pointerEvents: visible ? 'auto' : 'none' }) as const;
```

**Full-screen overlay pattern:**
```typescript
<View style={[fullScreenOverlayWrap, { pointerEvents: isOpen ? 'auto' : 'none' }]}>
```

**Why:** `display: 'none'` removes the view from the layout tree, but on RN's responder system
(both old and Fabric) an absolute-positioned wrapper or descendant can still capture touches
meant for the bottom nav. See `.planning/phases/01-nav-reliability/01-RESEARCH.md` §4 and
[RNav #12824](https://github.com/react-navigation/react-navigation/issues/12824). Use style-based
`pointerEvents` (not the deprecated prop form).

**On adding a new full-screen overlay:** add the overlay's visibility flag to the `OVERLAY_FLAGS`
array in `App.tsx` so `hideMainStackUnderOverlay` keeps working. Review checklist item.
```

### 4.5 Install gate

None. `pointerEvents` is a core RN API — no dependencies to install, no native rebuild required beyond the normal Metro hot reload cycle.

## 5. Regression Risks Per Candidate Fix

### 5.1 Wave 1 (pointerEvents + OVERLAY_FLAGS — always applied)

| Risk | Likelihood | How to detect | Mitigation |
|------|-----------|---------------|------------|
| Keep-alive tab's transient UI (a timer, socket listener, `setInterval`) depends on touch events to stay active | LOW | Tab appears frozen / chat badge stops updating when inactive | The library (`ChatService.connectSocket`) is event-driven, not touch-driven. `pointerEvents:'none'` blocks touches, NOT timers or subscriptions. Regression spot-check: after Wave 1, background Chat for 60 s, return → unread count should still update. |
| `TourHeroCard.tsx` already uses prop-form `pointerEvents="none"` on a gradient layer | NONE (orthogonal) | — | Unchanged. Documented for completeness; not our fix site. |
| A future overlay added in M2 skips the `OVERLAY_FLAGS` array → reintroduces C1 | MEDIUM (future) | `grep OVERLAY_FLAGS` in PR review | Covered by D-07 CONVENTIONS entry. Enforcement = review, not linting. |
| `OVERLAY_FLAGS.some(Boolean)` is evaluated on every render | NONE (perf) | — | 5 boolean coercions per render is negligible; current derivation does 3 already. No `useMemo` needed. |

### 5.2 C2 fix — BackHandler ref-pattern refactor (if escalated)

| Risk | Likelihood | How to detect | Reproduction matrix cell to verify |
|------|-----------|---------------|------------------------------------|
| Back-handler fires with stale callback references (setters themselves are stable — React guarantees setter identity) | NONE | — | — |
| Back navigation order regresses (priority stack at lines 188-270 has 20 branches — one accidentally moved changes pop order) | HIGH | Open 3 overlays nested, press back 3×, confirm pop order matches pre-refactor | HR-5 (nested teardown) — run Android side 3× |
| `returnToProfileAfterFavorites` / `returnToProfileAfterAppointments` paths at lines 249-262 break (these branch-and-setter patterns are the most subtle) | MEDIUM | Open Profile → Favorites → back → verify Profile re-opens | Add as a specific device-QA checkpoint in Wave 2.5 |
| Listener registered twice on Fast Refresh during dev | LOW | Android-only, dev-build only — console shows duplicate `[BACK] effect register` from previous session | Strict-mode double-invoke protection in React 19 / RN 0.84 handles this. Not a release risk. |
| iOS unaffected (Platform guard at line 185) | NONE — verified | — | — |
| Back on root Home exits the app (return `false` at line 272) | Unchanged — verify post-refactor | Android: at S1 Home, press back → app backgrounds | Add as device-QA checkpoint |

**Android hardware back regression (Success Criterion 5) — concrete checklist:**

Triggered by Wave 2 / C2 escalation only. Human verifies on Android device after the ref-pattern lands:

- [ ] From Home, press back → app backgrounds (default behavior, returns `false`)
- [ ] From PropertyDetails overlay, press back → PropertyDetails closes, Home visible
- [ ] From CreateListing overlay, press back → CreateListing closes, returns to whichever tab was active
- [ ] From RenterListings, press back → RenterListings closes
- [ ] From Tour3D (early-return), press back → Tour3D closes, returns to PropertyDetails (if that was the prior state) or Home
- [ ] From Profile → Favorites, press back → Favorites closes, Profile re-opens (returnToProfileAfterFavorites path)
- [ ] From Profile → Appointments, press back → Appointments closes, Profile re-opens (returnToProfileAfterAppointments path)
- [ ] From Chat thread, press back → Chat closes
- [ ] From Login modal (no user), press back → modal closes, main stack visible
- [ ] From nested Login → ForgotPassword → ResetPassword, press back 3× → unwinds in order: reset → forgot → login → modal-closed
- [ ] From AuthPrompt, press back → AuthPrompt closes
- [ ] From PropertyDetails → Tour3D, press back 2× → Tour3D closes, PropertyDetails closes, Home visible

All 12 must pass before merging the C2 ref-pattern change.

### 5.3 C3 fix — auth modal pointerEvents (if escalated)

| Risk | Likelihood | How to detect | Mitigation |
|------|-----------|---------------|------------|
| Auth flow (Login/Signup/ForgotPassword/ResetPassword) becomes non-interactive if the pointerEvents condition misjudges visibility | HIGH if introduced | Try to tap anything on any auth screen → nothing happens | The conditional form shown in §2.3 mirrors the enclosing JSX gate at line 853. Test: open each of the 4 auth screens after the fix, verify every input and button works. |
| Other existing `Modal` instances in the codebase still capture touches when hidden | LOW, but out of scope | Trap returns on a path involving a contact modal or delete modal | Explicitly out of scope per D-06. If observed, scope expansion required. |

### 5.4 C4 fix — keep-alive unmount timer (if escalated)

| Risk | Likelihood | How to detect | Mitigation |
|------|-----------|---------------|------------|
| User loses scroll position / draft text / filter state when unmount fires | CERTAIN (semantic change) | Any UX test | If C4 confirms, D-04 "pause, reassess" applies — this is beyond Phase 1 scope. |

## 6. Goal-Backward Verification (5 Success Criteria → Evidence)

Each Success Criterion from ROADMAP.md Phase 1, mapped to concrete physical-device evidence that plan-checker's `must_haves` section requires.

### SC1 — "Tapping any bottom-nav tab (Home, Chat, Profile, Favorites, Listings, Appointments) from any main-stack screen switches to that tab on both physical iOS and physical Android (0% repro across the full 32+ state×tab transition matrix)"

**Evidence:**
- Post-fix `01-REPRO-MATRIX.md` shows all 45 cells × 2 platforms = 90 cells marked `PASS`, with zero `FAIL` or `FLAKY`
- Video evidence for all 6 high-risk transitions (HR-1…HR-6) on both iOS and Android (12 videos minimum)
- Human's signed-off statement in the matrix document: "Verified on {iOS device model, iOS version}, {Android device model, Android version} on {date}"

### SC2 — "A reproduction matrix document exists in the repo recording which transitions used to trap and which platforms they trapped on, with video or notes, before the fix landed"

**Evidence:**
- File exists: `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md`
- Contains "Baseline (pre-fix)" section with commit SHA predating any Wave 1 changes
- Contains at least one `FAIL` cell in the baseline (proving the bug existed and was observed) OR a documented statement if the human genuinely cannot reproduce it (in which case Phase 1 scope collapses to the `pointerEvents` mitigation only + reassess)
- Contains "Post-Wave-1" (and subsequent escalation waves if triggered) showing the progression to 0% repro
- Videos for every baseline `FAIL` cell stored under `videos/` sub-directory

### SC3 — "Returning from any overlay (PropertyDetails, CreateListing, RenterListings, Tour3D) re-enables the main stack's touch responders — no 'taps go nowhere' state is reachable"

**Evidence:** HR-1 through HR-5 transitions all PASS on both platforms. Specifically:
- HR-1 (iOS, Android): From S6 (PropertyDetails), tap each of T1 T2 T3 T4 T5 sequentially → each succeeds, videoed
- HR-2 (iOS, Android): From S7 (CreateListing), same
- HR-3 (iOS, Android): From S8 (RenterListings), same
- HR-4 (iOS, Android): From S9 (Tour3D closed back to main), same
- HR-5 (iOS, Android): Nested S6 → Tour3D → back → main → tap tab, succeeds

### SC4 — "New screens added later inherit the fix: keep-alive screens apply `pointerEvents={isVisible ? 'auto' : 'none'}` (belt-and-suspenders) so the class of bug cannot recur on M2 additions"

**Evidence:**
- `App.tsx:502-506` diff shows `mainStackScreenStyle(visible)` now includes `pointerEvents: visible ? 'auto' : 'none'`
- `App.tsx` diff at overlay wrapper sites (716-725, 780, 798) shows style-based `pointerEvents`
- `.planning/codebase/CONVENTIONS.md` contains the new `## Keep-alive and overlay screens` subsection per §4.4
- `grep "OVERLAY_FLAGS" App.tsx` returns the array definition — proves D-10 shape landed

### SC5 — "Android hardware back button still pops overlays in the correct order (no regression introduced by back-handler refactor to ref-based pattern)"

**Evidence path depends on whether C2 escalation was triggered:**

If C2 was NOT escalated (Wave 1 alone fixed the bug):
- Back-handler is unchanged — no regression possible
- Spot-check: 4 baseline back-press scenarios on Android (back from PropertyDetails, back from Profile → Favorites, back from nested auth modals, back from Home exits app). Notes in repro matrix.

If C2 WAS escalated (ref-pattern refactor landed):
- All 12 checkpoints in §5.2 "Android hardware back regression concrete checklist" verified PASS
- Videoed: 3 nested-overlay teardown sequences
- Videoed: Profile → Favorites → back → Profile re-opens (the `returnToProfile*` path — most-subtle-to-miss)

## 7. React Native 0.84 / New Architecture Landmines

Only the ones that are real and load-bearing for Phase 1. Nothing padded.

### 7.1 `props.pointerEvents` deprecation — use style form

`[CITED: https://github.com/expo/expo/issues/33290, https://github.com/react-navigation/react-navigation/issues/12441]`

The deprecation warning `props.pointerEvents is deprecated. Use style.pointerEvents` is live on RN web and will land on native in a future RN release. **Impact on this phase:** use `style={{ pointerEvents: ... }}`, not `<View pointerEvents=...>`. Already incorporated in §4.

### 7.2 Fabric touch system treats `display: 'none'` + responder the same as Paper

`[CITED: https://reactnative.dev/blog/2025/08/12/react-native-0.81 — Fabric accessibility change]` + `[CITED: RNav #12824]`

Fabric does NOT automatically fix the `display: 'none'` touch-capture bug. It does set `isClickable` based on `pointerEvents`, which means once the belt-and-suspenders `pointerEvents: 'none'` is applied, Fabric propagates non-clickability to native a11y — but the underlying responder-capture bug on the old architecture persists equivalently on the new one. **Impact:** the Wave 1 fix is correct under Fabric; nothing Fabric-specific to add.

### 7.3 Fabric view tree updates can lag state updates during fast transitions

`[ASSUMED — general knowledge of Fabric async commit model; not verified against a specific issue]`

Under Fabric, view tree commits are scheduled asynchronously on the native side. Fast state transitions (e.g., closing an overlay then immediately tapping a tab within <100 ms) may see the tab tap processed against a view tree still carrying the overlay. **Impact:** `pointerEvents` gating is the correct defense because it is checked at responder-resolution time on native, which happens after the commit. This reinforces §4's recommendation to keep both `display` and `pointerEvents` — if either alone were sufficient, the commit-latency race could be weaponized. Logged in §9 Assumptions.

### 7.4 Stale closures in hook-based `useEffect` — unchanged behavior under Fabric

`[CITED: https://reactnative.dev/docs/backhandler, https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/]`

Stale-closure semantics are a pure React concern, not RN/Fabric-specific. The C2 ref-pattern refactor is platform-agnostic. `[VERIFIED: App.tsx imports `useRef` already at line 1]` — no new imports required.

### 7.5 React 19 Strict Mode / double-invoke effects

`[ASSUMED — React 19 preserves React 18 strict-mode double-invoke; not independently verified for RN 0.84]`

In dev mode, effects run twice under Strict Mode. The register-once pattern in §2.2 C2 fix (empty deps) handles this correctly — the cleanup runs between invokes, so only one listener is registered at steady-state. **Impact:** during Wave 0 instrumentation, the `[BACK] effect register #` counter will show 2× the expected increments in dev — not a bug. Production builds are unaffected. Logged in §9.

### 7.6 `react-native-maps 1.27.1` exact-pin / no-caret

`[VERIFIED: package.json:23]`

Not a Phase 1 landmine per se, but noted: Home and PropertyDetails use maps. If the C3 diagnostic adds borders to absolute-positioned wrappers that contain a map view, the map may re-render or behave oddly. **Impact:** during C3 instrumentation only, pin `react-native-maps` is unchanged; don't bump it.

### 7.7 `LayoutAnimation.setLayoutAnimationEnabledExperimental(true)` at `HomeScreen.tsx:20-23` conflicts with Fabric

`[CITED: .planning/codebase/CONCERNS.md "LayoutAnimation enabled globally for Android"]`

Pre-existing latent issue. Impact on this phase: if Wave 1's `pointerEvents` change triggers layout re-flows that intersect the Android `LayoutAnimation` call, behavior is undefined. Mitigation: the `pointerEvents` change does NOT alter layout (it's a responder-system flag), so LayoutAnimation is not triggered. Monitored risk, not expected to manifest. Logged as a possible debugging hint if Wave 1 produces a surprising regression.

### 7.8 Android BackHandler.exitApp behavior on Android 14+

`[ASSUMED — BackHandler docs don't call out 14+ changes]`

The return-`false` path at `App.tsx:272` lets the OS handle the back press, which on Android 14+ with predictive back gesture can behave differently from Android 13. Not in scope for Phase 1 unless C2 escalates AND the human's test device is Android 14+. If so, verify that `back from Home exits app` in §5.2 checklist works on Android 14+ (predictive back should still work — it's opt-in and the app doesn't opt in).

## 8. Validation Architecture

The phase's only acceptable evidence is physical-device QA (D-03). This section specifies how that QA loop is structured so the workflow's VALIDATION.md can be generated mechanically.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual physical-device QA (NOT Jest, NOT Detox, NOT automated) |
| Config file | `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` (the matrix IS the test spec) |
| Quick run command | Human executes canonical trap sequence §2.1 from S6 → T5 Profile on both platforms |
| Full suite command | Human executes all 45 cells × 2 platforms = 90 transitions per §3 |

> **Why no automated tests:** CONTEXT D-03 forbids simulator/automated evidence. PITFALLS §3 ("touch-capture bugs only reproduce on real hardware"). `.planning/codebase/CONCERNS.md` confirms the codebase has effectively zero test coverage and no Detox setup — adding a test framework is out of scope for a polish bug-fix phase.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Validation Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| NAV-01 | Bottom nav responds to every tab tap from every main-stack screen on iOS+Android physical | manual-device-qa | Human runs full 45×2 matrix per §3; records in `01-REPRO-MATRIX.md` | ❌ Wave 0 creates skeleton |
| NAV-02 | Screens pushed over tab bar release touch capture on return | manual-device-qa | Human runs HR-1…HR-5 high-risk transitions per §3.5 with video | ❌ Wave 0 creates skeleton |
| NAV-03 | Reproduction matrix recorded BEFORE fix lands | artifact-check | `git log --oneline -- .planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` shows the baseline commit predates any `App.tsx` touch-handling edits | ❌ Wave 0 creates skeleton, Wave 0.5 commits baseline |

### Sampling Rate

This phase is **not** code-level unit-test sampled. The sampling hierarchy is:

- **Per instrumentation change** (Wave 0, 2, 3): Re-run the canonical trap sequence §2.1 on one platform, human verifies logs appear as designed. <5 min.
- **Per wave merge**: Re-run the 6 high-risk transitions (HR-1…HR-6) on iOS + Android. ~20 min.
- **Phase gate (pre-merge to main)**: Full 45×2 matrix + video evidence per §3.7. ~2 hours with device setup.

### Wave 0 Gaps

Wave 0 creates test infrastructure BEFORE any `App.tsx` changes land:

- [ ] `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` — skeleton per §3.9
- [ ] `.planning/phases/01-nav-reliability/videos/` directory — created, `.gitkeep` added if empty
- [ ] Agreement on test devices: which specific iOS device/version, which Android device/version — recorded at top of `01-REPRO-MATRIX.md`
- [ ] Baseline matrix run on pre-change HEAD commit — recorded in "Baseline (pre-fix)" section of matrix doc
- [ ] Baseline matrix committed to git — this IS NAV-03's satisfying artifact

**No framework install command.** The validation framework is "the human runs the matrix and writes the results."

### What counts as "validation passing"

At the Phase 1 gate:
1. `01-REPRO-MATRIX.md` has a complete Baseline section with at least one FAIL entry (OR a discovered-not-reproducible note — which triggers reassess per §3.8)
2. `01-REPRO-MATRIX.md` has a complete Post-Wave-N section with all 90 cells `PASS`, zero `FAIL`, zero `FLAKY`
3. `videos/` contains at minimum 12 video files (6 HR × 2 platforms) for the Post-Wave-N sign-off
4. All diagnostic `console.log` calls tagged `[NAV]`, `[BACK]`, `[C3]`, `[C4]` are stripped — verify via `grep -n "\[NAV\]\|\[BACK\]\|\[C3\]\|\[C4\]" App.tsx src/components/BottomNavigator.tsx` returning zero matches (per D-02)
5. `.planning/codebase/CONVENTIONS.md` has the new `## Keep-alive and overlay screens` subsection
6. `App.tsx:502-506` shows `pointerEvents: visible ? 'auto' : 'none'` in `mainStackScreenStyle`
7. `App.tsx` overlay wrap sites show style-based `pointerEvents`
8. `App.tsx` has `OVERLAY_FLAGS` array matching D-10 shape

## 9. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "isTour3DOpen" in CONTEXT D-08/D-09 is conceptual shorthand for the pre-existing `activeTourUrl`/`activePhotosUrl` flags, which already use early-return at App.tsx:461-478 | §2.1, §1 | If user intended literal `isTour3DOpen` as a new state, planner must introduce it during Wave 1. Low risk — the recommended `OVERLAY_FLAGS` includes `!!activeTourUrl` and `!!activePhotosUrl` which future-proof against a refactor to either shape. **User confirmation recommended at plan-phase time.** |
| A2 | Under Fabric, view tree commits can lag state updates during fast transitions, making `pointerEvents` a necessary complement to `display` | §7.3 | Low risk — even if the race doesn't exist, `pointerEvents` is the official RNav #12824 workaround regardless. The belt-and-suspenders justification holds either way. |
| A3 | React 19 Strict Mode preserves React 18's double-invoke-effect behavior in dev on RN 0.84 | §7.5 | Very low risk — if wrong, the `[BACK] effect register #` instrumentation will show normal (not 2×) increments in dev. Diagnostic hint only, not load-bearing for the fix. |
| A4 | Android 14+ predictive-back does not activate when the app does not opt in via `android:enableOnBackInvokedCallback` | §7.8 | Low risk — if wrong, hardware back behavior on Android 14 devices may differ from documented; covered by device-QA checklist §5.2. |
| A5 | C4 (idle touchable degradation per #36710) is NOT fixed in RN 0.84 Fabric | §2.4 | Low risk — issue remains open. If C4 turns out to be fixed, Phase 1 benefits (one less candidate to diagnose). |
| A6 | The user's bug reports are based on actual device usage, and the baseline matrix WILL produce at least one FAIL cell when recorded | §3.8, §6 SC2 | If baseline produces zero FAILs, Phase 1 is not solving a real bug — scope collapses to "apply the `pointerEvents` belt-and-suspenders prophylactically" and D-04 "pause, reassess" triggers. Plan must have a branch for this outcome. |

**User confirmation needed on A1 before Wave 1 lands** — a 1-line question: "Does `isTour3DOpen` in CONTEXT mean the existing `activeTourUrl`/`activePhotosUrl` flags, or are you proposing a new flag?" The plan should surface this for discuss-phase clarification OR include both-possibilities handling in the Wave 1 task description.

## 10. Open Questions

1. **Does the human have access to BOTH iOS and Android physical devices for the full matrix run?**
   - What we know: D-03 mandates physical-device, both platforms
   - What's unclear: Device specifics (model, OS version) are undeclared — material for reproducing C2 (Android 14+ back gesture) and C4 (RAM-dependent idle degradation)
   - Recommendation: Planner's Wave 0 task MUST capture device IDs in `01-REPRO-MATRIX.md` header; absence = release-blocking dependency surfaced pre-implementation.

2. **Will baseline matrix reproduce the bug reliably?**
   - What we know: User has reported the bug (implicit from Phase 1 existing)
   - What's unclear: Whether the repro is deterministic or flaky; whether it's 100% or intermittent
   - Recommendation: Wave 0.5 baseline run MUST complete before Wave 1 code changes land. If baseline cannot reproduce, trigger D-04 "pause, reassess" — Phase 1 may collapse to the `pointerEvents` prophylactic alone with an explicit acknowledgement that root-cause is unverified.

3. **Is Tour3D actually accessible as a navigation target in user testing?**
   - What we know: Tour3D is gated on `property.tours.length > 0` at `App.tsx:420`
   - What's unclear: Whether any test listings have tours — if not, S9 and HR-4/HR-5 cells are not runnable
   - Recommendation: Wave 0 includes verifying at least one test listing with ≥1 tour exists on the Railway backend; if not, seeding one is a Wave 0 sub-task.

4. **Is the 23-dep `BackHandler` effect (lines 277-297) also 20 deps? Precise count matters for instrumentation.**
   - What we know: CONTEXT D-01 references "23-dep BackHandler"; CONCERNS.md at `App.tsx:184-297` says "19 dependencies"; the actual count at lines 278-297 is 20 entries
   - What's unclear: All three counts (19, 20, 23) are used in different docs — which is canonical?
   - Recommendation: Non-load-bearing discrepancy. Correct count is 20 per direct read of the code. Research uses "23-dep" label per CONTEXT D-01 for consistency with user-facing terminology.

## 11. Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Physical iOS device (human-owned) | D-03 device QA | TBD — human to confirm | iOS 16+ assumed (RN 0.84 baseline) | None — release-blocking |
| Physical Android device (human-owned) | D-03 device QA | TBD — human to confirm | Android 10+ assumed (RN 0.84 baseline) | None — release-blocking |
| Xcode + iOS build toolchain | iOS archive build for device install | ✓ (inferred — git status shows ios pbxproj edits) | TBD | None — release-blocking, also Phase 8 requirement |
| Android SDK + gradle | Android build for device install | ✓ (inferred — git status shows build.gradle edits) | TBD | None — release-blocking |
| Screen-recording capability (iOS: Control Center record; Android: system recorder) | Video evidence per §3.7 | ✓ (built into iOS 12+ and Android 11+) | N/A | Photos/burst as fallback acceptable but inferior |
| Railway backend (properties with tours) | S9 Tour3D testing | Probably ✓ | N/A | See Q3 above |
| No external libraries required for this phase | — | — | — | — |

**Missing dependencies with no fallback:**
- Physical device access on both platforms — if the human does not have access to one or both, Phase 1 cannot exit. Planner must confirm at Wave 0.

**Missing dependencies with fallback:**
- None.

## 12. Sources

### Primary (HIGH confidence)
- `.planning/codebase/ARCHITECTURE.md` — provider tree, nav state machine, keep-alive pattern [VERIFIED — read in research]
- `.planning/codebase/CONCERNS.md` — 23-dep back-handler, App.tsx god-file, `hideMainStackUnderOverlay` toggle [VERIFIED]
- `.planning/research/ARCHITECTURE.md §2` — C1/C2/C3/C4 candidate ranking, fix patterns [CITED]
- `.planning/research/PITFALLS.md §1, §3` — state-machine bug framing, `display:none` touch-capture failure mode [CITED]
- `App.tsx:36-76, 184-297, 337-388, 461-478, 502-519, 715-822` — direct code verification [VERIFIED]
- [RN BackHandler docs](https://reactnative.dev/docs/backhandler) — return-true cancellation, subscription semantics [CITED]
- [RNav #12824](https://github.com/react-navigation/react-navigation/issues/12824) — canonical `display:none` invisible-touchable bug in React Navigation [CITED]
- [facebook/react-native #36710](https://github.com/facebook/react-native/issues/36710) — idle touchable degradation, unresolved as of RN 0.84 [CITED]
- [CoreUI stale closures in hooks](https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/) — canonical ref-pattern [CITED]

### Secondary (MEDIUM confidence)
- [expo/expo #33290](https://github.com/expo/expo/issues/33290) — `props.pointerEvents` deprecation warning [CITED]
- [react-navigation/react-navigation #12441](https://github.com/react-navigation/react-navigation/issues/12441) — web deprecation propagation [CITED]
- [RN 0.81 blog, Fabric accessibility](https://reactnative.dev/blog/2025/08/12/react-native-0.81) — Fabric `isClickable` + `pointerEvents` interaction [CITED]
- [LogRocket — pointer events in RN](https://blog.logrocket.com/exploring-react-native-pointer-events/) — `auto`/`none`/`box-none`/`box-only` semantics [CITED]

### Tertiary (LOW confidence, validation required at plan-phase)
- Assumption A1 (isTour3DOpen shorthand interpretation) — user to confirm
- Assumption A6 (baseline matrix will reproduce bug deterministically) — empirical only

## 13. Metadata

**Confidence breakdown:**
- Diagnostic protocol (C1 → C4): HIGH — each candidate has a specific instrumentation + predicate grounded in actual `App.tsx` lines
- C1 being primary cause: MEDIUM — matches symptoms in CONCERNS.md and ARCHITECTURE.md, but physical-device confirmation is the only decider
- `pointerEvents` implementation: HIGH — RN documented + RNav #12824 workaround confirmed
- Reproduction matrix scope: HIGH — derived mechanically from `tabEverMounted` record + overlay inventory
- Fabric landmines: HIGH on documented items, LOW-MEDIUM on assumed-behavior items (logged in §9)

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days; RN 0.84 is stable-branch, but RN patch releases may alter Fabric pointerEvents behavior)

## RESEARCH COMPLETE

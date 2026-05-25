---
id: 260525-fjw
type: quick
status: complete
completed: 2026-05-25
one_liner: "Fix iOS keyboard covering chat composer on ChatThreadScreen + ChatComposeScreen by hoisting the screen-level library `<KeyboardAvoidingView>` (`react-native-keyboard-controller`) outside the chat header — header now sits INSIDE the KAV's coordinate system, so iOS keyboard-avoidance math compensates correctly. Preserves the M1 Phase 2 KBD-02 / §6 SC3.a phase-wide grep gate (`keyboardVerticalOffset` ban) and the load-bearing `behavior=\"padding\"` prop from M1 commit 47a52b7."

commits:
  - hash: a0dc245
    type: fix
    scope: quick-260525-fjw
    file: src/screens/ChatThreadScreen.tsx
    summary: "Hoist KeyboardAvoidingView outward — header + loading conditional + FlatList + inputRow now all inside KAV; non-loading branch wrapped in explicit React fragment."
  - hash: fd588eb
    type: fix
    scope: quick-260525-fjw
    file: src/screens/ChatComposeScreen.tsx
    summary: "Hoist KeyboardAvoidingView outward — header + previewCard + inputRow now all inside KAV; intermediate `<View style={styles.composeContent}>` wrapper deleted (KAV with `keyboardView` style {flex:1, justifyContent:'flex-end'} takes over the role)."

files_modified:
  - src/screens/ChatThreadScreen.tsx
  - src/screens/ChatComposeScreen.tsx

key_decisions:
  - "Structural hoist over offset-prop tuning — the bug was renderHeader() rendering as a sibling above KAV (outside its coordinate system), not the KAV props. Hoisting preserves the project-wide `keyboardVerticalOffset` ban (M1 Phase 2 KBD-02 / §6 SC3.a) without any per-screen magic number."
  - "Preserved `behavior=\"padding\"` prop verbatim on both KAVs — load-bearing per M1 hotfix commit 47a52b7 (library KAV no-ops without an explicit `behavior` prop; M1 disproven assumption A8)."
  - "Left `styles.composeContent: { flex: 1 }` in the ChatComposeScreen StyleSheet as harmless dead-code per plan's recommendation (zero functional cost; smaller diff footprint to review). Plan offered cleanup as opt-in Q2 — deferred."
  - "Did NOT swap KeyboardAvoidingView for KeyboardAwareScrollView on either chat screen — chat is a FlatList-above + pinned-input layout, not a form. KASV is the wrong primitive for this shape."

cross_links:
  - ".planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-05-SUMMARY.md (M1 Plan 02-05 — chat KAV pattern origin)"
  - ".planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-06-SUMMARY.md (M1 Plan 02-06 — Tier 1 rows 7+8 iOS+Android PASS recorded 2026-04-23 baseline)"
  - "git commit 47a52b7 (M1 hotfix — disproved A8 by re-adding `behavior=\"padding\"` after Plan 02-05 stripped it; load-bearing for library KAV)"
  - ".planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-PATTERNS.md (M1 Phase 2 canonical keyboard-handling pattern doc)"
---

# Quick Task 260525-fjw: Fix iOS Keyboard Covering Chat Input Summary

## Problem

On iPhone, opening a chat (`ChatThreadScreen`) OR tapping the message button on a property detail (`ChatComposeScreen`) and then tapping the composer `TextInput` caused the system keyboard to RIDE OVER the composer — the input was hidden by the keyboard.

User-reported scope: confirmed on iOS. Android not yet tested by user (M1 Phase 2 baseline 2026-04-23 had Tier 1 rows 7+8 PASS on Android Moto G XT2513V; non-blocking).

## Root cause

Both chat screens had the same anti-pattern: `renderHeader()` was rendered as a **sibling above** the screen-level `<KeyboardAvoidingView>` (the drop-in from `react-native-keyboard-controller`), placing the header **outside** the KAV's coordinate system. The library KAV computes `padding` from the keyboard top to its own bottom — but since the header consumed ~52pt + safe-area top above the KAV, the avoidance math under-compensated, leaving the composer under the keyboard.

The KAV props (`behavior="padding"`, no `keyboardVerticalOffset`) were already correct per the M1 Phase 2 canonical pattern + the M1 hotfix `47a52b7` that re-added the load-bearing `behavior="padding"` prop. The bug was **structural**, not propositional.

## Fix shape

Project-canonical: hoist the `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` outward so it is a direct child of `<SafeAreaView edges={['top']}>`, wrapping the header + the screen body. Identical structural transform on both files.

```
BEFORE                                     AFTER
─────────────────────────────────────────  ─────────────────────────────────────────
<SafeAreaView edges={['top']}>             <SafeAreaView edges={['top']}>
  {renderHeader()}        ← outside KAV       <KeyboardAvoidingView behavior="padding">
  <KeyboardAvoidingView behavior="padding">     {renderHeader()}  ← inside KAV
    <FlatList />                                {loading ? <Spinner/> : (
    <View inputRow />                             <>
  </KeyboardAvoidingView>                           <FlatList />
</SafeAreaView>                                     <View inputRow />
                                                  </>
                                                )}
                                              </KeyboardAvoidingView>
                                            </SafeAreaView>
```

`ChatComposeScreen.tsx` also dropped the now-redundant intermediate `<View style={styles.composeContent}>` wrapper (the hoisted KAV with `styles.keyboardView = { flex: 1, justifyContent: 'flex-end' }` takes over its layout role).

## Tasks executed

### Task 1 — `src/screens/ChatThreadScreen.tsx` (commit `a0dc245`)

Restructured the return statement at lines 195–238 of the pre-edit file. Hoisted the single `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` to be the direct child of `<SafeAreaView>`. The `loading ? <Spinner/> : (<FlatList/> + <View inputRow/>)` conditional was preserved; the non-loading branch became an explicit `<>...</>` React fragment to keep `FlatList` and `inputRow` as sibling JSX nodes returned from the conditional.

Net diff: 1 file changed, 41 insertions(+), 39 deletions(-). All hooks, callbacks, REPORT_REASONS, the entire StyleSheet, every i18n key, every theme token preserved verbatim. The FlatList `onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}` (auto-scroll-to-latest-message) preserved verbatim per `must_haves.truths`.

**Verify gates (all PASS):**
- Gate 1: exactly 1 `<KeyboardAvoidingView` opening tag ✓
- Gate 2: exactly 1 `</KeyboardAvoidingView>` closing tag ✓
- Gate 3: `behavior="padding"` count = 1 ✓
- Gate 4: KAV imported from `'react-native-keyboard-controller'` (library, not RN built-in) ✓
- Gate 5: file-local `keyboardVerticalOffset` count (excl. comments) = 0 ✓
- Gate 6: phase-wide `grep -rn 'keyboardVerticalOffset' src/ | wc -l` = 0 ✓
- Gate 7: SafeAreaView line (196) < KAV opening line (197) < `renderHeader()` invocation line (198) ✓ — header is now INSIDE KAV
- Gate 8: `flatListRef.current?.scrollToEnd({ animated: true })` count = 1 (auto-scroll preserved verbatim) ✓
- Gate 9: i18n diff empty ✓
- Gate 10: `npx tsc --noEmit` introduces zero NEW errors mentioning `ChatThreadScreen.tsx` — file shows 0 tsc errors ✓

### Task 2 — `src/screens/ChatComposeScreen.tsx` (commit `fd588eb`)

Restructured the return statement at lines 92–142 of the pre-edit file. Hoisted the single `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` to be the direct child of `<SafeAreaView>`. **Deleted the intermediate `<View style={styles.composeContent}>` wrapper** from the JSX (as the plan instructs). The `styles.composeContent: { flex: 1 }` StyleSheet entry was LEFT in place (per plan recommendation + constraint #2 — harmless dead-code, zero functional cost, smaller diff to review; cleanup is opt-in Q2 deferred).

Net diff: 1 file changed, 26 insertions(+), 28 deletions(-). All hooks, the `owner` / `ownerName` / `imageUrl` derivations, the `handleSend` callback, every i18n key, every theme token preserved verbatim. The `keyboardView` style `{ flex: 1, justifyContent: 'flex-end' }` preserved verbatim (it's what pins `inputRow` to the bottom of the screen now that it lives directly under the hoisted KAV).

**Verify gates (all PASS):**
- Gate 1: exactly 1 `<KeyboardAvoidingView` opening tag ✓
- Gate 2: exactly 1 `</KeyboardAvoidingView>` closing tag ✓
- Gate 3: `behavior="padding"` count = 1 ✓
- Gate 4: KAV imported from `'react-native-keyboard-controller'` ✓
- Gate 5: file-local `keyboardVerticalOffset` count (excl. comments) = 0 ✓
- Gate 6: phase-wide `grep -rn 'keyboardVerticalOffset' src/ | wc -l` = 0 ✓
- Gate 7: SafeAreaView < KAV opening < `renderHeader()` invocation (inside the post-`return (` block) ✓
- Gate 8: zero `style={styles.composeContent}` usages in JSX (wrapper removed) ✓
- Gate 9: `keyboardView: { flex: 1, justifyContent: 'flex-end' }` style preserved verbatim ✓
- Gate 10: i18n diff empty ✓
- Gate 11: `npx tsc --noEmit` introduces zero NEW errors on `ChatComposeScreen.tsx` — proven by stash-diff: pre-edit baseline shows the same 6 pre-existing `Property` type errors on lines 48, 76, 102, 108 (`property.imageUrl`, `property.images`, `property.title`) which are 100% unchanged by this edit. Same pre-existing-error family STATE.md documents for the 260515-iqi quick task (3 `App.tsx Property.tours` errors) — M3 D-20 nested `Property` type cutover left these as pre-existing project debt. ✓

### Task 3 — On-device QA checkpoint (USER, BLOCKING per plan, but non-blocking per dispatch constraints — pending)

The plan's Task 3 is a `checkpoint:human-verify` device walk on iPhone (and opportunistically Android). The dispatch directive says: "Do NOT block on it. Document it in SUMMARY.md as pending-user-QA and return."

**Status: AWAITING USER DEVICE WALK** — see `## Pending User QA` section below.

## Combined exit gates (all PASS after Task 1 + Task 2)

| Gate | Expected | Actual | Status |
|------|----------|--------|--------|
| Phase 2 KBD-02 / §6 SC3.a — `grep -rn 'keyboardVerticalOffset' src/ \| wc -l` | 0 | 0 | ✓ |
| ChatThreadScreen.tsx — `<KeyboardAvoidingView behavior="padding"` count | 1 | 1 | ✓ |
| ChatComposeScreen.tsx — `<KeyboardAvoidingView behavior="padding"` count | 1 | 1 | ✓ |
| ChatThreadScreen.tsx — `from 'react-native-keyboard-controller'` count | 1 | 1 | ✓ |
| ChatComposeScreen.tsx — `from 'react-native-keyboard-controller'` count | 1 | 1 | ✓ |
| Atomic commit hygiene — 2 commits, 1 file each | 2 commits, 1 file each | 2 commits, 1 file each | ✓ |
| Zero i18n diff across both commits | empty diff | empty diff | ✓ |
| Zero NEW tsc errors on either chat file (vs. pre-edit baseline) | 0 new (6 pre-existing remain) | 0 new (6 pre-existing remain — proven by stash-diff) | ✓ |
| Other source files NOT touched | only `src/screens/ChatThreadScreen.tsx` + `src/screens/ChatComposeScreen.tsx` | exactly those two files | ✓ |

## Phase 2 inheritance check (other keyboard-controller surfaces unchanged)

| Surface | Expected | Actual | Status |
|---------|----------|--------|--------|
| `LoginScreen.tsx` — `KeyboardAwareScrollView` count | ≥2 | 3 | ✓ |
| `SignupScreen.tsx` — `KeyboardAwareScrollView` count | ≥2 | 3 | ✓ |
| `ForgotPasswordScreen.tsx` — `KeyboardAwareScrollView` count | ≥2 | 3 | ✓ |
| `ResetPasswordScreen.tsx` — `KeyboardAwareScrollView` count | ≥2 | 3 | ✓ |
| `AccountSettingsScreen.tsx` — `react-native-keyboard-controller` imports | ≥1 | 1 | ✓ |
| `LandlordApplicationScreen.tsx` — same | ≥1 | 1 | ✓ |
| `MediaCurationScreen.tsx` — same | ≥1 | 1 | ✓ |
| `AdminVerificationScreen.tsx` — same | ≥1 | 1 | ✓ |
| `CreateListingScreen.tsx` — same | ≥1 | **N/A — file deleted in M3 D-22 commit `19bde0d`** ("atomic-delete CreateListingScreen + CreateListingForm; extract admin verification"). Replaced by `ContextualListingFlow`. Plan's inheritance gate is stale — current state is correct per STATE.md sentinel `create-listing-screen-removed`. | ✓ (gate stale; current state correct) |
| `App.tsx` — `KeyboardProvider` count | ≥2 | 3 | ✓ |

## Existing chat tests re-run

`find src -name '*Chat*.test.*' -o -name '*chat*.test.*'` returned 0 matches at execution time. No existing chat tests to re-run. The 2 fixes are pure JSX structural transforms; no unit-testable logic change. Real-world verification is Task 3 on-device QA.

## Deviations from plan

**None — plan executed exactly as written.**

- Plan's `<action>` blocks for both tasks were applied byte-for-byte.
- All structural gates PASSed first try.
- No Rule 1/2/3 auto-fixes triggered (no bugs surfaced during the structural transform; the only tsc output on either chat file is the pre-existing `Property` type error set that already exists on `main`, unchanged by these edits — same family as STATE.md's documented `App.tsx Property.tours` pre-existing errors).
- No Rule 4 architectural decisions needed.

## Round 1 on-device QA (2026-05-25) — layout regression caught + fixed inline

User opened `ChatComposeScreen` on iOS for the round-1 walk. The keyboard-coverage bug was confirmed fixed — composer no longer hidden by the keyboard. **However, a static-layout regression introduced by the KAV hoist was caught:** the header (Back / title / calendar icon), property preview card, and message input were all bottom-aligned with a huge empty black region above them, on both keyboard-up and keyboard-down states.

### Root cause of the regression

The original `ChatComposeScreen` `styles.keyboardView` style was `{ flex: 1, justifyContent: 'flex-end' }`. That `justifyContent: 'flex-end'` was load-bearing in the original layout — the KAV wrapped ONLY the `inputRow` (single child), and the `flex-end` justification pushed that single input to the bottom of the KAV's vertical space (the parent `composeContent` view gave the KAV `flex: 1` of the remaining space below the header + previewCard).

After commit `fd588eb` hoisted the KAV outward to wrap `renderHeader() + previewCard + inputRow`, the KAV had three children — and `justifyContent: 'flex-end'` faithfully bottom-aligned all three (header included). That's the screenshot bug. The keyboard fix itself was correct; the layout regression was a styling oversight in the hoist.

`ChatThreadScreen` had a companion latent bug: the `<FlatList>` had no explicit `flex: 1`, relying on its position as a direct sibling-of-input child of the KAV (with the KAV taking `flex: 1` of its parent). After the hoist, the FlatList sits in a `<>...</>` Fragment with the inputRow as siblings of the header inside the KAV — without an explicit flex it can collapse to zero height and the inputRow doesn't stick to the bottom. Less visible than the ChatCompose regression (no preview card to wedge between header and input) but the same class of issue.

### Round 1 fix-forward commits

| Commit | File | Change |
|--------|------|--------|
| `8175715` | `src/screens/ChatComposeScreen.tsx` | Drop `justifyContent: 'flex-end'` from `styles.keyboardView`; insert `<View style={{ flex: 1 }} />` spacer between `previewCard` and `inputRow`. Header sits at top, previewCard right after, spacer fills middle, inputRow sticks to bottom. |
| `412df18` | `src/screens/ChatThreadScreen.tsx` | Add `style={styles.messagesContainer}` (new `{ flex: 1 }` style) to the `<FlatList>` so it fills the middle between the header and the inputRow now that it has a header sibling inside the KAV. |

### Round 1 verification

- `grep -rn 'keyboardVerticalOffset' src/` → **0** (KBD-02 gate still preserved)
- `behavior="padding"` retained on both KAVs (M1 commit `47a52b7` invariant untouched)
- `npx tsc --noEmit` → 0 new errors attributable to either fix-forward edit. The errors that surface on `ChatComposeScreen.tsx` lines 48/76/102/108 are the same Property-type baseline already documented in STATE.md for `260515-iqi` ("3 pre-existing App.tsx Property.tours errors untouched").
- `ChatComposeScreen` `composeContent: { flex: 1 }` StyleSheet entry — left in place (still dead code; planner's Q2 cleanup remains deferred).

### Lesson — added to memory

A hoist that changes a wrapper's child count can silently invalidate a `justifyContent` or implicit-flex assumption that was correct under the old structure. When restructuring a KAV's children, audit the styles on the KAV AND on the previously-implicit-flex children (e.g., FlatList). Captured as a feedback note alongside [[m1-keyboard-kbd-02-invariants]].

## Round 2 on-device QA (2026-05-25) — PASSED

User confirmed round 2 on-device QA passed on iPhone after the round-1 layout-regression fix-forward (commits 8175715 + 412df18 + b17b2cb). Both `ChatComposeScreen` and `ChatThreadScreen` now show the chat header at the top, body in the middle, and the message composer pinned above the keyboard with no header / FlatList / send-button regression. Task is closed.

## Pending User QA Round 2 — ARCHIVED (verbatim, for audit trail)

The plan's Task 3 verify steps as documented before round-2 ran:

**iOS (BLOCKING — reported bug surface, iPhone 15 Pro Max baseline per M3 close):**

1. `npx react-native run-ios` on physical iPhone (or via Xcode).
2. Sign in → open a property → tap chat / message button → land on **ChatComposeScreen**.
   - Tap composer `TextInput`.
   - Expected: keyboard rises; composer (placeholder "Type your message...") visible above keyboard; property preview card visible above composer; chat header (back + property title + calendar icon) visible at top and tappable.
   - Regression check: type at least one full line — multiline composer should grow up to `maxLength={2000}` with all of it visible; tap Send; conversation thread opens.
3. Now in **ChatThreadScreen** (from step 2 or by opening any existing conversation from the chat inbox):
   - Tap composer `TextInput` (placeholder "Type a message...").
   - Expected: keyboard rises; composer visible above keyboard; most-recent message in FlatList visible above composer; chat header (back / property title / report flag / calendar) visible at top.
   - Regression check: send a message — new message bubble auto-scrolls into view (`flatListRef.current?.scrollToEnd`).
   - Regression check: tap back button with keyboard open — first tap dismisses keyboard OR pops back to chat list (either acceptable per M1 Phase 2 row 7); header remains tappable throughout.
4. Repeat steps 2 + 3 in BOTH dark mode AND light mode (CLAUDE.md `useTheme()` parity requirement). Theme tokens already drive all colors; no regression expected.

**Android (RECOMMENDED — Moto G XT2513V baseline per M3 close; user reported "not tested yet"):**

5. `npx react-native run-android` on physical Android device (or emulator).
6. Repeat steps 2 + 3 + 4 on Android. Expected: identical visual outcome to iOS. Library KAV with `behavior="padding"` is iOS-effective but near-inert on Android (Android relies on `windowSoftInputMode="adjustResize"` set in M1 Phase 2). No regression vs. M1 Phase 2 baseline (Tier 1 rows 7+8 PASS recorded 2026-04-23).
   - Android hardware back-button check: with keyboard open, hardware back dismisses keyboard (system default); second back pops to chat list (per `App.tsx` Phase 1 `BackHandler` `useEffect`).

**Resume signal:** Type "approved" if both chat surfaces show the composer above the iOS keyboard (and Android if tested) with no header / FlatList / send-button / report-flow / back-navigation regression. Type a description otherwise.

**Escape-hatch note (1–2 px gap, unlikely with structural fix):** If a 1–2 px gap surfaces between composer and keyboard on iOS, the canonical adjustment is `paddingBottom` on `styles.inputRow` in the affected file — NOT re-introducing `keyboardVerticalOffset` (which would break the §6 SC3.a grep gate). Flag only if observed.

## Open question disposition

- **Q1 (codify "library KAV must be outermost child of SafeAreaView" as a project convention)** — DEFERRED to user. Not part of this fix's two atomic commits. If user wants to codify, follow-on quick task adds a note to `.planning/codebase/CONVENTIONS.md` OR a future M4 phase's PATTERNS doc.
- **Q2 (remove unused `styles.composeContent: { flex: 1 }` entry on `ChatComposeScreen.tsx`)** — LEFT in StyleSheet per plan's recommendation + dispatch constraint #2 ("If the plan offered the dead-style cleanup as a follow-up question only, leave `styles.composeContent` in the StyleSheet"). Harmless dead-code, opt-in cleanup for the next time this file is touched.

## Cross-links to M1 Phase 2 inheritance

- `.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-05-SUMMARY.md` — M1 Plan 02-05 "chat KAV pattern origin"; established the FlatList-above + inputRow shape but did NOT codify the "header must sit inside KAV" rule (this fix discovers and applies that rule via structural hoist).
- `.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-06-SUMMARY.md` — M1 Plan 02-06 Tier 1 rows 7+8 iOS+Android PASS recorded 2026-04-23. That PASS measured the post-Plan-02-05 baseline; this fix re-stabilises the same surface after a regression surfaced 2026-05-25.
- Git commit `47a52b7` — M1 hotfix that re-added the load-bearing `behavior="padding"` prop after Plan 02-05 stripped it (disproved research §9 A8). Preserved verbatim by this fix.
- `.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-PATTERNS.md` — M1 Phase 2 canonical keyboard-handling pattern doc.

## Self-Check: PASSED

**Created files:**
- `.planning/quick/260525-fjw-fix-ios-keyboard-covering-chat-input-on-/260525-fjw-SUMMARY.md` — written this commit (will land in the orchestrator's docs commit per dispatch directive)

**Commits in repo:**
- `a0dc245` — `fix(quick-260525-fjw): hoist KAV outward on ChatThreadScreen…` — verified present in `git log` ✓
- `fd588eb` — `fix(quick-260525-fjw): hoist KAV outward on ChatComposeScreen…` — verified present in `git log` ✓

**Files modified across both commits (verified via `git diff HEAD~2 HEAD --name-only | sort -u`):**
- `src/screens/ChatComposeScreen.tsx` ✓
- `src/screens/ChatThreadScreen.tsx` ✓

No other source file touched. No i18n change. No theme-token change. No dependency change. Phase 2 KBD-02 grep gate intact (`grep -rn 'keyboardVerticalOffset' src/` returns 0).

---
phase: 2
slug: universal-keyboard-handling
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Source:** Generated from `02-RESEARCH.md` §7 "Validation Architecture" (lines 490–569).
> **Project testing bar:** Manual physical-device QA for M1 — no Jest/Detox automation for keyboard behavior in this phase (CLAUDE.md "Key Conventions" → "Testing bar"). All grep-based gates are mechanical; matrix walkthrough is human-driven on real hardware.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual device QA + grep-based mechanical gates (no Jest/Detox for keyboard behavior in M1) |
| **Config file** | none — `02-KEYBOARD-MATRIX.md` is the test contract (created in Wave 3) |
| **Quick run command** | `grep -rn "keyboardVerticalOffset" src/` (must return 0 lines) |
| **Full suite command** | Manual matrix walkthrough on both physical devices (iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16) per D-12, D-13 |
| **Estimated runtime** | Mechanical gates: ~5 seconds. Manual matrix: ~30–45 minutes per platform pass. |

---

## Sampling Rate

- **After every task commit:** Run the per-task `grep` listed in the verification map below (mechanical, ~1s each).
- **After every plan wave:** Run the wave gate from RESEARCH §4 (Wave 0/1/2/3 each have explicit go/no-go criteria).
- **Before `/gsd-verify-work`:** Full Tier 1 + Tier 2 matrix must be filled with all `Pass` cells; all §6 mechanical exit gates must succeed.
- **Max feedback latency:** Mechanical gates: <5s. Matrix walk: ~45 min per platform — accepted because the project's M1 testing bar is manual physical-device QA.

---

## Per-Task Verification Map

> Task IDs assigned by the planner; rows below map RESEARCH-defined behaviors to mechanical gates so the planner has a ready-made acceptance-criteria source. The planner may add or split tasks; every added task must inherit a row here or document why none applies.

| Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Manual Step |
|------|------|-------------|-----------------|-----------|-------------------|-------------|
| Wave 0 install | 0 | KBD-03 | reanimated v4 + worklets present in package.json; Babel plugin LAST in `babel.config.js` plugins array | grep | `grep -c "react-native-reanimated" package.json` returns 1; `grep -c "react-native-worklets" package.json` returns 1; `tail -n 5 babel.config.js \| grep -c "react-native-worklets/plugin"` returns 1 | iOS: `pod install` exits 0. Android: `cd android && ./gradlew clean` exits 0; `npx react-native run-android` builds successfully on Moto G. iOS: `npx react-native run-ios --device "iPhone"` builds successfully. |
| Wave 0 install | 0 | KBD-03 | keyboard-controller installed AFTER reanimated peer dep stable | grep | `grep -c "react-native-keyboard-controller" package.json` returns 1 | — |
| Wave 1 provider | 1 | KBD-02 | `<KeyboardProvider>` wraps all sub-providers in `App.tsx` between `SafeAreaProvider` and `ThemeProvider` (per D-03) | grep | `grep -n "KeyboardProvider" App.tsx` returns ≥2 lines (import + JSX) | Visually inspect `App.tsx` provider tree shape unchanged otherwise: `SafeAreaProvider → KeyboardProvider → ThemeProvider → LanguageProvider → AuthProvider`. App opens to first screen on both platforms without crash. |
| Wave 2 auth | 2 | KBD-01 | LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen wrap their content in `KeyboardAwareScrollView` from `react-native-keyboard-controller` | grep | `grep -l "KeyboardAwareScrollView" src/screens/{Login,Signup,ForgotPassword,ResetPassword}Screen.tsx` returns 4 paths | Tier 1 matrix rows 1–4: tap each input on iOS + Android, confirm field stays above keyboard. |
| Wave 2 settings + listing | 2 | KBD-01 | AccountSettingsScreen + both ScrollViews in CreateListingScreen.tsx use KASV (per D-07) | grep | `grep -c "KeyboardAwareScrollView" src/screens/CreateListingScreen.tsx` returns ≥2 (admin-verify branch + main form); `grep -c "KeyboardAwareScrollView" src/screens/AccountSettingsScreen.tsx` returns 1 | Tier 1 matrix rows 5–6 (CreateListing) and Tier 2 row 9 (AccountSettings) — sample 3 inputs spanning top/middle/bottom on the form. |
| Wave 2 chat | 2 | KBD-01, KBD-02 | ChatThreadScreen + ChatComposeScreen use library's `KeyboardAvoidingView` (NOT RN's); `keyboardVerticalOffset` removed (per D-09) | grep | `grep "from 'react-native-keyboard-controller'" src/screens/ChatThreadScreen.tsx` returns 1; same for ChatComposeScreen.tsx; `grep -c "keyboardVerticalOffset" src/screens/Chat{Thread,Compose}Screen.tsx` returns 0 | Tier 1 matrix rows 7–8: send a message in each, confirm composer rises with keyboard, FlatList not pushed off-screen. |
| Wave 3 verify | 3 | KBD-01, KBD-04 | Matrix doc populated with all-Pass cells; both Fabric release builds succeed | manual | `test -f .planning/phases/02-universal-keyboard-handling/02-KEYBOARD-MATRIX.md`; `grep -c "Fail" 02-KEYBOARD-MATRIX.md` returns 0 | Walk the full Tier 1 + Tier 2 matrix on both devices. Capture device IDs in the matrix header. Confirm Fabric (`newArchEnabled=true`) is the build mode. |
| Wave 3 cleanup (discretionary) | 3 | KBD-02 | HomeScreen workaround comment + structural workaround removed if device test confirms safe | grep | `grep -c "Header outside FlatList to prevent TextInput focus issues" src/screens/HomeScreen.tsx` returns 0 (if cleanup taken) OR a reasoned note in matrix doc explaining why it stays | Tier 2 matrix row 10: tap search input on both devices; if KASV under the FlatList resolves focus issue, remove the workaround. If not, leave + document in matrix. |
| Wave 3 exit | 3 | KBD-02 | Zero magic-number keyboard offsets remain anywhere in `src/` | grep | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` returns 0 | — |

*Status legend (planner fills during plan generation): ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> No new test infrastructure to install — manual QA bar holds. Wave 0 here means the **install precondition** (reanimated v4 + worklets + Babel plugin + iOS pod install + clean Android build) per RESEARCH §2 / §4 Wave 0. The planner encodes this as a `[BLOCKING]` gate before Wave 1 begins.

- [ ] `react-native-reanimated@^4.0.0` installed (Fabric-only, current latest 4.3.x verified compatible with RN 0.84 per RESEARCH §2.1)
- [ ] `react-native-worklets@^0.8.0` installed (separate peer of reanimated v4 — load-bearing correction per RESEARCH §2 "Key Findings")
- [ ] `react-native-worklets/plugin` is the **LAST** entry in `babel.config.js` `plugins` array (NOT `react-native-reanimated/plugin` — that's the legacy v3 name)
- [ ] iOS: `pod install` from `ios/` exits 0; `Podfile.lock` committed
- [ ] Android: `cd android && ./gradlew clean` exits 0
- [ ] Both libs resolve: `npm ls react-native-reanimated react-native-worklets react-native-keyboard-controller` shows all three with no peer-dep warnings
- [ ] Both platforms build cleanly: iOS `npx react-native run-ios --device` + Android `npx react-native run-android` exit 0 on physical devices
- [ ] Rollback plan documented in PLAN.md: revert `package.json`, `yarn.lock` / `package-lock.json`, `babel.config.js`, `ios/Podfile.lock`; `cd android && ./gradlew clean`

---

## Manual-Only Verifications

> Per D-13 (physical device only), every behavioral verification below is manual on iPhone 15 Pro Max / iOS 26.4 and Moto G XT2513V / Android 16.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard never covers focused input on Tier 1 screens (Auth ×4, CreateListing both branches, ChatThread, ChatCompose) | KBD-01 | Keyboard avoidance is Fabric-level rendering behavior under New Architecture — not testable via Jest; physical hardware required because soft-nav-bar / safe-area heights vary per device | For each Tier 1 row, on each platform: open the screen, tap each listed input, observe the keyboard rises and the focused field stays visible above the keyboard. Cell entry: `Pass` + one-line note. Any obscured field = `Fail` with photo or written description. |
| Smoke verification on AccountSettings + HomeScreen search | KBD-01 (Tier 2) | Same as above; lower risk because fewer inputs / less complex layout | Tap one input on each platform; confirm field stays above keyboard. Cell: `Pass` / `Fail` / `N/A`. |
| HomeScreen workaround removal safe (Discretionary per CONTEXT.md) | KBD-02 | Requires visual confirmation that removing the workaround doesn't reintroduce search-input focus issue on iOS Fabric | Remove workaround comment + structural patch in a separate commit. Re-test HomeScreen search on both devices. If issue returns, revert that single commit; document in matrix. |
| Fabric / New Architecture confirmed for the test build | KBD-04 | Library compatibility under bridgeless mode is RN-version-sensitive; verified by build flag + boot success on real device | Capture in matrix header: "Tested on Fabric build (`newArchEnabled=true`), iOS device ID `<id>`, Android device ID `<id>`, library versions: reanimated `<v>`, worklets `<v>`, keyboard-controller `<v>`." |
| Android hardware back button still dismisses overlays correctly (regression check from Phase 1's BackHandler refactor) | NAV-01 (cross-phase) | Phase 1 closed with BackHandler ref-based pattern at `App.tsx:184–297`; library installs new keyboard-event handlers — confirm no conflict | On Android device: open Chat composer, tap input (keyboard rises), press hardware back → keyboard dismisses (library default). Press back again → composer closes / nav pops. Document outcome in matrix as a footnote row. |

---

## Validation Sign-Off

- [ ] All planner-generated tasks have either a grep-based `<automated>` verify OR a Wave 0 dependency (install) OR an entry in the manual matrix table above
- [ ] Sampling continuity: no 3 consecutive tasks without an automated grep verify (mechanical sanity check between manual passes)
- [ ] Wave 0 covers all install precondition items above; planner gates Wave 1 entry on Wave 0 completion
- [ ] No watch-mode flags (no Jest watcher exists for this phase)
- [ ] Feedback latency for mechanical gates < 5s; manual matrix ~45 min per platform (accepted per M1 testing bar)
- [ ] `02-KEYBOARD-MATRIX.md` populated with all-Pass cells before `/gsd-verify-work` runs
- [ ] `nyquist_compliant: true` set in this file's frontmatter once planner confirms every task in `02-*-PLAN.md` files maps cleanly to a row in the verification map above

**Approval:** GRANTED 2026-04-23 — Plan 02-06 matrix walk complete. Tier 1 16/16 Pass, Tier 2 4/4 Pass, L10 6/6 Pass, Android back-button 2/2 Pass. All 12 mechanical grep gates `Actual` match `Expected`. HomeScreen workaround comment removed per D-Discretion. Disproved assumption A8 (library KAV requires explicit `behavior` prop) and committed the fix as `47a52b7`.

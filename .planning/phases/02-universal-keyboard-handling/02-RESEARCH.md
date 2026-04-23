# Phase 2: Universal Keyboard Handling — Research

**Researched:** 2026-04-22
**Domain:** React Native keyboard handling under New Architecture (Fabric + bridgeless + Hermes) on RN 0.84
**Confidence:** HIGH (build on top of locked D-01..D-14 in `02-CONTEXT.md`; one load-bearing correction surfaced — see §2.1)

## User Constraints (from CONTEXT.md)

### Locked Decisions

> Verbatim from `02-CONTEXT.md` `<decisions>`. Research builds on these — does not re-decide.

- **D-01:** Library is `react-native-keyboard-controller@1.21.6` (or later 1.21.x).
- **D-02:** `react-native-reanimated` is NOT in `package.json` today. Install order is load-bearing: reanimated FIRST, with its Babel plugin added as the LAST entry in `babel.config.js`, then `pod install` on iOS, clean Android build, THEN `react-native-keyboard-controller`. Budget 1–2 hours.
- **D-03:** `<KeyboardProvider>` placement: inside `SafeAreaProvider`, wrapping `ThemeProvider → LanguageProvider → AuthProvider` in `App.tsx`.
- **D-04:** `KeyboardAwareScrollView` for >1-input screens; library's `KeyboardAvoidingView` (NOT RN's) for chat composer + single-input modals. Banned: KASV+KAV in same tree, KASV nested in ScrollView, RN's built-in KAV.
- **D-05:** FlatList screens with inputs use `renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}`.
- **D-06:** Android `windowSoftInputMode="adjustResize"` already set in `android/app/src/main/AndroidManifest.xml:25`. Confirmed.
- **D-07:** BOTH top-level `ScrollView`s in `CreateListingScreen.tsx` (lines 455 admin-verify, 497 main form) convert to KASV. Internal structure NOT touched.
- **D-08:** Phase 4/5 may reshape KASV wrappers — accepted, "minor rework, not throwaway."
- **D-09:** Drop-in swap of RN's `KeyboardAvoidingView` with library's in `ChatThreadScreen.tsx:183` and `ChatComposeScreen.tsx:114`. Remove `keyboardVerticalOffset` entirely. ~5 lines per screen.
- **D-10:** `KeyboardStickyView` for Chat — DEFERRED to M2.
- **D-11:** `KeyboardToolbar` — DEFERRED to Phase 5.
- **D-12:** Risk-weighted device verification. Full test: Auth (4 screens), CreateListing (both branches), ChatThread, ChatCompose. Smoke test: AccountSettings, HomeScreen search. Out: ScheduleViewing.
- **D-13:** Physical-device only — iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16.
- **D-14:** Textual matrix entries, no video required.

### Claude's Discretion

- Wave granularity for the phase plan.
- Whether to remove `HomeScreen.tsx:465` workaround comment after `KeyboardProvider` lands.
- Whether `PasswordTextInput` needs wrapper-side changes (expected: no).
- Whether to batch the 4 auth screens into one plan or split.
- Confirm Android back-button (BackHandler at `App.tsx:214-327`) does not conflict with library's keyboard-dismiss-on-back behavior during Chat testing.

### Deferred Ideas (OUT OF SCOPE)

- `KeyboardStickyView` for Chat (M2 polish).
- `KeyboardToolbar` accessory bar (Phase 5).
- Full exhaustive test matrix — replaced by D-12 risk-weighted matrix for M1.
- Landscape-orientation keyboard testing — JayTap is portrait-only.
- `HomeScreen.tsx:465` workaround removal — opportunistic during Phase 2 verify, otherwise left as polish-pass debt.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KBD-01 | Keyboard never covers focused input on every input-bearing screen, iOS + Android physical | §3 per-screen mechanics + §7 matrix axes |
| KBD-02 | Single root-level solution, not per-screen patching | §2 + §6 SC2 (`KeyboardProvider` at `App.tsx:949` slot) |
| KBD-03 | `react-native-reanimated` peer-dep gate | §2.1 (corrected to v4 + `react-native-worklets`) |
| KBD-04 | New Architecture (Fabric) compat verified on physical-device builds | §2.4 + §8 + §6 SC4 |

---

## §1 Phase Scope Summary

Install `react-native-reanimated@^4.3.0` + `react-native-worklets@^0.8.x` (peer of reanimated v4) → install `react-native-keyboard-controller@^1.21.6` → wire `<KeyboardProvider>` between `SafeAreaProvider` and `ThemeProvider` in `App.tsx:948-960` → on 9 input-bearing screens, swap RN built-ins for library equivalents per D-04/D-07/D-09. Outcome: every TextInput in the app inherits universal keyboard avoidance from one root provider, the `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` magic-number anti-pattern is deleted, and CreateListingScreen's tall form scrolls focused fields above the keyboard on both physical iPhone 15 Pro Max / iOS 26.4 and Moto G XT2513V / Android 16. The Wave-0 install precondition is the load-bearing risk; everything downstream is mechanical drop-ins.

---

## §2 Install Precondition Mechanics (Wave 0)

> **Critical clarification on D-02:** The CONTEXT decision says "reanimated FIRST, Babel plugin LAST." That is correct in spirit. However, **the current reanimated release (4.3.0, latest dist-tag, verified `npm view react-native-reanimated dist-tags` 2026-04-22)** ships as two packages — `react-native-reanimated@^4.3.0` + `react-native-worklets@^0.8.x` — and the Babel plugin moved from `'react-native-reanimated/plugin'` to **`'react-native-worklets/plugin'`**. The planner must encode this in Wave 0; otherwise Babel will silently produce a working bundle without worklet transformation and animations will fail at runtime with no compile error. Source: [VERIFIED: `npm view react-native-reanimated dist-tags` 2026-04-22 — `latest: '4.3.0'`, `reanimated-3: '3.19.5'`]; [CITED: docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started — "react-native-worklets/plugin has to be listed last"]; [CITED: docs.swmansion.com migration-from-3.x — "Reanimated 4.x supports only the New Architecture and drops support for the Legacy Architecture (Paper) entirely"].

JayTap has `newArchEnabled=true` (verified `android/gradle.properties`) and Fabric on iOS (verified RCTNewArch enabled per `.planning/codebase/STACK.md:22`), so the v4 line is the right pick. Do NOT pin to v3.x to "be safe" — v3.19.5 is in maintenance only and has no stated guarantee for RN 0.84; v4 explicitly targets the New Architecture this app is on.

### §2.1 Compatible version pins (verified)

| Package | Pin | Why | Source |
|---------|-----|-----|--------|
| `react-native-reanimated` | `^4.3.0` | Latest, Fabric-only, supports RN `0.81 - 0.85` per peerDeps. JayTap is RN 0.84. | [VERIFIED: `npm view react-native-reanimated@4.3.0 peerDependencies` → `{ react: '*', 'react-native': '0.81 - 0.85', 'react-native-worklets': '0.8.x' }`] |
| `react-native-worklets` | `^0.8.0` (whatever ships with reanimated 4.3.0; `npm install react-native-worklets` will resolve a compatible release per the `0.8.x` peer constraint) | Required peer of reanimated v4. Hosts the Babel plugin. | [CITED: docs.swmansion.com getting-started — "Install the main package and peer dependency: `npm install react-native-reanimated react-native-worklets`"] |
| `react-native-keyboard-controller` | `^1.21.6` | D-01 locked. Peer is `react-native-reanimated >= 3.0.0` so v4 satisfies it. | [VERIFIED: `npm view react-native-keyboard-controller version` → `1.21.6`; `peerDependencies` → `{ react: '*', 'react-native': '*', 'react-native-reanimated': '>=3.0.0' }`] |

### §2.2 Exact Wave-0 command sequence

The order matters. Each step has an explicit verification.

```bash
# 1. Pre-install snapshot (rollback baseline)
git status                                    # confirm clean working tree
git rev-parse HEAD                             # record commit for rollback
cp package.json package.json.bak               # belt + suspenders
cp ios/Podfile.lock ios/Podfile.lock.bak       # iOS rollback
# Android needs no lockfile copy — gradle clean is the rollback

# 2. Install reanimated + its required peer (one npm command)
npm install react-native-reanimated react-native-worklets

# Verify both landed in package.json dependencies block:
npm ls react-native-reanimated react-native-worklets
#   expect: react-native-reanimated@4.3.x  react-native-worklets@0.8.x

# 3. Append Babel plugin as the LAST plugins-array entry
#    Edit babel.config.js — see §2.3 for the exact diff.

# 4. iOS: pod install (Fabric + bridgeless requires fresh pods after native module add)
cd ios && pod install && cd ..
# Verify: Podfile.lock changed; "Installing RNReanimated" and "Installing RNWorklets"
# (or similar pod names) appear in `pod install` output.

# 5. Android: clean rebuild (gradle caches native module registration; stale cache → silent runtime failure)
cd android && ./gradlew clean && cd ..

# 6. Install keyboard-controller AFTER reanimated is fully wired
npm install react-native-keyboard-controller
npm ls react-native-keyboard-controller
#   expect: react-native-keyboard-controller@1.21.6

# 7. Re-pod for keyboard-controller's native module
cd ios && pod install && cd ..

# 8. Sanity-check resolution + native build on both platforms
npx react-native info             # confirms RN version + linked native modules
npm run android                   # full Android build → must succeed; watch for native link errors
npm run ios                       # full iOS build → must succeed
# In a release-mode shell: `cd android && ./gradlew assembleRelease`
# (matches `android:build` script in package.json) and equivalent xcodebuild archive.
```

**Estimated time:** 1–2 hours per CONTEXT D-02. Unknowns that can extend it: pod install network speed, Android NDK warm cache state, Xcode 26 CLT path issues if the build machine has older CLT.

### §2.3 Exact `babel.config.js` diff

Current file (verbatim from `babel.config.js`):

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```

After Wave 0 (only addition is the `plugins` array; no other change):

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets/plugin', // MUST be last; reanimated v4 ships its plugin here
  ],
};
```

If a future task adds another Babel plugin, it goes ABOVE `'react-native-worklets/plugin'` — the worklets plugin's `// MUST be last` comment is load-bearing. Documented constraint: [CITED: docs.swmansion.com getting-started — "react-native-worklets/plugin has to be listed last"].

After editing, **clear Metro cache** before the next build:

```bash
npx react-native start --reset-cache
# OR delete cache directory before starting:
# rm -rf $TMPDIR/metro-* && npm start
```

Skipping the cache reset is the most common cause of "I added the plugin but worklets still throw 'Reanimated is not configured properly'" in the wild.

### §2.4 New Architecture / Fabric / bridgeless landmines (RN 0.84 specific)

JayTap's runtime per verified config: `newArchEnabled=true`, `hermesEnabled=true`, `targetSdkVersion=36`, `compileSdkVersion=36`, `minSdkVersion=24`, `kotlinVersion=2.1.20`, `ndkVersion=27.1.12297006` (verified `android/build.gradle:1-11`, `android/gradle.properties`).

| Landmine | What goes wrong | Mitigation |
|----------|----------------|------------|
| Reanimated v4 is **Fabric-only** | If the New-Arch flag were ever flipped off (e.g. someone debugging unrelated issue toggles `newArchEnabled=false`), the app crashes at startup. | Add an inline comment near `newArchEnabled=true` in `android/gradle.properties` warning that reanimated 4 + keyboard-controller require Fabric. [CITED: docs.swmansion.com migration-from-3.x — "Reanimated 4.x supports only the New Architecture and drops support for the Legacy Architecture along with the legacy renderer (commonly known as Paper) entirely"] |
| Bridgeless mode + worklets plugin missing → "Reanimated is not configured properly" runtime error | Babel transformed source without the worklets plugin produces JS that fails to register worklet functions. No compile error. | Verify §2.3 plugin is present BEFORE first run. Smoke check after Wave 0: in App.tsx, briefly render `<KeyboardProvider>` and inspect Metro logs for "Reanimated is not configured properly" — its absence is the green light. |
| Android `windowSoftInputMode` not set to `adjustResize` → keyboard pushes content but library's animation engine receives no resize event | Library silently no-ops. | ✅ Already correct per D-06: `android/app/src/main/AndroidManifest.xml:25` already has `android:windowSoftInputMode="adjustResize"`. Verified during read. No change. |
| `pod install` succeeds but app fails to find native module at runtime ("RNReanimated module is null") | Stale Hermes prebuilt cache or stale Xcode DerivedData. | After §2.2 step 4 (`pod install`), if iOS build fails: `cd ios && rm -rf Pods Podfile.lock && pod install && cd ..`. Last resort: delete Xcode DerivedData (`~/Library/Developer/Xcode/DerivedData/JayTap-*`). |
| Android Gradle daemon caches stale native registration | After installing a new native module, `./gradlew clean` is necessary; `npm run android` alone reuses cached classes. | §2.2 step 5 makes `gradlew clean` mandatory between the reanimated install and the keyboard-controller install. Don't skip. |
| Issue [#1411](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1411) — RN 0.83.x + Fabric edge cases | Maintainer was actively patching through 1.21.6 (2026-04 timeframe). 0.84 is one minor higher; expect parity but not guaranteed. | If wave-0 device verify shows weird focus loss / blank inputs on Android, file an issue against the library before patching client-side; do NOT add `keyboardVerticalOffset` workarounds (would violate KBD-02). [CITED: STACK.md §1 line 84] |

### §2.5 Post-install verification checklist (gate to enter Wave 1)

All must be true to proceed:

- [ ] `grep -c "react-native-reanimated" package.json` returns `1`
- [ ] `grep -c "react-native-worklets" package.json` returns `1`
- [ ] `grep -c "react-native-keyboard-controller" package.json` returns `1`
- [ ] `grep -c "react-native-worklets/plugin" babel.config.js` returns `1` AND it is the last entry of the `plugins` array
- [ ] `cd ios && pod install && cd ..` exits 0; `Podfile.lock` shows `RNReanimated`, `RNWorklets`, `RNKeyboardController` (or pod-equivalent names — exact strings vary by lib)
- [ ] `npm run android` builds and launches on Moto G XT2513V; no red box, no "Reanimated is not configured properly" Metro log
- [ ] `npm run ios` builds and launches on iPhone 15 Pro Max; same condition
- [ ] App opens to home screen (existing behavior unchanged — Wave 0 added zero render-tree changes)

### §2.6 Rollback plan

If any step in §2.2 fails and cannot be diagnosed in <30 minutes, revert cleanly:

```bash
git checkout package.json package-lock.json babel.config.js
mv ios/Podfile.lock.bak ios/Podfile.lock
cd ios && pod install && cd ..
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
```

Rollback returns to the pre-Wave-0 commit (recorded in §2.2 step 1). Phase 2 then re-plans Wave 0 with whatever new information the failure surfaced — do not "patch around" reanimated install issues.

---

## §3 Per-Screen Conversion Mechanics

### §3.1 Defensive grep — TextInput inventory reconciled against D-12

`grep -rn "TextInput" src/screens/` (verified 2026-04-22) returns matches in the following screens. Every input-bearing screen is accounted for in either the D-12 Full tier, Smoke tier, or has an explicit reason to be out of scope:

| Screen | TextInput count | D-12 tier | Action this phase |
|--------|----------------|-----------|-------------------|
| `LoginScreen.tsx` | 1 visible TextInput + 1 PasswordTextInput composition | Full | KASV wrap (§3.2) |
| `SignupScreen.tsx` | 1 TextInput + 2 PasswordTextInput | Full | KASV wrap (§3.2) |
| `ForgotPasswordScreen.tsx` | 1 TextInput | Full | KASV wrap (§3.2) |
| `ResetPasswordScreen.tsx` | 1 TextInput + 2 PasswordTextInput | Full | KASV wrap (§3.2) |
| `CreateListingScreen.tsx` | 19 TextInput matches across both branches | Full | Both top-level ScrollViews → KASV (§3.4) |
| `ChatThreadScreen.tsx` | 1 TextInput, currently inside RN `KeyboardAvoidingView` | Full | Library's KAV swap (§3.5) |
| `ChatComposeScreen.tsx` | 1 TextInput, currently inside RN `KeyboardAvoidingView` | Full | Library's KAV swap (§3.5) |
| `AccountSettingsScreen.tsx` | 1 TextInput inside `renderInfoRow()` (rendered up to 4 times) | Smoke | KASV swap on `ScrollView` at line 150 (§3.3) |
| `HomeScreen.tsx` | 1 TextInput (search bar at line 306) inside header above FlatList | Smoke | No wrapper — root KeyboardProvider handles it (§3.6) |
| `ScheduleViewingScreen.tsx` | 0 matches (verified) | Out of scope | None — D-12 confirmation |

**Result:** No TextInput-bearing screens fall outside the D-12 tier list. The inventory is closed.

### §3.2 Auth screens (LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen) — KASV wrap

These four screens share an identical structure: `<SafeAreaView>` → optional close button → `<View style={styles.header}>` → `<View style={styles.content}>` containing `TextInput`s + a submit button. None currently use a ScrollView.

**Generic mechanical edit (apply to all 4):**

1. Add an import at the top of the file (group 2 of `src/components/PasswordRequirements.tsx` import order convention — third-party RN modules):
   ```typescript
   import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
   ```

2. Inside the `<SafeAreaView>`, wrap the `<View style={styles.content}>` (and any header content that sits above it within the SafeAreaView) in `<KeyboardAwareScrollView contentContainerStyle={...} keyboardShouldPersistTaps="handled" bottomOffset={20}>`.
   - `contentContainerStyle` receives `{ flexGrow: 1 }` so the existing `justifyContent: 'center'` on the container still works when content fits the screen.
   - `keyboardShouldPersistTaps="handled"` lets the user tap outside an input to dismiss without the parent ScrollView eating the tap on the submit button.
   - `bottomOffset={20}` is the library's idiomatic spacing — NOT a `keyboardVerticalOffset` magic number. It's a small constant gap below the focused input (per library docs).

3. **Important — do NOT wrap the `AuthModalCloseButton`** (absolute-positioned, sits at `zIndex: ?` per `src/components/AuthModalCloseButton.tsx`). Leaving it as a sibling of the KASV preserves its tap target.

4. **`PasswordTextInput` requires zero changes.** Verified by reading `src/components/PasswordTextInput.tsx:1-57`: it's a plain `<TextInput>` wrapped in a relative `<View>` with an absolute-positioned eye icon. KASV finds focused inputs via React Native's `currentlyFocused()` API, which returns the underlying TextInput regardless of compositional nesting. No prop pass-through needed. (D-Discretion item from CONTEXT — confirmed.)

**Concrete LoginScreen edit example (illustrative; planner will spell out per-file):**

```tsx
// Before — current LoginScreen.tsx:48-115 (excerpt):
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
    <View style={styles.header}>...</View>
    <View style={styles.content}>
      {/* TextInput + PasswordTextInput + submit button */}
    </View>
  </SafeAreaView>
);

// After — KASV wraps header + content; close button stays sibling:
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <View style={styles.header}>...</View>
      <View style={styles.content}>
        {/* TextInput + PasswordTextInput + submit button */}
      </View>
    </KeyboardAwareScrollView>
  </SafeAreaView>
);
```

**Style note:** `styles.container` currently has `padding: 20` and `justifyContent: 'center'`. Move `padding: 20` to the KASV's `contentContainerStyle` (or keep it on the SafeAreaView as page-padding). The KASV scroll surface owns the centering via `flexGrow: 1` + `justifyContent: 'center'` on `contentContainerStyle`. Verify visually that the rendered look is unchanged when keyboard is closed — that's the regression bar.

**Planner choice (D-Discretion):** batch all 4 auth screens in one plan or split. Recommendation: **batch into one plan with 4 sequential tasks**. Identical structure means identical diff shape; review is one read of the pattern + 4 verify-and-apply. Splitting adds plan-overhead with no risk-isolation benefit.

### §3.3 AccountSettingsScreen — ScrollView → KASV swap

Current structure (`src/screens/AccountSettingsScreen.tsx:150` verified):

```tsx
<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
  {/* renderInfoRow x 4 (each conditionally renders a TextInput when isEditing) */}
</ScrollView>
```

**Edit:**

1. Add import: `import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';`
2. Remove `ScrollView` from `react-native` import line (verify nothing else in the file uses it — currently it does not).
3. Rename element: `<ScrollView ...>` → `<KeyboardAwareScrollView ...>` and matching closing tag. Same props pass through (`contentContainerStyle`, `showsVerticalScrollIndicator`).
4. Add `keyboardShouldPersistTaps="handled"` and `bottomOffset={20}` for parity with auth screens.

This is the cleanest swap in the phase — one element rename + import swap. No nested-component caveats; `renderInfoRow` returns plain `<View><TextInput /></View>`.

### §3.4 CreateListingScreen — both branches → KASV (D-07)

Two top-level `ScrollView`s, both convert. Internal structure UNTOUCHED per D-07.

**Branch A — admin-verify (line 455):**

Current:
```tsx
<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
  {/* 3x verificationSwitchRow + submit button — NO TextInputs in this branch today */}
</ScrollView>
```

Note: a `grep` of `:455-477` shows zero `TextInput` matches in the admin-verify branch — it renders only Switch rows. Converting to KASV is still required by D-07 (decision is "BOTH top-level ScrollViews"), and is harmless — KASV degrades to an inert ScrollView when no input is focused. This also future-proofs Phase 3 (Role Gating) which may add admin-only text fields here.

Edit: same pattern as §3.3 — element rename + import.

**Branch B — main listing form (line 497):**

Current:
```tsx
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
>
  {/* 19 TextInputs spread across nested sections — see §3.1 grep */}
</ScrollView>
```

Edit: element rename + import + `keyboardShouldPersistTaps="handled"` + `bottomOffset={20}`. Internal nested sections (image picker, segmented controls, datetime picker) remain.

**Caveat — nested ScrollView risk:** before merging, grep `src/screens/CreateListingScreen.tsx` for any nested `ScrollView` or `FlatList` that lives INSIDE the main form (the file is 47KB; it's plausible). If found, **do not** wrap them — KASV-inside-ScrollView is a banned mix per D-04 / PITFALLS §Pitfall 2. Per D-07, internal structure is not touched in Phase 2, so any nested scroller stays as it is and the planner notes it as Phase 4/5 follow-up. The Wave-0 / Wave-1 device verify is the regression detector if a nested scroller misbehaves.

### §3.5 ChatThreadScreen + ChatComposeScreen — RN KAV → library KAV (D-09)

Both files have the same anti-pattern. Verified `src/screens/ChatThreadScreen.tsx:183-187` and `src/screens/ChatComposeScreen.tsx:114-118`:

```tsx
<KeyboardAvoidingView
  style={styles.keyboardView}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
```

**Edit (both files, identical mechanic):**

1. **Remove** `KeyboardAvoidingView` from the `'react-native'` import. Confirm `Platform` is still imported (it may still be used elsewhere; grep first — in ChatThreadScreen it likely still is).
2. **Add** import: `import { KeyboardAvoidingView } from 'react-native-keyboard-controller';`
3. **Remove the `keyboardVerticalOffset` prop entirely.** This is the magic number that PITFALLS §Pitfall 2 calls out as the canonical anti-pattern.
4. **Remove** the `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` prop — the library's `KeyboardAvoidingView` defaults to a behavior that works on both platforms. Confirm by reading library docs at [keyboardcontroller.dev](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-avoiding-view); current default behavior parity is the whole reason D-09 calls this a "drop-in".

After:
```tsx
<KeyboardAvoidingView style={styles.keyboardView}>
  <FlatList ... />
  <View style={styles.inputRow}>
    <TextInput ... />
    <TouchableOpacity .../>
  </View>
</KeyboardAvoidingView>
```

~5 lines changed per file. **No FlatList rewrite** — the existing inverted-FlatList + composer layout is unchanged. The library's KAV handles offset based on safe-area + keyboard frame events from `KeyboardProvider` (root-level).

**Sibling-component layout impact:** none expected. The composer's `<View style={styles.inputRow}>` already sits flush with the bottom of the KAV's frame; library's KAV preserves that. If, on physical device, the composer sits 1-2px off after the swap, that's a `paddingBottom` tweak inside `inputRow`'s style — NOT a re-introduction of `keyboardVerticalOffset`.

**Android back-button interaction (D-Discretion in CONTEXT):** library's `KeyboardProvider` does not register a back-handler; it relies on RN's native keyboard-dismiss-on-back behavior (default `windowSoftInputMode=adjustResize`). JayTap's BackHandler at `App.tsx:214-327` doesn't intercept "back when keyboard open" — it only handles modal/screen pops. No conflict expected. **Verify during Chat verification:** open keyboard → press hardware back on Android → keyboard dismisses, screen does NOT pop. If screen pops (regression), file as test failure.

### §3.6 HomeScreen search bar (Smoke tier) — no wrapper edit

Current `src/screens/HomeScreen.tsx:302-317` puts a `<TextInput>` inside the header View, which sits ABOVE a `<FlatList>` (line 467). Header is OUTSIDE the FlatList — that's the existing workaround documented at line 465: `{/* Header outside FlatList to prevent TextInput focus issues */}`.

After `KeyboardProvider` lands at the root, this workaround likely becomes unnecessary because keyboard-controller resolves focused-input scrolling without the header-as-FlatList-header pattern that originally caused the issue. **Recommended workflow (D-Discretion in CONTEXT):**

1. Phase 2 Wave 1 (provider wiring): leave HomeScreen unchanged.
2. Phase 2 Wave 3 (verify): smoke-test HomeScreen search — tap search bar, confirm keyboard does not cover the field.
3. If smoke-test passes AND nothing else breaks, optionally remove the `{/* Header outside FlatList ... */}` comment (not the structural separation — leaving header outside the FlatList is also a non-keyboard rendering choice). Cleanup is OPTIONAL; defer if any uncertainty.

**Do NOT** restructure HomeScreen to use `renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}` on the FlatList in Phase 2 — the search bar is in the header (outside the FlatList), so the FlatList itself does not contain inputs. D-05 (renderScrollComponent for FlatLists with inputs) does not apply here.

---

## §4 Wave Structure Recommendation with Gates

Mirrors Phase 1's diagnostic-first / wave-gated structure. Four waves; each subsequent wave blocked on the prior's go/no-go.

### Wave 0 — Install precondition (BLOCKING)

**Tasks:**

1. Pre-install snapshot (clean tree + lockfile copies).
2. Install reanimated + worklets via `npm install react-native-reanimated react-native-worklets`.
3. Edit `babel.config.js` to add `'react-native-worklets/plugin'` as last plugin (§2.3).
4. iOS pod install + Android gradle clean.
5. Install `react-native-keyboard-controller`.
6. Re-pod iOS.
7. Smoke build on both platforms.

**Go/no-go gate:** §2.5 checklist — all 8 items pass. If any item fails: enter §2.6 rollback, re-plan Wave 0 with surfaced diagnostic. **Do NOT proceed to Wave 1 with a partial install.**

### Wave 1 — KeyboardProvider wiring + diagnostic check

**Tasks:**

1. Edit `App.tsx` lines 948-960: insert `<KeyboardProvider>` between `<SafeAreaProvider>` and `<ThemeProvider>`. One file, ~3 line change.
2. Add `import { KeyboardProvider } from 'react-native-keyboard-controller';` at the top of `App.tsx` (alongside the existing `react-native-safe-area-context` import — both are third-party RN modules in the convention's import-group 2).
3. Build + launch on both physical devices; confirm app renders identically to pre-Wave-1 state (no visible change is the success criterion — the provider is a context-only wrapper).
4. Smoke check: open Login modal, tap email field, confirm keyboard pops. No regression in any existing screen.

**Go/no-go gate:**
- App launches on both devices.
- No new red-box, no Metro warnings about `KeyboardProvider`.
- Existing screens render unchanged.

If any item fails, do not proceed — bisect against Wave 0's verification (most likely failure mode is a stale Metro cache; reset and rebuild).

### Wave 2 — Screen conversions (parallelizable groupings)

**Recommended groupings (parallelizable plans):**

- **Plan 2A — Auth flow (4 screens):** Login + Signup + ForgotPassword + ResetPassword. One plan, four sequential tasks (each <30min). Pattern is identical (§3.2). Single plan keeps review scope tight.
- **Plan 2B — AccountSettings + CreateListing both branches:** §3.3 + §3.4. Three sites, two files. AccountSettings is trivial; CreateListing has the larger surface but is two same-shape edits. One plan, three tasks.
- **Plan 2C — ChatThread + ChatCompose:** §3.5. Two files, identical 5-line diff each. One plan, two tasks.

Plans 2A / 2B / 2C are mutually independent — no shared file edits, no shared state. They can be planned and executed in parallel if `parallelization: true` in `.planning/config.json` (verified: `true`). The planner may prefer a single Wave-2 plan with grouped tasks if that's simpler; the dependency graph permits either.

**Go/no-go gate (after all Wave-2 plans land):**
- `grep -rn "keyboardVerticalOffset" src/` returns 0 matches.
- `grep -rn "from 'react-native'" src/screens/ChatThreadScreen.tsx src/screens/ChatComposeScreen.tsx | grep -c "KeyboardAvoidingView"` returns 0 (RN's KAV no longer imported in those two files).
- `grep -rn "KeyboardAwareScrollView\|KeyboardAvoidingView" src/screens/ src/components/ | grep -v "from 'react-native'" | grep -c "react-native-keyboard-controller"` returns ≥7 (4 auth + AccountSettings + 2 CreateListing branches + 2 chat screens — minimum 9 imports across 9 files, but counting per-file may collapse to ≥7 since some files may import both KASV and KAV; planner asserts the precise number).
- Both physical devices launch the app and reach the home screen.

### Wave 3 — Verification matrix execution + cleanup decisions

**Tasks:**

1. Execute D-12 Tier 1 (Full) per-screen test on both devices, populating the matrix doc (suggested location §7.6).
2. Execute D-12 Tier 2 (Smoke) on AccountSettings + HomeScreen search.
3. Decide on `HomeScreen.tsx:465` workaround comment removal (per §3.6).
4. If matrix is fully Pass: phase sign-off; STATE.md updated; `/gsd-verify-work` runs.
5. If any matrix cell is Fail: triage — is it a regression (revert that screen's diff and re-plan) or a known limitation (document in §9 risks and accept).

**Go/no-go gate (phase exit):**
- All Tier 1 matrix cells: `Pass`.
- All Tier 2 matrix cells: `Pass`.
- Wave-2 grep checks (above) still hold.
- Both platform release builds succeed (`npm run android:build` for assembleDebug; iOS archive equivalent).

---

## §5 Out-of-Scope Confirmations

Echoing CONTEXT for downstream clarity (planner / executor / verifier should not surprise these):

| Item | Status | Source |
|------|--------|--------|
| `KeyboardStickyView` on Chat screens (composer pinned above keyboard, iMessage-style) | DEFERRED to M2 | D-10 |
| `KeyboardToolbar` (prev/next/done accessory bar) on multi-input forms | DEFERRED to Phase 5 | D-11 |
| `ScheduleViewingScreen.tsx` keyboard handling | EXCLUDED — no `TextInput` matches in file (verified §3.1 grep) | D-12 |
| Landscape-orientation keyboard testing | OUT — JayTap is portrait-only | CONTEXT deferred |
| Full exhaustive matrix (every screen × portrait+landscape × modal+no-modal) | OUT — replaced by D-12 risk-weighted matrix | CONTEXT deferred |
| `react-navigation` migration | OUT (project-wide constraint) | CLAUDE.md "Working with This Project" |
| Per-screen `KeyboardAvoidingView` retrofits without root `KeyboardProvider` | OUT — would violate KBD-02 | PROJECT.md "Out of Scope" |
| Adding any `keyboardVerticalOffset={N}` magic number to fix a verification failure | OUT — phase exit criterion is zero such matches | KBD-02 + §6 SC3 |

---

## §6 Success Criteria → Evidence Mapping

For each ROADMAP.md Phase 2 Success Criterion (lines 60-66), the exact mechanical artifact / command / matrix cell that proves it:

| SC | Statement (paraphrased from ROADMAP) | Evidence (mechanical) |
|----|--------------------------------------|------------------------|
| **SC1** | `react-native-reanimated` confirmed present in `package.json` (installed with Babel plugin as LAST entry if absent) | `grep -c "react-native-reanimated" package.json` → returns `1` AND `grep -c "react-native-worklets" package.json` → returns `1` AND `tail -n 5 babel.config.js` shows `'react-native-worklets/plugin'` as the last array entry. (Note: SC1 was written assuming reanimated v3's plugin name; v4 changed it. Document this in the verify wave's evidence note.) |
| **SC2** | `react-native-keyboard-controller@1.21+` installed; `KeyboardProvider` wraps root in `App.tsx` inside SafeAreaProvider, outside domain providers; pod install + clean builds succeed both platforms | `npm ls react-native-keyboard-controller` shows `^1.21.6`. `grep -n "KeyboardProvider" App.tsx` returns ≥2 matches (import line + JSX usage). `grep -A1 "<SafeAreaProvider>" App.tsx | grep -c "KeyboardProvider"` returns `1`. Both platforms: `npm run android` and `npm run ios` exit 0. |
| **SC3** | Every input-bearing screen scrolls focused field above keyboard on physical iOS + Android. Zero `keyboardVerticalOffset` magic numbers. | `grep -rn "keyboardVerticalOffset" src/` returns **0 matches**. D-12 matrix doc (§7.6) shows all Tier-1 + Tier-2 cells as `Pass`. |
| **SC4** | Keyboard behavior verified on Fabric (New Architecture) builds on both platforms | `cat android/gradle.properties \| grep newArchEnabled` shows `newArchEnabled=true`. iOS Fabric flag confirmed (existing per `.planning/codebase/STACK.md:22` — RCTNewArch enabled). Wave-3 matrix doc explicitly notes iOS build + Android build both ran with New Arch on; device IDs recorded (iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16) per D-13. |

**Combined exit gate for the phase verifier:**

```bash
# All four must hold:
[ $(grep -c "react-native-reanimated" package.json) -eq 1 ]                                 # SC1.a
[ $(grep -c "react-native-worklets" package.json) -eq 1 ]                                   # SC1.b
[ $(grep -c "react-native-worklets/plugin" babel.config.js) -eq 1 ]                          # SC1.c
[ $(grep -c "react-native-keyboard-controller" package.json) -eq 1 ]                         # SC2.a
[ $(grep -cE "KeyboardProvider" App.tsx) -ge 2 ]                                             # SC2.b
[ $(grep -rn "keyboardVerticalOffset" src/ | wc -l) -eq 0 ]                                  # SC3.a
[ $(grep -c "newArchEnabled=true" android/gradle.properties) -eq 1 ]                         # SC4.a
# AND: matrix doc all-Pass, both release builds succeed (manual checks)
```

---

## §7 Validation Architecture

> Required by `.planning/config.json` `workflow.nyquist_validation: true`. Drives generation of `02-VALIDATION.md`.

### §7.1 Validation philosophy

Phase 2 has **no automated test coverage** for the runtime concern (keyboard avoidance under Fabric on physical hardware). Like Phase 1, validation is **manual physical-device QA against a reproducibility matrix**, mechanically auditable by `grep` for the negative-space invariants (§6 SC3.a, SC4.a). This is the project's accepted M1 testing bar per CLAUDE.md "Key Conventions" → "Testing bar: manual physical-device QA for M1."

### §7.2 Test framework

| Property | Value |
|----------|-------|
| Framework | Manual device QA — no Jest/Detox automation for keyboard behavior in M1 |
| Config file | none (matrix doc is the test contract) |
| Quick run command | `grep -rn "keyboardVerticalOffset" src/` (must return 0) |
| Full suite command | Manual matrix walkthrough on both physical devices |

### §7.3 Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Manual Step |
|--------|----------|-----------|-------------------|-------------|
| KBD-01 | Keyboard never covers focused input on every input-bearing screen | manual | — | D-12 matrix walkthrough; cell entries `Pass` for all 8 screens × 2 platforms |
| KBD-02 | Universal root-level solution, not per-screen patching | grep | `grep -rn "keyboardVerticalOffset" src/` returns 0 | Visually inspect `App.tsx:948-960` for `<KeyboardProvider>` wrapping all sub-providers |
| KBD-03 | reanimated peer dep installed with Babel plugin LAST | grep | `grep -c "react-native-reanimated\|react-native-worklets" package.json` returns 2; `tail -n 5 babel.config.js \| grep "react-native-worklets/plugin"` returns 1 | — |
| KBD-04 | Fabric / New Arch verified on physical-device builds | grep + manual | `grep -c "newArchEnabled=true" android/gradle.properties` returns 1 | Capture matrix evidence note "Tested on Fabric build, device ID `<id>`, iOS 26.4 / Android 16" |

### §7.4 Matrix axes (per D-12, D-14)

The keyboard verification matrix is a 2-D grid:

- **Rows (screens × inputs):** ordered by D-12 priority — Tier 1 first, Tier 2 second, Out-of-scope marked N/A.
- **Columns (platforms):** `iOS (iPhone 15 Pro Max, iOS 26.4)` | `Android (Moto G XT2513V, Android 16)`.
- **Cells:** `Pass` | `Fail` | `N/A` plus a one-line note describing what was tested ("tapped email field → keyboard rose, field stayed visible above keyboard").

Per D-14, **textual entries only — no video required.** Cells are populated by hand during Wave 3.

**Tier 1 (Full) rows:**

| Row # | Screen | Input(s) tested |
|-------|--------|-----------------|
| 1 | LoginScreen | email TextInput, PasswordTextInput |
| 2 | SignupScreen | email TextInput, password PasswordTextInput, confirm PasswordTextInput |
| 3 | ForgotPasswordScreen | email TextInput |
| 4 | ResetPasswordScreen | reset-link TextInput, new password PasswordTextInput, confirm PasswordTextInput |
| 5 | CreateListingScreen (admin-verify branch) | (no inputs today — verify scroll & switch interaction unbroken) |
| 6 | CreateListingScreen (main form) | sample 3 inputs spanning top / middle / bottom of form (e.g. title, address, description) |
| 7 | ChatThreadScreen | composer TextInput |
| 8 | ChatComposeScreen | composer TextInput |

**Tier 2 (Smoke) rows:**

| Row # | Screen | Input |
|-------|--------|-------|
| 9 | AccountSettingsScreen | one TextInput while in edit mode |
| 10 | HomeScreen | search TextInput |

**Out-of-scope row (informational):**

| Row # | Screen | Input | Status |
|-------|--------|-------|--------|
| — | ScheduleViewingScreen | (none) | N/A — no inputs today |

### §7.5 Pass/fail thresholds

- **Pass = phase exit eligible:** every Tier 1 cell `Pass` AND every Tier 2 cell `Pass` AND §6 SC1–SC4 all true.
- **Fail = phase blocks:** any single Tier 1 cell shows `Fail` (keyboard covers field, focus lost, app crashes on input). Triage: is the failure caused by Phase 2's diff (revert + re-plan) or pre-existing (file as known issue, not phase exit blocker, but require explicit user accept).
- **Tier 2 fail:** smoke-tier failure is recoverable — accept-with-note OR open follow-up task. Does not block phase exit IF user accepts in writing.

### §7.6 Matrix doc location

**Recommended:** `.planning/phases/02-universal-keyboard-handling/02-KEYBOARD-MATRIX.md` (mirrors Phase 1's `01-NAV-REPRO-MATRIX.md` co-location convention).

Planner may choose alternative; suggested name keeps the artifact discoverable next to the phase it belongs to.

### §7.7 Wave 0 gaps

- [ ] No existing Jest test covers keyboard behavior — none required (manual QA bar). No Wave-0 test infrastructure work.
- [ ] No matrix doc exists for Phase 2 — Wave 3 Task 1 creates it.

*"None — manual physical-device QA covers all phase requirements per project's M1 testing bar."*

---

## §8 RN 0.84 + Fabric / Bridgeless Landmines (Cited)

Consolidated from §2.4 with sources:

| # | Landmine | Source | Mitigation in this phase |
|---|----------|--------|--------------------------|
| L1 | Reanimated v4 is **Fabric-only**; legacy Paper renderer dropped | [CITED: docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x — "Reanimated 4.x supports only the New Architecture and drops support for the Legacy Architecture along with the legacy renderer (commonly known as Paper) entirely"] | JayTap verified `newArchEnabled=true`; phase encodes this assumption in §6 SC4.a |
| L2 | Babel plugin renamed: `react-native-reanimated/plugin` → `react-native-worklets/plugin` in v4. Old name still passes `npm install` but produces silent runtime failure. | [CITED: docs.swmansion.com getting-started — "react-native-worklets/plugin has to be listed last"] | §2.3 specifies the v4 plugin name explicitly; SC1.c grep checks for it |
| L3 | `react-native-reanimated@4.x` requires `react-native-worklets@0.8.x` as a SEPARATE peer package | [VERIFIED: `npm view react-native-reanimated@4.3.0 peerDependencies` 2026-04-22 → `react-native-worklets: '0.8.x'`] | §2.2 step 2 installs both in one `npm install` command; SC1.b grep checks for it |
| L4 | Bridgeless mode + missing/misconfigured worklets plugin → "Reanimated is not configured properly" runtime error with no compile-time signal | [CITED: PITFALLS.md §Pitfall 2 line 47 — install KeyboardProvider correctly + library docs warn about plugin order] | §2.2 step 3 mandates Metro cache reset; §2.5 gate verifies log-clean launch |
| L5 | RN 0.84 explicit support not yet in keyboard-controller's published compatibility matrix (caps at 0.81+ with 1.18+) | [CITED: STACK.md §1 lines 80-86; verified via library issue #1411 mid-2026 fixes through 1.21.6] | Risk-flag in §9; mitigation is physical-device verify (Wave 3) on actual RN 0.84 build, not simulator |
| L6 | Android `windowSoftInputMode` not set to `adjustResize` → library silently no-ops | [CITED: PITFALLS.md §Pitfall 2 line 49] | ✅ Already correct (D-06 verified) |
| L7 | KASV nested inside ScrollView causes gesture-conflict | [CITED: STACK.md §1 line 79; PITFALLS.md §Pitfall 2 line 54] | D-04 bans this composition; D-07 explicitly does not touch CreateListingScreen's internal structure (avoids accidentally creating this) |
| L8 | KASV mixed with KAV in same tree | [CITED: PITFALLS.md §Pitfall 2 line 53] | D-04 bans this; per-screen mechanics §3.2-§3.5 use exactly one wrapper per screen |
| L9 | FlatList wrapped in external avoider has known perf issues | [CITED: PITFALLS.md §Pitfall 2 line 39] | D-05 mandates `renderScrollComponent` pattern for FlatList-with-inputs; HomeScreen FlatList has no inputs (search bar is in header, outside the list — §3.6) so this rule does not apply in Phase 2 |
| L10 | Multiline TextInputs inside ScrollView under Fabric refuse to grow (KASV + new-architecture issue) | [CITED: PITFALLS.md §Pitfall 2 line 55] | Chat composer uses `multiline` (`ChatThreadScreen.tsx:203`, `ChatComposeScreen.tsx:126`). Verify explicitly in Wave 3 Tier-1 row 7-8: type a multi-line message, confirm composer grows. If it doesn't, file as failure. |

---

## §9 Assumptions Log + Risk Callouts

### Assumptions (planner / executor must confirm)

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-reanimated@^4.3.0` works under RN 0.84 (peer states `0.81 - 0.85`, JayTap is 0.84 — within range) | §2.1 | If npm resolves a version that fails at runtime, fall back to `react-native-reanimated@^3.19.5` + the v3 plugin name `'react-native-reanimated/plugin'`. Documented escape hatch — but defeats Fabric-native benefits and adds tech debt. |
| A2 | `react-native-keyboard-controller@1.21.6` runs on RN 0.84 + Fabric. The compat matrix officially caps at 0.81+ but maintainer is patching 0.83.x in 1.21.x. | §2.1, §8 L5 | If runtime fails on physical devices in Wave 1: file issue #1411-style upstream report; accepting Phase 2 stall is preferable to per-screen workarounds (which violate KBD-02). |
| A3 | The Babel plugin name `'react-native-worklets/plugin'` is correct for the resolved reanimated v4 / worklets 0.8.x pairing at install time. | §2.3 | If wrong: Metro produces a non-worklet bundle, animations crash. Mitigation: read `node_modules/react-native-worklets/package.json` after install to confirm the plugin entry path; adjust if the package's exports field changes the plugin path. |
| A4 | `pod install` succeeds in one shot under Xcode 26 / iOS 26 SDK on the build machine. (Phase 8 gate flagged Xcode 26 as required for store submission, but doesn't promise it's already on the build machine.) | §2.2 | If Xcode 26 is missing: install Xcode 26 first (this is a separate item in `.planning/STATE.md` "Todos carried forward"). Phase 2 cannot complete without it. Surface to user during Wave 0 if `pod install` fails on Xcode-version mismatch. |
| A5 | `PasswordTextInput` composes cleanly under KASV with no prop pass-through. | §3.2 | Verified by reading the component (plain TextInput inside relative View). If physical-device test shows the eye icon misaligned when keyboard is open, that's a `position: 'absolute'` interaction with KASV's animated container — fix by adding `keyboardShouldPersistTaps="handled"` (already specified) and verifying. |
| A6 | `HomeScreen.tsx:465` workaround is safe to remove after `KeyboardProvider` lands. | §3.6 | If smoke-test fails after removal: revert the comment-only cleanup. Cleanup is OPTIONAL per CONTEXT D-Discretion. |
| A7 | `npm install react-native-worklets` resolves a version compatible with the simultaneously-installed `react-native-reanimated@^4.3.0` (peer is `0.8.x`, npm should pick the latest patch in that range). | §2.2 | If resolution fails or produces incompatible versions, pin both: `npm install react-native-reanimated@4.3.0 react-native-worklets@0.8.0`. Verify with `npm ls`. |
| A8 | Library's `KeyboardAvoidingView` defaults to a behavior that works on both platforms with no `behavior` prop — i.e. omitting `behavior` is the idiomatic usage. | §3.5 | If iOS over-pads or Android under-avoids after the swap: read library API docs and pass an explicit `behavior` prop matching the library's recommendation, NOT a re-introduced platform conditional. |

### Risk callouts

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Wave 0 install precondition consumes >2 hours (CONTEXT budget) due to Xcode/Gradle cache thrash | Medium | Phase 2 elapsed time slips by half a day | §2.2 makes each step verify-as-you-go; failure is detected fast and rollback is clean per §2.6 |
| Reanimated worklets + Hermes + bridgeless edge case surfaces only on physical Android hardware (not on emulator) | Low-Medium | Wave 3 catches it but requires triage | D-13 mandates physical-device testing; emulator is explicitly excluded |
| HomeScreen workaround removal breaks search-bar focus on Android (the original reason the workaround exists) | Low | Smoke-tier regression; cosmetic OR functional depending on severity | §3.6 makes removal opportunistic; if test fails, revert the (comment-only) cleanup |
| Phase 4/5 reshape ripples — KASV wrappers added in Phase 2 will be moved when CreateListing decomposes | Accepted (D-08) | Future rework, not throwaway | Document in Phase 4 plan that root-level provider stays; sub-component KASV wrappers travel with sub-components |
| Multiline TextInput in chat composer doesn't grow under KASV (L10) | Low | Composer UX regression | Verify in Wave 3 Tier-1 rows 7-8; explicit failure detection. Mitigation if hit: switch composer to library's `KeyboardStickyView` (D-10 deferral) — but that's a scope expansion to be approved by user, not an inline fix. |
| App's Android BackHandler at `App.tsx:214-327` interferes with keyboard-dismiss-on-back behavior | Low | Wrong layer eats the back press | Verify in Wave 3 chat-screen test (per §3.5 instruction); if regression, BackHandler effect's `onBackPress` already returns `false` to fall through when no overlay is open — keyboard dismiss should still work. If not: add an explicit "if keyboard open, return false (let RN dismiss)" branch — but that requires importing `Keyboard` from `react-native` and checking visibility, which is an out-of-scope expansion. |

---

## §10 Open Questions for the Planner

Short. Most decisions are made in CONTEXT D-01..D-14.

1. **Plan granularity for Wave 2:** group all screen conversions into one plan with parallel tasks (§4 Plan 2A/2B/2C as one), or three separate plans? Recommendation: **three separate plans (2A/2B/2C)** — gives parallel execution under `parallelization: true`, isolates risk per screen-cluster, and review surface per plan stays small. Planner's call.

2. **Wave 0 plan ownership:** is Wave 0 (install precondition) one plan or two (reanimated install + verification, then keyboard-controller install + verification)? Recommendation: **one plan, two sequential tasks** — install reanimated + worklets (verify), then install keyboard-controller (verify). Keeping it one plan preserves the rollback-as-a-unit semantic of §2.6.

3. **Matrix doc format:** strict markdown table (rows × columns), or a per-screen subsection with a 2-line evidence paragraph? Recommendation: **markdown table** — mirrors Phase 1's matrix doc shape and is grep-able for `Pass`/`Fail`/`N/A` cells during phase exit verification. (Stronger machine-readability when an LLM verifier reads it later.)

4. **Should Wave 1 (provider wiring) include a deliberate "diagnostic confirmation" task** — e.g. add a temporary `console.log("KeyboardProvider mounted")` log to confirm the provider is alive, then strip it in Wave 2? Phase 1's pattern was diagnostic-first; Phase 2 is install-first which is similar in spirit. Recommendation: **no temporary log required** — `KeyboardProvider`'s presence is verified by the smoke check (open Login modal → keyboard pops without RN warning) plus the `grep "KeyboardProvider" App.tsx` check in §6 SC2.b. Adding-and-stripping log is a process tax with no insight gain since the install-precondition gate already covered native module wiring.

---

## RESEARCH COMPLETE

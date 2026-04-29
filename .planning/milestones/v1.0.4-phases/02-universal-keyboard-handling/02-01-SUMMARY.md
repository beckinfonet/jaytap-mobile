---
phase: 02-universal-keyboard-handling
plan: 01
status: complete
wave: 0
autonomous: false
requirements_addressed: [KBD-03, KBD-04]
completed: 2026-04-23
---

# 02-01 — Wave 0 Install Precondition (reanimated v4 + worklets + keyboard-controller)

## Outcome

Wave 0 install precondition **complete**. Both physical-device boot verifications passed. Wave 1 (Plan 02-02 — `<KeyboardProvider>` wiring in App.tsx) is unblocked.

## Commits (chronological)

| SHA | Message | Notes |
|-----|---------|-------|
| `2c10056` | docs(state): Phase 2 planned — (pre-Wave-0 rollback target) | Clean HEAD snapshotted by Task 1 before any install. |
| `8ea02cf` | chore(02-01): install reanimated v4 + worklets, register Babel plugin LAST (KBD-03, D-02) | Tasks 1+2 committed atomically (reanimated + worklets + babel.config.js together; the Babel plugin is load-bearing for reanimated to work, so they ship as one logical change). |
| `0fa3d20` | chore(02-01): install react-native-keyboard-controller + regenerate Podfile.lock (KBD-03, D-01) | Task 3: pod install ×2 (first run materialized reanimated + worklets; second run materialized keyboard-controller), gradle clean exit 0, keyboard-controller installed. |

Task 1 and Task 2 committed together is a deviation from the original plan (which listed 3 commits). Reason: per the plan's own Task 2 `<action>` ("Commit Task 1 + Task 2 together with one atomic message"), the reanimated install and the Babel plugin registration are a single logical atomic unit — if one lands without the other, the bundle is either unrecoverable (plugin without lib) or silently no-op (lib without plugin). This deviation is the plan's own intent.

## Resolved Versions

| Package | Installed | Pin | Source |
|---------|-----------|-----|--------|
| `react-native-reanimated` | **4.3.0** | `^4.3.0` | RESEARCH §2.1 — peer accepts RN 0.81-0.85; JayTap is RN 0.84 (in range) |
| `react-native-worklets` | **0.8.1** | `^0.8.0` | Required peer of reanimated v4; hosts the Babel plugin — load-bearing v4 name correction per RESEARCH §2 |
| `react-native-keyboard-controller` | **1.21.6** | `^1.21.6` | CONTEXT D-01 — RN 0.83.x/Fabric maintenance branch |

`npm ls react-native-reanimated react-native-worklets react-native-keyboard-controller` reports zero peer-dependency warnings.

## Device verification (Task 4 — human gate)

| Platform | Device | OS | Result |
|----------|--------|-----|--------|
| iOS | iPhone 15 Pro Max | iOS 26.4 | ✓ xcodebuild exit 0; app launched; home screen unchanged; no red box; Metro clean of "Reanimated is not configured properly" |
| Android | Moto G XT2513V | Android 16 | ✓ gradle exit 0; app launched; home screen unchanged; no red box; logcat clean of "Reanimated is not configured properly" |

Smoke regression passed on both: home renders, property cards render, bottom nav taps still work (Phase 1 preserved), Login modal email field keyboard behaviour unchanged (library's downstream alive even pre-Wave-1 wiring).

## Mechanical gate results (Wave 0 §2.5 entry-gate checklist)

| Gate | Result |
|------|--------|
| `grep -c "react-native-reanimated" package.json` | 1 ✓ |
| `grep -c "react-native-worklets" package.json` | 1 ✓ |
| `grep -c "react-native-keyboard-controller" package.json` | 1 ✓ |
| `tail -n 5 babel.config.js \| grep -c "react-native-worklets/plugin"` | 1 ✓ |
| `grep -c "react-native-reanimated/plugin" babel.config.js` | **0** ✓ (legacy v3 name absent — load-bearing correction per RESEARCH §2.4 L2) |
| `grep -c "// MUST be last" babel.config.js` | 1 ✓ |
| `grep -c "react-native-keyboard-controller\|RNKeyboardController" ios/Podfile.lock` | ≥1 ✓ |
| `grep -c "react-native-reanimated\|RNReanimated" ios/Podfile.lock` | ≥1 ✓ |
| `git diff --name-only 2c10056..HEAD -- ios/Podfile` | empty ✓ (autolink preserved; `use_native_modules!` did the work) |
| iOS physical-device build | ✓ (iPhone 15 Pro Max / iOS 26.4) |
| Android physical-device build | ✓ (Moto G XT2513V / Android 16) |
| App opens to home screen unchanged | ✓ |

All 8 §2.5 gates PASS → Wave 1 unblocked.

## Deviations

- **T1+T2 committed together (not separately).** Covered above — it is the plan's own intent.
- **`ios/JayTap.xcodeproj/project.pbxproj` modified by `pod install`.** Cocoapods normalised empty `inputPaths` / `outputPaths` arrays in the `[CP] Embed Pods Frameworks` and `[CP] Copy Pods Resources` build phases. Deterministic side-effect of `pod install` — not a manual edit. Committed with Task 3 so the working tree reads clean.

## iOS pod install excerpts

```
run 1 (after reanimated+worklets install) — 13s, exit 0:
  Installing RNReanimated (4.3.0)
  Installing RNWorklets (0.8.1)

run 2 (after keyboard-controller install) — 11s, exit 0:
  Installing react-native-keyboard-controller (1.21.6)

Pod count:    83 → 84
ios/Podfile:  UNTOUCHED (autolink via use_native_modules!)
```

## Android gradle clean

```
./gradlew clean
BUILD SUCCESSFUL in 23s
(reanimated + worklets clean tasks ran — confirms Android autolink picked up the new native modules)
```

## Rollback recipe (RESEARCH §2.6)

If any Wave 1+ failure surfaces an install-related root cause:

```bash
git checkout package.json package-lock.json babel.config.js
cp /tmp/Podfile.lock.bak ios/Podfile.lock
cd ios && pod install && cd ..
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
# then if needed:
git reset --hard 2c1005690f0168d20d87790df61f88a983df1361
```

Backup files:
- `/tmp/package.json.bak` — original 14-dep package.json
- `/tmp/Podfile.lock.bak` — original Podfile.lock before Wave 0

## Downstream contract

**Wave 1 is unblocked — Plan 02-02 (`<KeyboardProvider>` wiring in App.tsx between `SafeAreaProvider` and `ThemeProvider` per CONTEXT D-03) may proceed.**

Every Wave 2 plan (02-03 / 02-04 / 02-05) depends on a live `KeyboardProvider` context at the App root, which Wave 1 provides. KBD-03 and KBD-04 are satisfied by the work in this plan; KBD-01 and KBD-02 are delivered by Waves 1-3.

# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript 5.8.3 - Application code in `src/` (all `.ts` and `.tsx` files)
- JavaScript - Config/entry files (`index.js`, `babel.config.js`, `metro.config.js`, `jest.config.js`)

**Secondary:**
- Swift - iOS native bridge (`ios/JayTap/AppDelegate.swift`)
- Kotlin 2.1.20 - Android native bridge (`android/app/src/main/java/com/movein/MainActivity.kt`, `MainApplication.kt`)
- Objective-C / Objective-C++ - Legacy pods via CocoaPods toolchain
- Ruby - CocoaPods tooling (`Gemfile`, `ios/Podfile`) requires Ruby >= 2.6.10
- Groovy - Gradle build scripts (`android/build.gradle`, `android/app/build.gradle`)

## Runtime

**Environment:**
- Node.js >= 22.11.0 (enforced via `package.json` `engines` field)
- React Native 0.84.0 with New Architecture enabled (`newArchEnabled=true`, `RCTNewArchEnabled=true`)
- Hermes JavaScript engine enabled on Android (`android/gradle.properties` `hermesEnabled=true`)
- iOS uses Hermes pre-built framework (see `ios/Podfile.lock`)

**Package Manager:**
- npm (inferred from `package-lock.json` presence)
- Lockfile: present (`package-lock.json`)
- Additional lockfiles: `ios/Podfile.lock`, `Gemfile.lock`

## Frameworks

**Core:**
- React 19.2.3 - UI library
- React Native 0.84.0 - Mobile app framework
- `@react-native/new-app-screen` 0.84.0 - Default onboarding scaffolding (imported but not central)

**Testing:**
- Jest 29.6.3 - Test runner (`jest.config.js` uses `preset: 'react-native'`)
- `react-test-renderer` 19.2.3 - React component renderer for tests
- `@types/jest` 29.5.13 - Jest TypeScript definitions
- `@types/react-test-renderer` 19.1.0 - Type defs for test renderer

**Build/Dev:**
- Metro bundler - Default React Native bundler (`metro.config.js`)
- `@react-native/metro-config` 0.84.0 - Metro base config
- `@react-native/babel-preset` 0.84.0 - Babel preset (`babel.config.js`)
- `@babel/core` 7.25.2, `@babel/preset-env` 7.25.3, `@babel/runtime` 7.25.0
- TypeScript compiler 5.8.3 with `@react-native/typescript-config`
- `@react-native-community/cli` 20.1.0 - React Native CLI for build/run commands
- `@react-native-community/cli-platform-android` 20.1.0
- `@react-native-community/cli-platform-ios` 20.1.0
- ESLint 8.19.0 with `@react-native/eslint-config` 0.84.0
- Prettier 2.8.8

## Key Dependencies

**Critical (runtime):**
- `axios` ^1.13.5 - HTTP client used in all services (`src/services/*.ts`)
- `socket.io-client` ^4.8.3 - Realtime chat websocket client (`src/services/ChatService.ts`)
- `@react-native-async-storage/async-storage` ^2.2.0 - Local key/value persistence for auth tokens/user data (`src/services/AuthService.ts`)
- `react-native-maps` 1.27.1 - Map rendering (`src/components/PropertyMap.tsx`, `src/screens/PropertyDetailsScreen.tsx`)
- `react-native-webview` ^13.16.0 - Embedded 3D tour viewer (`src/screens/Tour3DScreen.tsx`)
- `react-native-image-picker` ^8.2.1 - Gallery/camera access for listing images (`src/screens/CreateListingScreen.tsx`)
- `@react-native-community/datetimepicker` ^8.6.0 - Native date picker (`src/screens/CreateListingScreen.tsx`)
- `react-native-safe-area-context` ^5.5.2 - Safe area insets (`App.tsx`, `src/components/BottomNavigator.tsx`)
- `react-native-svg` ^15.15.3 - SVG rendering primitives
- `react-native-linear-gradient` ^2.8.3 - Gradient backgrounds
- `lucide-react-native` ^0.564.0 - Icon set used across UI

**Infrastructure / Native:**
- Hermes engine (iOS pre-built `hermes-engine` 250829098.0.7 per `ios/Podfile.lock`; Android `com.facebook.react:hermes-android`)
- JSC fallback: `io.github.react-native-community:jsc-android:2026004.+` (Android `app/build.gradle`)
- `BVLinearGradient` pod 2.8.3 (bridged from `react-native-linear-gradient`)
- Android NDK 27.1.12297006
- Android Gradle plugin via `com.facebook.react` plugin

## Configuration

**Environment:**
- `.env` file present at repo root (contents not inspected; not wired through `react-native-config` — no such dependency declared)
- API URLs hardcoded in service modules (see `src/services/*.ts` for `PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api'`)
- Firebase Identity Toolkit API key hardcoded in `src/services/AuthService.ts` (`API_KEY = 'AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY'`)
- App base URL for share/universal links in `src/constants.ts` (`APP_BASE_URL = 'https://www.moveinplatform.com'`)
- Android Google Maps API key loaded from `android/app/key.properties` via `manifestPlaceholders` in `android/app/build.gradle` and injected into `AndroidManifest.xml` as `com.google.android.geo.API_KEY`
- Android signing config also read from `android/app/key.properties` (template at `android/app/key.properties.example`)

**Build:**
- Metro: `metro.config.js` (default merged config)
- Babel: `babel.config.js` using `module:@react-native/babel-preset`
- TypeScript: `tsconfig.json` extends `@react-native/typescript-config`, includes `**/*.ts` / `**/*.tsx`, excludes `node_modules` and `Pods`
- iOS build: `ios/Podfile` with React Native autolinking, `ios/ExportOptions.plist` for archive export, `scripts/archive-ios.sh` helper, `build-android-release.sh` at repo root
- Android build: `android/build.gradle` (root), `android/app/build.gradle`, `android/gradle.properties`, `android/app/proguard-rules.pro`
- Android architectures: `armeabi-v7a,arm64-v8a,x86,x86_64` (`reactNativeArchitectures`)
- Edge-to-edge display: disabled (`edgeToEdgeEnabled=false`)

## Platform Requirements

**Development:**
- Node.js >= 22.11.0
- Ruby >= 2.6.10 with CocoaPods >= 1.13 (excluding 1.15.0/1.15.1) for iOS dependency management
- Xcode toolchain for iOS; Android SDK with:
  - `compileSdk` 36
  - `targetSdk` 36
  - `minSdk` 24
  - `buildTools` 36.0.0
  - `ndk` 27.1.12297006
  - Kotlin 2.1.20
- JDK with JVM args `-Xmx2048m -XX:MaxMetaspaceSize=512m`

**Production:**
- **iOS App Store:** Bundle ID `com.jaytap.app`, display name "MoveIn", development region `ru` (Russian default), development team `M3W6Y259JR`, automatic code signing, marketing version 1.0.3, current project version 21, supports arm64 only; portrait + landscape orientations; iOS minimum supported per React Native 0.84. Privacy manifest at `ios/JayTap/PrivacyInfo.xcprivacy` declares use of FileTimestamp (C617.1, 3B52.1), UserDefaults (CA92.1), and SystemBootTime (35F9.1) APIs with no tracking.
- **Android Play Store:** Application ID `com.movein`, namespace `com.movein`, `versionCode 25`, `versionName "1.0.24"`, locale resources limited to `ru` and `en`; release keystore expected at `android/app/release.keystore` with credentials in `android/app/key.properties`; Proguard disabled for release (`enableProguardInReleaseBuilds = false`).
- Deployment readiness tracked in `IOS_APP_STORE_READINESS.md`, `ANDROID_PLAY_STORE_READINESS.md`, `APP_STORE_SUBMISSION_CHECKLIST.md`, `IOS_PRODUCTION_SIGNING_GUIDE.md`, `UNIVERSAL_LINKS_SETUP.md`, `REACT_NATIVE_MAPS_VERSION_GUIDE.md`.

---

*Stack analysis: 2026-04-22*

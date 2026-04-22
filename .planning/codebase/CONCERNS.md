# Codebase Concerns

**Analysis Date:** 2026-04-22

This document catalogs technical debt, bugs, security issues, performance concerns, fragile areas, and submission-readiness blockers for the JayTap (MoveIn) React Native app. Each item cites concrete file paths with line numbers so fixes can be scoped without further exploration.

---

## Tech Debt

### Critical: Firebase API key hardcoded in source
- **Issue**: Firebase Identity Toolkit API key is committed as a plaintext string literal.
- **Files**: `src/services/AuthService.ts:5` (`const API_KEY = 'AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY';`), used at lines 15, 28, 42, 54, 124.
- **Impact**: Key is exposed in every APK/IPA, git history, and any shared clone. Although Firebase web API keys are designed to be public in principle, without corresponding Firebase Auth restrictions (allowed domains, Check App enrollment) the key can be abused to run signup/signin traffic against the project.
- **Fix approach**: Move key to a build-time config (`react-native-config` or `@react-native/metro-config` env injection), gitignore the source, and rotate the current key in Firebase Console. Apply "Android apps" and "iOS apps" restrictions in Google Cloud Console credential settings.

### Critical: `.env` loader not wired up
- **Issue**: `.env` file exists at repo root (`./.env`, 0 bytes) and is gitignored, but the project has no runtime env loader — no `react-native-config`, `react-native-dotenv`, or equivalent in `package.json`.
- **Files**: `.env` (empty), `package.json:13-28` (no env library in dependencies).
- **Impact**: Hardcoded secrets and URLs proliferate in `src/services/*` because there is no infrastructure to read env values at runtime. Developers must edit source files to switch environments.
- **Fix approach**: Install `react-native-config`, move `API_KEY`, `PRODUCTION_URL`, backend URLs, and Google Maps key into `.env` + `.env.production`, and read them via `Config.<VAR>`.

### High: App.tsx god-file (941 lines)
- **Issue**: `App.tsx` combines navigation routing, modal stack, deep-link handling, favorites state, chat unread polling, Android back-button handling, auth prompt orchestration, and tab keep-alive logic in one component.
- **File**: `App.tsx:1-941`, particularly the `AppContent` component `App.tsx:32-925` and the 27 `useState` declarations at `App.tsx:36-76`.
- **Impact**: Every new feature touches this file. The 23-dependency `useEffect` at `App.tsx:184-297` (Android hardware back handler) is a frequent source of stale-closure bugs. The tab keep-alive logic (`App.tsx:70-76`, `App.tsx:337-388`) is hand-rolled rather than using a navigation library.
- **Fix approach**: Adopt `@react-navigation/native` + `@react-navigation/native-stack`. Native navigation handles back button, deep linking, and screen lifecycle automatically and would eliminate ~500 lines here.

### High: No navigation library
- **Issue**: Project implements its own navigation via show/hide booleans and absolute-positioned overlays (`App.tsx:502-922`).
- **Files**: `App.tsx:184-297` (back handler), `App.tsx:337-388` (tab keep-alive), `App.tsx:460-499` (overlay stacking), `App.tsx:715-819` (overlay mounts), `package.json:13-28` (no `@react-navigation/*`).
- **Impact**: Screen transitions lack animations, deep linking must be hand-parsed, no gesture back on iOS, modal stacking bugs are easy to introduce (e.g., the elaborate `hideMainStackUnderOverlay` toggle at `App.tsx:508-509`).
- **Fix approach**: Migrate to React Navigation. This is a substantial refactor but will remove significant fragility.

### High: Oversized screen files
- **Issue**: Two screens exceed 1000 LOC and cannot be comfortably reviewed or unit-tested.
- **Files**:
  - `src/screens/PropertyDetailsScreen.tsx` — 1680 lines
  - `src/screens/CreateListingScreen.tsx` — 1300 lines
  - `src/screens/HomeScreen.tsx` — 684 lines
- **Impact**: Business logic, styling, and child components are all inline. Difficult to share pieces (contact modal in `PropertyDetailsScreen.tsx:866-1050`, feature icon map at `PropertyDetailsScreen.tsx:89-155`, form validation in `CreateListingScreen.tsx:339-430`).
- **Fix approach**: Extract into `src/components/`: `ContactOptionsModal`, `PropertyFeatureIcons`, `PropertyImageCarousel`, `CreateListingForm/*` (by section: BasicInfo, Media, Tours, Verification).

### High: Dead code and unused state
- **Issue**: `isLoginView` state declared but never read.
- **File**: `App.tsx:40` — `const [isLoginView, setIsLoginView] = useState(true);` — only `isLoginView` is referenced on that one line; no setter use or reader elsewhere.
- **Impact**: Misleading to reviewers; may hint at abandoned flow.
- **Fix approach**: Remove the declaration.

### High: Duplicated service boilerplate
- **Issue**: Five services each redeclare `PRODUCTION_URL`, `LOCAL_URL`, `API_URL`, and `getHeaders()` with near-identical code.
- **Files**:
  - `src/services/PropertyService.ts:5-11`
  - `src/services/FavoritesService.ts:5-10`
  - `src/services/ChatService.ts:6-18`
  - `src/services/AppointmentService.ts:6-14`
  - `src/services/AuthService.ts:10` (`BACKEND_URL`)
- **Impact**: Switching API base or auth header scheme requires editing five files; easy to miss one. `LOCAL_URL` constants are dead (never assigned to `API_URL`).
- **Fix approach**: Introduce `src/services/apiClient.ts` exporting a configured `axios.create({ baseURL, ...})` and a `useAuthHeaders()` helper; each service uses that instance.

### Medium: Pervasive `any` typing
- **Issue**: 35+ `any` annotations and `as any` casts across the codebase.
- **Notable files**:
  - `src/context/AuthContext.tsx:5,16,64,83,117` — `user: any`, loose error types, loose prop types (`login: (email, password)` has no param types).
  - `src/screens/PropertyDetailsScreen.tsx:243,271,299,316,336,555,753,887` — `(property as any).owner` because `Property.owner` IS defined at `src/types/Property.ts:49-57`; unclear why casts are needed.
  - `src/screens/AppointmentsScreen.tsx:189,330` — `item.property as any`, `colors: any`.
  - `src/screens/PropertyDetailsScreen.tsx:336` — `event: any` on scroll handler.
- **Impact**: Defeats the purpose of TypeScript strict mode (enabled via `@react-native/typescript-config`). Masks real type mismatches.
- **Fix approach**: Remove the casts in `PropertyDetailsScreen.tsx` (already typed), type `AuthContext.user` as a proper `AuthUser` interface, type error objects via a small `ApiError` helper, and use `NativeSyntheticEvent<NativeScrollEvent>` for scroll handlers.

### Medium: Auth user type is `any`
- **Issue**: `AuthContextType.user: any` at `src/context/AuthContext.tsx:5`; no shape is defined for backend profile data despite extensive use.
- **Files**: `src/context/AuthContext.tsx:5-11`; consumers at `App.tsx:33`, `src/screens/CreateListingScreen.tsx:110` (`user?.backendProfile?.userType === 'admin'`).
- **Impact**: Admin gating is a string comparison against an untyped object; typos silently pass.
- **Fix approach**: Add `interface AuthUser { localId: string; email: string; backendProfile?: BackendProfile }` and `interface BackendProfile { userType: 'admin' | 'renter' | 'owner' | ''; ... }`.

### Medium: Mock coordinate fallback in production code
- **Issue**: When a property has no lat/lng, the UI fabricates coordinates via a character-code hash of the ID so the map still draws a pin.
- **File**: `src/screens/PropertyDetailsScreen.tsx:343-362` — `// Otherwise, generate consistent mock coordinates based on property ID for demo`.
- **Impact**: Users see a pin at a fake address within ±50 m of Bishkek center, but the address displayed alongside may point elsewhere. Misleading and unsafe for scheduling viewings.
- **Fix approach**: Hide the map section (or show a "location coming soon" placeholder) when no real coordinates exist. Ensure `CreateListingScreen` geocodes addresses and rejects listings that don't geocode.

### Medium: Backward-compat code for migrated domain
- **Issue**: Deep-link parser and entitlements still support legacy `bizdinkonush.com` domain a year after the migration noted in comments.
- **Files**:
  - `src/constants.ts:5` (comment)
  - `App.tsx:95` (comment says "also supports legacy bizdinkonush.com links")
  - `ios/JayTap/JayTap.entitlements:8` (`applinks:www.bizdinkonush.com`)
  - `IOS_APP_STORE_READINESS.md:18` (documents legacy entitlement)
- **Impact**: Carrying defunct universal-link entitlement adds attack surface (anyone controlling the domain could phish users) and keeps the iOS provisioning profile bound to an unused domain.
- **Fix approach**: Verify DNS ownership status of `bizdinkonush.com`; if lapsed, remove the applinks entry and strip legacy deep-link branches.

### Medium: Duplicate `TourHeroCard` platform variants
- **Issue**: `TourHeroCard.tsx` and `TourHeroCard.android.tsx` diverged (186 vs 187 lines with near-identical content).
- **Files**: `src/components/TourHeroCard.tsx`, `src/components/TourHeroCard.android.tsx`.
- **Impact**: Any fix has to be applied twice; drift will happen.
- **Fix approach**: Merge to a single file with `Platform.select` for the one piece that actually differs (likely shadow styling).

### Low: 37 `console.error`/`console.warn` calls in production build
- **Issue**: Errors surface only to developer logs; no crash reporter (Sentry, Bugsnag, Crashlytics) is configured.
- **Files (sample)**: `src/context/AuthContext.tsx:40`, `src/context/AuthContext.tsx:69`, `src/services/PropertyService.ts:22`, `src/screens/FavoritesScreen.tsx:63-64`, `App.tsx:109`, `App.tsx:452`, plus 31 more grep matches.
- **Impact**: Production crashes and silently-swallowed errors (e.g., `FavoritesService.getFavorites` returns `[]` on any error, `src/services/FavoritesService.ts:43-49`) are invisible in the field.
- **Fix approach**: Add `@sentry/react-native` and replace bare `console.error` with `Sentry.captureException` in service-layer catches.

---

## Known Bugs

### High: Favorites errors silently swallowed
- **Issue**: `FavoritesService.getFavorites` catches any error and returns `[]`, hiding real failures from the UI.
- **File**: `src/services/FavoritesService.ts:43-49`.
- **Trigger**: Backend 500, network outage, or malformed response.
- **Symptoms**: User sees empty favorites even when the server is returning data.
- **Workaround**: None currently; logs are lost because the catch doesn't even log on line 48.

### High: Deep-link handler re-runs on every auth change
- **Issue**: `useEffect` dependency `[user]` at `App.tsx:131` re-attaches the `Linking` listener every time the user object changes (e.g., after login), which can cause duplicate navigations when an in-flight URL resolves.
- **File**: `App.tsx:79-131`.
- **Symptoms**: On cold-start with a universal link, if Firebase auth restores before `getInitialURL` resolves, the user can land on both PropertyDetails and the reset-password modal.
- **Fix approach**: Remove `user` from the dependency array; the handler doesn't read `user`. Use a `ref` if user access is genuinely needed.

### Medium: `Alert.alert` uses English strings in deep-link handler
- **Issue**: While most of the app is localized via `useLanguage().t(...)`, deep-link errors are hardcoded English.
- **File**: `App.tsx:105,110` — `'Property Not Found'`, `'Failed to open property link.'`.
- **Symptoms**: Russian-locale users see English error titles for a common path.
- **Fix approach**: Replace with `t('property.notFoundTitle')` / `t('error.deepLinkFailed')` and add the keys to `src/locales/en.ts` + `src/locales/ru.ts`.

### Medium: HomeScreen.loadProperties uses hardcoded English Alert
- **Issue**: Same issue as above.
- **File**: `src/screens/HomeScreen.tsx:106` — `Alert.alert('Error', 'Failed to load properties');`.
- **Fix approach**: Localize.

### Medium: Chat unread count polled every 60 seconds
- **Issue**: `App.tsx:146-162` polls `ChatService.getUnreadCount()` on a fixed interval regardless of foreground/background state; socket connection at `ChatService.connectSocket` (`src/services/ChatService.ts:96-104`) already delivers real-time `new_message` events and could be used instead.
- **Impact**: Battery/data drain, duplicate unread signals, and wasted backend requests while the app is backgrounded.
- **Fix approach**: Pause polling on `AppState === 'background'`; rely on socket events to increment the badge.

---

## Security Considerations

### Critical: Firebase API key in source (see Tech Debt)
- See "Firebase API key hardcoded in source" above.

### High: Firebase uid used as sole auth for backend requests
- **Issue**: Every authenticated request sends the Firebase uid in a plain header `x-firebase-uid` rather than the signed `idToken`.
- **Files**: `src/services/PropertyService.ts:106,178,208,225`, `src/services/FavoritesService.ts:25,64,90,114,141`, `src/services/ChatService.ts:17`, `src/services/AppointmentService.ts:13`.
- **Impact**: If the backend accepts the header without verifying the token, anyone who obtains another user's `localId` (e.g., from a shared listing response) can impersonate them. The `saveToken` pattern at `src/services/AuthService.ts:64-67` stores the `idToken` but it is never sent.
- **Fix approach**: Send `Authorization: Bearer ${idToken}` and verify on the backend with Firebase Admin SDK. Remove the `x-firebase-uid` path.

### High: Auth tokens stored in AsyncStorage (unencrypted)
- **Issue**: Firebase `idToken` and cached user profile are placed in `AsyncStorage` plaintext.
- **File**: `src/services/AuthService.ts:64-66`, `src/services/AuthService.ts:69-75`.
- **Impact**: On a rooted Android device or a backed-up iOS device, tokens are accessible. For an app handling property listings with contact info, this is notable.
- **Fix approach**: Migrate to `react-native-keychain` or `@react-native-async-storage/async-storage` with `react-native-encrypted-storage` wrapper.

### Medium: Google Maps key shipped in Android manifest placeholder
- **Issue**: `AndroidManifest.xml:14-16` injects the Maps key via `${GOOGLE_MAPS_API_KEY}` manifest placeholder, sourced from `key.properties`.
- **Files**: `android/app/src/main/AndroidManifest.xml:14-16`, `android/app/build.gradle:96-98`.
- **Impact**: The key ends up in the compiled APK. Without Google Cloud Console key restrictions (package name + SHA-1), the key can be scraped and reused.
- **Fix approach**: The `ANDROID_PLAY_STORE_READINESS.md:51-55` acknowledges this — apply the restriction in Google Cloud Console. Verify restriction is actually in place before release.

### Medium: `android:allowBackup="false"` but user data in AsyncStorage
- **Issue**: `android:allowBackup="false"` at `android/app/src/main/AndroidManifest.xml:10` is set — good — but confirm iOS iCloud backup exclusion is also applied for AsyncStorage files.
- **Impact**: Low on Android (backup disabled), but iOS default backs up the app's Documents directory.
- **Fix approach**: Add `NSURLIsExcludedFromBackupKey` handling or use Keychain for secrets.

### Medium: No certificate pinning or ATS exception review
- **Issue**: iOS ATS is correctly `NSAllowsArbitraryLoads = false` (`ios/JayTap/Info.plist:30-35`), but `NSAllowsLocalNetworking = true` is set and no certificate pinning is configured.
- **Impact**: Standard HTTPS is the baseline; MitM against a user on a hostile Wi-Fi could read property data and chat.
- **Fix approach**: Consider certificate pinning for the Railway backend using `axios` interceptors + `react-native-ssl-pinning` for high-value actions (auth, account deletion).

### Medium: No password policy enforcement on backend (visible)
- **Issue**: Client enforces password policy (`src/utils/passwordPolicy.ts`); no visible server-side enforcement in this mobile repo.
- **Impact**: Weak passwords can be created via direct Firebase REST call from a tampered client.
- **Fix approach**: Rely on Firebase Auth policies in console + ensure backend re-validates on signup hook.

### Low: Admin role check is client-side
- **Issue**: Admin panel visibility and the "patch verifications" call is gated only by `user?.backendProfile?.userType === 'admin'` on the client.
- **Files**: `src/screens/CreateListingScreen.tsx:110,319,396,926`; `src/services/PropertyService.ts:189-213` (`patchPlatformVerifications`).
- **Impact**: A motivated user could call the endpoint directly. Only a concern if backend doesn't independently verify admin role.
- **Fix approach**: Ensure `/properties/:id/verifications` on the server checks the authenticated uid's role — and send `idToken` not just `x-firebase-uid` header (see above).

---

## Performance Bottlenecks

### High: Unread-count polling plus socket duplication
- **Issue**: Duplicate unread sources — setInterval polling at `App.tsx:160` and socket listener at `ChatService.connectSocket` (`src/services/ChatService.ts:96-104`). Each can increment badges.
- **Impact**: Unnecessary network calls, potential UI flicker when poll result and socket push race.
- **Fix approach**: Drop the poll once the socket is connected; poll only as a fallback if the socket fails to establish within 5 s.

### High: `getAllProperties` loads entire list up front
- **Issue**: `PropertyService.getAllProperties` returns every property in one payload and the client filters client-side.
- **Files**: `src/services/PropertyService.ts:14-25`, `src/screens/HomeScreen.tsx:100-110,112-160` (all filtering is in `useMemo`).
- **Impact**: Linear slowdown as the catalog grows. 500+ properties will cause dropped frames in the list and map.
- **Fix approach**: Add server-side pagination + filter params (`type`, `propertyType`, `city`, `bounds`). Use `FlatList` `onEndReached` for infinite scroll.

### Medium: Android back-handler useEffect with 19 dependencies
- **Issue**: `App.tsx:277-297` dependency array rebinds the listener on every state change.
- **Impact**: Allocation churn; possible duplicate event subscriptions if React Native batches re-renders unexpectedly.
- **Fix approach**: Use a `ref` to hold the up-to-date handler, attach a single listener at mount.

### Medium: `LayoutAnimation` enabled globally for Android
- **Issue**: `src/screens/HomeScreen.tsx:20-23` enables `setLayoutAnimationEnabledExperimental(true)` at module import time.
- **Impact**: Layout animations may run on screens that don't expect them, and the experimental API can conflict with Fabric (new architecture is enabled per `android/gradle.properties`: `newArchEnabled=true`).
- **Fix approach**: Remove the experimental flag; use `react-native-reanimated` layout animations instead.

### Medium: ProGuard/R8 disabled for release builds
- **Issue**: `enableProguardInReleaseBuilds = false` at `android/app/build.gradle:64`.
- **Impact**: Larger APK/AAB, no code obfuscation. Known already per `ANDROID_PLAY_STORE_READINESS.md:62-63`.
- **Fix approach**: Enable ProGuard and run `bundleRelease` to catch missing keep rules for Hermes/RN.

---

## Fragile Areas

### High: Manual tab keep-alive via booleans
- **Issue**: `App.tsx:70-76` tracks a `tabEverMounted` record; `App.tsx:337-388` computes visibility booleans from a chain of negations.
- **Why fragile**: Adding a new screen requires editing 6–10 places. The `showHome` computation at `App.tsx:359-366` depends on every other `show*` being false — easy to break when adding a new modal.
- **Safe modification**: Only add new overlays after writing out the full truth table in a comment, then mirror it in the back-handler at `App.tsx:184-297`.
- **Test coverage**: Zero tests for this logic. `__tests__/App.test.tsx` only renders App and checks it doesn't throw.

### High: Deep-link URL matching via regex
- **Issue**: URL parsing is hand-rolled regex with case-insensitive string includes.
- **File**: `App.tsx:83` (`url.toLowerCase().includes('mode=resetpassword')`), `App.tsx:96` (`url.match(/\/property\/([^\/\?]+)/)`).
- **Why fragile**: Trailing slashes, URL fragments, query-param ordering, and nested paths are all special-cased implicitly. Doesn't decode URL-encoded characters.
- **Safe modification**: Use the `URL` polyfill (`import 'react-native-url-polyfill/auto'`) or a dedicated routing library.
- **Test coverage**: None.

### Medium: Property data shape trusts backend
- **Issue**: Services cast `response.data.map((p: any) => ({ ...p, id: p._id }))` everywhere.
- **Files**: `src/services/PropertyService.ts:19,43`, `src/services/FavoritesService.ts:37-40`, `src/services/ChatService.ts:51,64,74`, `src/services/AppointmentService.ts:20,68,81`.
- **Why fragile**: Any backend rename breaks silently. There is no runtime validation.
- **Safe modification**: Add `zod` or `io-ts` schemas and parse at the service boundary.
- **Test coverage**: Zero.

### Medium: Manual Firebase Identity Toolkit REST integration
- **Issue**: Authentication is implemented directly against Firebase REST endpoints rather than `@react-native-firebase/auth`.
- **Files**: `src/services/AuthService.ts:7-62`.
- **Why fragile**: No automatic token refresh, no offline queueing, requires manual handling of all error codes. The comment `/** Firebase Identity Toolkit REST — same flow as CarEx; no Firebase client SDK. */` at line 39 suggests this was copied from another project.
- **Safe modification**: Either commit to REST and add token refresh logic, or migrate to `@react-native-firebase/auth` and get refresh + anonymous + phone auth for free.

### Medium: Deletion flow partial-failure path
- **Issue**: Account deletion soft-deletes the backend record, then attempts Firebase Auth deletion; if Firebase succeeds but backend fails after the state mutation, state is inconsistent.
- **File**: `src/services/AuthService.ts:116-156`.
- **Why fragile**: Comments at lines 128-131 acknowledge a partial-failure path. There's no retry or admin reconciliation mechanism.
- **Safe modification**: Perform Firebase deletion first (or use Firebase Auth's onDelete function to trigger backend lock) to keep both sides in sync.

---

## Scaling Limits

### High: Home list renders without virtualization beyond FlatList defaults
- **Resource**: `FlatList` in `HomeScreen`/`RenterListingsScreen`.
- **Current capacity**: Works for ~100 properties on mid-range Android.
- **Limit**: Beyond a few hundred properties the image preloading (each `PropertyCard` loads its hero image eagerly) will cause OOM on low-RAM devices.
- **Files**: `src/screens/HomeScreen.tsx:93-94`, `src/components/PropertyCard.tsx` (~417 lines).
- **Scaling path**: Server-side pagination + image thumbnails (resize on upload), set `windowSize`, `maxToRenderPerBatch`, and `removeClippedSubviews`.

### Medium: Chat messages loaded in one request per conversation
- **Resource**: `ChatService.getMessages(conversationId)` at `src/services/ChatService.ts:61-65`.
- **Limit**: Long-running conversations (500+ messages) will send outsized payloads and cause lag when rendering.
- **Scaling path**: Add pagination (`?before=<cursor>&limit=50`) and reverse-scroll load.

---

## Dependencies at Risk

### Medium: React Native 0.84.0 + React 19.2.3 + New Architecture enabled
- **Issue**: Running on bleeding-edge combination of RN, React, and Fabric (`newArchEnabled=true` at `android/gradle.properties:41`).
- **File**: `package.json:19-20`, `android/gradle.properties:41`.
- **Impact**: Not every RN library is compatible with new-architecture yet; `react-native-maps 1.27.1` is pinned without ^ (per `package.json:23`) which suggests past compatibility issues — corroborated by `REACT_NATIVE_MAPS_VERSION_GUIDE.md:1-70` which lists a downgrade ladder.
- **Migration plan**: Before each major RN upgrade, run regression tests for maps, image-picker, webview, and linear-gradient. Keep `REACT_NATIVE_MAPS_VERSION_GUIDE.md` updated.

### Medium: `@react-native/new-app-screen` dependency unused
- **Issue**: `package.json:16` lists `"@react-native/new-app-screen": "0.84.0"` but no file imports it.
- **Impact**: Dead dependency; slows `pod install` / gradle sync slightly.
- **Fix approach**: Remove from `package.json`.

### Low: `prettier 2.8.8`
- **Issue**: Prettier v3 has been out since 2023.
- **File**: `package.json:45`.
- **Impact**: None functionally; minor formatter drift vs. modern codebases.

### Low: No Husky / lint-staged / pre-commit hooks
- **Issue**: Nothing enforces `eslint`/`prettier` before commits. `eslint.config` at `.eslintrc.js:1-4` is a one-liner (`extends: '@react-native'`).
- **Impact**: Style drift creeps in.
- **Fix approach**: Add `husky` + `lint-staged` in `devDependencies`.

---

## Missing Critical Features

### High: No crash / error monitoring
- **Problem**: No Sentry, Bugsnag, Crashlytics, or Firebase Crashlytics configured.
- **Blocks**: Detecting production crashes; user-reported bugs have no stack traces.

### High: No analytics
- **Problem**: No analytics SDK integrated.
- **Blocks**: Understanding drop-off in listing creation, measuring feature usage. Needed before scale-up decisions.

### Medium: No push notifications
- **Problem**: Socket-based chat only works while the app is foregrounded.
- **Blocks**: Re-engagement, appointment reminders, new chat alerts when the app is closed.

### Medium: No offline mode / request queueing
- **Problem**: Every mutation fails hard on network error; no retry queue.
- **Blocks**: Listing creation in low-connectivity areas (which describes much of Kyrgyzstan outside Bishkek).

---

## Test Coverage Gaps

### Critical: Effectively zero tests
- **What's not tested**: Everything except "App renders".
- **File**: `__tests__/App.test.tsx:1-12` — only `test('renders correctly', ...)`.
- **Risk**: Any regression in auth, deep linking, favorites, chat, listing CRUD, or navigation is undetectable without manual testing on device.
- **Priority**: High for authentication, deep linking, and property CRUD; Medium for UI components; Low for styling.

### High: No service-layer tests
- **What's not tested**: `src/services/*` have no unit tests. No Axios mocking setup.
- **Risk**: A silent schema change on the backend will be discovered in the field.
- **Priority**: High.

### High: No utility tests
- **Files**: `src/utils/passwordPolicy.ts`, `src/utils/parseOobCode.ts`, `src/utils/formatPrice.ts`, `src/utils/formatTourHeroCount.ts` — all pure and trivial to unit-test, but untested.
- **Priority**: Medium (pure functions change rarely).

---

## iOS App Store Submission Blockers

### Critical: Version/build mismatch between docs and code
- **Issue**: `IOS_APP_STORE_READINESS.md:13-15` documents `MARKETING_VERSION = 1.0`, `CURRENT_PROJECT_VERSION = 1`, but actual project is at `MARKETING_VERSION = 1.0.3`, `CURRENT_PROJECT_VERSION = 21` (per `ios/JayTap.xcodeproj/project.pbxproj:266,275,297,305`).
- **Impact**: Documentation is stale; may mislead release checklist work.
- **Fix approach**: Update `IOS_APP_STORE_READINESS.md` to reflect actual versions.

### High: `CFBundleDevelopmentRegion` is `ru`
- **Issue**: `ios/JayTap/Info.plist:7-8` sets primary region to Russian.
- **Impact**: If primary market is Kyrgyzstan/Russia this is correct, but App Store reviewers default to English localization review. `IOS_APP_STORE_READINESS.md:68` already flags this.
- **Fix approach**: Confirm with product. If Russian is primary, leave it; if English is primary, change to `en`.

### Medium: `NSPrivacyCollectedDataTypes` is empty
- **Issue**: `ios/JayTap/PrivacyInfo.xcprivacy:29-30` has `<key>NSPrivacyCollectedDataTypes</key><array/>` but the app collects email, name, phone, whatsapp, telegram, property photos, location (via IP/maps).
- **Impact**: App Privacy responses in App Store Connect must match the privacy manifest or review rejection.
- **Fix approach**: Populate the array with the actual collected data types (EmailAddress, Name, PhoneNumber, PhotoOrVideo, etc.) with `linkedToUser = true`, `usedForTracking = false`.

### Medium: Legacy associated-domain still in entitlements
- **Issue**: `ios/JayTap/JayTap.entitlements:8` includes `applinks:www.bizdinkonush.com`.
- **Impact**: If the domain's `apple-app-site-association` is no longer hosted (likely), app install succeeds but the entitlement is dead weight. If someone else acquires the domain they could host AASA and hijack deep links.
- **Fix approach**: Remove the legacy applinks entry once backward-compat support for old shared links is sunset.

### Low: `APP_STORE_SUBMISSION_CHECKLIST.md` is gitignored
- **Issue**: `.gitignore:7` ignores `APP_STORE_SUBMISSION_CHECKLIST.md`.
- **Impact**: Checklist isn't shared across the team / CI.
- **Fix approach**: Decide whether it should be tracked; if so, remove from `.gitignore`.

---

## Android Google Play Submission Blockers

### High: Manifest lacks declared permissions that readiness doc claims
- **Issue**: `ANDROID_PLAY_STORE_READINESS.md:73` states: "You use INTERNET, CAMERA, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE" — but `AndroidManifest.xml:3-4` declares only `INTERNET` and `CAMERA`.
- **Impact**: If `ImagePicker` needs media permissions at runtime on Android 13+, the request will fail silently because the permission is not declared. This may be fine if `react-native-image-picker 8.x` uses the scoped photo picker (no permission needed), but that should be explicitly verified on device.
- **Fix approach**: Either add `READ_MEDIA_IMAGES` + `READ_EXTERNAL_STORAGE` to the manifest and justify in Play Console, or remove the claim from the readiness doc. Also, no `ACCESS_FINE_LOCATION` is declared — but the iOS side asks for location usage. Confirm whether Android uses IP-only location.

### High: ProGuard disabled (see Performance Bottlenecks)
- Known per `ANDROID_PLAY_STORE_READINESS.md:62-63`; still not enabled.

### High: Version/build mismatch between docs and code
- **Issue**: `ANDROID_PLAY_STORE_READINESS.md:14` shows `versionCode 1, versionName "1.0"`; actual is `versionCode 25, versionName "1.0.24"` (`android/app/build.gradle:91-92`).
- **Impact**: Stale documentation.
- **Fix approach**: Update doc.

### Medium: Application namespace renamed but docs reference old package
- **Issue**: `android/app/build.gradle:85-87` uses `namespace "com.movein"` and `applicationId "com.movein"`. `ANDROID_PLAY_STORE_READINESS.md:15` still documents `com.jaytap`. The Java package path is `android/app/src/main/java/com/movein/`.
- **Impact**: If an app was previously published as `com.jaytap`, users cannot upgrade to `com.movein` — they must install a new listing.
- **Fix approach**: Confirm Play Console app ID. If the app was never published under `com.jaytap`, this is fine. Update documentation accordingly.

### Medium: Release keystore and `key.properties` committed locally but not verified as safe
- **Issue**: `android/app/key.properties` and `android/app/release.keystore` exist locally. They are gitignored (`.gitignore:37,39`) but developers should verify history — `git log --all -- android/app/key.properties` to ensure they were never committed.
- **Fix approach**: Audit git history for accidental commits of these files.

### Low: `resConfigs "ru", "en"` only
- **Issue**: `android/app/build.gradle:94` limits resource configurations to ru/en, matching the app's actual locales. Good — no action needed.

---

## Submission-Readiness Summary

| Item | iOS | Android | Severity |
|------|-----|---------|----------|
| Hardcoded Firebase API key | Yes | Yes | Critical |
| Version/build docs out of sync | Yes | Yes | Medium |
| Privacy manifest incomplete | Yes | N/A | Medium |
| Legacy domain entitlement | Yes | No | Medium |
| Permissions match declared list | N/A | No | High |
| ProGuard enabled | N/A | No | High |
| Release signing configured | Yes (automatic) | Yes (keystore present) | — |
| Privacy policy URL | Required | Required | High |
| Crash reporting integrated | No | No | High |

---

*Concerns audit: 2026-04-22*

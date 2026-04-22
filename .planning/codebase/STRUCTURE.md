# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
JayTap/
├── App.tsx                           # Root component: providers + AppContent navigation state machine
├── index.js                          # RN AppRegistry entry point
├── app.json                          # RN app name config
├── package.json                      # Dependencies, scripts, engines
├── tsconfig.json                     # TypeScript config
├── babel.config.js                   # Babel preset config
├── metro.config.js                   # Metro bundler config
├── jest.config.js                    # Jest config
├── apple-app-site-association.example # Example universal-links config
├── build-android-release.sh          # Android release build helper
├── Gemfile / Gemfile.lock            # CocoaPods / Fastlane Ruby deps
├── __tests__/
│   └── App.test.tsx                  # Single RN smoke test
├── scripts/
│   └── archive-ios.sh                # iOS archive helper
├── ios/                              # Xcode project (JayTap.xcodeproj, Podfile, native code)
├── android/                          # Gradle project (app/build.gradle, native code)
├── vendor/                           # Bundler-installed Ruby gems
├── src/                              # All app source code
│   ├── components/                   # Reusable presentational widgets (13 files)
│   ├── constants.ts                  # APP_BASE_URL + getPropertyShareUrl helper
│   ├── context/                      # React Contexts: Auth, Language
│   ├── data/                         # (Empty — reserved)
│   ├── locales/                      # i18n dictionaries (en, ru) + t() function
│   ├── screens/                      # 19 full-screen views
│   ├── services/                     # axios + socket.io network layer (5 services)
│   ├── theme/                        # colors palette + ThemeContext
│   ├── types/                        # Property, Appointment TypeScript interfaces
│   └── utils/                        # Pure helpers (format, parse, policy)
├── node_modules/                     # Installed JS deps
└── Markdown docs at root             # ANDROID_PLAY_STORE_READINESS.md, APP_STORE_SUBMISSION_CHECKLIST.md,
                                      # IOS_APP_STORE_READINESS.md, IOS_PRODUCTION_SIGNING_GUIDE.md,
                                      # REACT_NATIVE_MAPS_VERSION_GUIDE.md, UNIVERSAL_LINKS_SETUP.md, README.md
```

## Directory Purposes

**`src/components/`:**
- Purpose: Reusable presentational & interactive widgets consumed by screens
- Contains: 13 `.tsx` files (no subfolders, no barrel `index.ts`)
- Key files:
  - `src/components/BottomNavigator.tsx` — 5-tab bottom bar with `TabId = 'home' | 'favorites' | 'add' | 'chat' | 'profile'`, chat unread badge
  - `src/components/PropertyCard.tsx` — list cell that composes `ListingMetaTable`, share, favorite, edit / delete actions
  - `src/components/PropertyMap.tsx` — `react-native-maps` `MapView` with markers (Bishkek-centered)
  - `src/components/AuthPromptModal.tsx` — Sign-in nag used when anon user hits protected action
  - `src/components/DeleteAccountModal.tsx` / `src/components/DeleteListingModal.tsx` — confirm destructive flows
  - `src/components/LanguageToggleSwitch.tsx` / `src/components/ThemeToggleSwitch.tsx` — header controls
  - `src/components/ListingMetaTable.tsx` — availability / beds / baths / sqm detail rows
  - `src/components/PasswordRequirements.tsx` / `src/components/PasswordTextInput.tsx` — password UX
  - `src/components/TourHeroCard.tsx` + `src/components/TourHeroCard.android.tsx` — platform-split Matterport hero card
  - `src/components/AuthModalCloseButton.tsx` — shared "X" button for auth modals

**`src/screens/`:**
- Purpose: Full-screen views. One file per screen. No nested folders.
- Contains: 19 `.tsx` files
- Key files:
  - `src/screens/HomeScreen.tsx` (684 lines) — search, filters, list/map toggle
  - `src/screens/PropertyDetailsScreen.tsx` (1680 lines) — largest screen; hero, gallery, meta, actions
  - `src/screens/CreateListingScreen.tsx` (1300 lines) — multi-step listing form with image upload
  - `src/screens/ProfileScreen.tsx`, `src/screens/AccountSettingsScreen.tsx`
  - `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`, `src/screens/ForgotPasswordScreen.tsx`, `src/screens/ResetPasswordScreen.tsx`
  - `src/screens/FavoritesScreen.tsx`, `src/screens/RenterListingsScreen.tsx`, `src/screens/OwnerListingsScreen.tsx`
  - `src/screens/ChatScreen.tsx`, `src/screens/ChatComposeScreen.tsx`, `src/screens/ChatThreadScreen.tsx`
  - `src/screens/AppointmentsScreen.tsx`, `src/screens/ScheduleViewingScreen.tsx`
  - `src/screens/Tour3DScreen.tsx` (WebView 3D tour), `src/screens/TourSelectionScreen.tsx`

**`src/services/`:**
- Purpose: Network I/O layer (REST + websocket). Every outgoing request goes through this folder.
- Contains: 5 `.ts` service objects (no classes)
- Key files:
  - `src/services/AuthService.ts` — Firebase Identity Toolkit REST + backend user sync + `AsyncStorage` token persistence
  - `src/services/PropertyService.ts` — CRUD on `/api/properties`, multipart image uploads
  - `src/services/FavoritesService.ts` — `/api/favorites`
  - `src/services/ChatService.ts` — `/api/chats` REST + `socket.io-client` live channel
  - `src/services/AppointmentService.ts` — `/api/appointments` + owner-settings + availability

**`src/context/`:**
- Purpose: React Context providers that expose app-wide state
- Contains: 2 `.tsx` files
- Key files:
  - `src/context/AuthContext.tsx` — `AuthProvider`, `useAuth()`, exposes `{ user, loading, login, signup, logout, deleteAccount }`
  - `src/context/LanguageContext.tsx` — `LanguageProvider`, `useLanguage()`, exposes `{ language, setLanguage, t }`, persists to `@jaytap_language`

**`src/theme/`:**
- Purpose: Design tokens + theme context (kept beside color palette rather than under `context/`)
- Contains:
  - `src/theme/colors.ts` — `colors.light` / `colors.dark` objects and `ThemeColors` type
  - `src/theme/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, follows system `useColorScheme()`

**`src/types/`:**
- Purpose: Shared TypeScript domain models
- Contains:
  - `src/types/Property.ts` — `Property`, `Tour`, `PlatformVerifications`
  - `src/types/Appointment.ts` — `Appointment`, `TimeSlot`, `AvailabilityResponse`, `OwnerSettings`

**`src/utils/`:**
- Purpose: Pure, dependency-light helpers
- Contains:
  - `src/utils/formatPrice.ts` — currency formatting for USD / KGS / custom
  - `src/utils/formatTourHeroCount.ts` — tour count pluralization
  - `src/utils/parseOobCode.ts` — extract Firebase reset oobCode from URL / pasted string
  - `src/utils/passwordPolicy.ts` — `PASSWORD_MIN_LENGTH`, `getPasswordRequirementChecks`, `passwordMeetsPolicy`

**`src/locales/`:**
- Purpose: Localization dictionaries and lookup function
- Contains:
  - `src/locales/en.ts` — English strings (source of `TranslationKeys` type)
  - `src/locales/ru.ts` — Russian strings
  - `src/locales/index.ts` — `t(language, key, params)` with `{param}` interpolation, English fallback, raw-key fallback

**`src/data/`:**
- Purpose: Reserved directory (currently empty). Intended for static seed data / mock fixtures.
- Contains: No files

**`__tests__/`:**
- Purpose: Jest tests
- Contains: `__tests__/App.test.tsx` only (single RN smoke test — minimal coverage)

**`scripts/`:**
- Purpose: Shell scripts for release tooling
- Contains: `scripts/archive-ios.sh`; `build-android-release.sh` is at project root

**`ios/` and `android/`:**
- Purpose: Native platform projects generated by the RN template
- Contains: Xcode workspace / Gradle project; edited for signing and version bumps (see recent `project.pbxproj` / `app/build.gradle` changes)

## Key File Locations

**Entry Points:**
- `index.js`: React Native `AppRegistry.registerComponent` binding
- `App.tsx`: Root provider composition and top-level navigation state machine (`AppContent`)

**Configuration:**
- `app.json`: RN app name
- `package.json`: Scripts (`android`, `ios`, `start`, `test`, `lint`), dependencies, `engines.node >=22.11.0`
- `tsconfig.json`: TypeScript compiler config
- `babel.config.js`, `metro.config.js`, `jest.config.js`: Tooling configs
- `src/constants.ts`: `APP_BASE_URL = 'https://www.moveinplatform.com'` and `getPropertyShareUrl`
- `apple-app-site-association.example`, `UNIVERSAL_LINKS_SETUP.md`: Deep-link configuration reference

**Core Logic:**
- `App.tsx`: All navigation state (~20 boolean flags), back-handler logic, deep-link handler
- `src/services/`: All network calls
- `src/context/AuthContext.tsx`: Auth session orchestration
- `src/screens/HomeScreen.tsx`: Primary discovery surface
- `src/screens/PropertyDetailsScreen.tsx`: Primary detail surface

**Testing:**
- `__tests__/App.test.tsx`: Sole test file
- `jest.config.js`: Jest configuration

**Native:**
- `ios/JayTap.xcodeproj/project.pbxproj`: iOS build settings (version bumps tracked here)
- `android/app/build.gradle`: Android versionCode / versionName
- `build-android-release.sh`, `scripts/archive-ios.sh`: Release build helpers

## Naming Conventions

**Files:**
- Components and screens: `PascalCase.tsx` (e.g., `PropertyCard.tsx`, `HomeScreen.tsx`)
- Services: `PascalCase.ts` ending in `Service` (e.g., `PropertyService.ts`, `AuthService.ts`)
- Contexts: `PascalCase.tsx` ending in `Context` (e.g., `AuthContext.tsx`)
- Utils: `camelCase.ts` named after the primary exported function (e.g., `formatPrice.ts`, `parseOobCode.ts`)
- Types: `PascalCase.ts` matching the primary interface (e.g., `Property.ts`, `Appointment.ts`)
- Locales: lowercase language codes (`en.ts`, `ru.ts`)
- Shell scripts: `kebab-case.sh`
- Platform-specific variants: `ComponentName.android.tsx` / `ComponentName.ios.tsx` siblings (e.g., `TourHeroCard.android.tsx`)

**Directories:**
- All lowercase, single-word where possible (`screens`, `components`, `services`, `context`, `types`, `utils`, `locales`, `theme`, `data`)
- No grouping by feature; grouped by technical role

**Symbols:**
- Components / screens: `PascalCase` functional components with `React.FC` or explicit `({ ... }: Props) =>`
- Services: `const XxxService = { method1, method2 }` — object literal, not a class
- Hooks: `useXxx` (e.g., `useAuth`, `useTheme`, `useLanguage`)
- Context types: `XxxContextType` interface
- Types: `PascalCase` interfaces in `src/types/`
- Constants: `SCREAMING_SNAKE_CASE` at module scope (e.g., `API_URL`, `BISHKEK_DISTRICTS`, `PASSWORD_MIN_LENGTH`, `LANGUAGE_STORAGE_KEY`)
- Translation keys: dot-namespaced strings typed as `TranslationKeys` (e.g., `'nav.search'`, `'auth.pleaseSignInToFavorite'`)

## Where to Add New Code

**New Screen:**
- Primary code: `src/screens/NewFeatureScreen.tsx`
- Import and render in `App.tsx` → `AppContent` using the boolean-flag pattern (`isNewFeatureOpen`, `setIsNewFeatureOpen`)
- Add a back-button branch in the `BackHandler` effect in `App.tsx`
- Tests: `__tests__/NewFeatureScreen.test.tsx`

**New Component:**
- Implementation: `src/components/NewWidget.tsx`
- Consume `useTheme()` for colors and `useLanguage()` for strings — do not hardcode
- If platform-divergent: add `src/components/NewWidget.android.tsx` alongside

**New Service / API Integration:**
- Implementation: `src/services/NewService.ts` as `export const NewService = { ... }`
- Reuse `const API_URL = 'https://jaytap-services-production.up.railway.app/api'` pattern
- Inject auth via `await AuthService.getUserData()` → `x-firebase-uid` header

**New Domain Type:**
- Add to `src/types/NewEntity.ts`
- Export all related interfaces from the same file (see `Appointment.ts` for the pattern)

**New Utility Helper:**
- Shared helpers: `src/utils/newHelper.ts` (one helper per file, named after the primary export)

**New Localization Key:**
- Add to `src/locales/en.ts` first (English is the key source), then mirror in `src/locales/ru.ts`
- Consume via `const { t } = useLanguage(); t('my.new.key')`

**New Theme Color:**
- Add to both `colors.light` and `colors.dark` in `src/theme/colors.ts`
- Access via `const { colors } = useTheme()`

**New Context / Global State:**
- Create `src/context/NewContext.tsx` following the `AuthContext` / `LanguageContext` template (Provider + `useNewContext` hook that throws if unmounted)
- Add provider to the nested stack in `App.tsx` → `App` (inside `SafeAreaProvider` → `ThemeProvider` → `LanguageProvider` → `AuthProvider`)

## Special Directories

**`src/data/`:**
- Purpose: Reserved for static data / seed fixtures
- Generated: No
- Committed: Yes
- Note: Currently empty

**`vendor/`:**
- Purpose: Bundler-managed Ruby gem cache (Fastlane / CocoaPods tooling)
- Generated: Yes (by `bundle install`)
- Committed: Partially (typical for RN projects)

**`node_modules/`:**
- Purpose: Installed JS dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**`ios/Pods/`:**
- Purpose: CocoaPods-installed iOS dependencies
- Generated: Yes (by `pod install`)
- Committed: No (controlled by `.gitignore`)

**Root-level Markdown files:**
- Purpose: Operational runbooks — not consumed by the app
- Files: `ANDROID_PLAY_STORE_READINESS.md`, `APP_STORE_SUBMISSION_CHECKLIST.md`, `IOS_APP_STORE_READINESS.md`, `IOS_PRODUCTION_SIGNING_GUIDE.md`, `REACT_NATIVE_MAPS_VERSION_GUIDE.md`, `UNIVERSAL_LINKS_SETUP.md`, `README.md`
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-22*

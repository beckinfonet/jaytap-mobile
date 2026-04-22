# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Single-file state-machine UI with feature-grouped folders (layered React Native app without a navigation library)

**Key Characteristics:**
- Flat, role-based folder taxonomy (`screens/`, `components/`, `services/`, `context/`, `theme/`, `types/`, `utils/`, `locales/`) — no feature-per-folder modularization
- No third-party navigator (no `@react-navigation/*` or `react-native-navigation`) — screen routing is expressed as boolean state + conditional rendering in `App.tsx` (`AppContent`)
- Service layer (`src/services/*.ts`) encapsulates all HTTP calls via `axios` to a single Railway-hosted backend plus direct Firebase Identity Toolkit REST calls
- Global cross-cutting concerns injected via nested React Context providers (`ThemeProvider` → `LanguageProvider` → `AuthProvider`)
- Component-level state is local (`useState`, `useCallback`, `useRef`); no Redux / Zustand / MobX / React Query
- Single source of truth for navigation state lives in `App.tsx` as ~20+ boolean / object flags (`selectedProperty`, `isProfileOpen`, `isFavoritesOpen`, `showLoginModal`, `activeTourUrl`, etc.)
- Tab persistence ("keep-alive") pattern: main-stack screens remain mounted but hidden via `display: none` in `mainStackScreenStyle()` so state survives tab switches

## Layers

**Entry / Registration Layer:**
- Purpose: Register the root React component with the React Native runtime
- Location: `index.js`
- Contains: `AppRegistry.registerComponent(appName, () => App)` using the name from `app.json`
- Depends on: `App.tsx`
- Used by: React Native platform bootstrap (iOS `AppDelegate`, Android `MainApplication`)

**Provider / Root Layer:**
- Purpose: Compose cross-cutting providers and host the navigation state machine
- Location: `App.tsx`
- Contains: `App` component (wraps providers), `AppContent` component (navigation state, back-button handling, deep-link handling, conditional rendering)
- Depends on: `react-native-safe-area-context`, all `src/context/*` and `src/theme/ThemeContext`, every screen in `src/screens/*`
- Used by: `index.js`

**Context / State Layer:**
- Purpose: App-wide state for auth, theme, and localization
- Location: `src/context/`, `src/theme/ThemeContext.tsx`
- Contains:
  - `src/context/AuthContext.tsx` — `AuthProvider`, `useAuth()`, loads cached user from `AsyncStorage`, orchestrates `login` / `signup` / `logout` / `deleteAccount` against `AuthService`
  - `src/context/LanguageContext.tsx` — `LanguageProvider`, `useLanguage()`, persists `'en' | 'ru'` in `AsyncStorage` key `@jaytap_language`, exposes `t(key, params)` bound to current language
  - `src/theme/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, follows system `useColorScheme()` and exposes `colors`, `isDark`, `toggleTheme`
- Depends on: services (`AuthService`), locale tables (`src/locales/*`), theme palette (`src/theme/colors.ts`)
- Used by: Every screen and nearly every component

**Screen Layer:**
- Purpose: Full-screen views rendered by `AppContent`. Each receives navigation callbacks (`onBack`, `onSelectProperty`, etc.) as props instead of using a router
- Location: `src/screens/`
- Contains: 19 screens — `HomeScreen`, `PropertyDetailsScreen`, `ProfileScreen`, `LoginScreen`, `SignupScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `AccountSettingsScreen`, `CreateListingScreen`, `RenterListingsScreen`, `OwnerListingsScreen`, `FavoritesScreen`, `ChatScreen`, `ChatComposeScreen`, `ChatThreadScreen`, `ScheduleViewingScreen`, `AppointmentsScreen`, `Tour3DScreen`, `TourSelectionScreen`
- Depends on: components, services, contexts, types
- Used by: `App.tsx` (`AppContent`)

**Component Layer:**
- Purpose: Reusable presentational / interactive building blocks
- Location: `src/components/`
- Contains: `PropertyCard`, `PropertyMap`, `BottomNavigator`, `ListingMetaTable`, `TourHeroCard` (with `.android.tsx` platform split), `AuthPromptModal`, `AuthModalCloseButton`, `DeleteAccountModal`, `DeleteListingModal`, `LanguageToggleSwitch`, `ThemeToggleSwitch`, `PasswordRequirements`, `PasswordTextInput`
- Depends on: `lucide-react-native` icons, `react-native-maps`, `useTheme`, `useLanguage`, types
- Used by: Screens

**Service Layer:**
- Purpose: All network I/O — REST to the JayTap backend and Firebase Identity Toolkit, plus a Socket.IO connection for chat
- Location: `src/services/`
- Contains:
  - `AuthService.ts` — Firebase Identity Toolkit REST (signUp, signInWithPassword, sendOobCode, resetPassword, delete), plus backend `auth/users/*` sync and `AsyncStorage` token persistence
  - `PropertyService.ts` — CRUD for `/api/properties`, `multipart/form-data` image uploads, admin-only `patchPlatformVerifications`
  - `FavoritesService.ts` — `/api/favorites` get / toggle
  - `ChatService.ts` — `/api/chats` REST plus `socket.io-client` websocket to `https://jaytap-services-production.up.railway.app`
  - `AppointmentService.ts` — `/api/appointments` CRUD, availability queries, owner settings
- Depends on: `axios`, `@react-native-async-storage/async-storage`, `socket.io-client`, types
- Used by: Screens, contexts

**Type Layer:**
- Purpose: Shared TypeScript interfaces for domain entities
- Location: `src/types/`
- Contains: `Property.ts` (`Property`, `Tour`, `PlatformVerifications`), `Appointment.ts` (`Appointment`, `TimeSlot`, `AvailabilityResponse`, `OwnerSettings`)
- Depends on: nothing
- Used by: Services, screens, components

**Utility Layer:**
- Purpose: Pure helper functions
- Location: `src/utils/`
- Contains: `formatPrice.ts`, `formatTourHeroCount.ts`, `parseOobCode.ts`, `passwordPolicy.ts`
- Depends on: types only
- Used by: Screens, components

**Localization Layer:**
- Purpose: English / Russian translation dictionaries and the `t()` lookup function
- Location: `src/locales/`
- Contains: `en.ts`, `ru.ts`, `index.ts` (exports `t(language, key, params)` with `{param}` substitution)
- Depends on: `LanguageContext` type (`Language`)
- Used by: `LanguageContext`, consumed via `useLanguage().t`

## Data Flow

**Startup Flow:**

1. React Native runtime invokes `AppRegistry` from `index.js`
2. `App` (in `App.tsx`) mounts nested providers: `SafeAreaProvider` → `ThemeProvider` → `LanguageProvider` → `AuthProvider` → `AppContent`
3. `AuthProvider` (`src/context/AuthContext.tsx`) fires `loadStorageData()` — reads `userData` from `AsyncStorage`, calls `AuthService.getBackendUser()` to hydrate `backendProfile`, then sets `loading=false`
4. `LanguageProvider` loads persisted `@jaytap_language` key; `ThemeProvider` subscribes to `useColorScheme()`
5. `AppContent` renders an `ActivityIndicator` while `loading`, then switches into the navigation state machine

**Navigation Flow:**

1. User action (e.g., tap on `BottomNavigator` tab) invokes a callback passed from `AppContent`
2. Callback mutates one or more boolean flags (`setIsFavoritesOpen`, `setIsProfileOpen`, `setSelectedProperty`, etc.)
3. A cascade of computed booleans (`showHome`, `showFavorites`, `showChat`, …) derives the currently-visible screen from mutual-exclusion rules
4. JSX conditionally renders / hides via `display: 'flex' | 'none'` (keep-alive) or `position: absolute` overlays (modals / detail screens)
5. Android hardware back press is intercepted by a `BackHandler` effect in `AppContent` that pops the top-most overlay in priority order

**Data Fetch Flow (property detail example):**

1. `HomeScreen` on mount calls `PropertyService.getAllProperties()` → `axios.get(${API_URL}/properties)`
2. Backend returns Mongo docs; service remaps `_id` → `id`
3. User taps a `PropertyCard` → `onSelectProperty(property)` → `App.setSelectedProperty(property)`
4. `AppContent` renders `<PropertyDetailsScreen property={selectedProperty} />` as a `position: absolute` overlay
5. Subsequent actions (favorite, message, schedule) call the matching service and toggle local state in `AppContent`

**Auth Flow:**

1. Unauthenticated user attempts a protected action → `setShowAuthPrompt(true)` with localized message
2. User selects Login / Signup → state flip shows `LoginScreen` / `SignupScreen` in a full-screen absolute overlay with `zIndex: 1000`
3. Screen calls `useAuth().login(email, password)` → `AuthService.signIn` (Firebase REST) → `AuthService.getBackendUser` / `createBackendUser` → `AuthService.saveToken` (AsyncStorage) → `setUser`
4. Effect in `AppContent` watches `user` and closes the auth modal stack once non-null

**Deep-Link Flow:**

1. `Linking.getInitialURL()` and `Linking.addEventListener('url', …)` in `AppContent`
2. If URL contains `mode=resetPassword` → `parseOobCodeFromResetInput(url)` → open `ResetPasswordScreen` with prefilled oob code
3. If URL matches `/property/:id` → `PropertyService.getPropertyById(id)` → `setSelectedProperty(property)`
4. Supports both `https://www.moveinplatform.com` and legacy `bizdinkonush.com` (per `src/constants.ts`)

**State Management:**
- No external store. Local component `useState` + three React Contexts (Auth / Language / Theme)
- `AuthContext` caches user in `AsyncStorage` keys `userToken` and `userData`
- `LanguageContext` caches language in `AsyncStorage` key `@jaytap_language`
- `ThemeContext` does not persist — it tracks the OS color scheme via `useColorScheme()`

## Key Abstractions

**Screen Navigation via Props:**
- Purpose: Replace a navigator with callback-driven screen transitions
- Examples: `LoginScreen` receives `onNavigateToForgotPassword`, `onNavigateToSignup`, `onClose`; `ProfileScreen` receives `onBack`, `onCreateListing`, `onViewListings`, `onViewFavorites`, etc.
- Pattern: Every screen declares an `interface` of `onX` callbacks; `AppContent` wires callbacks into `useState` setters

**Overlay Z-Layers:**
- Purpose: Stack full-screen flows over the main tab stack without a stack navigator
- Examples: `PropertyDetailsScreen` (`zIndex: 2`), `RenterListingsScreen` / `CreateListingScreen` (`zIndex: 3`), auth modals (`zIndex: 1000`), `Tour3DScreen` (top-level early return)
- Pattern: `position: absolute` wrappers with explicit `zIndex` / `elevation`

**Service Objects:**
- Purpose: Group related network calls as static-method-style objects
- Examples: `export const PropertyService = { getAllProperties, getPropertyById, createProperty, updateProperty, deleteProperty, … }`
- Pattern: Plain object literal with async arrow methods; no class instantiation; depends on `AuthService.getUserData()` for the `x-firebase-uid` header

**Context + Custom Hook Pairing:**
- Purpose: Encapsulate a provider and a guarded consumer in one module
- Examples: `AuthContext` / `useAuth`, `LanguageContext` / `useLanguage`, `ThemeContext` / `useTheme`
- Pattern: `const ctx = useContext(X); if (!ctx) throw new Error('useX must be used within XProvider')`

**Platform-Split Components:**
- Purpose: Diverge implementations across iOS/Android using Metro's platform suffix resolution
- Examples: `src/components/TourHeroCard.tsx` + `src/components/TourHeroCard.android.tsx`
- Pattern: Default file targets iOS/fallback; `.android.tsx` overrides on Android

## Entry Points

**JavaScript Entry:**
- Location: `index.js`
- Triggers: RN runtime boot (iOS `AppDelegate` / Android `MainApplication` instantiate the JS bundle)
- Responsibilities: Call `AppRegistry.registerComponent(appName, () => App)` using `appName` from `app.json`

**Root Component:**
- Location: `App.tsx`
- Triggers: Rendered by `AppRegistry`
- Responsibilities: Compose `SafeAreaProvider` + context providers, render `AppContent` (the navigation state machine)

**Navigation State Machine:**
- Location: `App.tsx` (`AppContent`)
- Triggers: Rendered by `App`
- Responsibilities: Hold all cross-screen state, handle deep links, manage Android hardware back, load favorites and chat-unread counts, render screens as tabs / overlays / modals

**Native Entry Points:**
- iOS: `ios/JayTap.xcodeproj` (initializes JS bundle)
- Android: `android/app/` (initializes JS bundle)

## Error Handling

**Strategy:** Per-call try / catch inside services; surface errors to screens via thrown exceptions; screens decide whether to `Alert.alert(…)` or log silently

**Patterns:**
- Services log errors via `console.error` and re-throw (e.g., `PropertyService.getAllProperties`)
- `FavoritesService.getFavorites` swallows 404 / 500 and returns `[]` so absent-data paths don't break UI
- `AuthService` normalizes Firebase REST errors to `error.response.data.error` shapes
- `AuthContext.login` re-throws with `'locked'` message when backend returns `ACCOUNT_LOCKED`
- `AppContent` uses `Alert.alert` for deep-link failures

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` / `console.error` only. No Sentry / Crashlytics / other SDK detected.

**Validation:** Inline per-screen; password validation centralized in `src/utils/passwordPolicy.ts` (`getPasswordRequirementChecks`, `passwordMeetsPolicy`, `PASSWORD_MIN_LENGTH = 7`)

**Authentication:** Firebase Identity Toolkit REST tokens stored in `AsyncStorage` (`userToken`, `userData`); backend authorization via `x-firebase-uid` header injected by each service

**Localization:** All user-visible strings go through `useLanguage().t('key', params)`. Keys typed via `TranslationKeys` derived from `src/locales/en.ts`. Fallback order: current language → English → raw key.

**Theming:** `useTheme().colors` for palette; dark / light auto-follows `useColorScheme()`. Components read `isDark` for platform-specific accents (e.g., `BottomNavigator` tab bar background).

**Deep Linking:** Handled exclusively inside `AppContent`'s `useEffect` using `Linking.getInitialURL()` + `Linking.addEventListener('url', …)`; `apple-app-site-association.example` and `UNIVERSAL_LINKS_SETUP.md` describe universal-link configuration.

**Back Navigation (Android):** Single `BackHandler.addEventListener('hardwareBackPress', …)` effect in `AppContent` that unwinds the overlay stack in priority order before letting the OS exit the app.

---

*Architecture analysis: 2026-04-22*

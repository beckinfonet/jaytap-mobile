# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Authentication (Identity Provider):**
- Google Firebase Identity Toolkit (REST) - Email/password authentication, signup, signin, password reset, and account deletion
  - Endpoint base: `https://identitytoolkit.googleapis.com/v1/accounts`
  - Operations used in `src/services/AuthService.ts`:
    - `:signUp` - Account creation
    - `:signInWithPassword` - Login
    - `:sendOobCode` (requestType `PASSWORD_RESET`) - Forgot password email
    - `:resetPassword` - Confirm password reset with `oobCode`
    - `:delete` - Delete Firebase Auth account
  - SDK/Client: `axios` (no Firebase client SDK installed)
  - Auth: Hardcoded API key `AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY` directly in `src/services/AuthService.ts` (sourced from `GoogleService-Info.plist` per code comment; file itself is NOT present in `ios/JayTap/`)

**Backend Platform API (primary):**
- JayTap Services (Railway-hosted) - Primary application backend
  - Base URL: `https://jaytap-services-production.up.railway.app/api`
  - Local dev fallback: `http://10.0.2.2:5000/api` (Android emulator) or `http://localhost:5000/api` (iOS simulator); hardcoded `LOCAL_URL` constants exist in each service but `API_URL = PRODUCTION_URL` is the active toggle
  - Clients: `src/services/PropertyService.ts`, `src/services/FavoritesService.ts`, `src/services/AppointmentService.ts`, `src/services/ChatService.ts`, `src/services/AuthService.ts`
  - Auth header: `x-firebase-uid: <localId>` (Firebase UID) for backend calls (see `getHeaders()` in `ChatService.ts`, `AppointmentService.ts`, `FavoritesService.ts`)
  - Resource paths:
    - `POST /auth/users`, `GET /auth/users/:uid`, `DELETE /auth/users/:uid` - User profile mirror
    - `GET /properties`, `GET /properties/:id`, `GET /properties/user/:firebaseUid`, `POST /properties`, etc. (`src/services/PropertyService.ts`)
    - `GET /favorites`, toggle/check endpoints (`src/services/FavoritesService.ts`)
    - `GET /appointments`, `GET /appointments/availability/:propertyId`, `GET|PUT /appointments/owner-settings`, `POST /appointments` (`src/services/AppointmentService.ts`)
    - `GET /chats`, `POST /chats`, `GET /chats/:id/messages`, `POST /chats/:id/messages`, `PATCH /chats/:id/read`, `POST /chats/:id/report`, `GET /chats/unread-count` (`src/services/ChatService.ts`)

**Real-time Messaging:**
- Socket.IO server (same Railway host)
  - URL: `https://jaytap-services-production.up.railway.app`
  - Path: `/socket.io`
  - Transports: `['websocket', 'polling']`
  - Auth payload: `{ firebaseUid }`
  - Events subscribed: `new_message`
  - Client: `socket.io-client` ^4.8.3 via `src/services/ChatService.ts` `connectSocket(...)`

**Maps:**
- Google Maps (Android) - Native Google Maps through `react-native-maps`
  - API key injected via `android/app/build.gradle` `manifestPlaceholders.GOOGLE_MAPS_API_KEY` from `android/app/key.properties`
  - Wired into `AndroidManifest.xml` meta-data `com.google.android.geo.API_KEY`
- Apple Maps (iOS) - Default native provider via `PROVIDER_DEFAULT`
  - Usage: `src/components/PropertyMap.tsx`, `src/screens/PropertyDetailsScreen.tsx`

**3D Tours / Virtual Walkthroughs:**
- Matterport - 3D tour links embedded via `WebView` in `src/screens/Tour3DScreen.tsx`
  - User-supplied URLs of the form `https://my.matterport.com/show/?m=...`
  - Entered in `src/screens/CreateListingScreen.tsx` (see `createListing.matterportUrlExample` string in `src/locales/en.ts` / `ru.ts`)
- Ricoh 360 Photos - Panoramic photo viewer URLs also rendered via `Tour3DScreen` (`activePhotosUrl` flow in `App.tsx`)

**Cross-app Deep Linking (outbound):**
- WhatsApp - Declared in `ios/JayTap/Info.plist` `LSApplicationQueriesSchemes` (`whatsapp`)
- Telegram - Declared in `ios/JayTap/Info.plist` `LSApplicationQueriesSchemes` (`tg`, `telegram`)

## Data Storage

**Databases:**
- Managed server-side by the Railway backend (not accessed directly from the app). MongoDB inferred from response shape `_id` → `id` mapping repeated across `PropertyService.ts`, `ChatService.ts`, `AppointmentService.ts`, `FavoritesService.ts`.
- Client: HTTP via `axios` only

**File Storage:**
- Handled server-side (multipart/form-data uploads). Listing images sent via `FormData` from `src/services/PropertyService.ts` (`createProperty` appends `images` fields)
- No direct S3/GCS/Firebase Storage SDK on the client

**Caching / Local Persistence:**
- `@react-native-async-storage/async-storage` - Persists auth state
  - Keys: `userToken`, `userData` (see `src/services/AuthService.ts` `saveToken`, `getToken`, `getUserData`, `logout`)
- No other client-side cache layer

## Authentication & Identity

**Auth Provider:**
- Firebase Identity Toolkit (REST) for credential storage and token issuance
- Custom Railway backend stores user profile mirror keyed on `firebaseUid` (`localId` from Firebase)
  - Sync flow implemented in `src/context/AuthContext.tsx`:
    - `login()` → signIn → `getBackendUser` → if missing `createBackendUser`
    - `signup()` → signUp → `createBackendUser` (with cleanup: if backend rejects with `ACCOUNT_LOCKED`, Firebase account is deleted)
  - Soft-delete: `DELETE /auth/users/:uid` then Firebase `:delete` (`AuthService.deleteAccount`)
- Token persisted as `userToken` in AsyncStorage; currently NOT sent as `Authorization: Bearer ...` — backend calls use `x-firebase-uid` header only

**Session:**
- Firebase `idToken` stored locally
- Only `localId` (Firebase UID) is used for backend authorization via `x-firebase-uid` header — token is never refreshed or verified server-side in visible client code

## Monitoring & Observability

**Error Tracking:**
- None detected - no Sentry, Bugsnag, Crashlytics, or similar SDK in `package.json`

**Logs:**
- `console.error` / `console.warn` only (see `src/services/AuthService.ts`, `src/services/PropertyService.ts`, `src/context/AuthContext.tsx`)

**Analytics:**
- None detected

## CI/CD & Deployment

**Hosting:**
- Backend: Railway (`jaytap-services-production.up.railway.app`)
- Mobile distribution: Apple App Store (iOS) and Google Play Store (Android)
- Web companion: `www.moveinplatform.com` (used for universal links and share URLs via `src/constants.ts`)

**CI Pipeline:**
- No CI config detected in repo (no `.github/workflows`, no `fastlane/`, no `bitrise.yml`, no CircleCI/GitLab files visible at root)
- Local release helpers:
  - `build-android-release.sh` (repo root) - Android release build
  - `scripts/archive-ios.sh` - iOS archive workflow
  - `ios/ExportOptions.plist` - Archive export configuration

**Code Signing:**
- iOS: Automatic signing with team `M3W6Y259JR`, entitlements in `ios/JayTap/JayTap.entitlements`
- Android: Release keystore `android/app/release.keystore` with properties in `android/app/key.properties` (template `android/app/key.properties.example`), debug keystore `android/app/debug.keystore`

## Environment Configuration

**Required env vars / secrets:**
- `GOOGLE_MAPS_API_KEY` entry in `android/app/key.properties` (consumed by `android/app/build.gradle` via `manifestPlaceholders`)
- `storeFile`, `storePassword`, `keyAlias`, `keyPassword` in `android/app/key.properties` for Android release signing
- Firebase API key is hardcoded in `src/services/AuthService.ts` (not externalized)
- `.env` file present at repo root — existence only; contents not inspected. No `react-native-config` or similar runtime loader is installed, so any values there are NOT automatically injected into the JS bundle.

**Secrets location:**
- `android/app/key.properties` (git-ignored, per `.example` comment)
- Project-level `.env` (present but not wired into JS runtime)
- iOS `GoogleService-Info.plist` referenced in code comment but file is NOT present in `ios/JayTap/`; API key copied into source instead

## Webhooks & Callbacks

**Incoming Deep Links (universal + custom scheme):**
- iOS associated domains (`ios/JayTap/JayTap.entitlements`):
  - `applinks:www.moveinplatform.com`
  - `applinks:www.bizdinkonush.com` (legacy domain, preserved for backward compatibility)
- iOS `CFBundleURLSchemes` (`ios/JayTap/Info.plist`):
  - `jaytap://` - Custom URL scheme
  - `https` under `CFBundleURLName` `com.jaytap.app`
- Apple App Site Association example at `apple-app-site-association.example` routes `/property/*` paths to `M3W6Y259JR.com.jaytap.app`
- Handled in `App.tsx` `handleDeepLink`:
  - Firebase password-reset URLs (detected via `mode=resetPassword`) parsed through `src/utils/parseOobCode.ts` to extract `oobCode`
  - Property share URLs matched with regex `\/property\/([^\/\?]+)` then fetched via `PropertyService.getPropertyById`
- Android: No intent filters for universal links currently declared in `android/app/src/main/AndroidManifest.xml` (only `MAIN`/`LAUNCHER`); see `UNIVERSAL_LINKS_SETUP.md` for setup notes

**Outgoing webhooks:**
- None - app is a consumer of the Railway backend; no outbound webhook endpoints exposed by the mobile client

## Native Permissions

**iOS (`ios/JayTap/Info.plist`):**
- `NSLocationWhenInUseUsageDescription` - Map / nearby listings
- `NSPhotoLibraryUsageDescription` - Upload property images
- `NSCameraUsageDescription` - Take property photos
- App Transport Security: `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=true`

**Android (`android/app/src/main/AndroidManifest.xml`):**
- `android.permission.INTERNET`
- `android.permission.CAMERA`

## Privacy & Compliance

- iOS privacy manifest (`ios/JayTap/PrivacyInfo.xcprivacy`):
  - `NSPrivacyTracking`: false
  - `NSPrivacyCollectedDataTypes`: empty
  - Declared API access: FileTimestamp (C617.1, 3B52.1), UserDefaults (CA92.1), SystemBootTime (35F9.1)
- `ITSAppUsesNonExemptEncryption`: false (`ios/JayTap/Info.plist`)

---

*Integration audit: 2026-04-22*

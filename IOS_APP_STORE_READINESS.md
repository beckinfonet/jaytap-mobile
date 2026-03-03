# iOS App Store readiness

Summary of the current state and what to do before publishing.

---

## Done / OK

| Item | Status |
|------|--------|
| **Bundle ID** | `com.jaytap.app` |
| **Display name** | MoveIn (user-facing) |
| **Version** | 1.0 (MARKETING_VERSION) |
| **Build number** | 1 (CURRENT_PROJECT_VERSION) |
| **Deployment target** | iOS 15.1 |
| **Code signing** | Automatic |
| **ExportOptions** | `app-store`, teamID `M3W6Y259JR` |
| **Entitlements** | Associated domains for `applinks:www.bizdinkonush.com` |
| **Privacy manifest** | PrivacyInfo.xcprivacy present (required reason APIs, no tracking) |
| **ATS** | `NSAllowsArbitraryLoads = false` (HTTPS only) |
| **Usage descriptions** | Location, Photo Library, Camera |
| **Deep links** | `jaytap://` and `https` URL schemes |
| **LSApplicationQueriesSchemes** | whatsapp, tg, telegram (for `canOpenURL`) |

---

## Build requirements (as of 2025)

- **Xcode 16+** and **iOS 18 SDK** are required for App Store uploads (since April 2025).
- Build the app with the latest Xcode before archiving and uploading.

---

## You must do before first upload

### 1. App Store Connect setup

- Create the app in [App Store Connect](https://appstoreconnect.apple.com/) with bundle ID `com.jaytap.app`.
- Complete:
  - **App information** (name, subtitle, category)
  - **Pricing and availability**
  - **App Privacy** (data collection and usage)
  - **Content rights**
  - **Age rating** questionnaire

### 2. Store listing assets

- **Screenshots** for required device sizes (6.7", 6.5", 5.5" for iPhone).
- **App icon** (1024×1024).
- **Privacy policy URL** (required if you collect user data).

### 3. Build and archive

```bash
cd ios
xcodebuild -workspace JayTap.xcworkspace -scheme JayTap -configuration Release -sdk iphoneos archive -archivePath build/JayTap.xcarchive
```

Or use Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.

---

## Recommended checks

| Item | Suggestion |
|------|-------------|
| **Build number** | For each new submission, increment `CURRENT_PROJECT_VERSION` in the Xcode project. |
| **CFBundleDevelopmentRegion** | Currently `ru`. Use `en` if the primary language is English, or keep `ru` for Russian/Kyrgyz market. |
| **Privacy manifest** | `NSPrivacyCollectedDataTypes` is empty. If you use sign-in, chat, or favorites, confirm that your data collection matches your App Privacy answers in App Store Connect. |
| **TestFlight** | Use TestFlight for internal and external testing before public release. |

---

## App Store Connect (store listing and policy)

- **App Privacy** – Declare what data you collect (e.g. email, name, identifiers) and how it’s used.
- **Export compliance** – Answer whether the app uses encryption (e.g. HTTPS only → typically “No”).
- **Content rights** – Confirm you have rights to all content.
- **Age rating** – Complete the questionnaire.

---

## Quick test before upload

1. In Xcode, select **Any iOS Device** as the run destination.
2. **Product → Archive**.
3. In Organizer, choose **Distribute App** → **App Store Connect**.
4. Upload the build.

---

## Comparison with Android

| Aspect | iOS | Android |
|--------|-----|---------|
| Version | 1.0 | 1.0.1 |
| Build | 1 | 2+ |
| Signing | Automatic (Xcode) | Release keystore (key.properties) |
| Bundle ID | com.jaytap.app | com.jaytap |

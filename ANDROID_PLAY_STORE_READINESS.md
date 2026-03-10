# Android Google Play Store readiness

Summary of the current state and what to do before publishing.

---

## Done / OK

| Item | Status |
|------|--------|
| **Target SDK** | 36 (meets 2025 requirement: 35+) |
| **Compile SDK** | 36 |
| **Min SDK** | 24 |
| **Version** | versionCode 1, versionName "1.0" |
| **Application ID** | `com.jaytap` |
| **Release signing** | Configured to use `android/app/key.properties` when present; falls back to debug if not (so local builds still work) |
| **Launcher activity** | `android:exported="true"` set for MainActivity |
| **App name** | User-facing name is "MoveIn" in `res/values/strings.xml`; project/config name remains JayTap. Correct as-is. |
| **Languages** | `resConfigs "ru", "en"` |

---

## You must do before first upload

### 1. Create and configure release keystore

- Create a release keystore (one-time, keep it safe and backed up):

  ```bash
  cd android/app
  keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias jaytap -keyalg RSA -keysize 2048 -validity 10000
  ```

- Copy `key.properties.example` to `key.properties` in `android/app/`.
- Fill in `key.properties` with your keystore path (e.g. `release.keystore`), passwords, and alias.
- **Do not commit** `key.properties` or `release.keystore` (they are gitignored).

Without this, release builds would use the debug keystore, which Play Store does not accept for publishing.

### 2. Build an App Bundle (AAB) for Play

- Play prefers AAB over APK. Build with:

  ```bash
  ./build-android-release.sh
  ```

- Output: `android/app/build/outputs/bundle/release/app-release.aab`. Upload this in Play Console.

### 3. Restrict your Google Maps API key

- The Maps API key is in `AndroidManifest.xml`. In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials:
  - Restrict the key to your Android app (package name `com.jaytap` + your upload keystore SHA-1).
  - Restrict to the APIs you use (e.g. Maps SDK for Android).  
This limits abuse if the key is exposed in the manifest.

---

## Recommended

| Item | Suggestion |
|------|------------|
| **ProGuard/R8** | `enableProguardInReleaseBuilds` is `false`. Set to `true` in `android/app/build.gradle` for smaller size and obfuscation; test release build and add keep rules if something breaks. |
| **Cleartext traffic** | Manifest uses `usesCleartextTraffic="${usesCleartextTraffic}"`. Ensure release builds do not allow cleartext (HTTPS only); React Native usually sets this per build type. |
| **App name** | "MoveIn" is the user-facing name (device & store); "JayTap" is kept for project/config only. No change needed. |

---

## Play Console (store listing and policy)

- **Privacy policy** – Required if you collect user data. Add URL in Play Console.
- **Content rating** – Complete the questionnaire in Play Console.
- **Permissions** – You use INTERNET, CAMERA, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE. In the Play Console listing, declare and justify each permission.
- **Data safety** – Declare what data you collect and how it’s used.

---

## Quick test before upload

```bash
cd android
./gradlew bundleRelease
```

If `key.properties` (and optionally `release.keystore`) is set up, the bundle will be signed with your release key. Upload `app/build/outputs/bundle/release/app-release.aab` to the Play Console.

# Finding a Compatible react-native-maps Version

## Current Setup
- React Native: 0.84.0
- react-native-maps: 1.27.1 (latest stable)

## Testing Strategy

### Step 1: Test Current Version (1.27.1)
1. Clean build: `cd android && ./gradlew clean && cd ..`
2. Rebuild: `npx react-native run-android`
3. Test if app launches without crashing

### Step 2: If 1.27.1 Crashes, Try Older Versions

#### Option A: Try 1.26.20 (previous stable)
```bash
npm install react-native-maps@1.26.20
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

#### Option B: Try 1.25.0 (older stable)
```bash
npm install react-native-maps@1.25.0
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

#### Option C: Try 1.20.0 (much older, but stable)
```bash
npm install react-native-maps@1.20.0
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### Step 3: Check Compatibility Requirements

For each version, check peer dependencies:
```bash
npm view react-native-maps@<version> peerDependencies
```

### Step 4: Android Configuration

If maps work but don't display, you may need:
1. Google Maps API key in `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_API_KEY_HERE"/>
</application>
```

2. Location permissions (already present):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Known Issues

- **New Architecture (Fabric)**: Some versions may have issues with React Native's New Architecture
- **Android Gradle Plugin**: Ensure compatibility with your Gradle version
- **Google Play Services**: Maps require Google Play Services on Android devices

### Version History

- `1.27.1` - Latest, requires RN >= 0.76.0
- `1.26.20` - Previous stable, requires RN >= 0.76.0
- `1.25.0` - Older stable
- `1.20.0` - Much older but very stable

### If All Versions Crash

1. Check if the issue is with New Architecture:
   - Try disabling New Architecture (if possible in RN 0.84.0)
   - Or use a version specifically built for New Architecture

2. Check Android logs:
   ```bash
   adb logcat | grep -i "maps\|crash\|error"
   ```

3. Check react-native-maps GitHub issues for your specific RN version


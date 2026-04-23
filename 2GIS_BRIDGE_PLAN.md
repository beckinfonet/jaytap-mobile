# 2GIS Native Bridge — Integration Plan

Decision captured: **2026-04-22**

## Decision

Build a custom React Native native bridge that wraps the 2GIS iOS and Android SDKs, exposing them as a `<DgisMap />` component drop-in replacement for `react-native-maps`.

## Why this path (vs alternatives)

| Option | Verdict | Reason rejected / accepted |
|---|---|---|
| Full Swift + Kotlin rewrite | Rejected | 4–8 months re-implementing auth, listings, forms, locales, release pipelines. 2× velocity cost forever. Not justified unless app becomes map-first (not the case today). |
| WebView + MapGL JS | Viable fallback | Faster (3–7 days) but gesture/performance compromises on mid-range Android, especially with pitch/rotate on the full-screen detail map. |
| REST APIs only, keep react-native-maps | Rejected for map rendering | Leaves Google/Apple tiles, which are sparse in Bishkek. Fine as a supplement for geocoding/POI. |
| **Native bridge** | **Accepted** | Native-quality 2GIS tiles, keeps RN for everything else, ~6 weeks one-time cost vs months of rewrite. Extends naturally if map surface grows. |

Key context: JayTap targets Bishkek, where 2GIS tile quality materially beats Google/Apple. Map surface today is small (3 files) and features used are basic (markers + region control), so the bridge scope is bounded.

## What a "bridge" is

Glue code that lets TypeScript/JS in RN talk to native iOS (Swift) and Android (Kotlin) code. Two pieces per platform:

1. **Native View Component (Fabric)** — wraps 2GIS `MapView` so `<DgisMap />` renders in JSX.
2. **TurboModule** — imperative calls: `moveCamera`, `animateTo`, `addMarker`, optional `geocode`.

Plus TypeScript specs that RN's codegen consumes at build time to generate the C++ glue.

## Proposed file layout

```
JayTap/
├── src/dgis/
│   ├── DgisMapViewNativeComponent.ts   ← Fabric view spec (codegen input)
│   ├── NativeDgisModule.ts             ← TurboModule spec (codegen input)
│   └── DgisMap.tsx                     ← Friendly RN wrapper (the import site)
│
├── ios/Dgis/
│   ├── DgisMapView.swift               ← Wraps DGis.Map
│   ├── DgisMapViewManager.swift        ← Registers the Fabric component
│   ├── DgisModule.swift                ← Imperative methods
│   └── Dgis.podspec                    ← Deps on DGisMobileSDK/Map (or /Full)
│
└── android/dgis/
    ├── DgisMapView.kt                  ← Wraps 2GIS Android MapView
    ├── DgisMapViewManager.kt           ← Fabric view manager
    ├── DgisModule.kt                   ← TurboModule impl
    └── build.gradle                    ← Pulls 2GIS Maven repo
```

## RN usage shape (target API)

```tsx
import { DgisMap } from './dgis/DgisMap';

<DgisMap
  style={{ flex: 1 }}
  initialCamera={{ latitude: 42.8746, longitude: 74.5698, zoom: 13 }}
  markers={properties.map(p => ({
    id: p.id,
    latitude: p.lat,
    longitude: p.lng,
    title: formatPrice(p.price),
  }))}
  onMarkerPress={(id) => navigation.navigate('PropertyDetails', { id })}
/>
```

Designed to mirror `react-native-maps` ergonomics so the three existing call sites swap cleanly.

## iOS view sketch

```swift
// ios/Dgis/DgisMapView.swift
import DGis
import React

@objc(DgisMapView)
class DgisMapView: UIView {
  private var mapView: DGis.MapView!

  override init(frame: CGRect) {
    super.init(frame: frame)
    self.mapView = DGis.MapView(frame: bounds)
    addSubview(mapView)
  }

  @objc func setInitialCamera(_ camera: NSDictionary) {
    // translate RN prop → 2GIS CameraPosition
  }

  @objc func setMarkers(_ markers: NSArray) {
    // diff vs previous, add/remove DGis.Marker objects
  }
}
```

Analogous Kotlin on Android.

## Effort breakdown (4–8 weeks, single engineer)

| Chunk | Weeks |
|---|---|
| Set up 2GIS SDK on each platform (SPM/CocoaPods, Maven repo, keys) | 0.5 |
| Fabric view component with props (camera, markers, style) | 1.5 |
| Marker lifecycle — diffing, tap events back to JS | 1 |
| Imperative camera API (`animateTo`, `fitBounds`) | 0.5 |
| Gesture handling (pan/pinch conflicts with RN parents) | 0.5 |
| iOS 16 requirement cascading through Podfile, Xcode project | 0.25 |
| Android proguard, build config, release variant testing | 0.5 |
| Swap call sites: `src/components/PropertyMap.tsx`, `src/screens/PropertyDetailsScreen.tsx`, `src/screens/HomeScreen.tsx` | 1 |
| Bugfixing on real devices, submission checks | 1–2 |

**Risk concentrates in:** gesture handling and marker diffing. Community wrappers in other ecosystems most often go wrong in these areas.

## Prerequisites (do these first)

1. **Get a paid 2GIS Mobile SDK subscription key.** Demo keys explicitly do **not** work for the Mobile SDK — prototype is blocked without this. Sales-gated, quote-based. Start the conversation early (days to weeks lead time).
2. **Confirm geographic key issuance.** Registration is via `platform.2gis.ru`. Ask explicitly whether keys are issued for apps distributed in US/EU App Stores, in case JayTap targets the Kyrgyz diaspora.
3. **Bump iOS deployment target to 16.0.** 2GIS iOS SDK minimum. Update `ios/JayTap.xcodeproj/project.pbxproj` → `IPHONEOS_DEPLOYMENT_TARGET`. Verify no current dependencies regress.
4. **Confirm Android minSdk ≥ 23.** 2GIS Android SDK minimum. Check `android/app/build.gradle`.
5. **Confirm RN New Architecture status.** Bridge should target Fabric/TurboModules (default in RN 0.76+). If currently on old arch, plan the migration before or alongside.

## Known gotchas

- **Demo keys blocked for Mobile SDK** — cannot prototype without a real subscription.
- **iOS SDK uses SwiftUI internals.** Interop with Fabric's `RCTViewComponentView` is unverified in the public docs. Budget a short spike at the start to de-risk.
- **Privacy manifest (iOS 17+).** Verify whether 2GIS SDK ships `PrivacyInfo.xcprivacy`. If not, you'll need to author one for App Store submission.
- **Binary size.** Mobile SDK framework archive size is unknown from docs — measure before shipping. Offline maps + nav engine empirically add meaningful weight.
- **App Store review risk.** 2GIS's own consumer app was pulled from the US App Store in 2022 over Sberbank sanctions. Third-party SDK use is legally different, but worth a quick legal gut-check if distributing in the US.
- **Community is Russian-language-dominated.** 2GIS prioritized Flutter over RN; no maintained community RN wrappers exist. You will be the reference implementation. Habr (habr.com) is the best source for 2GIS developer discussion.

## Current map surface to replace

All three files live in `/Users/beckmaldinVL/development/mobileApps/JayTap`:

- `src/components/PropertyMap.tsx` — browse-mode map with custom price-badge markers
- `src/screens/PropertyDetailsScreen.tsx` — inline 350px map + full-screen modal with pitch/rotate
- `src/screens/HomeScreen.tsx` — map/list toggle for property discovery

Features in use today: markers, `initialRegion`, `mapType="mutedStandard"`, `userInterfaceStyle`, pitch/rotate (detail modal only), scroll/zoom.

Features NOT in use (out of scope for initial bridge): clustering, polylines, polygons, circles, routing, user location, offline, animated camera, custom tile overlays, heatmaps, marker dragging, callout customization.

## Ongoing cost after ship

- 2GIS SDK version bumps: rebuild + retest.
- RN version bumps: verify Fabric codegen still works.
- Estimate ~1 week/year maintenance tax.

## References

- 2GIS iOS SDK: https://docs.2gis.com/en/ios/sdk/overview
- 2GIS Android SDK: https://docs.2gis.com/en/android/sdk/overview
- iOS SPM: https://github.com/2gis/mobile-sdk-full-swift-package
- iOS demo app: https://github.com/2gis/mobile-sdk-ios-demo
- MapGL JS (fallback option): https://www.npmjs.com/package/@2gis/mapgl
- Mobile SDK sales page: https://dev.2gis.com/api/mobile-sdk
- Access keys docs: https://docs.2gis.com/en/platform-manager/subscription/keys

## Related docs in this repo

- `REACT_NATIVE_MAPS_VERSION_GUIDE.md` — current `react-native-maps` setup reference
- `.planning/codebase/INTEGRATIONS.md` — full current integration inventory
- `.planning/codebase/STACK.md` — RN version, native deployment targets

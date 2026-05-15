---
phase: quick-260515-djv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - ios/Podfile.lock
  - App.tsx
  - src/screens/PropertyDetailsScreen.tsx
autonomous: false
requirements:
  - QUICK-DJV-01
user_setup: []

must_haves:
  truths:
    - "In the property full-screen photo viewer, a user can pinch with two fingers to zoom into a photo"
    - "A user can double-tap a full-screen photo to zoom in, and double-tap again to zoom back out"
    - "A user can still swipe horizontally between photos in the full-screen viewer"
    - "The full-screen viewer still opens at the photo the user tapped in the hero carousel (the activeSlide index)"
    - "The close (✕) button still dismisses the full-screen viewer"
    - "The pagination indicator still shows '{current} / {total}'"
    - "Hospitality listings (Hostel/Hotel) get the same zoomable full-screen viewer, since they reuse PropertyDetailsScreen"
  artifacts:
    - path: "package.json"
      provides: "react-native-gesture-handler + react-native-awesome-gallery dependencies"
      contains: "react-native-awesome-gallery"
    - path: "App.tsx"
      provides: "GestureHandlerRootView wrapping the app root"
      contains: "GestureHandlerRootView"
    - path: "src/screens/PropertyDetailsScreen.tsx"
      provides: "Awesome Gallery-based zoomable full-screen photo modal"
      contains: "react-native-awesome-gallery"
  key_links:
    - from: "App.tsx"
      to: "react-native-gesture-handler"
      via: "GestureHandlerRootView at the root of the component tree"
      pattern: "GestureHandlerRootView"
    - from: "src/screens/PropertyDetailsScreen.tsx full-screen Modal"
      to: "react-native-awesome-gallery Gallery component"
      via: "Gallery rendered inside the isFullScreen Modal, replacing the paging FlatList"
      pattern: "Gallery"
---

<objective>
Property photos in the full-screen viewer are not zoomable. Users tap a photo in
the PropertyDetailsScreen hero carousel, the full-screen Modal opens, but it is a
static paging FlatList of `<Image resizeMode="contain">` — no pinch-to-zoom, no
double-tap-to-zoom.

This plan replaces the full-screen paging FlatList with `react-native-awesome-gallery`,
which provides pinch-to-zoom, double-tap-to-zoom, and swipe-between-photos. This is
the ONLY full-screen image viewer in the app — Hospitality (Hostel/Hotel) listings
reuse the same PropertyDetailsScreen viewer, so they are fixed by the same change.

Purpose: A renter inspecting a listing can zoom into photos to check detail (room
condition, fixtures, finishes) — a core browsing expectation that is currently broken.

Output: `react-native-gesture-handler` + `react-native-awesome-gallery` installed,
`GestureHandlerRootView` mounted at the app root, and the PropertyDetailsScreen
full-screen photo modal rebuilt around `Gallery`.

Scope boundaries (locked decisions — do not revisit):
- ONLY the PropertyDetailsScreen full-screen photo modal changes.
- The inline hero carousel (`renderImageItem`) and card thumbnails stay as-is.
- The full-screen MAP modal (`isMapFullScreen`) is a map, not an image — out of scope.
- The moderator ID-photo thumbnail in LandlordApplicationQueueScreen is an inline
  thumbnail with no full-screen viewer — out of scope.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Extracted from the codebase. The executor should use these directly. -->

## App.tsx root structure (current — App.tsx:1362-1378)
The app root is wrapped, outermost-first:
  SafeAreaProvider > KeyboardProvider > ThemeProvider > LanguageProvider > AuthProvider > AppContent

`GestureHandlerRootView` (from react-native-gesture-handler) MUST wrap everything,
i.e. become the new OUTERMOST element, ABOVE SafeAreaProvider. It needs
`style={{ flex: 1 }}`.

## PropertyDetailsScreen full-screen viewer (current)
- State (PropertyDetailsScreen.tsx:231-232):
    const [activeSlide, setActiveSlide] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
- Image data (PropertyDetailsScreen.tsx:555-557):
    const images = photos.length > 0 ? photos : ['https://via.placeholder.com/800'];
  `images` is `string[]` (photo URIs).
- `renderImageItem` (~line 727): hero carousel item. Tap calls `setIsFullScreen(true)`.
  KEEP AS-IS — not in scope.
- `renderFullScreenItem` (~line 737): the static full-screen item. This becomes DEAD
  CODE once Gallery replaces the FlatList — delete it.
- Full-screen Modal (PropertyDetailsScreen.tsx:1283-1305): `visible={isFullScreen}`,
  `transparent`, `animationType="fade"`, `onRequestClose={() => setIsFullScreen(false)}`.
  Contains: a close `TouchableOpacity` (✕, style `closeButton`), a horizontal paging
  `FlatList` over `images` with `initialScrollIndex={activeSlide}`, and a pagination
  `View` (style `fullScreenPagination`) showing `{activeSlide + 1} / {images.length}`.
- Existing styles (PropertyDetailsScreen.tsx:2354-2389): `fullScreenContainer`,
  `closeButton`, `closeButtonText`, `fullScreenPagination`, `fullScreenPaginationText`.
  KEEP these styles — reuse the close button and pagination chrome verbatim.

## react-native-awesome-gallery API (the Gallery component)
Key props the executor will use:
- `data: string[]` — the image URIs (pass `images`).
- `initialIndex: number` — pass `activeSlide` so the viewer opens on the tapped photo.
- `onIndexChange: (index: number) => void` — call `setActiveSlide(index)` so the
  pagination indicator stays in sync as the user swipes.
- `onSwipeToClose?: () => void` — optional; can call `setIsFullScreen(false)`.
- Gallery fills its parent — render it inside a `flex: 1` `View`.
Pinch-to-zoom and double-tap-to-zoom are built in — no extra props needed.

## Babel / reanimated state (verified)
- `react-native-reanimated@^4.3.0` is installed.
- `babel.config.js` already has `'react-native-worklets/plugin'` last (reanimated v4
  ships its babel plugin via worklets). No babel changes needed.
- `react-native-gesture-handler` is NOT installed yet.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install gesture-handler + awesome-gallery and mount GestureHandlerRootView</name>
  <files>package.json, ios/Podfile.lock, App.tsx</files>
  <action>
Install the two native-dependency packages and wire the gesture-handler root.

1. Install `react-native-gesture-handler` and `react-native-awesome-gallery` with npm.
   Install the latest published versions of each. Both must be New-Architecture
   compatible with RN 0.84 + reanimated 4.x:
   - `react-native-awesome-gallery` is built on reanimated + gesture-handler and is
     New-Arch compatible — latest is fine.
   - `react-native-gesture-handler` v2.x supports the New Architecture; install latest
     2.x. After install, confirm the resolved versions appear under `dependencies` in
     package.json.
   If either package's latest version declares a peer-dependency conflict with
   reanimated 4.x or RN 0.84, STOP and surface the conflict rather than forcing the
   install — do not downgrade reanimated.

2. iOS native link: run `cd ios && pod install` (CocoaPods). gesture-handler and the
   gallery's native deps must appear in `ios/Podfile.lock`.

3. Wire `GestureHandlerRootView` in App.tsx. Per CLAUDE.md and gesture-handler's docs,
   `react-native-gesture-handler` MUST be imported at the very top of the app entry.
   Add `import 'react-native-gesture-handler';` as the FIRST import line in App.tsx,
   and import `{ GestureHandlerRootView }` from `react-native-gesture-handler`. In the
   `App()` component (App.tsx:1362-1378), wrap the entire existing tree so
   `GestureHandlerRootView` is the OUTERMOST element — above `SafeAreaProvider`. Give
   it `style={{ flex: 1 }}`. Do not reorder any of the existing providers
   (SafeAreaProvider > KeyboardProvider > ThemeProvider > LanguageProvider >
   AuthProvider) — only add the new outer wrapper.

Do NOT touch babel.config.js — reanimated 4's worklets plugin is already last and
gesture-handler needs no babel plugin.
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); if(!p.dependencies['react-native-gesture-handler']||!p.dependencies['react-native-awesome-gallery']) process.exit(1)" && grep -q "GestureHandlerRootView" App.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>
Both packages are in package.json `dependencies`; `ios/Podfile.lock` references the
new native pods; App.tsx imports `react-native-gesture-handler` as its first line and
wraps the app in `GestureHandlerRootView style={{ flex: 1 }}` as the outermost element;
`npx tsc --noEmit` passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace the full-screen paging FlatList with the zoomable Gallery</name>
  <files>src/screens/PropertyDetailsScreen.tsx</files>
  <action>
Rebuild the full-screen photo modal (PropertyDetailsScreen.tsx:1283-1305) around
`react-native-awesome-gallery`'s `Gallery` component.

1. Add `import Gallery from 'react-native-awesome-gallery';` to the import block.

2. Inside the `<Modal visible={isFullScreen} ...>` (keep the Modal element and its
   props verbatim: `transparent`, `animationType="fade"`, `onRequestClose`), replace
   the `<FlatList ...>` block with a `Gallery`:
   - Wrap `Gallery` in a `<View style={{ flex: 1 }}>` so it fills the modal.
   - `data={images}` — the existing `string[]` of photo URIs.
   - `initialIndex={activeSlide}` — opens the viewer on the photo the user tapped
     (replaces the old `initialScrollIndex={activeSlide}`; preserves that behavior).
   - `onIndexChange={(index) => setActiveSlide(index)}` — keeps `activeSlide` in sync
     as the user swipes, so the pagination indicator updates correctly.
   - Pinch-to-zoom and double-tap-to-zoom are built into Gallery — no extra props.

3. KEEP the close button (`closeButton` / `closeButtonText` ✕ TouchableOpacity calling
   `setIsFullScreen(false)`) and the pagination block (`fullScreenPagination` /
   `fullScreenPaginationText` showing `{activeSlide + 1} / {images.length}`) exactly
   as they are. They must render ABOVE the Gallery (later siblings in the same
   `fullScreenContainer` View, so they overlay it). The pagination text now reflects
   `activeSlide` updated by `onIndexChange`.

4. Delete the now-unused `renderFullScreenItem` function (~line 737) — it is dead code
   once the FlatList is gone. Do NOT touch `renderImageItem` (the hero carousel item)
   — it stays.

5. Do not introduce any new user-facing strings — the close button uses the literal
   `✕` glyph and pagination uses numerals only, so no en.ts / ru.ts i18n changes are
   needed. If you find yourself adding a translatable string, stop and reconsider —
   the locked scope reuses existing chrome verbatim. The full-screen viewer chrome is
   intentionally dark-on-black (existing `closeButton` / `fullScreenPagination` styles)
   and is identical in light and dark mode — no `useTheme()` change required.
  </action>
  <verify>
    <automated>grep -q "react-native-awesome-gallery" src/screens/PropertyDetailsScreen.tsx && test "$(grep -c 'renderFullScreenItem' src/screens/PropertyDetailsScreen.tsx)" = "0" && grep -q "fullScreenPaginationText" src/screens/PropertyDetailsScreen.tsx && npx tsc --noEmit && npx jest --silent</automated>
  </verify>
  <done>
The full-screen Modal renders `Gallery` (from `react-native-awesome-gallery`) instead
of the paging FlatList; `initialIndex={activeSlide}` and `onIndexChange` are wired;
the close button and pagination chrome are unchanged; `renderFullScreenItem` is
deleted; `npx tsc --noEmit` and `npx jest` both pass.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: On-device verification of pinch / double-tap zoom</name>
  <what-built>
`react-native-gesture-handler` + `react-native-awesome-gallery` installed,
`GestureHandlerRootView` mounted at the app root, and the PropertyDetailsScreen
full-screen photo modal rebuilt around `Gallery`. Pinch-to-zoom and double-tap-to-zoom
gestures cannot be verified in a JS-only test run — they require a native build on a
physical device (this is a native-dependency change, same install-gate pattern as
`react-native-keyboard-controller` in CLAUDE.md Stack Decisions).
  </what-built>
  <how-to-verify>
Build and run on BOTH physical devices (iOS iPhone 15 Pro Max + Android Moto G XT2513V):

iOS:
1. `npx react-native run-ios --device` (or build via Xcode to the iPhone 15 Pro Max).

Android:
2. `npx react-native run-android` to the Moto G XT2513V.
   NOTE: a release `bundleRelease` is NOT needed for this QA — debug build is fine.

On EACH device, in the running app:
3. Open any property listing → tap a photo in the hero carousel. The full-screen
   viewer opens on the photo you tapped.
4. Pinch with two fingers on the photo → it zooms IN smoothly. Pinch out → zooms back.
5. Double-tap the photo → it zooms in. Double-tap again → it zooms back out.
6. Swipe left/right → it moves between photos; the "{n} / {total}" indicator at the
   bottom updates to match.
7. Tap the ✕ button (top-right) → the viewer closes.
8. Repeat steps 3-7 on a Hospitality listing (a Hostel or Hotel card → tap into
   details → tap a photo) — it must behave identically.

Expected: pinch-zoom, double-tap-zoom, swipe-between-photos, synced pagination, and
close button all work on both platforms, in both light and dark mode.
  </how-to-verify>
  <resume-signal>Type "approved" if zoom works on both devices, or describe any issues.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors from the Gallery integration).
- `npx jest` passes (no regressions in existing test suites).
- `package.json` lists both `react-native-gesture-handler` and
  `react-native-awesome-gallery` under `dependencies`.
- `ios/Podfile.lock` references the new native pods.
- App.tsx imports `react-native-gesture-handler` first and wraps the tree in
  `GestureHandlerRootView`.
- `renderFullScreenItem` no longer exists in PropertyDetailsScreen.tsx.
- ON-DEVICE (Task 3 checkpoint): pinch-zoom, double-tap-zoom, swipe-between-photos,
  synced pagination indicator, and close button all work on iOS + Android — pinch
  gestures cannot be verified without a physical-device native build.
</verification>

<success_criteria>
- A user can pinch-to-zoom and double-tap-to-zoom property photos in the full-screen
  viewer on both iOS and Android.
- Swiping between photos still works and the pagination indicator stays in sync.
- The full-screen viewer still opens at the tapped photo's index and the ✕ close
  button still dismisses it.
- Hospitality (Hostel/Hotel) listings get the same zoomable viewer via the shared
  PropertyDetailsScreen.
- No type errors, no test regressions.
</success_criteria>

<output>
After completion, create
`.planning/quick/260515-djv-user-cannot-zoom-in-to-the-images/260515-djv-SUMMARY.md`
</output>

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
    - "A user can still swipe horizontally between photos in the full-screen viewer when no photo is zoomed in"
    - "While a photo is zoomed in, a one-finger drag pans the zoomed photo (it does not page to the next photo)"
    - "The full-screen viewer still opens at the photo the user tapped in the hero carousel (the activeSlide index)"
    - "The close (✕) button still dismisses the full-screen viewer"
    - "The pagination indicator still shows '{current} / {total}'"
    - "Hospitality listings (Hostel/Hotel) get the same zoomable full-screen viewer, since they reuse PropertyDetailsScreen"
  artifacts:
    - path: "package.json"
      provides: "react-native-gesture-handler + @likashefqet/react-native-image-zoom dependencies"
      contains: "@likashefqet/react-native-image-zoom"
    - path: "App.tsx"
      provides: "GestureHandlerRootView wrapping the app root"
      contains: "GestureHandlerRootView"
    - path: "src/screens/PropertyDetailsScreen.tsx"
      provides: "Zoomable full-screen photos — each full-screen image wrapped in ImageZoom"
      contains: "@likashefqet/react-native-image-zoom"
  key_links:
    - from: "App.tsx"
      to: "react-native-gesture-handler"
      via: "GestureHandlerRootView at the root of the component tree"
      pattern: "GestureHandlerRootView"
    - from: "src/screens/PropertyDetailsScreen.tsx renderFullScreenItem"
      to: "@likashefqet/react-native-image-zoom ImageZoom component"
      via: "each full-screen FlatList item's Image wrapped in ImageZoom (FlatList paging kept)"
      pattern: "ImageZoom"
---

<objective>
Property photos in the full-screen viewer are not zoomable. Users tap a photo in
the PropertyDetailsScreen hero carousel, the full-screen Modal opens, but it is a
static paging FlatList of `<Image resizeMode="contain">` — no pinch-to-zoom, no
double-tap-to-zoom.

This plan adds `@likashefqet/react-native-image-zoom` (the `ImageZoom` component)
and wraps each photo in the existing full-screen paging FlatList with it, giving
pinch-to-zoom, double-tap-to-zoom, and pan-while-zoomed. The horizontal swipe-paging
FlatList is KEPT — `ImageZoom` is a per-image zoom wrapper, not a gallery. This is
the ONLY full-screen image viewer in the app — Hospitality (Hostel/Hotel) listings
reuse the same PropertyDetailsScreen viewer, so they are fixed by the same change.

Purpose: A renter inspecting a listing can zoom into photos to check detail (room
condition, fixtures, finishes) — a core browsing expectation that is currently broken.

Output: `react-native-gesture-handler` + `@likashefqet/react-native-image-zoom`
installed, `GestureHandlerRootView` mounted at the app root, and each full-screen
FlatList photo wrapped in `ImageZoom`.

Scope boundaries (locked decisions — do not revisit):
- Library: `@likashefqet/react-native-image-zoom`. (`react-native-awesome-gallery`
  was the original pick but is INCOMPATIBLE — every published version pins
  `react-native-reanimated@^3.2.0` and this project is on reanimated 4.3.1.
  `@likashefqet/react-native-image-zoom@4.3.0` peers `reanimated >=2.x` — compatible.)
- ONLY the PropertyDetailsScreen full-screen photo modal changes. The existing
  horizontal paging FlatList stays — each item gains a zoom wrapper.
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
- `renderFullScreenItem` (~line 737): the static full-screen item — a `<View>` with a
  `<Image resizeMode="contain">`. This is the item to MODIFY (wrap the image in
  `ImageZoom`). Do NOT delete it — the FlatList still uses it.
- Full-screen Modal (PropertyDetailsScreen.tsx:1283-1305): `visible={isFullScreen}`,
  `transparent`, `animationType="fade"`, `onRequestClose={() => setIsFullScreen(false)}`.
  Contains: a close `TouchableOpacity` (✕, style `closeButton`), a horizontal paging
  `FlatList` over `images` with `initialScrollIndex={activeSlide}`, and a pagination
  `View` (style `fullScreenPagination`) showing `{activeSlide + 1} / {images.length}`.
  KEEP the Modal, the FlatList, the close button, and the pagination — only the
  FlatList ITEM gains a zoom wrapper, plus the FlatList gets a `scrollEnabled` toggle
  (see Task 2).
- Existing styles (PropertyDetailsScreen.tsx:2354-2389): `fullScreenContainer`,
  `closeButton`, `closeButtonText`, `fullScreenPagination`, `fullScreenPaginationText`.
  KEEP these styles verbatim.
- Pagination sync: the FlatList already has an `onViewableItemsChanged` / scroll
  handler that updates `activeSlide`. Do NOT remove it — it stays the source of the
  pagination indicator. (If the executor finds the FlatList lacks an index-sync
  handler, preserve whatever currently keeps `activeSlide` correct.)

## @likashefqet/react-native-image-zoom API (the ImageZoom component, v4.x)
Named export: `import { ImageZoom } from '@likashefqet/react-native-image-zoom';`
Key props the executor will use:
- `uri: string` — the image URI (pass the FlatList `item`).
- `style` — pass `{ width, height }` so it fills the full-screen item.
- `resizeMode` — pass `"contain"` to preserve current letterboxed behavior.
- `minScale` / `maxScale` — pass `1` / `5` (sensible zoom bounds).
- `isDoubleTapEnabled` — `true` (double-tap-to-zoom).
- `isPinchEnabled` — `true` (default; pinch-to-zoom).
- Interaction callbacks (use these to coordinate with the parent FlatList paging —
  see Task 2): `onPinchEnd`, `onDoubleTap`, `onResetAnimationEnd`, `onInteractionEnd`.
  The exact callback set varies slightly by patch version — the executor should
  inspect the installed version's typings and pick the cleanest available signals
  for "is now zoomed" vs "is back to scale 1".
Pinch/double-tap/pan-while-zoomed are built in. The library is pure JS on top of
reanimated + gesture-handler — it ships NO native module of its own.
</interfaces>

<gesture_coordination_note>
This is the known integration friction (flagged to the user when the library was
chosen): `ImageZoom` is a per-image zoom wrapper, and it lives INSIDE a horizontal
paging FlatList. When a photo is at scale 1, a one-finger horizontal drag should page
the FlatList. When a photo is zoomed in, a one-finger drag should PAN the zoomed
photo, not page away.

Resolve it by toggling the FlatList's `scrollEnabled`:
- Add state `const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);`
- When an `ImageZoom` reports it has zoomed in (e.g. via `onPinchEnd` / `onDoubleTap`),
  set `isPhotoZoomed` true.
- When it reports a reset back to scale 1 (e.g. `onResetAnimationEnd`), set it false.
- Pass `scrollEnabled={!isPhotoZoomed}` to the full-screen FlatList.
- Also reset `isPhotoZoomed` to false whenever the viewer opens/closes and on photo
  change, so a stale zoomed flag never locks paging.
If the installed `@likashefqet/react-native-image-zoom` version does not expose
callbacks precise enough to drive this cleanly, the executor may instead set
`minPanPointers={2}` on `ImageZoom` (one finger always pages, two-finger drag pans a
zoomed photo) — note that as a deviation in the SUMMARY. Either way, the swipe-vs-pan
behavior is a primary on-device QA item in Task 3.
</gesture_coordination_note>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install gesture-handler + image-zoom and mount GestureHandlerRootView</name>
  <files>package.json, ios/Podfile.lock, App.tsx</files>
  <action>
Install the dependencies and wire the gesture-handler root.

1. Install `react-native-gesture-handler` and `@likashefqet/react-native-image-zoom`
   with npm. Install the latest published versions of each:
   - `react-native-gesture-handler` — latest 2.x (peers are only react/react-native;
     New-Architecture compatible; no conflict — verified during planning).
   - `@likashefqet/react-native-image-zoom@4.3.0` (latest) — peers
     `react-native-reanimated >=2.x` and `react-native-gesture-handler >=2.x`; both are
     satisfied by this project (reanimated 4.3.1, gesture-handler 2.x). It is pure JS
     (no native module of its own).
   After install, confirm the resolved versions appear under `dependencies` in
   package.json. If `npm install` reports a peer-dependency `ERESOLVE` conflict, STOP
   and surface it — do NOT use `--force` / `--legacy-peer-deps`, do NOT downgrade
   reanimated. (Per planning, a clean install is expected — both packages' peer ranges
   accept this project's versions.)

2. iOS native link: run `cd ios && pod install` (CocoaPods). `react-native-gesture-handler`
   ships a native module — its pod must appear in `ios/Podfile.lock`.
   (`@likashefqet/react-native-image-zoom` is pure JS — it adds no pod.)

3. Wire `GestureHandlerRootView` in App.tsx. Per gesture-handler's docs,
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
    <automated>node -e "const p=require('./package.json'); if(!p.dependencies['react-native-gesture-handler']||!p.dependencies['@likashefqet/react-native-image-zoom']) process.exit(1)" && grep -q "GestureHandlerRootView" App.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>
Both packages are in package.json `dependencies`; `ios/Podfile.lock` references the
`react-native-gesture-handler` pod; App.tsx imports `react-native-gesture-handler` as
its first line and wraps the app in `GestureHandlerRootView style={{ flex: 1 }}` as the
outermost element; `npx tsc --noEmit` passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wrap each full-screen photo in ImageZoom and coordinate paging</name>
  <files>src/screens/PropertyDetailsScreen.tsx</files>
  <action>
Make the full-screen photos zoomable by wrapping each FlatList item in `ImageZoom`,
keeping the existing paging FlatList, close button, and pagination chrome.

1. Add `import { ImageZoom } from '@likashefqet/react-native-image-zoom';` to the
   import block.

2. Add zoom-paging coordination state near the existing full-screen state
   (PropertyDetailsScreen.tsx:231-232):
     const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

3. Modify `renderFullScreenItem` (~line 737): replace the static `<Image>` with
   `<ImageZoom>`:
   - `uri={item}`
   - `style={{ width, height }}`
   - `resizeMode="contain"` (preserve current letterboxed look)
   - `minScale={1}`, `maxScale={5}`
   - `isDoubleTapEnabled` (double-tap-to-zoom)
   - Wire the interaction callbacks to drive `setIsPhotoZoomed` per the
     <gesture_coordination_note> in context: zoomed-in → `setIsPhotoZoomed(true)`;
     reset to scale 1 → `setIsPhotoZoomed(false)`. Use the cleanest callbacks the
     installed version exposes (inspect its typings). If precise callbacks are not
     available, fall back to `minPanPointers={2}` and note it in the SUMMARY.
   Keep the wrapping `<View style={{ width, height }}>`.

4. On the full-screen `FlatList` (PropertyDetailsScreen.tsx:1283-1305): add
   `scrollEnabled={!isPhotoZoomed}` so paging is disabled while a photo is zoomed in.
   Keep `data`, `renderItem`, `horizontal`, `pagingEnabled`, `initialScrollIndex`,
   the index-sync handler, and `keyExtractor` exactly as they are.

5. Reset the zoom flag so it cannot get stuck: ensure `isPhotoZoomed` is set back to
   `false` when the viewer closes (the ✕ button's `setIsFullScreen(false)` handler and
   the Modal `onRequestClose`) and when the user pages to a different photo (the
   existing index-sync handler that updates `activeSlide`).

6. KEEP the close button (`closeButton` / `closeButtonText` ✕ TouchableOpacity calling
   `setIsFullScreen(false)`) and the pagination block (`fullScreenPagination` /
   `fullScreenPaginationText` showing `{activeSlide + 1} / {images.length}`) exactly
   as they are. Do NOT touch `renderImageItem` (the hero carousel item).

7. Do not introduce any new user-facing strings — the close button uses the literal
   `✕` glyph and pagination uses numerals only, so no en.ts / ru.ts i18n changes are
   needed. The full-screen viewer chrome is intentionally dark-on-black and identical
   in light and dark mode — no `useTheme()` change required.
  </action>
  <verify>
    <automated>grep -q "@likashefqet/react-native-image-zoom" src/screens/PropertyDetailsScreen.tsx && grep -q "ImageZoom" src/screens/PropertyDetailsScreen.tsx && grep -q "fullScreenPaginationText" src/screens/PropertyDetailsScreen.tsx && npx tsc --noEmit && npx jest --silent</automated>
  </verify>
  <done>
Each full-screen FlatList photo renders inside `ImageZoom` (from
`@likashefqet/react-native-image-zoom`); the FlatList paging, close button, and
pagination chrome are unchanged; `scrollEnabled={!isPhotoZoomed}` coordinates
swipe-vs-pan; `isPhotoZoomed` resets on close and photo change; `npx tsc --noEmit` and
`npx jest` both pass.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: On-device verification of pinch / double-tap zoom</name>
  <what-built>
`react-native-gesture-handler` + `@likashefqet/react-native-image-zoom` installed,
`GestureHandlerRootView` mounted at the app root, and each full-screen photo in
PropertyDetailsScreen wrapped in `ImageZoom` with a `scrollEnabled` toggle to
coordinate swipe-paging vs. zoom-pan. Pinch-to-zoom and double-tap-to-zoom gestures
cannot be verified in a JS-only test run — they require a native build on a physical
device (this is a native-dependency change — `react-native-gesture-handler` ships a
native module — same install-gate pattern as `react-native-keyboard-controller` in
CLAUDE.md Stack Decisions).
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
6. While zoomed in, drag with one finger → the zoomed photo PANS (it does NOT page to
   the next photo).
7. Back at normal zoom (scale 1), swipe left/right → it pages between photos; the
   "{n} / {total}" indicator at the bottom updates to match.
8. Tap the ✕ button (top-right) → the viewer closes. Re-open it — paging works again
   (the zoom flag did not get stuck).
9. Repeat steps 3-8 on a Hospitality listing (a Hostel or Hotel card → tap into
   details → tap a photo) — it must behave identically.

Expected: pinch-zoom, double-tap-zoom, pan-while-zoomed, swipe-between-photos (only
when not zoomed), synced pagination, and close button all work on both platforms, in
both light and dark mode.
  </how-to-verify>
  <resume-signal>Type "approved" if zoom works on both devices, or describe any issues.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors from the ImageZoom integration).
- `npx jest` passes (no regressions in existing test suites).
- `package.json` lists both `react-native-gesture-handler` and
  `@likashefqet/react-native-image-zoom` under `dependencies`.
- `ios/Podfile.lock` references the `react-native-gesture-handler` pod.
- App.tsx imports `react-native-gesture-handler` first and wraps the tree in
  `GestureHandlerRootView`.
- PropertyDetailsScreen.tsx imports `ImageZoom` and renders it for each full-screen
  photo; the paging FlatList carries `scrollEnabled={!isPhotoZoomed}`.
- ON-DEVICE (Task 3 checkpoint): pinch-zoom, double-tap-zoom, pan-while-zoomed,
  swipe-between-photos, synced pagination indicator, and close button all work on
  iOS + Android — pinch gestures cannot be verified without a physical-device build.
</verification>

<success_criteria>
- A user can pinch-to-zoom and double-tap-to-zoom property photos in the full-screen
  viewer on both iOS and Android.
- While zoomed, a one-finger drag pans the photo; at scale 1, swiping pages between
  photos and the pagination indicator stays in sync.
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

---
phase: quick-260515-djv
plan: 01
subsystem: property-browsing
tags: [zoom, gestures, images, property-details, hospitality]
requires:
  - react-native-reanimated (4.3.1 — already present, peer of image-zoom)
provides:
  - Zoomable full-screen property photos (pinch / double-tap / pan-while-zoomed)
  - GestureHandlerRootView mounted at the app root
affects:
  - PropertyDetailsScreen full-screen photo viewer (shared by standard + Hospitality listings)
tech-stack:
  added:
    - react-native-gesture-handler@2.31.2 (native module)
    - "@likashefqet/react-native-image-zoom@4.3.0 (pure JS, ImageZoom component)"
  patterns:
    - "ImageZoom per-image zoom wrapper inside the existing horizontal paging FlatList"
    - "scrollEnabled={!isPhotoZoomed} toggle to coordinate swipe-paging vs zoom-pan"
key-files:
  created: []
  modified:
    - App.tsx
    - package.json
    - package-lock.json
    - ios/Podfile.lock
    - jest.setup.js
    - src/screens/PropertyDetailsScreen.tsx
decisions:
  - "Library: @likashefqet/react-native-image-zoom (revised pick — awesome-gallery pins reanimated 3.x, incompatible with this project's 4.3.1)"
  - "Zoom-vs-page coordination via scrollEnabled toggle driven by ImageZoom interaction callbacks (onPinchEnd / onDoubleTap / onResetAnimationEnd)"
  - "Rule 2: added an onScroll index-sync handler to the full-screen FlatList — it previously had none, so the pagination indicator never updated on swipe"
  - "Rule 3: mocked @likashefqet/react-native-image-zoom in jest.setup.js (its react-native field resolves to untranspiled src/) + added gesture-handler's official jestSetup"
metrics:
  duration: ~9 min (executor; Tasks 1-2 only — Task 3 is an on-device checkpoint)
  completed: 2026-05-15
---

# Quick Task 260515-djv: Zoomable Property Photos Summary

Full-screen property photos in `PropertyDetailsScreen` are now zoomable —
pinch-to-zoom, double-tap-to-zoom (1x-5x), and pan-while-zoomed — via
`@likashefqet/react-native-image-zoom`'s `ImageZoom` component wrapping each
photo inside the existing horizontal paging FlatList. Hospitality (Hostel/Hotel)
listings inherit the fix because they reuse the same screen.

## What Was Done

### Task 1 — Install gesture-handler + image-zoom, mount GestureHandlerRootView (commit `23fe2c8`)

- Installed `react-native-gesture-handler@2.31.2` (ships a native module) and
  `@likashefqet/react-native-image-zoom@4.3.0` (pure JS — adds no pod).
- **Clean `npm install` — no `ERESOLVE` peer conflict.** `image-zoom`'s peers
  (`react-native-reanimated >=2.x`, `react-native-gesture-handler >=2.x`) are
  satisfied by this project's reanimated 4.3.1 and the freshly-installed
  gesture-handler 2.31.2. (The original library pick, `react-native-awesome-gallery`,
  pinned `reanimated@^3.2.0` and was incompatible — hence the plan revision.)
- `pod install` ran: `RNGestureHandler (2.31.2)` pod added to `ios/Podfile.lock`.
- `App.tsx`: added `import 'react-native-gesture-handler';` as the first line,
  and wrapped the app root in `<GestureHandlerRootView style={{ flex: 1 }}>` as
  the new outermost element — above `SafeAreaProvider`. The existing provider
  order (SafeAreaProvider > KeyboardProvider > ThemeProvider > LanguageProvider >
  AuthProvider) is unchanged. `babel.config.js` untouched.

### Task 2 — Wrap each full-screen photo in ImageZoom and coordinate paging (commit `7d976d1`)

- `PropertyDetailsScreen.tsx`: imported `ImageZoom` + the `ZOOM_TYPE` runtime enum.
- `renderFullScreenItem` now renders `<ImageZoom uri={item} resizeMode="contain"
  minScale={1} maxScale={5} isDoubleTapEnabled isPinchEnabled>` in place of the
  static `<Image>`, keeping the wrapping `<View style={{ width, height }}>`.
- Added `isPhotoZoomed` state and passed `scrollEnabled={!isPhotoZoomed}` to the
  full-screen paging FlatList — when a photo is zoomed in, a one-finger drag
  pans the zoomed photo instead of paging to the next one.
- `ImageZoom` interaction callbacks drive the flag: `onPinchEnd` and
  `onDoubleTap(ZOOM_IN)` set it true; `onDoubleTap(ZOOM_OUT)` and
  `onResetAnimationEnd(finished)` set it false (`onResetAnimationEnd` is the
  authoritative "back to scale 1" signal and corrects the flag after a
  pinch-out that lands at scale 1).
- The full-screen FlatList paging, close (✕) button, and `{n} / {total}`
  pagination chrome are all unchanged. The hero carousel `renderImageItem` and
  card thumbnails were not touched. No new user-facing strings (no i18n change),
  no theme change.
- The zoom flag is reset to `false` on viewer close (both the ✕ button and the
  Modal `onRequestClose`) and on photo change, so paging can never get stuck.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added an index-sync handler to the full-screen FlatList**

- **Found during:** Task 2.
- **Issue:** The plan's context assumed the full-screen FlatList already had an
  "index-sync handler" that keeps `activeSlide` correct. It does not — the
  full-screen FlatList only had `initialScrollIndex={activeSlide}` and **no
  `onScroll` handler**. Swiping between photos in the viewer never updated
  `activeSlide`, so the `{n} / {total}` pagination indicator was stuck — a
  must-have truth ("The pagination indicator still shows '{current} / {total}'")
  would have failed.
- **Fix:** Added `onFullScreenScroll` (scoped to the full-screen viewer,
  separate from the hero carousel's `onScroll`) that rounds the scroll offset
  to a slide index, updates `activeSlide`, and resets `isPhotoZoomed` on photo
  change. Wired via `onScroll={onFullScreenScroll}` + `scrollEventThrottle={16}`.
- **Files modified:** `src/screens/PropertyDetailsScreen.tsx`.
- **Commit:** `7d976d1`.

**2. [Rule 3 - Blocking issue] jest.setup.js — gesture-handler + image-zoom Jest mocks**

- **Found during:** Task 2 verification (`npx jest`).
- **Issue:** Task 1's `import 'react-native-gesture-handler'` in `App.tsx` made
  every Jest suite that transitively imports `App.tsx` fail at module-load —
  gesture-handler's commonjs entry calls
  `TurboModuleRegistry.getEnforcing('RNGestureHandlerModule')`, a native module
  absent in the Jest runtime. Once that was fixed, a second failure surfaced:
  `@likashefqet/react-native-image-zoom`'s `package.json` `"react-native"`
  field resolves to its **untranspiled `src/`** entry, which the `react-native`
  Jest preset cannot parse.
- **Fix:** In `jest.setup.js` — (a) `require('react-native-gesture-handler/jestSetup')`
  (the library's official mock), and (b) a passthrough `jest.mock` of
  `@likashefqet/react-native-image-zoom` rendering a plain `<Image>` and
  exposing a `ZOOM_TYPE` enum stub — same convention the file already uses for
  `react-native-maps`, `react-native-svg`, `react-native-keyboard-controller`.
- **Files modified:** `jest.setup.js`.
- **Commit:** `7d976d1`.
- **Net effect:** This *reduced* the failing-suite count. Before the fix, the
  new gesture-handler import broke `App.test.tsx` plus 2 pre-existing failing
  suites; after the fix, `App.test.tsx` passes and only the 3 pre-existing
  failures remain. Net Jest regression from this task: **zero**.

## Deferred Issues

Out-of-scope discoveries logged to
`.planning/quick/260515-djv-user-cannot-zoom-in-to-the-images/deferred-items.md`:

- **17 pre-existing `npx tsc --noEmit` errors** — `Property` type drift
  (`tours`, `title`, `address`, `images`, `imageUrl`, `Tour`) across App.tsx,
  DeleteListingModal, ChatComposeScreen, ChatScreen, ScheduleViewingScreen,
  TourSelectionScreen, plus a `ThemeContext` `ColorSchemeName` indexing issue.
  Verified byte-identical on the clean base commit `3762c8d` — **not introduced
  by this task** (the zoom integration adds zero new type errors).
- **3 pre-existing `npx jest` failures** in `useRole.test.ts` (1) and
  `PropertyService.test.ts` (2). Verified identical (3 failed / 42 passed) on
  the fully-clean pre-Task-1 commit `3762c8d` — these files do not import
  App.tsx / gesture-handler / image-zoom and are unrelated to this task.

## Verification

| Check | Result |
|-------|--------|
| `package.json` lists both new deps under `dependencies` | PASS |
| `ios/Podfile.lock` references `RNGestureHandler` pod | PASS (2.31.2) |
| `App.tsx` imports gesture-handler first + wraps in `GestureHandlerRootView` | PASS |
| `PropertyDetailsScreen.tsx` imports `ImageZoom`, renders it per full-screen photo, FlatList carries `scrollEnabled={!isPhotoZoomed}` | PASS |
| `npx tsc --noEmit` introduces no new errors vs clean base | PASS (error set byte-identical to base) |
| `npx jest` — no regressions vs clean base | PASS (3 failures, all pre-existing on base; App.test.tsx now passes) |
| On-device pinch / double-tap / pan / swipe / pagination / close (iOS + Android) | PENDING — Task 3 checkpoint (`gate="blocking"`) |

## Checkpoint — Task 3 (NOT executed by this executor)

Task 3 is a `checkpoint:human-verify` with `gate="blocking"`. Pinch and
double-tap gestures require a native build on a physical device and cannot be
verified in a JS-only test run (`react-native-gesture-handler` ships a native
module — same install-gate pattern as `react-native-keyboard-controller`).

The user must build and run on **both** physical devices (iPhone 15 Pro Max +
Moto G XT2513V) and verify, on a standard listing AND a Hospitality listing:
pinch-to-zoom, double-tap-to-zoom, pan-while-zoomed, swipe-between-photos (only
when at scale 1), synced `{n} / {total}` indicator, and the ✕ close button —
in both light and dark mode. See Task 3 `<how-to-verify>` in the PLAN for the
full step list.

## Commits

- `23fe2c8` — feat(quick-260515-djv): install gesture-handler + image-zoom, mount GestureHandlerRootView
- `7d976d1` — feat(quick-260515-djv): make full-screen property photos zoomable

## Self-Check: PASSED

All modified files exist (`App.tsx`, `package.json`, `ios/Podfile.lock`,
`jest.setup.js`, `src/screens/PropertyDetailsScreen.tsx`) and the SUMMARY was
written. Both commits (`23fe2c8`, `7d976d1`) are in git history. Content
assertions confirmed: `GestureHandlerRootView` in `App.tsx`,
`@likashefqet/react-native-image-zoom` in both `PropertyDetailsScreen.tsx` and
`package.json`.

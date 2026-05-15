/**
 * Jest global setup — mocks native-module dependencies pulled in transitively
 * by non-UI code under test (canFromUser pure helper imports AuthContext which
 * imports AsyncStorage) and by App.tsx (KeyboardProvider from
 * react-native-keyboard-controller, which tries to attach a native-module
 * event emitter at module-load).
 *
 * Added in Plan 03-02 (Rule 3 — AsyncStorage) and extended in Plan 03-04
 * (react-native-keyboard-controller stub — closes Phase 2 App.test.tsx residual
 * per 03-01-SUMMARY Observation #1).
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// quick-260515-djv: App.tsx now imports 'react-native-gesture-handler', whose
// commonjs entry calls TurboModuleRegistry.getEnforcing('RNGestureHandlerModule')
// at module-load — that native module is absent in the Jest runtime. The
// library ships an official Jest setup that registers the mock. Required by
// App.test.tsx (imports App) and any suite that transitively pulls App.tsx.
require('react-native-gesture-handler/jestSetup');

// react-native-keyboard-controller pulls a native-module event emitter in
// its commonjs entry (bindings.native.ts:33). The library ships no Jest
// shim, so we stub the tiny surface App.tsx consumes: <KeyboardProvider>.
// Other exports (KeyboardAwareScrollView, useKeyboardHandler, etc.) are
// passthrough/noop so transitive imports don't crash.
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }) => children,
  KeyboardAwareScrollView: ({ children }) => children,
  KeyboardToolbar: () => null,
  useKeyboardHandler: () => {},
  useReanimatedKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
  KeyboardController: {
    dismiss: jest.fn(),
    setInputMode: jest.fn(),
    setDefaultMode: jest.fn(),
  },
}));

// Transitive native-module stubs for App.test.tsx smoke test.
// App.tsx → HomeScreen → PropertyMap pulls these; without stubs the
// react-native preset tries to load their native bindings at module-load.
// Minimal surface — only what the source files actually import.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
  const nullComp = () => null;
  return {
    __esModule: true,
    default: passthrough,
    Marker: nullComp,
    PROVIDER_DEFAULT: 'default',
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-webview', () => {
  const nullComp = () => null;
  return { WebView: nullComp };
});

jest.mock('react-native-svg', () => {
  const nullComp = () => null;
  return {
    __esModule: true,
    default: nullComp,
    Svg: nullComp,
    Defs: nullComp,
    LinearGradient: nullComp,
    Rect: nullComp,
    Stop: nullComp,
    Circle: nullComp,
    Path: nullComp,
    G: nullComp,
  };
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-community/blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  const BlurView = ({ children, style, ...rest }) =>
    React.createElement(View, { style, ...rest }, children);
  return { BlurView };
});

// quick-260515-djv: @likashefqet/react-native-image-zoom resolves to its
// untranspiled `src/` entry under the react-native jest preset (its
// package.json "react-native" field points at src/index), so Jest fails to
// parse its TSX. PropertyDetailsScreen imports ImageZoom; the Jest suites are
// smoke renders / moderation-logic tests that do not exercise zoom gestures
// (verified on-device in this task's checkpoint). Stub ImageZoom as a plain
// Image passthrough — same convention as the react-native-maps / svg stubs
// above. ZOOM_TYPE is the runtime enum the screen imports for double-tap.
jest.mock('@likashefqet/react-native-image-zoom', () => {
  const React = require('react');
  const { Image } = require('react-native');
  const ImageZoom = ({ uri, style, resizeMode }) =>
    React.createElement(Image, { source: { uri }, style, resizeMode });
  return {
    ImageZoom,
    ZOOM_TYPE: { ZOOM_IN: 'ZOOM_IN', ZOOM_OUT: 'ZOOM_OUT' },
  };
});

/**
 * Jest global setup — mocks native-module dependencies pulled in transitively
 * by non-UI code under test (canFromUser pure helper imports AuthContext which
 * imports AsyncStorage).
 *
 * Added in Plan 03-02 (Rule 3 — blocking issue) to unblock useRole unit tests.
 * Plan 04 is expected to extend this file with mocks for
 * `react-native-keyboard-controller` (to fix the Phase 2 App.test.tsx residual)
 * and any additional axios/AuthService mocks for PropertyService.test.ts.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

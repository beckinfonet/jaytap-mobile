# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- `jest` `^29.6.3` (devDependency in `package.json`)
- Config: `jest.config.js`
  ```javascript
  module.exports = {
    preset: 'react-native',
  };
  ```
- Single preset, no custom transforms, setup files, module mappers, or coverage thresholds

**Assertion Library:**
- Jest built-in `expect` (not used yet — the only test relies on `react-test-renderer`'s `act()` with no assertions)

**Type Support:**
- `@types/jest` `^29.5.13` and `@types/react-test-renderer` `^19.1.0` (devDependencies)
- Jest types wired in `tsconfig.json` via `"types": ["jest"]`

**Renderer:**
- `react-test-renderer` `19.2.3` (pinned to the React version `19.2.3`)

**Run Commands:**
```bash
npm test                 # Run all tests (alias for `jest`)
npm run lint             # ESLint (separate from tests)
```
No `test:watch`, `test:coverage`, or CI scripts are configured in `package.json`.

## Test File Organization

**Location:**
- Root-level `__tests__/` directory (`__tests__/App.test.tsx`)
- No co-located `*.test.tsx` files inside `src/`
- No `__mocks__/` directories anywhere in the repo (outside `node_modules`)

**Naming:**
- `<Name>.test.tsx` — matches the source file's name
- The only current test file is `__tests__/App.test.tsx` (testing the root `App.tsx` component)

**Structure:**
```
JayTap/
├── __tests__/
│   └── App.test.tsx        # Root smoke test
├── src/
│   ├── components/         # No tests
│   ├── screens/            # No tests
│   ├── services/           # No tests
│   ├── utils/              # No tests
│   ├── context/            # No tests
│   └── types/              # No tests
└── jest.config.js
```

## Test Structure

**Suite Organization:**
There is no `describe`/nested suite pattern in use. The single test file is a flat `test()` call:

```typescript
// __tests__/App.test.tsx
/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
```

**Patterns observed:**
- `@format` pragma at top (Prettier's React Native convention)
- Async `test(...)` wrapped in `ReactTestRenderer.act()` to flush effects
- Smoke-test style: renders and asserts no throw; no `expect(...)` call
- No setup/teardown hooks (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`) are used

## Mocking

**Framework:**
- Jest's built-in `jest.mock`, `jest.fn`, `jest.spyOn` — none currently used in any test

**Grep for mocks confirms:** `grep -rn "jest.mock\|jest.fn"` across `__tests__/` and `src/` returns **zero matches**.

**Implicit mocks from preset:**
- `preset: 'react-native'` auto-mocks native modules it ships with (e.g. `NativeAnimatedHelper`, `react-native/Libraries/...`)
- Third-party native modules used by `App.tsx` (e.g. `@react-native-async-storage/async-storage`, `react-native-maps`, `react-native-safe-area-context`, `socket.io-client`, `lucide-react-native`, `axios`) have **no manual mocks**; the smoke test only passes because effects are swallowed by `act()` and network requests in `AuthContext`'s `loadStorageData` are fired but not awaited on assertions

**What to mock (recommendation when new tests are added):**
- `AsyncStorage` — wrap reads in `AuthContext`, `LanguageContext`
- `axios` — used in every file under `src/services/`
- `socket.io-client` — used in `src/services/ChatService.ts`
- `Linking`, `BackHandler`, `Platform` — used in `App.tsx`
- `react-native-image-picker`, `react-native-maps`, `react-native-webview` — heavy native modules

**What NOT to mock:**
- Pure utilities under `src/utils/` (`formatPrice`, `parseOobCode`, `passwordPolicy`) — these are deterministic and should be unit-tested directly

## Fixtures and Factories

**Test Data:**
- None exist. No fixtures directory, no factory helpers, no shared builders.
- Type definitions in `src/types/Property.ts` and `src/types/Appointment.ts` would serve as the shape for any future fixtures.

**Location (when added):**
- A `__tests__/fixtures/` or `src/__tests__/fixtures/` directory would follow the existing `__tests__/` convention.

## Coverage

**Requirements:** None enforced. `jest.config.js` does not define `collectCoverage`, `coverageThreshold`, or `coverageReporters`.

**Current de-facto coverage:**
- 1 test file / ~1600+ source files (`src/**/*.tsx`, `src/**/*.ts`, `App.tsx`)
- Only `App.tsx`'s render path is exercised (and it does not assert anything)
- 0% of utilities, services, hooks, and components have dedicated unit tests

**View coverage:**
```bash
npx jest --coverage       # Not wired into scripts; runs with default reporter
```

## Test Types

**Unit Tests:**
- Not present. Utilities like `src/utils/passwordPolicy.ts` (`getPasswordRequirementChecks`, `passwordMeetsPolicy`), `src/utils/formatPrice.ts`, and `src/utils/parseOobCode.ts` are pure-function candidates with zero coverage.

**Integration Tests:**
- Not present. Services (`AuthService`, `PropertyService`, `ChatService`, `FavoritesService`) interact with Firebase Identity Toolkit REST and a Railway-hosted backend — none of these flows are mocked or tested.

**Component/Snapshot Tests:**
- The single `App.test.tsx` renders the tree through `react-test-renderer` but does not call `toJSON()` / `toMatchSnapshot()`. No snapshot files exist in the repo.

**E2E Tests:**
- Not used. No Detox, Maestro, Appium, or WebdriverIO setup present. No `e2e/` directory.

**Linting as a Quality Gate:**
- `npm run lint` (`eslint .`) is the only automated quality check configured; there is no CI config file (`.github/workflows/`, `circleci/`, etc.) in this repo.

## Common Patterns

**Async Testing:**
Only one example exists — wrap async rendering in `act()`:
```typescript
await ReactTestRenderer.act(() => {
  ReactTestRenderer.create(<App />);
});
```

**Error Testing:**
Not demonstrated anywhere. When added, the service-layer error shape to target is either:
- Firebase REST error envelope: `error.response.data.error` (see `src/services/AuthService.ts:22`)
- Backend `ACCOUNT_LOCKED` code: `error.response.data.code === 'ACCOUNT_LOCKED'` (see `src/services/AuthService.ts:90`)

**Recommended next steps (based on current gaps):**
1. Add unit tests for `src/utils/passwordPolicy.ts` (deterministic regex checks)
2. Add unit tests for `src/utils/parseOobCode.ts` (URL parsing edge cases)
3. Add unit tests for `src/utils/formatPrice.ts` (multi-currency formatting)
4. Add `axios` mock tests for `src/services/AuthService.ts` error normalization
5. Introduce `@testing-library/react-native` for component behavior tests (currently not a dependency)

---

*Testing analysis: 2026-04-22*

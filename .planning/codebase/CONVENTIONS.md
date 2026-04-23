# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- React components (screens, UI): `PascalCase.tsx` — e.g. `PropertyCard.tsx`, `LoginScreen.tsx`, `BottomNavigator.tsx`
- Context providers: `PascalCase.tsx` ending in `Context` — e.g. `AuthContext.tsx`, `LanguageContext.tsx`, `ThemeContext.tsx`
- Services: `PascalCase.ts` ending in `Service` — e.g. `AuthService.ts`, `PropertyService.ts`, `ChatService.ts`, `FavoritesService.ts`
- TypeScript type modules: `PascalCase.ts` (noun) — e.g. `Property.ts`, `Appointment.ts`
- Utilities / helpers: `camelCase.ts` (verb or noun) — e.g. `formatPrice.ts`, `parseOobCode.ts`, `passwordPolicy.ts`
- Locale files: lowercase 2-letter codes — e.g. `en.ts`, `ru.ts`
- Platform-specific overrides: `ComponentName.android.tsx` / `ComponentName.tsx` pair — e.g. `src/components/TourHeroCard.android.tsx` + `src/components/TourHeroCard.tsx`
- Config files: lowercase dotted — e.g. `.eslintrc.js`, `.prettierrc.js`, `jest.config.js`, `babel.config.js`, `metro.config.js`
- Entry / root: `App.tsx` (project root, not inside `src/`), `index.js` for RN registration
- Tests: co-located in root-level `__tests__/` with `.test.tsx` suffix — e.g. `__tests__/App.test.tsx`

**Functions:**
- `camelCase` for standalone functions and methods — e.g. `formatPrice`, `parseOobCodeFromResetInput`, `getPasswordRequirementChecks`, `passwordMeetsPolicy`
- React components use `PascalCase` — e.g. `PasswordRequirements`, `PropertyCard`, `AuthModalCloseButton`
- Event handlers prefixed with `handle` — e.g. `handleLogin`, `handleShare` in `src/screens/LoginScreen.tsx`, `src/components/PropertyCard.tsx`
- Callback props prefixed with `on` — e.g. `onPress`, `onTabChange`, `onNavigateToSignup`, `onViewTour`, `onFavorite`

**Variables:**
- `camelCase` for locals, state, and props — e.g. `errorMessage`, `isFavorited`, `loading`, `activeTab`
- Boolean flags prefixed with `is`/`has`/`show` — e.g. `isDark`, `isFavorited`, `isLoading`, `showEditButton`, `showBadge`
- `SCREAMING_SNAKE_CASE` for module-level constants — e.g. `API_KEY`, `AUTH_URL`, `BACKEND_URL` in `src/services/AuthService.ts`, `PASSWORD_MIN_LENGTH` in `src/utils/passwordPolicy.ts`, `LANGUAGE_STORAGE_KEY` in `src/context/LanguageContext.tsx`, `TAB_IDS`, `TAB_ICONS`, `TAP`, `ICON_CIRCLE`
- Refs suffixed with `Ref` — e.g. `skipRenterListingsReopenRef`, `slideAnim` in `App.tsx` and `src/components/LanguageToggleSwitch.tsx`

**Types / Interfaces:**
- `PascalCase` for interfaces and type aliases — e.g. `Property`, `Appointment`, `TimeSlot`, `Conversation`, `Message`, `PasswordRequirementCheck`
- Props interfaces suffixed with `Props` — e.g. `PropertyCardProps`, `BottomNavigatorProps`, `PasswordTextInputProps`
- Context value types suffixed with `ContextType` — e.g. `AuthContextType`, `LanguageContextType`, `ThemeContextType`
- String-literal union IDs — e.g. `TabId = 'home' | 'favorites' | 'add' | 'chat' | 'profile'`, `Language = 'en' | 'ru'`, `PasswordRequirementId = 'length' | 'uppercase' | 'number' | 'symbol'`

## Code Style

**Formatting:**
- Prettier `2.8.8` (devDependency in `package.json`)
- Config: `.prettierrc.js`
  - `arrowParens: 'avoid'` — `x => x` preferred over `(x) => x`
  - `singleQuote: true` — single quotes for strings
  - `trailingComma: 'all'` — trailing commas everywhere allowed
- Default RN indentation (2 spaces), semicolons enabled (inherited from `@react-native` preset)

**Linting:**
- ESLint `^8.19.0`
- Config: `.eslintrc.js` — extends `@react-native` (package `@react-native/eslint-config@0.84.0`)
- Run: `npm run lint` (`eslint .`)
- Only the preset is applied; no custom overrides are declared in this repo

## Import Organization

**Order observed across `src/`:**
1. React / React Native core imports — `import React, { ... } from 'react'`, then `from 'react-native'`
2. Third-party RN modules — `react-native-safe-area-context`, `lucide-react-native`, `axios`, `@react-native-async-storage/async-storage`, `socket.io-client`
3. Internal absolute imports via relative paths:
   - `../context/...`
   - `../theme/...`
   - `../services/...`
   - `../types/...`
   - `../utils/...`
   - `../components/...` (when importing siblings from screens)
4. Local sibling components — `./ListingMetaTable`, etc.

Example from `src/components/PasswordRequirements.tsx`:
```typescript
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import type { TranslationKeys } from '../locales';
import {
  getPasswordRequirementChecks,
  type PasswordRequirementId,
} from '../utils/passwordPolicy';
```

**Path Aliases:**
- None configured. `tsconfig.json` uses `@react-native/typescript-config` with no `paths` override
- All internal imports use relative paths (`../`, `./`)

## Error Handling

**Service layer pattern (try/catch + throw-or-normalize):**
Every service method wraps `axios` calls in `try/catch` and either re-throws, swallows with a safe default, or unwraps the Firebase REST error envelope. See `src/services/AuthService.ts`:

```typescript
signIn: async (email: string, password: string) => {
  try {
    const response = await axios.post(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, {
      email, password, returnSecureToken: true,
    });
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data.error : error;
  }
},
```

**Conventions used in services:**
- `catch (error: any)` — errors are typed as `any` throughout; no `unknown`/narrowing
- `console.error('Error ...:', error)` before re-throw for debugging — see `src/services/PropertyService.ts`, `src/services/FavoritesService.ts`
- Backend-specific codes surfaced as Error messages (e.g. `ACCOUNT_LOCKED` → `throw new Error(...)` in `src/services/AuthService.ts:90–94`)
- Some reads return safe defaults instead of throwing when unauthenticated — e.g. `FavoritesService.getFavorites` returns `[]` on 404/500 (`src/services/FavoritesService.ts:43–49`)

**UI layer pattern (state + user-facing message):**
Screens hold an `errorMessage` state, clear it on submit, and render a styled error container. See `src/screens/LoginScreen.tsx:27–46`:

```typescript
const [errorMessage, setErrorMessage] = useState('');

const handleLogin = async () => {
  setErrorMessage('');
  if (!email || !password) {
    setErrorMessage(t('auth.pleaseFillAllFields'));
    return;
  }
  setLoading(true);
  try {
    await login(email, password);
    if (onClose) onClose();
  } catch (error: any) {
    setErrorMessage(error.message || t('auth.loginFailed'));
  } finally {
    setLoading(false);
  }
};
```

**Context pattern (custom hook guards):**
Each context exposes a `use*` hook that throws if used outside its provider. See `src/context/AuthContext.tsx:131–137`:

```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```
Same pattern in `src/theme/ThemeContext.tsx` and `src/context/LanguageContext.tsx`.

## Logging

**Framework:** `console` only (no logger library)

**Patterns:**
- `console.error('<Human-readable action>:', error)` in service `catch` blocks
- `console.warn(...)` for non-fatal degradations (`src/services/AuthService.ts:130`, `src/context/AuthContext.tsx:69`)
- Silent catches with a comment when intentional — e.g. `src/context/AuthContext.tsx:32–34`:
  ```typescript
  } catch (_) {
    /* keep cached user without profile */
  }
  ```

## Comments

**When to comment:**
- JSDoc on exported utility functions and non-obvious public service methods — e.g. `src/utils/parseOobCode.ts`, `src/utils/formatPrice.ts`, `src/services/PropertyService.ts:189` (`/** Admin only: ... */`)
- Inline `//` for migration notes, TODOs, and cross-platform reminders — e.g. `src/services/PropertyService.ts:5–11` explaining local vs. production URL toggle
- File-level doc-comment for configuration modules — e.g. `src/constants.ts:1–8` explains domain migration

**TSDoc style:** Multi-line `/** ... */` with plain English descriptions; param/return tags used only occasionally (mostly narrative).

## Function Design

**Size:** Screen components are large monoliths (`src/screens/PropertyDetailsScreen.tsx` is 53KB, `CreateListingScreen.tsx` 47KB). Utilities, components, and services stay short (typically <200 lines).

**Parameters:** Services use plain positional args for primitives (`email`, `password`, `firebaseUid`) and a loose `any` for complex payloads (`propertyData: any`, `profileData: any = {}`). Components use a destructured props object with an explicit `Props`/`ContextType` interface.

**Return values:** Service methods return `response.data` (or mapped variants where `_id` → `id`). Async returns are not explicitly annotated except in `ChatService` which uses `Promise<T>` return types (`src/services/ChatService.ts:42–81`).

## Module Design

**Exports:**
- Services exported as a single const object with methods — e.g. `export const AuthService = { signUp, signIn, ... }` (`src/services/AuthService.ts:12`)
- Components use **named exports** (no default exports) — e.g. `export const PropertyCard: React.FC<PropertyCardProps> = ...`, `export function PasswordRequirements(...)`
- Types/interfaces use named `export interface` / `export type`
- Utility functions use named `export function`

**Barrel files:**
- Only `src/locales/index.ts` acts as a barrel (re-exports `en`, `ru`, and the `t` translator)
- Neither `src/components/`, `src/services/`, `src/screens/`, nor `src/utils/` has an `index.ts`

## TypeScript Usage

- TypeScript `^5.8.3`; `tsconfig.json` extends `@react-native/typescript-config` with `"types": ["jest"]`
- `strict` mode inherited from the preset; include globs cover `**/*.ts` and `**/*.tsx`
- Heavy use of `any` at API/service boundaries — e.g. `propertyData: any`, `userData: any`, `error: any`, response `.map((p: any) => ...)` in `src/services/PropertyService.ts`, `src/services/ChatService.ts`, `src/services/FavoritesService.ts`
- Discriminated string-literal unions for domain enums (`Language`, `TabId`, `PasswordRequirementId`, `Property.type: 'rent' | 'sale'`, `Appointment.status`)
- React component typing mixes both styles:
  - `React.FC<Props>` — `BottomNavigator`, `PropertyCard`, `LanguageToggleSwitch`, `ThemeProvider`
  - Plain `function Name({...}: Props)` — `PasswordRequirements`, `PasswordTextInput`, `AuthModalCloseButton`
- `type` imports: `import type { TranslationKeys } from '../locales'` used when importing types only

## Component Patterns

**Functional components with hooks only** — no class components anywhere in `src/`.

**Props interface immediately above component** (`src/components/PropertyCard.tsx:22–34`):
```typescript
interface PropertyCardProps {
  property: Property;
  onPress: (property: Property) => void;
  onEdit?: (property: Property) => void;
  isFavorited?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property, onPress, onEdit, isFavorited = false,
}) => { ... };
```

**Default prop values** via destructuring defaults, not `defaultProps`.

**Styles colocated at bottom of file** using `StyleSheet.create({...})`. Every component file ends with a `const styles = StyleSheet.create(...)` block.

**Theme colors applied inline via `style={[styles.x, { backgroundColor: colors.surface }]}`** because the palette is resolved at runtime from `useTheme()` rather than being baked into `StyleSheet`. Pattern repeated in `PropertyCard`, `LoginScreen`, `BottomNavigator`, `AuthModalCloseButton`.

**Accessibility:**
- `accessibilityRole`, `accessibilityLabel`, `accessibilityLiveRegion` used consistently on interactive elements — see `src/components/AuthModalCloseButton.tsx:22`, `src/components/PasswordRequirements.tsx:33–43`, `src/components/PropertyCard.tsx:176–198`
- `hitSlop` enforced on small targets (`src/components/PasswordTextInput.tsx:26`, `src/components/AuthModalCloseButton.tsx:23`)
- 44×44 minimum tap target constants documented — `TAP = 44` in `AuthModalCloseButton.tsx:8`

## Styling Approach

**React Native `StyleSheet.create` only.** No styled-components, no utility CSS, no styled-system.

**Theme integration:** Static structural styles live in `StyleSheet.create`; dynamic (color, theme) values are merged via style arrays:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
```

**Platform-specific styles** via `Platform.select`:
```typescript
...Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { ... }, shadowOpacity: 0.15 },
  android: { elevation: 12 },
}),
```
See `src/components/BottomNavigator.tsx:100–110`, `src/components/PropertyCard.tsx:391–411`.

**Platform-specific files** for fully divergent UI — e.g. `src/components/TourHeroCard.android.tsx` vs. `src/components/TourHeroCard.tsx` (Metro picks the right one via `.android.tsx` suffix).

**Safe-area handling** via `react-native-safe-area-context`'s `useSafeAreaInsets()` for dynamic inset math (`BottomNavigator`, `AuthModalCloseButton`) and `<SafeAreaView>` at screen roots (`LoginScreen`).

**Color palette centralized** in `src/theme/colors.ts` with parallel `light` and `dark` records typed as `ThemeColors = typeof colors.light`. Access via `const { colors } = useTheme()`.

**Responsive sizing** uses `Dimensions.get('window')` at module load — e.g. `const { width } = Dimensions.get('window')` in `src/components/PropertyCard.tsx:36`.

**Fonts:** Platform-specific serif stack for branded typography — `fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' })` (`src/components/PropertyCard.tsx:326, 347`).

## Keep-alive and overlay screens

Keep-alive (tab) screens and full-screen overlays in `App.tsx` MUST use BOTH `display`
and `pointerEvents` to gate visibility, not either one alone.

**Keep-alive tab pattern:**
```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({ flex: 1, display: visible ? 'flex' : 'none', pointerEvents: visible ? 'auto' : 'none' }) as const;
```

**Full-screen overlay pattern:**
```typescript
<View style={[fullScreenOverlayWrap, { pointerEvents: isOpen ? 'auto' : 'none' }]}>
```

**Why:** `display: 'none'` removes the view from the layout tree, but on RN's responder system
(both old and Fabric) an absolute-positioned wrapper or descendant can still capture touches
meant for the bottom nav. See `.planning/phases/01-nav-reliability/01-RESEARCH.md` §4 and
[RNav #12824](https://github.com/react-navigation/react-navigation/issues/12824). Use style-based
`pointerEvents` (not the deprecated prop form).

**On adding a new full-screen overlay:** add the overlay's visibility flag to the `OVERLAY_FLAGS`
array in `App.tsx` so `hideMainStackUnderOverlay` keeps working. Review checklist item.

---

*Convention analysis: 2026-04-22*

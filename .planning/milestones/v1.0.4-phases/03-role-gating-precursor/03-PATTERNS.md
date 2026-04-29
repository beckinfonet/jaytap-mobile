# Phase 3: Role Gating Precursor — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 4 new + 5 modified = 9 total
**Analogs found:** 7 / 9 strong, 2 partial (see §No Analog Found)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useRole.ts` (NEW) | hook + pure helper + error class | reads auth context → derives role; `canFromUser` is pure `(user, action) → boolean` | `src/context/LanguageContext.tsx` (hook-over-context shape) + `src/utils/passwordPolicy.ts` (pure helper in same file) | partial — first hook file, hybrid pattern |
| `src/components/Gated.tsx` (NEW) | component | renders conditionally on `useRole().can()` | `src/components/PasswordRequirements.tsx` (hook-consuming conditional-render), `src/components/LanguageToggleSwitch.tsx` (small functional wrapper) | role-match |
| `src/constants/adminAllowlist.ts` (NEW) | constant + pure helper | exports typed array + `isAllowlistedAdmin(email)` predicate | `src/constants.ts` (existing constants module) + `src/utils/passwordPolicy.ts` (constant + predicate pair) | role-match |
| `src/hooks/__tests__/useRole.test.ts` (NEW) | test (unit — pure function) | `describe` blocks exercise pure helpers; second block `jest.mock('axios')` + `jest.mock('AuthService')` | `__tests__/App.test.tsx` (only existing test — render smoke) | partial — no Jest precedent for pure/service tests |
| `src/screens/CreateListingScreen.tsx` (MOD) | screen | 4 `isAdmin` sites → `can()` + 3 `<Gated>` wraps | self (in-file migration) | exact (same file) |
| `src/screens/PropertyDetailsScreen.tsx` (MOD) | screen | 1 `isAdmin` site → `can()` + 1 `<Gated>` wrap | self (in-file migration) | exact |
| `src/screens/ProfileScreen.tsx` (MOD) | screen | `canManageListings` derivation → `can('manageListings')` | self (in-file migration) | exact |
| `src/services/PropertyService.ts` (MOD) | service | service-layer guard: `getUserData()` → `canFromUser()` → throw `PermissionDeniedError` | self (adjacent method patterns in same file) | exact |
| `src/locales/en.ts` + `src/locales/ru.ts` (MOD) | i18n | append `errors.permissionDenied` key to each locale object | self (existing `common.*` / `auth.*` keys in same file) | exact |

---

## Pattern Assignments

### `src/hooks/useRole.ts` (hook + pure helper + error class — NEW)

**No existing `src/hooks/` directory.** Phase 3 establishes this directory. The closest structural analogs are:

**Analog A (hook contract):** `src/context/LanguageContext.tsx` — for the hook-that-reads-context shape
**Analog B (pure helper co-located with types):** `src/utils/passwordPolicy.ts` — for the `exported-constant + exported-type + exported-predicate` module layout

**Imports pattern** (copy from `LanguageContext.tsx:1-3`):
```typescript
import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
// → in useRole.ts we only need useMemo:
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
```
**Path convention:** relative imports `../context/AuthContext` (not path aliases — repo has no `@/` setup). Use this in every new file.

**Hook export shape** (copy from `LanguageContext.tsx:56-60`):
```typescript
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
```
**Translation for `useRole`:** `useRole` consumes `useAuth()` directly (not its own context), so skip the null-guard — `useAuth()` already throws if outside `AuthProvider` (`AuthContext.tsx:132-135`). Example to follow:
```typescript
export function useRole(): UseRoleResult {
  const { user } = useAuth();
  return useMemo(() => {
    // ... derive + return shape
  }, [user]);
}
```

**Exported-type + exported-const + exported-predicate module shape** (copy from `passwordPolicy.ts:1-21`):
```typescript
export const PASSWORD_MIN_LENGTH = 7;

export type PasswordRequirementId = 'length' | 'uppercase' | 'number' | 'symbol';

export interface PasswordRequirementCheck {
  id: PasswordRequirementId;
  met: boolean;
}

export function getPasswordRequirementChecks(password: string): PasswordRequirementCheck[] { /* ... */ }
export function passwordMeetsPolicy(password: string): boolean { /* ... */ }
```
**Apply to `useRole.ts`:** Export `Role` type, `Action` string-literal union, `UseRoleResult` interface, `canFromUser` pure function, `useRole` hook, `PermissionDeniedError` class, all from the one file. Named exports only — no default export. This matches the repo's single-file-module convention.

**Error class pattern** — no existing custom Error class in the codebase (all services just `throw new Error(...)` — see `PropertyService.ts:54`, `AuthContext.tsx:108-112`). Define `PermissionDeniedError extends Error` with `this.name = 'PermissionDeniedError'` so `error.message === 'E_PERMISSION_DENIED'` matches existing string-match catch patterns (e.g., `AuthContext.tsx:66` uses `e.message.includes('locked')`).

**Comment style** — JSDoc block above each exported symbol, matching `parseOobCode.ts:1-3`:
```typescript
/**
 * Extract Firebase password-reset oobCode from a pasted reset URL or raw code.
 */
export function parseOobCodeFromResetInput(input: string): string | null { /* ... */ }
```

---

### `src/components/Gated.tsx` (component — NEW)

**Analog A (small hook-consuming functional component):** `src/components/LanguageToggleSwitch.tsx:1-64`
**Analog B (props interface + `React.FC` + conditional children):** `src/components/PasswordRequirements.tsx:1-58`

**Imports + component shape** (from `PasswordRequirements.tsx:1-23`):
```typescript
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import type { TranslationKeys } from '../locales';
// ...
type Props = {
  password: string;
};

export function PasswordRequirements({ password }: Props) {
  const { t } = useLanguage();
  // ...
}
```

**Alternative typing style — `React.FC<Props>` with interface** (from `DeleteAccountModal.tsx:14-25`):
```typescript
interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userEmail?: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  userEmail,
}) => { /* ... */ };
```
**Which to use:** Repo mixes both. RESEARCH.md §3.3 recommends `React.FC<GatedProps>` to match `BottomNavigator`/`PropertyCard`. Either is acceptable per CONVENTIONS.md. Stay consistent within the file.

**Hook-consumption + conditional-render** (from `LanguageToggleSwitch.tsx:6-9` + `PasswordRequirements.tsx:35-43` for the `{met ? <A /> : <B />}` ternary):
```typescript
export const LanguageToggleSwitch: React.FC = () => {
  const { isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  // ...
```
**Translate to `Gated.tsx`:**
```typescript
export const Gated: React.FC<GatedProps> = ({ action, children, fallback = null }) => {
  const { can } = useRole();
  return can(action) ? <>{children}</> : <>{fallback}</>;
};
```
**No StyleSheet** — this is a logical wrapper, not a visual component. Don't add `StyleSheet.create({})`.

**Export style** — named export `export const Gated` (matching `LanguageToggleSwitch`, `DeleteAccountModal`). No default exports anywhere in `src/components/`.

---

### `src/constants/adminAllowlist.ts` (constants + predicate — NEW)

**Analog A (constant module header + JSDoc):** `src/constants.ts:1-14`
**Analog B (typed-const + predicate pair):** `src/utils/passwordPolicy.ts:1-21`

**Module header pattern** (copy from `constants.ts:1-10`):
```typescript
/**
 * App configuration constants.
 * Centralized here for easy domain/URL updates.
 *
 * Domain migration: bizdinkonush.com → moveinplatform.com (Mar 2025)
 * Deep link parsing supports both domains for backward compatibility with old shared links.
 */

/** Base URL for the property platform (used for share links and universal links) */
export const APP_BASE_URL = 'https://www.moveinplatform.com';
```
**Apply:** Top-of-file JSDoc block explaining purpose + the `TODO(M2): replace allowlist with role-based implementation` comment per D-07. Single-line JSDoc `/** ... */` above each export.

**Typed const + predicate** (copy shape from `passwordPolicy.ts:1-21`):
```typescript
export const PASSWORD_MIN_LENGTH = 7;
export type PasswordRequirementId = 'length' | 'uppercase' | 'number' | 'symbol';
export function passwordMeetsPolicy(password: string): boolean {
  return getPasswordRequirementChecks(password).every((c) => c.met);
}
```
**Translate to `adminAllowlist.ts`:**
```typescript
export const ALLOWLIST = ['beckprograms@gmail.com'] as const;
export type AllowlistedEmail = typeof ALLOWLIST[number];
export function isAllowlistedAdmin(email: string | null | undefined): boolean { /* ... */ }
```
**Nullish guard pattern** — mirrors `parseOobCode.ts:5-7`:
```typescript
const trimmed = input.trim();
if (!trimmed) {
  return null;
}
```
Apply the same early-return style for `isAllowlistedAdmin(email)` per D-06.

---

### `src/hooks/__tests__/useRole.test.ts` (test — NEW)

**WEAK ANALOG — see §No Analog Found.** The only existing test is `__tests__/App.test.tsx` (13 lines, smoke-renders `<App />`). No repo precedent for:
- unit-testing a pure function
- `jest.mock('axios')` / `jest.mock('../../services/...')` service tests
- co-located `src/**/__tests__/` directories

**Existing test file** (full file, `__tests__/App.test.tsx:1-13`):
```typescript
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

**What this tells the planner:**
- File header comment: `/** @format */` — preserve in new test files for Prettier consistency.
- `test(...)` style (not `it(...)`) — matches repo convention.
- `await ReactTestRenderer.act(...)` for async React trees — not needed for our pure-function tests.
- `jest.config.js:1-3` = `{ preset: 'react-native' }` only — no custom setup, no coverage thresholds, no `@testing-library/react-native` (confirmed by RESEARCH §2 + §3.8).

**Template the planner should provide the executor** (pattern from RESEARCH.md §3.8, no repo analog):
```typescript
import { canFromUser } from '../useRole';

describe('canFromUser priority ladder', () => {
  const admin = { email: 'admin@foo.com', backendProfile: { userType: 'admin' } };
  // ...
  test('userType=admin grants editVerifications', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });
});
```

**For the service-guard test** — mock pattern has no in-repo precedent; RESEARCH.md §3.8 Test 2 is the canonical template. Key mechanics:
```typescript
jest.mock('axios');
jest.mock('../../services/AuthService');

(AuthService.getUserData as jest.Mock).mockResolvedValue({ /* ... */ });
await expect(PropertyService.patchPlatformVerifications(...)).rejects.toThrow('E_PERMISSION_DENIED');
expect(axios.patch).not.toHaveBeenCalled();
```

---

### `src/screens/CreateListingScreen.tsx` (MODIFIED — migrate 4 sites + wrap 3 sections)

**Analog:** self — in-place migration. Surrounding code is the analog.

**Current `isAdmin` declaration** (line 110, already loaded):
```typescript
const isEditMode = !!propertyToEdit;
const isAdmin = user?.backendProfile?.userType === 'admin';
```
**Migrate to:**
```typescript
const isEditMode = !!propertyToEdit;
const { can, isAdmin } = useRole();
```
**Add import** near existing `useAuth` import — mirror import ordering already in the file.

**Current payload gate** (lines 394-405):
```typescript
tours: tours.length > 0 ? tours : undefined, // Include Matterport tours
existingImages: existingImageUrls, // Send existing image URLs for merging
...(isAdmin
  ? {
      platformVerifications: {
        ownershipDocuments: verifyOwnership,
        ownerIdentityVerified: verifyOwnerId,
        stateIssuedDocumentsVerified: verifyStateDocs,
      },
    }
  : {}),
```
**Migrate to:** `...(can('editVerifications') ? { platformVerifications: {...} } : {})` — RESEARCH.md §3.7 row 3 confirms the action is `editVerifications`, NOT `editMatterportUrl` (CONTEXT D-10's label is ambiguous — correct per RESEARCH §2.3 correction). The `tours` + `panoramicPhotosUrl` fields stay OUTSIDE this branch per D-09.

**Current `{isAdmin && (<View>...)}` conditional** (line 933, already loaded):
```typescript
{isAdmin && (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('verification.adminSectionTitle')}</Text>
    {/* ... switches ... */}
  </View>
)}
```
**Migrate to `<Gated>` wrapper:**
```typescript
<Gated action="editVerifications">
  <View style={styles.section}>
    {/* ... same children ... */}
  </View>
</Gated>
```
**Add import** — `import { Gated } from '../components/Gated';` near other component imports at the top of the file.

---

### `src/screens/PropertyDetailsScreen.tsx` (MODIFIED — 1 site + 1 wrap)

**Analog:** self. Existing pattern at line 178 (already loaded):
```typescript
const { user } = useAuth();
const { t } = useLanguage();
const isAdmin = user?.backendProfile?.userType === 'admin';
```
**Migrate to:** `const { can } = useRole();` (drop `isAdmin` unless grep shows residual uses — RESEARCH.md §3.7 row 7 confirms).

**Existing inline conditional** (line 401, already loaded):
```typescript
{isAdmin && onAdminVerifyDocuments && (
  <TouchableOpacity /* ... admin verify icon ... */>
    <ShieldCheck size={22} color={colors.accent} />
  </TouchableOpacity>
)}
```
**Migrate to:**
```typescript
<Gated action="editVerifications">
  {onAdminVerifyDocuments && (
    <TouchableOpacity /* ... */>
      <ShieldCheck size={22} color={colors.accent} />
    </TouchableOpacity>
  )}
</Gated>
```
**Invariant:** keep the `onAdminVerifyDocuments &&` prop nil-check inside — it's a presence check, not a gate (D-11).

---

### `src/screens/ProfileScreen.tsx` (MODIFIED — 1 gating migration)

**Analog:** self. Existing pattern (lines 20-33, already loaded):
```typescript
function ProfileScreenComponent({ onBack, /* ... */ }: ProfileScreenProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    // ...
    const [userType, setUserType] = useState<string>('');
    // ...
    /** Same listing tools as renters; admins keep access after userType change */
    const canManageListings = userType === 'renter' || userType === 'admin';
```
**Migrate to:**
```typescript
const { can } = useRole();
// ...
const canManageListings = can('manageListings');
```
**NOT migrated:** `setUserType(profile.userType || '')` at line 70 — this is display state, per D-13. Leave as-is. The `userType` local state variable stays for display copy; only the gating derivation moves through `can()`.

---

### `src/services/PropertyService.ts` (MODIFIED — add guard)

**Analog:** self. Existing `patchPlatformVerifications` method (lines 190-213, already loaded):
```typescript
/** Admin only: update verification flags on any listing */
patchPlatformVerifications: async (
  propertyId: string,
  platformVerifications: { /* ... */ }
) => {
  const userData = await AuthService.getUserData();
  if (!userData?.localId) {
    throw new Error('User not authenticated');
  }
  const response = await axios.patch(/* ... */);
  return { ...response.data, id: response.data._id };
},
```

**Guard insertion pattern** — matches the existing `if (!userData?.localId) throw new Error(...)` shape in the same method. Insert RIGHT AFTER that check:
```typescript
const userData = await AuthService.getUserData();
if (!userData?.localId) {
  throw new Error('User not authenticated');
}
// NEW per D-17:
if (!canFromUser(userData, 'editVerifications')) {
  console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
  throw new PermissionDeniedError();
}
const response = await axios.patch(/* ... unchanged ... */);
```

**Imports to add** at top of file (mirror existing imports `PropertyService.ts:1-3`):
```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from './AuthService';
// NEW:
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';
```
**React-free invariant preserved** — `canFromUser` is a pure function; importing it here does NOT pull React into the service layer. D-16 / CONVENTIONS.md "services don't depend on React" remains intact.

**Existing error-throw style** in same file (line 54, `createProperty`):
```typescript
const userData = await AuthService.getUserData();
if (!userData?.localId) {
  throw new Error('User not authenticated');
}
```
Our new throw uses the `PermissionDeniedError` class (RESEARCH §3.5 — co-located with `canFromUser`). The message string `E_PERMISSION_DENIED` matches existing string-match catch convention (`AuthContext.tsx:66` checks `e.message.includes('locked')`).

---

### `src/locales/en.ts` + `src/locales/ru.ts` (MODIFIED — add `errors.permissionDenied`)

**Analog:** self. The existing namespace pattern (`en.ts:2-17`):
```typescript
export const en = {
  // Common
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  // ...
  'common.no': 'No',

  // Auth
  'auth.signInRequired': 'Sign In Required',
  // ...
```

**New namespace section to add** (end of file, before the closing `}` — D-18):
```typescript
  // Errors
  'errors.permissionDenied': "You don't have permission to perform this action.",
```

**Russian parity** (`ru.ts:3-17`):
```typescript
export const ru: Record<TranslationKeys, string> = {
  // Common
  'common.back': 'Назад',
  // ...
```
The `ru.ts` file is typed `Record<TranslationKeys, string>` — TypeScript will force adding the key to `ru.ts` as soon as it's added to `en.ts` (since `TranslationKeys` derives from `en`). Add the key to `en.ts` FIRST, then to `ru.ts` to keep EN + RU parity per CLAUDE.md "Key Conventions."

Russian suggested: `'errors.permissionDenied': 'У вас нет прав для выполнения этого действия.'` — per CONTEXT D-18, wording is refinable.

---

## Shared Patterns

### Pattern S1 — Named exports only
**Source:** Every file in `src/components/`, `src/services/`, `src/utils/`, `src/context/`, `src/locales/`
**Apply to:** `useRole.ts`, `Gated.tsx`, `adminAllowlist.ts`
**Rationale:** No default exports anywhere in the repo.
```typescript
// PasswordRequirements.tsx:23
export function PasswordRequirements({ password }: Props) { /* ... */ }
// LanguageContext.tsx:56
export const useLanguage = () => { /* ... */ };
// LanguageToggleSwitch.tsx:6
export const LanguageToggleSwitch: React.FC = () => { /* ... */ };
```

### Pattern S2 — Relative imports (no path aliases)
**Source:** All of `src/`
**Apply to:** All new files
```typescript
// PasswordRequirements.tsx:4-10
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import type { TranslationKeys } from '../locales';
import { getPasswordRequirementChecks, type PasswordRequirementId } from '../utils/passwordPolicy';
```
Planner must use `../context/AuthContext`, `../constants/adminAllowlist`, `../hooks/useRole` — never `@/hooks/useRole`.

### Pattern S3 — Functional components + hooks only
**Source:** All of `src/components/` and `src/screens/` (confirmed by CONVENTIONS.md)
**Apply to:** `Gated.tsx`
**Anti-pattern avoided:** no class components.

### Pattern S4 — Service error handling (match existing throw shape)
**Source:** `src/services/PropertyService.ts:52-56`, `src/services/AuthService.ts:21-22`
```typescript
// PropertyService.ts:52-56
const userData = await AuthService.getUserData();
if (!userData?.localId) {
  throw new Error('User not authenticated');
}
```
```typescript
// AuthService.ts:21-22
} catch (error: any) {
  throw error.response ? error.response.data.error : error;
}
```
**Apply to:** `PropertyService.patchPlatformVerifications` guard — throw a string-matchable error message token (`E_PERMISSION_DENIED`) rather than a `.code` field. Matches existing catch-site idioms (e.g., `AuthContext.tsx:66` `if (e.message && e.message.includes('locked'))`). D-18.

### Pattern S5 — `useMemo` over context-derived values
**Source:** `src/context/LanguageContext.tsx:44-47`
```typescript
const t = useCallback(
  (key: TranslationKeys, params?: Record<string, string>) => translate(language, key, params),
  [language]
);
```
Memoizes a context-derived callback against its input key.

Similar idiom in `PasswordRequirements.tsx:27-30`:
```typescript
const checks = useMemo(() => {
  const list = getPasswordRequirementChecks(password);
  return new Map(list.map((c) => [c.id, c.met]));
}, [password]);
```
**Apply to:** `useRole()` should return a `useMemo`-wrapped object keyed on `user` identity per RESEARCH §3.2. Follow the `useMemo(() => ({ ... }), [user])` pattern.

### Pattern S6 — JSDoc block above exports
**Source:** `src/constants.ts:1-14`, `src/utils/formatPrice.ts:3-7`, `src/utils/parseOobCode.ts:1-3`, `src/services/PropertyService.ts:189`
```typescript
// PropertyService.ts:189
/** Admin only: update verification flags on any listing */
patchPlatformVerifications: async (/* ... */) => { /* ... */ },
```
**Apply to:** `useRole.ts` (`deriveRole`, `canFromUser`, `useRole`, `PermissionDeniedError`), `Gated.tsx` (component purpose), `adminAllowlist.ts` (TODO(M2) JSDoc block per D-07).

### Pattern S7 — i18n key added to both locales with parity
**Source:** `src/locales/en.ts` + `src/locales/ru.ts` — paired namespaces
**Apply to:** `errors.permissionDenied` — added to `en.ts` first (source of `TranslationKeys` type), then `ru.ts` (TypeScript will compile-error if missing in RU per `ru.ts:3` `Record<TranslationKeys, string>`).
**Typing leverage:** The `ru.ts:3` signature `export const ru: Record<TranslationKeys, string>` gives EN+RU parity for free — TS compiler is the enforcer. Confirmed in `locales/index.ts:4` `import type { TranslationKeys } from './en';`.

---

## No Analog Found

Files with no strong in-repo pattern match (planner should cite RESEARCH.md code sketches as the authoritative template for these):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/__tests__/useRole.test.ts` | test (pure unit + mocked service) | `jest.mock('axios')` + `jest.mock('AuthService')` → assert throws | Repo's only test is `__tests__/App.test.tsx` (13-line render smoke). No precedent for: pure-function unit tests, `jest.mock`-based service tests, or `src/**/__tests__/` co-location. **Planner must use RESEARCH.md §3.8 Test 1 + Test 2 templates as the authoritative source** — do NOT quote `App.test.tsx` as the model, it's the wrong shape. |
| `src/hooks/useRole.ts` (the hook-as-pure-selector-over-another-hook shape) | hook | `useAuth() → useMemo → { role, isAdmin, ..., can }` | No existing custom hook in the repo reads FROM another context hook. `useLanguage` / `useAuth` / `useTheme` are all context-internal `useContext` consumers. `useRole` is a derived/selector hook — new shape. Nearest analog is `LanguageContext.tsx` but the structure (no Provider) differs. **Planner cites RESEARCH.md §3.2 code sketch (lines 302-391 of research) as authoritative.** |

**Also partial, but usable:**

- **Custom Error classes** — no `class XxxError extends Error` exists in the codebase. All services use `throw new Error('string')`. `PermissionDeniedError` is a new pattern (one data point only). Planner should cite RESEARCH §3.5 for the shape; the string message `E_PERMISSION_DENIED` is the in-repo string-match catch convention (`AuthContext.tsx:66`).

- **`src/hooks/` directory itself** — Phase 3 is the first hook file outside of context files. Planner should bundle a one-line `.planning/codebase/CONVENTIONS.md` entry documenting the new directory (per CONTEXT code_context line 171).

---

## Metadata

**Analog search scope:**
- `src/components/` (14 files)
- `src/context/` (2 files — AuthContext, LanguageContext)
- `src/services/` (5 files — focus: PropertyService, AuthService)
- `src/utils/` (4 files — focus: passwordPolicy, parseOobCode, formatPrice, formatTourHeroCount)
- `src/constants.ts` (existing single-file constants module)
- `src/locales/` (en.ts, ru.ts, index.ts)
- `src/screens/` (CreateListingScreen, PropertyDetailsScreen, ProfileScreen — modification targets)
- `__tests__/` (root-level — only App.test.tsx)
- `jest.config.js` + `package.json` (test infra verification)

**Files scanned:** ~30 source files read or greped
**Pattern extraction date:** 2026-04-23
**Research cross-references:**
- CONTEXT.md decisions D-01..D-25 (all 25 locked)
- RESEARCH.md §3.1–§3.10 (patterns + code sketches), §2.1–§2.4 (corrections), §3.8 (test templates)

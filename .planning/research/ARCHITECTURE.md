# Architecture Patterns — M1 Additions to JayTap

**Domain:** React Native 0.84 + New Arch brownfield real-estate app
**Researched:** 2026-04-22
**Confidence:** HIGH for placement decisions that follow the existing `App.tsx` state-machine; MEDIUM for root-cause hypotheses on the bottom-nav bug (must be verified via reproduction)
**Scope:** Five targeted additions — universal keyboard handling, bottom-nav fix, category-driven listing form, role gating (M1 email allowlist → M2 real roles), separate Hospitality section on list screens. All changes must live inside the existing custom navigation state machine documented in `.planning/codebase/ARCHITECTURE.md` — no migration to react-navigation.

---

## Recommended Architecture

High-level: **preserve the `App.tsx` state machine, the nested Context stack, and the `display:none` keep-alive pattern verbatim.** Add three new cross-cutting seams — a `KeyboardProvider` at the top of the provider tree, a pure `useRole()` selector over the existing `AuthContext`, and a `useCategory(propertyType)` domain helper. Extract form sections from `CreateListingScreen.tsx` so category branching is one render-time dispatch, not 20 scattered `if` statements. Render Hospitality as a dedicated `<HospitalitySection>` header rendered before the main `FlatList` (section-before-list pattern), not via `SectionList`.

### Provider Tree (updated)

```
SafeAreaProvider
└── KeyboardProvider                    ← NEW (from react-native-keyboard-controller)
    └── ThemeProvider
        └── LanguageProvider
            └── AuthProvider
                └── AppContent          ← the navigation state machine (unchanged shape)
```

`KeyboardProvider` goes **outside** `ThemeProvider` because it owns native insets / status-bar translucency and those must apply uniformly regardless of theme-switching re-renders. It does **not** need to be inside `AuthProvider` (no auth dependency). Placing it at the root also means it wraps `AppContent` — whose keep-alive children all benefit from a single registered native listener rather than per-screen re-subscription. See [KeyboardProvider docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-provider).

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `KeyboardProvider` (root) | Owns native keyboard listener + shared animated `SharedValue`s; sets `statusBarTranslucent`-like behavior once | Consumed implicitly by `KeyboardAvoidingView` / `KeyboardAwareScrollView` from the same package, in screens that scroll |
| `KeyboardAwareScrollView` (per screen with inputs) | Replaces the outer `ScrollView` on `LoginScreen`, `SignupScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `ChatComposeScreen`, `ChatThreadScreen`, `CreateListingScreen`, `ScheduleViewingScreen`, `AccountSettingsScreen` | Auto-scrolls focused `TextInput` into view |
| `useRole()` hook (new) | Pure selector over `useAuth().user.backendProfile` + the M1 allowlist constant; returns `{ role, isAdmin, isModerator, can(action, resource?) }` | `AuthContext` (read-only) |
| `src/constants/adminAllowlist.ts` (new, M1 only) | Hardcoded lowercase email array + a `isAllowlistedAdmin(email)` helper | `useRole()` |
| `<Gated action="…">` component (new) | Wraps any restricted UI element; renders `null` when `useRole().can(action)` is false | `useRole()` |
| `useCategory(propertyType)` helper (new) | Pure function `propertyType → 'residential' \| 'commercial' \| 'hospitality'` | `src/types/Property.ts` |
| `CreateListingForm/` sub-components (new) | One file per category + shared fields: `BasicInfoSection`, `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `MediaSection`, `VerificationSection` | `CreateListingScreen.tsx` orchestrates which section renders |
| `HospitalitySection` on list screens (new) | Horizontal-scrolling strip of hospitality properties rendered above the primary list | `HomeScreen`, `FavoritesScreen`, `OwnerListingsScreen` |

### Data Flow

**Keyboard flow (new):**
1. Native iOS/Android keyboard notification → `KeyboardProvider` (root)
2. Provider pushes animated values into React via Reanimated `SharedValue`
3. `KeyboardAwareScrollView` on the focused screen reads those values and scrolls the focused `TextInput` into view
4. Because main-stack screens are kept alive under `display: none`, each mounted screen's `KeyboardAwareScrollView` **still receives events but ignores them** (only the focused `TextInput`'s ancestor scrolls). This is safe — the library scopes to focused inputs.

**Role flow (M1 → M2):**
1. `useAuth()` returns the existing `user` object (shape unchanged)
2. `useRole()` derives `role` from, in order of precedence: `user.backendProfile.customClaims?.role` (M2 future), `user.backendProfile.userType === 'admin' ? 'admin' : 'user'` (existing), `isAllowlistedAdmin(user.email) ? 'admin' : 'user'` (M1 override)
3. All call sites consume `const { can, isAdmin } = useRole()` — no direct reads of `backendProfile` anywhere in UI after migration
4. M2 deletes the allowlist file + fallback branch; call sites do not change

**Category flow (listing form):**
1. User taps a chip → `setPropertyType(value)`
2. `useCategory(propertyType)` returns `'residential' | 'commercial' | 'hospitality'`
3. Render dispatch: `{category === 'residential' && <ResidentialSection ... />}` etc.
4. Validation lives in a single `validateByCategory(category, formState)` function that returns `{ valid, errors }` with category-specific required-field logic (Residential: bedrooms/bathrooms/area; Commercial: area; Hospitality: rooms/bathrooms/amenities, no price)
5. Price field: `{category !== 'hospitality' && <PriceInput />}` — hidden for both Rent and Sell toggle when category is hospitality

---

## Answers to the Five Architectural Questions

### 1. Keyboard Handling Placement

**Recommendation:** `KeyboardProvider` at **root** (directly inside `SafeAreaProvider`, outside all domain providers). `KeyboardAwareScrollView` (not `KeyboardAvoidingView`) **per-screen** on every screen that has a `TextInput` inside a scroll view. Do **not** wrap individual inputs.

**Where it lives:** `App.tsx:1-30` — modify only the provider composition block.

**Why root-level provider:**
- `KeyboardProvider` installs a single native listener. Mounting it per-screen in a keep-alive stack where every main-stack screen is simultaneously mounted would mean N listeners competing for the same native event.
- It needs to run before any screen that uses its consumers mounts — with the keep-alive pattern, *every* tab mounts during app startup, so provider placement must precede them.
- The package expects provider-at-root; its `KeyboardAwareScrollView` reads context silently.

**Why `KeyboardAwareScrollView` over `KeyboardAvoidingView`:**
- The existing RN `KeyboardAvoidingView` is primarily iOS-focused and has known behavior discrepancies on Android. [Per the community discussion](https://github.com/react-native-community/discussions-and-proposals/discussions/867), iOS keyboard avoidance via `keyboardLayoutGuide` is the target behavior but RN's built-in doesn't achieve it cross-platform.
- `react-native-keyboard-controller`'s `KeyboardAwareScrollView` delivers identical iOS + Android behavior — a core project constraint (cross-platform parity is explicit in `PROJECT.md` constraints).
- Pain target in `PROJECT.md`: "Keyboard no longer covers inputs on any screen (iOS + Android, universal solution)". `KeyboardAwareScrollView` auto-scrolls the focused `TextInput` into view — this is the "universal" semantic the user wants.

**Known gotchas specific to this codebase:**

| Gotcha | Impact on JayTap | Mitigation |
|--------|------------------|------------|
| Requires `react-native-reanimated` (not currently installed) | Adds one native dep; ~200 KB to bundle | Acceptable; we ship to stores anyway. Reanimated is also useful for the sheet/modal animations later. No alternative gives parity without Reanimated. |
| `KeyboardProvider` takes over status-bar translucency | Our overlays currently use `zIndex: 1000` on auth modals and `SafeAreaView` on login; status-bar behavior may shift | Use the provider's `statusBarTranslucent` prop explicitly — set to `false` to preserve current behavior. Validate on both platforms. |
| `KeyboardAwareScrollView` is JS-backed and uses some deprecated RN APIs under New Arch — has been reported as a perf regressor on a few upgrades | RN 0.84 + `newArchEnabled=true` is exactly the combo flagged as risky | Hold known-good version; add physical-device validation to M1 release checklist. If a regression appears, fall back to `KeyboardAvoidingView` from the same package (identical API, simpler internals). |
| Android `softInputMode` interacts with the keyboard provider | Our `AndroidManifest.xml` likely inherits `adjustResize`. Changing it to `adjustPan` to support the provider's intrinsic animation can surprise existing screens. | The package handles `softInputMode` dynamically; leave manifest at `adjustResize` (RN default). |
| Keep-alive `display:none` screens still receive keyboard show/hide events | Could cause a hidden screen's `onFocus`-driven side effects to fire on keyboard events | We already guard state writes in effects; no observed issue, but worth confirming in `ChatScreen` (has a `TextInput` plus socket) — add to QA checklist. |

**Per-screen adoption order (low risk first):**
1. `LoginScreen`, `SignupScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen` — simple forms, low blast radius
2. `ChatComposeScreen`, `ChatThreadScreen` — message-input UX; check socket interaction
3. `CreateListingScreen` — large scrollable form, biggest win
4. `ScheduleViewingScreen`, `AccountSettingsScreen` — remaining form screens

Refs: [react-native-keyboard-controller](https://github.com/kirillzyusko/react-native-keyboard-controller), [KeyboardProvider docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-provider), [Architecture guide](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/recipes/architecture).

---

### 2. Bottom-Nav Fix Architecture

**This is a reproduction-first problem.** Before choosing a fix, instrument to identify which of the four candidate root causes is the actual one.

**Four candidate root causes (ranked by this codebase's fingerprints):**

**C1 (Highest likelihood): Overlay that left `hideMainStackUnderOverlay` stale / wrong on teardown.**
- Evidence: `App.tsx:508-509` mentions an elaborate `hideMainStackUnderOverlay` toggle (flagged in CONCERNS.md line 32).
- Mechanism: When an overlay (e.g., `PropertyDetailsScreen` at `zIndex: 2` or `RenterListingsScreen` at `zIndex: 3`) closes, if `hideMainStackUnderOverlay` fails to reset, the main stack (and `BottomNavigator`) remain `display: none` → **taps on the nav pass through to nothing.**
- Diagnostic: Add a temporary `console.log('[mainStack] visible=', !hideMainStackUnderOverlay)` at `App.tsx:525` and reproduce. If the log stays `false` after closing an overlay, this is it.

**C2 (High likelihood): Android back handler's 19-dependency `useEffect` captures a stale closure.**
- Evidence: `App.tsx:184-297` effect with 23 deps (per ARCHITECTURE.md:15 and CONCERNS.md:23-27). [BackHandler subscriptions are called in reverse-registration order and a `true` return cancels later ones.](https://reactnative.dev/docs/backhandler)
- Mechanism: Each state change re-registers the listener. On fast taps during re-register windows, an old closure may "swallow" a back press or a tab-tap indirectly. More commonly, a stale closure returns `true` when it should return `false`, making the nav *appear* unresponsive.
- Diagnostic: Log `[back] deps hash=<x>` at effect entry; log `[back] handler called, returning=<y>` inside. If re-registrations are frequent and the handler returns `true` for states the user thinks are popped, this is it.

**C3 (Medium likelihood): Touch-capture / z-index stack bug.**
- Evidence: The app uses absolute-positioned overlays without `pointerEvents="box-none"` on wrapper `View`s. [Known RN issue: absolute-positioned wrapper views capture touches invisibly](https://github.com/facebook/react-native/issues/27333). Auth modals at `zIndex: 1000` (`App.tsx:864`) are the most likely culprit if they render a transparent wrapper across the nav bar.
- Mechanism: An invisible wrapper `View` sitting above `BottomNavigator` absorbs the touch.
- Diagnostic: Temporarily border every absolute-positioned wrapper (`borderColor: 'red'`); reproduce and see which invisible rectangle covers the tab bar.

**C4 (Lower likelihood, but insidious): Keep-alive children retain native refs that stop responding.**
- Evidence: [Touchables stop responding after ~10 min of use](https://github.com/facebook/react-native/issues/36710) is a long-standing RN issue. Keep-alive `display:none` screens retain component instances — including their `TouchableOpacity` refs — indefinitely.
- Mechanism: Over time, a child screen's touchable stops firing `onPress`. `BottomNavigator` itself is not inside the keep-alive stack, but if the "hang" is *not* the nav but the screen above it that's capturing taps, this explains it.
- Diagnostic: Hot-reload the app; does the issue reset? If yes, it's lifecycle-dependent (C1 or C4). If no, it's configuration-driven (C3).

**Recommended diagnostic approach (order matters):**

1. **Instrument `hideMainStackUnderOverlay`** — single-liner log at the render site. Reproduce the bug. If this is the cause, fix is a 2-line change (derive the value rather than store it in state).
2. **If C1 clears, log the back-handler effect.** If stale-closure, refactor to the ref-pattern (see below).
3. **If C1 + C2 clear, add transparent borders to all `position: 'absolute'` wrappers.** Reproduce.
4. **If all above clear, instrument touchable `onPressIn` / `onPressOut` on `BottomNavigator`.** Compare timestamps to isolate C4.

**Recommended fix for C1 (most likely):** Replace the `hideMainStackUnderOverlay` state variable with a **derived** boolean computed from the other show-flags — eliminates the "forgot to reset" class of bug entirely.

```typescript
// Derived, not stored
const hideMainStackUnderOverlay =
  selectedProperty != null ||
  isRenterListingsOpen ||
  isCreateListingOpen ||
  isTour3DOpen;
```

**Recommended fix for C2:** Use the ref-pattern from the stale-closure literature. Attach the `BackHandler` listener **once** at mount; the listener reads the current state via a ref that's kept in sync via a separate `useEffect`:

```typescript
const stateRef = useRef({ showHome, showProfile, /* ... */ });
useEffect(() => { stateRef.current = { showHome, showProfile, /* ... */ }; });
useEffect(() => {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    const s = stateRef.current;
    // ...priority stack logic reads s.*
    return /* true | false */;
  });
  return () => sub.remove();
}, []); // empty deps — listener attached once
```

[This is the canonical pattern for avoiding stale closures in hooks.](https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/)

**Recommended fix for C3:** Add `pointerEvents="box-none"` to every absolute-positioned wrapper `View` that is meant to show its children but not receive taps itself.

**Recommended fix for C4:** Set `removeClippedSubviews={true}` on the outer `FlatList` in `HomeScreen` + keep the keep-alive pattern but add an upper-bound: unmount keep-alive screens after N minutes backgrounded, or on app foreground after a long absence.

**Do not propose:** Migrating to react-navigation. Out of scope per PROJECT.md constraints and `.planning/codebase/CONCERNS.md` explicit rejection.

Refs: [RN touch events in nested absolute views](https://github.com/facebook/react-native/issues/27333), [Touchables stop responding after idle time](https://github.com/facebook/react-native/issues/36710), [BackHandler docs](https://reactnative.dev/docs/backhandler), [How to fix stale closures](https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/).

---

### 3. Listing Form Conditional Rendering

**Recommendation: sub-component composition inside the existing `CreateListingScreen.tsx`.** One screen, one form state, one submit handler — with three category-specific section components plus shared sections. Do **not** split into three screens. Do **not** adopt a schema-driven form engine (overkill for M1; adds `zod` + form library + JSON-schema runtime).

**Why composition over full schema-driven:**
- Current screen is 1300 lines (flagged in CONCERNS.md:40). Adding 20 more `if` statements inline makes it worse. Extracting by section is already the recommended remediation in CONCERNS.md:42.
- A schema-driven engine with [Zod + React Hook Form](https://keyholesoftware.com/inferring-fields-zod-with-react-hook-form/) would require two new deps and a one-time learning curve for what is a brownfield ship-ASAP milestone.
- Category count is small and stable (3). Field-set branching is easily expressed in TypeScript with discriminated unions.

**Why composition over category-per-screen:**
- Category-per-screen would require 3 new screens wired into the `App.tsx` state machine. That adds exactly what PROJECT.md/CONCERNS.md warn against — more booleans in `AppContent`.
- Users may change their minds about category mid-form; splitting screens forces lossy state transitions.

**File layout (new):**

```
src/screens/CreateListingScreen.tsx              # orchestrator only, shrinks dramatically
src/components/CreateListingForm/
  BasicInfoSection.tsx        # category chip group + title + address — always shown
  ResidentialSection.tsx      # bedrooms, bathrooms, area
  CommercialSection.tsx       # area only
  HospitalitySection.tsx      # rooms, bathrooms, amenities (NO price)
  MediaSection.tsx            # images — always shown
  VerificationSection.tsx     # Matterport URL + panoramic URL — admin-gated (see Q4)
  PriceSection.tsx            # hidden when category === 'hospitality'
  index.ts                    # barrel (first and only barrel in src/components/, justified)
  validators.ts               # validateByCategory(category, state) → { valid, errors }
src/utils/propertyCategory.ts
  export type PropertyCategory = 'residential' | 'commercial' | 'hospitality';
  export const useCategory = (propertyType: string): PropertyCategory => { ... };
  export const PROPERTY_TYPE_TO_CATEGORY: Record<string, PropertyCategory> = {
    Apartment: 'residential', House: 'residential', Townhome: 'residential', Condo: 'residential',
    Office: 'commercial', Retail: 'commercial', Warehouse: 'commercial', Industrial: 'commercial',
    Hostel: 'hospitality', Hotel: 'hospitality',
  };
```

**Orchestrator shape (pseudocode):**

```typescript
// CreateListingScreen.tsx — after refactor
const category = useCategory(propertyType); // 'residential' | 'commercial' | 'hospitality'

return (
  <KeyboardAwareScrollView>
    <BasicInfoSection {...basicInfoProps} />

    {category === 'residential' && <ResidentialSection {...residentialProps} />}
    {category === 'commercial'  && <CommercialSection  {...commercialProps} />}
    {category === 'hospitality' && <HospitalitySection {...hospitalityProps} />}

    {category !== 'hospitality' && <PriceSection {...priceProps} />}

    <MediaSection {...mediaProps} />

    <Gated action="editVerifications">
      <VerificationSection {...verificationProps} />
    </Gated>
  </KeyboardAwareScrollView>
);
```

**Form state shape (single source of truth):** Keep the existing `useState` pattern (no Formik / react-hook-form introduction). Use a flat state object; section components receive the slice they need plus setters. This matches `.planning/codebase/CONVENTIONS.md` (no form library; local `useState` everywhere).

**Validation:** Single function `validateByCategory(category, state)` called in `handleSubmit`. Table of required fields:

| Category | Required Fields | Hidden Fields |
|----------|-----------------|---------------|
| Residential | bedrooms, bathrooms, area | — |
| Commercial  | area | bedrooms, bathrooms |
| Hospitality | rooms, bathrooms, amenities | price (both rent and sell), bedrooms |

**Types:** Extend `src/types/Property.ts`:
```typescript
export type PropertyCategory = 'residential' | 'commercial' | 'hospitality';
// Existing Property.propertyType stays a string (preserves backend compat);
// category is derived, not stored, unless backend wants it stored for query efficiency.
```

**Anti-patterns to avoid (this codebase specifically):**
- Do NOT add a new Context for form state. `useState` in the screen is the convention.
- Do NOT introduce `zod` or `react-hook-form` for M1. Validation stays inline per-screen (matches LoginScreen / SignupScreen pattern).
- Do NOT render all three category sections with CSS hiding — unmount on category change. Mounted-but-hidden inputs would validate against stale values.
- Do NOT store `category` in component state — derive via `useCategory(propertyType)` every render. Single source of truth = `propertyType`.

Refs: [Schema-driven form engine in RN](https://the-expert-developer.medium.com/build-a-schema-driven-form-engine-in-react-native-%EF%B8%8F-2025-dynamic-uis-conditional-logic-f45631998dac), [Conditional fields with React Hook Form](https://devmarvels.com/creating-conditional-form-fields-with-react-hook-form-and-typescript/). (We reviewed these and chose simpler approach for M1 scope.)

---

### 4. Role Gating Architecture

**Recommendation: context-derived selector + declarative component guard.** All admin checks go through `useRole()` and `<Gated action="…">`. Both M1 (email allowlist) and M2 (real roles) populate the same selector. Call sites remain identical.

**Where it lives:**
- `src/context/RoleContext.tsx` — **NOT a new Context.** Implement as a pure hook `useRole()` that reads from `useAuth()`. No provider needed.
  - File path: `src/hooks/useRole.ts` (create `src/hooks/` directory — aligns with `src/utils/` pattern)
- `src/constants/adminAllowlist.ts` — M1-only: hardcoded lowercase email array + helper
- `src/components/Gated.tsx` — declarative UI guard

**Key design: `can(action, resource?)` instead of `hasRole('admin')` at call sites.**

Call sites don't know *why* an action is restricted — only whether the current user can perform it. This is the M1→M2 forward-compat lynchpin:

```typescript
// BAD (couples call site to M1 implementation):
if (isAdmin || isAllowlistedAdmin(user?.email)) { ... }

// GOOD (call site doesn't change when M2 ships):
const { can } = useRole();
if (can('editVerifications')) { ... }
```

**useRole() shape:**

```typescript
// src/hooks/useRole.ts
import { useAuth } from '../context/AuthContext';
import { isAllowlistedAdmin } from '../constants/adminAllowlist';

export type Role = 'admin' | 'moderator' | 'user' | 'guest';
export type Action =
  | 'editVerifications'        // admin only
  | 'editMatterportUrl'        // admin only (M1 email gate, M2 admin role)
  | 'editPanoramicUrl'         // admin only (M1 email gate, M2 admin role)
  | 'editAnyListing'           // M2: moderator + admin; M1: listing owner only (unused)
  | 'approveListings'          // M2: moderator + admin; M1: unused
  | 'promoteToModerator'       // M2: admin only; M1: unused
  ;

export function useRole() {
  const { user } = useAuth();

  // Priority: M2 custom claim → existing userType → M1 email allowlist → guest
  const role: Role =
    user?.backendProfile?.customClaims?.role          // M2 (not yet populated, returns undefined)
    ?? (user?.backendProfile?.userType === 'admin' ? 'admin' : undefined)  // existing
    ?? (user?.email && isAllowlistedAdmin(user.email) ? 'admin' : undefined) // M1
    ?? (user ? 'user' : 'guest');

  const can = (action: Action): boolean => {
    switch (action) {
      case 'editVerifications':
      case 'editMatterportUrl':
      case 'editPanoramicUrl':
        return role === 'admin';
      case 'editAnyListing':
      case 'approveListings':
        return role === 'admin' || role === 'moderator';
      case 'promoteToModerator':
        return role === 'admin';
      default:
        return false;
    }
  };

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isAuthenticated: role !== 'guest',
    can,
  };
}
```

**M1 implementation — email allowlist:**

```typescript
// src/constants/adminAllowlist.ts
// M1 ONLY — remove in M2 when real roles ship. See PROJECT.md key decisions.
const ALLOWLIST = [
  'beckprograms@gmail.com',
  // Add admin emails here. Editing requires a code change + store release.
] as const;

export const isAllowlistedAdmin = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return ALLOWLIST.includes(email.toLowerCase().trim() as typeof ALLOWLIST[number]);
};
```

**`<Gated>` component:**

```typescript
// src/components/Gated.tsx
export const Gated: React.FC<{ action: Action; fallback?: ReactNode; children: ReactNode }> =
  ({ action, fallback = null, children }) => {
    const { can } = useRole();
    return <>{can(action) ? children : fallback}</>;
  };
```

**Call-site migration (M1):**

```typescript
// BEFORE (existing, scattered in 3 files):
// src/screens/PropertyDetailsScreen.tsx:178
const isAdmin = user?.backendProfile?.userType === 'admin';
// src/screens/CreateListingScreen.tsx:110
const isAdmin = user?.backendProfile?.userType === 'admin';
// src/screens/ProfileScreen.tsx:33
const canManageListings = userType === 'renter' || userType === 'admin';

// AFTER:
const { can, isAdmin, isAuthenticated } = useRole();
// and in JSX:
<Gated action="editVerifications"><VerificationSection /></Gated>
```

**Where guards belong — three layers, all three should exist:**

| Layer | Purpose | M1 scope |
|-------|---------|----------|
| **UI (`<Gated>` component)** | Hide restricted affordances | Yes — MatterportUrl + PanoramicUrl inputs + admin verification section |
| **Service (axios interceptor)** | Reject restricted API calls client-side before they're attempted | Optional M1 (nice to have). Wrap `patchPlatformVerifications` with `if (!useRole().can('editVerifications')) throw new Error('...')`. |
| **Backend** | Trustworthy enforcement | Out of scope M1 per PROJECT.md Out-of-Scope. M2 scope per PROJECT.md Milestone 2. |

**Don't add service-level axios interceptor gating in M1.** The current service pattern is object-literal methods that don't compose with a shared interceptor elegantly. M2 roles work (which must refactor services to use `idToken` bearer — see CONCERNS.md:146) is the right time to add this layer.

**M1 → M2 forward-compat checklist:**

- [ ] `useRole()` shape is identical in M1 and M2. Only its internals change.
- [ ] All call sites use `can(action)` — not `isAdmin` — for gating logic. `isAdmin` stays exposed for informational UI (e.g., "Admin" badge in profile).
- [ ] The M1 `adminAllowlist.ts` is the **only** new file that gets deleted in M2.
- [ ] `Action` union is forward-compat: M2 adds actions without touching existing ones.
- [ ] No call site reads `user.backendProfile.userType` directly after migration. Grep this invariant.

**Anti-patterns to avoid:**
- Do NOT create a new Context (`RoleProvider`). Role is a pure derivative of `AuthContext.user` — a hook suffices. Adding a Provider adds a re-render dependency and doesn't change any call-site behavior.
- Do NOT hardcode role comparisons (`userType === 'admin'`) at call sites. Always use `can(action)`.
- Do NOT use `isAdmin` in conditional rendering when `<Gated action="…">` applies — `<Gated>` is declarative and makes "what's gated" greppable.
- Do NOT use email checks directly at call sites. The allowlist is an implementation detail of `useRole()`.

Refs: [RBAC in React — complete guide](https://www.rohitnandi.com/blog/rbac-react), [Implementing RBAC in React/Node](https://www.permit.io/blog/implementing-react-rbac-authorization), [hasAccess hook patterns (gist)](https://gist.github.com/Bonny-kato/3f6ef42c68324a16a463c182d9d3b81a).

---

### 5. Separate Hospitality Section on List Screens

**Recommendation: dedicated `<HospitalitySection>` component rendered as the `ListHeaderComponent` of the existing vertical `FlatList`, with its own *horizontal* `FlatList` inside.** Not `SectionList`. Not a separate tab.

**Structure on `HomeScreen`, `FavoritesScreen`, `OwnerListingsScreen`:**

```
[Search bar / filters (existing header)]
[HospitalitySection]                      ← NEW
  - Horizontal FlatList of hospitality properties
  - "Hostels & Hotels" section title
  - Hidden when empty
[Vertical FlatList of non-hospitality properties]  ← existing, now filtered
```

**Why not `SectionList`:**
- The hospitality items render **differently** (different PropertyCard variant, tour-first, no price). `SectionList` assumes homogeneous cell rendering per section — achievable but awkward.
- The non-hospitality list continues to need flat vertical scrolling with existing filters, pagination (when added), and empty states. Keeping it as `FlatList` minimizes refactor.
- Horizontal carousel inside a `SectionList` [requires nested data structures](https://gist.github.com/robinheinze/19c4500b22a0c01d359f560d17612258) that break `FlatList` virtualization benefits.

**Why not a separate tab:**
- Discoverability: users browsing Bishkek properties want to see "hostels exist" without a tab hop. PROJECT.md requirement: "Hospitality listings render in a separate section on Home / Favorites / OwnerListings (not mixed with residential/commercial)" — *separate section*, not separate tab.
- Adding a 6th `BottomNavigator` tab would cascade through the navigation state machine.

**Why `ListHeaderComponent` pattern:**
- `FlatList.ListHeaderComponent` is virtualization-safe — it only renders once, above the virtualized window, and handles scroll coherently.
- Keeps a single scroll container on the screen (critical for UX — separate ScrollViews cause the "two scrolls competing" problem on mobile).

**Component shape:**

```typescript
// src/components/HospitalitySection.tsx
interface Props {
  properties: Property[];  // Pre-filtered to hospitality category
  onSelectProperty: (p: Property) => void;
  onFavorite?: (p: Property) => void;
}

export const HospitalitySection: React.FC<Props> = ({ properties, onSelectProperty, onFavorite }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  if (properties.length === 0) return null; // Hide section when empty

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.hospitalitySection')}
      </Text>
      <FlatList
        data={properties}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <HospitalityCard property={item} onPress={onSelectProperty} onFavorite={onFavorite} />
        )}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
};
```

**Call-site integration (HomeScreen):**

```typescript
// Derived lists via useMemo
const hospitalityProperties = useMemo(
  () => filteredProperties.filter(p => useCategory(p.propertyType) === 'hospitality'),
  [filteredProperties]
);
const primaryProperties = useMemo(
  () => filteredProperties.filter(p => useCategory(p.propertyType) !== 'hospitality'),
  [filteredProperties]
);

<FlatList
  data={primaryProperties}
  renderItem={({ item }) => <PropertyCard property={item} ... />}
  ListHeaderComponent={
    <HospitalitySection
      properties={hospitalityProperties}
      onSelectProperty={setSelectedProperty}
    />
  }
/>
```

**`HospitalityCard` — new component:**
- Variant of `PropertyCard` with: horizontal layout, tour-first hero (emphasizes Matterport/panoramic), no price, rooms-and-amenities line instead of bedrooms-and-bathrooms.
- File: `src/components/HospitalityCard.tsx`.
- Consumes existing `TourHeroCard` for 3D tour surfacing — aligns with PROJECT.md requirement "surfacing 3D tours and panoramic media" for hospitality.

**Filter behavior:**
- Rent/Sell toggle applies to both sections. Hospitality listings exist under both per PROJECT.md decision (owner can rent rooms or sell the whole hostel). Neither view shows a price.
- Property-type chip filter (when user selects e.g. "Hotel" specifically): collapse to show only the hospitality section; hide the primary list.

**i18n keys to add:**
- `home.hospitalitySection` — "Hostels & Hotels" / "Хостелы и Отели"
- `hospitalityCard.rooms`, `hospitalityCard.amenities`

**Anti-patterns to avoid:**
- Do NOT nest a vertical FlatList inside a vertical ScrollView — kills virtualization and produces the yellow-box warning.
- Do NOT use `SectionList` here — the renderer divergence between hospitality and non-hospitality cells doesn't fit the model.
- Do NOT render an empty "Hospitality" heading when there are no hospitality properties — return `null` early. Empty sections are visual noise.
- Do NOT fetch hospitality properties in a separate API call. The existing `/api/properties` endpoint returns all; filter client-side. (Consistent with current pattern per CONCERNS.md:193 — server-side pagination is a later concern.)

Refs: [FlatList vs SectionList](https://medium.com/@akashsoni181035/understanding-flatlist-and-sectionlist-in-react-native-830ed929774c), [Horizontal FlatList inside SectionList (pattern we rejected)](http://ashokmadduru.blogspot.com/2019/03/horizontal-flatlist-inside-sectionlist.html), [RN SectionList docs](https://reactnative.dev/docs/sectionlist).

---

## Patterns to Follow

### Pattern 1: Derive, Don't Store (for transient UI state)

**What:** State that can be computed from other state should be computed via `useMemo`, not stored via `useState`.
**When:** Anytime you catch yourself writing `setFoo(...)` in multiple places to "keep foo in sync" with some other state.
**Example (applied to `hideMainStackUnderOverlay`):**
```typescript
// BAD (current code):
const [hideMainStackUnderOverlay, setHideMainStackUnderOverlay] = useState(false);
// ... set it in 6 different effects ...

// GOOD:
const hideMainStackUnderOverlay = useMemo(
  () => selectedProperty != null || isRenterListingsOpen || isCreateListingOpen || isTour3DOpen,
  [selectedProperty, isRenterListingsOpen, isCreateListingOpen, isTour3DOpen]
);
```

### Pattern 2: Hook over Context for Derived Values

**What:** If a piece of "context-like" state is a pure function of existing contexts, expose it as a hook, not a new Provider.
**When:** New cross-cutting concern that reads from existing providers only.
**Example:** `useRole()` — doesn't need its own Provider because it's a selector over `useAuth()`.

### Pattern 3: Declarative Guards

**What:** Use components like `<Gated action="…">` to hide restricted UI, not `&&` conditionals in JSX.
**When:** Permission-based UI show/hide.
**Why:** Greppable — `rg "<Gated" src/` lists every gated UI in the app. Conditional `isAdmin &&` calls are lost in noise.

### Pattern 4: Keep Keep-Alive, But Add Escape Valves

**What:** The existing keep-alive (`display:none`) pattern is correct for tab-like screens. For overlay screens (`PropertyDetailsScreen`, `CreateListingScreen`, `Tour3DScreen`), **unmount on close** by leaving them off `tabEverMounted`.
**When:** Any new screen.
**Why:** Keep-alive has O(N) memory growth with screens. Only apply to the 5 main-stack tabs.

---

## Anti-Patterns to Avoid (This Codebase Specifically)

### Anti-Pattern 1: "Let's just migrate to react-navigation"
**Why bad:** PROJECT.md explicitly out of scope. Weeks of work for a polish release. Every anti-pattern in CONCERNS.md that recommends react-navigation is flagged as a *future* recommendation, not an M1 change.
**Instead:** Refactor within the state-machine pattern — derive values, refactor back handler to ref-pattern, consolidate hide flags.

### Anti-Pattern 2: Add a new Context for every new cross-cutting concern
**Why bad:** Already 3 nested Contexts. Each Provider subscribes all descendants to its value; adding providers has real perf cost and re-renders under the keep-alive model.
**Instead:** Hook composition. `useRole()` doesn't need a Provider. `useCategory(propertyType)` is a pure function. Only `KeyboardProvider` is truly required (installs a native listener).

### Anti-Pattern 3: Introduce a form library mid-milestone
**Why bad:** `react-hook-form` + `zod` are excellent but add ~100 KB and a new mental model to a brownfield codebase that's shipping in days. CONVENTIONS.md doesn't mention either — they'd be the first.
**Instead:** Sub-component decomposition with existing `useState`. Revisit in M2 or M3 when listing form matures.

### Anti-Pattern 4: Touch the `App.tsx` state machine to add new overlays
**Why bad:** Every new boolean flag makes the back-handler and `hideMainStackUnderOverlay` bugs worse.
**Instead:** For M1, don't add any new overlay screens. If M1 requires a new full-screen flow (it doesn't), use an existing overlay pattern unchanged — do not invent a new one.

### Anti-Pattern 5: Hide form sections with CSS instead of unmounting
**Why bad:** Hidden inputs retain refs, validation, and focus listeners. Submitting with a hidden bedrooms field that's "2" for a hospitality listing would silently persist the stale value.
**Instead:** Conditional unmount (`{category === 'residential' && <ResidentialSection />}`). RN garbage-collects the component.

### Anti-Pattern 6: Hardcode email lists in call sites
**Why bad:** Two M1 bugs waiting to happen: case-sensitivity and whitespace. Also violates the M1→M2 forward-compat contract.
**Instead:** Single `isAllowlistedAdmin(email)` helper with normalization. Call sites use `useRole().can(action)` only.

### Anti-Pattern 7: Nest a vertical FlatList inside a vertical ScrollView
**Why bad:** Loses virtualization; produces the yellow-box warning; hurts perf on low-end Android.
**Instead:** `ListHeaderComponent` for section content above the main list.

---

## Build Order Implications

**Critical insight: keyboard fix and bottom-nav fix must ship *before* the listing form overhaul.**

Reason: The overhauled `CreateListingScreen` is the biggest consumer of both. If category branching lands first and then we discover the keyboard handler has regressions on that screen, we've conflated two change sets.

**Recommended phase order for M1:**

1. **Phase: Bug-fix foundation** (keyboard + bottom-nav + stale-closure back handler)
   - Root-cause bottom-nav (C1/C2/C3/C4 diagnosis first)
   - Install `react-native-reanimated` + `react-native-keyboard-controller`, wire `KeyboardProvider` at root
   - Fix `hideMainStackUnderOverlay` → derived (if C1)
   - Refactor back-handler to ref-pattern (if C2)
   - Verify on physical iOS + Android
2. **Phase: Role primitive** (`useRole()`, `<Gated>`, allowlist file, migrate existing 3 call sites)
   - Zero user-visible change; sets up forward-compat for M2
   - Cheap and unblocks phase 3's admin-gated fields
3. **Phase: Listing form overhaul** (category concept, sub-component decomposition, Hospitality, remove Land)
   - Uses the new keyboard handler (`KeyboardAwareScrollView`)
   - Uses `<Gated action="editVerifications">` for Matterport + panoramic URL inputs
4. **Phase: Hospitality section on list screens + PropertyDetails adaptation**
   - `<HospitalitySection>` on Home / Favorites / OwnerListings
   - PropertyDetailsScreen: conditional price rendering for hospitality
5. **Phase: Release prep** (version bumps, manual device validation, store submission)

Phases 2 and 3 can overlap — phase 2 is small and doesn't block phase 3 from starting, but phase 3's `VerificationSection` wants phase 2 complete.

**Per-phase research flags:**

| Phase | Research Flag | Reason |
|-------|--------------|--------|
| Phase 1 (bug-fix) | HIGH | Bottom-nav root cause is unknown; `react-native-keyboard-controller` under New Arch needs version verification (MEDIUM confidence on "it just works") |
| Phase 2 (roles) | LOW | Pure React hook pattern; well-understood |
| Phase 3 (listing form) | MEDIUM | Category branching is straightforward; i18n key fan-out deserves a pass |
| Phase 4 (hospitality section) | LOW | Standard `FlatList` pattern |
| Phase 5 (release) | MEDIUM | CONCERNS.md calls out version/build doc drift, privacy manifest gaps, manifest permissions — must triage before submission |

---

## Scalability Considerations

| Concern | At 10 hospitality listings | At 100 hospitality listings | At 1000 hospitality listings |
|---------|---------------------------|----------------------------|------------------------------|
| Home list horizontal scroll | Works — render all | Works — horizontal `FlatList` virtualizes | Works — virtualization handles; add `initialNumToRender={5}` |
| `useCategory()` filter on every render | O(N) on filtered list — negligible | Add `useMemo` with `filteredProperties` dep | Already using `useMemo`; server-side `?category=hospitality` query preferable |
| `<Gated>` re-evaluation | Per-render, trivial | Same | Same |

None of these reach problematic scale in M1. Server-side filtering is a CONCERNS.md item for a later milestone.

---

## Confidence Assessment

| Area | Confidence | Why |
|------|------------|-----|
| Keyboard provider placement (root, above ThemeProvider) | HIGH | Multiple official docs agree; package is explicit about provider-at-root |
| `react-native-keyboard-controller` over built-in KAV | HIGH | Cross-platform parity is the user's explicit ask; alternatives fail that bar |
| Bottom-nav C1 (stale `hideMainStackUnderOverlay`) being root cause | MEDIUM | Matches codebase symptoms exactly, but must be verified by reproduction |
| Sub-component decomposition over schema-driven forms | HIGH | Scope/timeline arguments are definitive for M1; pattern matches existing codebase |
| `useRole()` as hook, not Provider | HIGH | Canonical React pattern; Provider adds no value here |
| M1→M2 forward compat via `can(action)` | HIGH | Well-established RBAC pattern; no M2 call-site churn if discipline holds |
| `ListHeaderComponent` horizontal FlatList for Hospitality | HIGH | Standard RN pattern; `SectionList` ill-fit due to heterogeneous cells |

---

## Sources

- [react-native-keyboard-controller (GitHub)](https://github.com/kirillzyusko/react-native-keyboard-controller)
- [KeyboardProvider docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-provider)
- [Keyboard Controller Architecture guide](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/recipes/architecture)
- [Mastering Keyboard Handling in React Native (Medium)](https://medium.com/@shreyasdamase/mastering-keyboard-handling-in-react-native-a-complete-guide-to-react-native-keyboard-controller-451438bdc1f0)
- [RN BackHandler docs](https://reactnative.dev/docs/backhandler)
- [RN touch events in nested absolute views (Issue #27333)](https://github.com/facebook/react-native/issues/27333)
- [Touchables stop responding (Issue #36710)](https://github.com/facebook/react-native/issues/36710)
- [How to fix stale closures in React hooks](https://coreui.io/answers/how-to-fix-stale-closures-in-react-hooks/)
- [Build a Schema-Driven Form Engine in React Native (considered, rejected for M1)](https://the-expert-developer.medium.com/build-a-schema-driven-form-engine-in-react-native-%EF%B8%8F-2025-dynamic-uis-conditional-logic-f45631998dac)
- [Conditional Form Fields with React Hook Form (considered, rejected for M1)](https://devmarvels.com/creating-conditional-form-fields-with-react-hook-form-and-typescript/)
- [Implementing RBAC in React — Complete Guide](https://www.rohitnandi.com/blog/rbac-react)
- [RBAC and React Apps (Auth0)](https://github.com/auth0-blog/react-rbac)
- [hasAccess hook patterns (Gist)](https://gist.github.com/Bonny-kato/3f6ef42c68324a16a463c182d9d3b81a)
- [RN SectionList docs](https://reactnative.dev/docs/sectionlist)
- [FlatList vs SectionList (Medium)](https://medium.com/@akashsoni181035/understanding-flatlist-and-sectionlist-in-react-native-830ed929774c)
- [Horizontal FlatList inside SectionList (pattern considered, rejected)](https://gist.github.com/robinheinze/19c4500b22a0c01d359f560d17612258)

---

*Research scope: Project / Architecture dimension — 2026-04-22*

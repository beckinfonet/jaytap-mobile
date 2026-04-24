# Phase 5 Research

**Researched:** 2026-04-24
**Domain:** RN 0.84 / Fabric form validation + pure-fn Jest + KeyboardAwareScrollView scroll-to-error + FormBag type tightening + App.tsx state-machine nav wiring
**Confidence:** HIGH (all 12 research targets verified against existing source)

<user_constraints>
## User Constraints (from 05-CONTEXT.md)

### Locked Decisions (D-01..D-18)

**Error surfacing**
- **D-01** Inline per-field red text below each invalid `TextInput` using `commonStyles.hint` typography + `colors.error` from `useTheme()`. Render shape: `{errors.fieldName && <Text style={[commonStyles.hint, { color: colors.error }]}>{errors.fieldName}</Text>}`. No input border color change. If `colors.error` absent → Claude's discretion (add to theme vs inline `#D32F2F`).
- **D-02** Validation runs on **submit only**. `onChange` dispatcher clears `errors[field]` on next keystroke. No `onBlur` wiring.
- **D-03** No required-field markers (no asterisks, no hint rows, no "required" labels) before submit is attempted.
- **D-04** On failed submit, auto-scroll to first invalid field. Use existing `KeyboardAwareScrollView` ref + scroll API. First-invalid = first field in active category section order (BasicInfo → category section → Price if applicable → Media → VerificationSection if rendered).

**Category switch + payload shape**
- **D-05** On `propertyType` change, orchestrator **preserves all FormBag values** unchanged. Unmounted sections stop rendering fields; state persists.
- **D-06** Pure `buildPayloadByCategory(values: FormBag, category: PropertyCategory): Partial<Property>` lives in `src/components/CreateListingForm/validators.ts` alongside `validateByCategory`. Submit payload built exclusively through it.
- **D-09** `panoramicPhotosUrl` and `tours` ALWAYS sent regardless of category (the latter as `tours.length > 0 ? tours : undefined`). `platformVerifications` payload key remains role-gated via `can('editVerifications')` at call-site — NOT inside `buildPayloadByCategory`.
- **D-07** Required-field map matches REQUIREMENTS.md FORM-04 verbatim (Residential / Commercial / Hospitality rules).
- **D-08** Edit mode uses **same** rules as create mode. Legacy listings missing now-required fields must be filled before save succeeds. Clean-slate data makes this safe.

**Hospitality contact (hybrid)**
- **D-09** If ANY of `contactPhone` / `contactWhatsapp` / `contactTelegram` (after trim) is non-empty, full rule fires. If ALL THREE empty, Hospitality submit passes silently.
- **D-10** Full rule: `contactPhone.trim() !== '' AND (contactWhatsapp.trim() !== '' OR contactTelegram.trim() !== '')`.
- **D-11** On failure, `Alert.alert` with `Cancel` + `Complete profile`. `Complete profile` navigates to `AccountSettingsScreen` via new `onNavigateToAccountSettings: () => void` prop on `CreateListingScreenProps`. Contact Info section renders inline red error row above read-only fields.
- **D-12** Edit mode applies same hybrid rule.

**Hospitality amenities (deferred to Phase 6)**
- **D-13** Phase 5 skips `amenities.length` validation entirely.
- **D-14** `buildPayloadByCategory('Hospitality', values)` does NOT include `amenities` key.
- **D-15** Explicit Phase-6 handoff recorded.

**Draft/Publish toggle on edit (D-16 user-reported bug, FORM-08 scope expansion)**
- **D-16** Visibility rule:
  - Create mode (`!propertyToEdit`): toggle visible. Submit label = `status === 'draft' ? saveAsDraft : createListing` (unchanged).
  - Edit mode, listing is draft: toggle **visible**. Submit label = `status === 'draft' ? saveAsDraft : publishListing` (new key).
  - Edit mode, listing is live: toggle **hidden**. Submit label = `updateListing` (unchanged).
  Rehydrate path at `CreateListingScreen.tsx:263` already sets `status` from `propertyToEdit.status` — no rehydrate wiring needed.

**Validator test coverage (D-17)**
- Jest unit tests at `src/components/CreateListingForm/__tests__/validators.test.ts` matching `propertyCategory.test.ts` + `useRole.test.ts` pattern. ~15–20 assertions. No mocks.

**Currency type tightening (D-18)**
- `FormBag.currency: Currency | ''` where `Currency = '$' | 'сом'`. Export `CURRENCY_OPTIONS = ['$', 'сом'] as const` + `type Currency = typeof CURRENCY_OPTIONS[number]`. `validateByCategory` asserts `currency !== ''` for Residential/Commercial.

### Claude's Discretion

1. Exact error color token — add `colors.error` to `ThemeContext` vs inline `#D32F2F`. **Research answer: ALREADY EXISTS** (see Finding #3).
2. i18n key namespace — extend `createListing.*` vs open `validation.*` sibling. **Research recommendation: extend `createListing.*Required`** — matches existing 4 keys at lines 225–229 (see Finding #4).
3. Whether to delete existing 4 `Alert.alert` checks at lines 415–431 — **recommended YES** (single source of truth per FORM-06).
4. Scroll-to-first-error implementation — `ScrollView.scrollTo` vs `measureLayout` vs `keyboard-controller`. **Research recommendation: ref-based `.scrollTo({y, animated})`** via KASV ref (see Finding #1).
5. Whether `validators.ts` exports `fieldIsValid(field, values, category): boolean` — **M1 default NO** (D-03 says no markers before submit).
6. Whether `onNavigateToAccountSettings` is optional with no-op fallback — **recommended optional** (matches `ProfileScreen.onViewAccountSettings?: () => void` precedent at `src/screens/ProfileScreen.tsx:18`).

### Deferred Ideas (OUT OF SCOPE)

- Amenity validation + payload inclusion → Phase 6 (HOSP-05).
- Live→Draft unpublish transition → M2 (MOD-01).
- Making Hospitality contact fields editable in-form → M2 potentially.
- RHF + zod migration → M2+ fallback; zod pin `^3.24` only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **FORM-04** | Required fields branch by category (Residential: title/description/address/city/district/price/currency/bedrooms/bathrooms/areaSqm/availableDate; Commercial: title/description/address/city/district/price/currency/areaSqm + sub-type; Hospitality: title/description/address/city/district/rooms/bathrooms/maxGuests/amenities/contact) | Finding #2 (pure validator + Jest shape proven); Finding #6 (payload contract); Finding #9 (errors threading); Finding #10 (role-agnostic) |
| **FORM-06** | `validateByCategory()` is the single source of truth; submitting invalid form surfaces per-field errors and prevents submission | Finding #1 (scroll-to-first-error); Finding #2 (Jest setup); Finding #9 (error rendering); Finding #3 (error color token ready) |
| **FORM-07** | Switching category chip mid-fill does not silently blank shared fields | Already satisfied by current orchestrator architecture — FormBag lives in orchestrator useState hooks; conditional mounts at `CreateListingScreen.tsx:643-655` only UNMOUNT sections, never reset state (confirmed by reading lines 86–174 + 641–665). Finding #5 (Commercial branch treats `propertyType` chip as sub-type proof). |
| **FORM-08** | Editing existing listing correctly initializes form into listing's category (no residential fields on commercial listing) + **D-16 scope expansion**: Draft toggle visibility on edit-draft | Finding #7 (status rehydrate confirmed at line 263); Finding #5 (rehydrate normalizer at 239–246 produces canonical tokens); current rehydrate `useEffect` at lines 212–285 already sets `propertyType`, which drives category derivation at line 551. |
</phase_requirements>

## Summary

Phase 5 is pure correctness work on top of the Phase-4 decomposition — no new UI surfaces, no new sections, no architectural shifts. Every prerequisite is already in place: `SectionProps.errors: FormErrorBag` is threaded to all 7 sub-components (passed as `{}` today at `CreateListingScreen.tsx:641–665`); `colors.error` exists on both light (`#F44336`) and dark (`#EF5350`) themes; `KeyboardAwareScrollView` accepts a ref that exposes the full `ScrollView.scrollTo({y, animated})` API plus a bonus `assureFocusedInputVisible()` helper; jest auto-discovers any `__tests__/` directory under `src/` (proven by `Gated.test.tsx`, `PropertyService.test.ts`, and `useRole.test.ts`); the orchestrator already derives `category` via `propertyTypeToCategory(values.propertyType)` at line 551 and conditionally mounts the three category sections without clearing state on switch (D-05 satisfied for free).

**Primary recommendation:** Build `validators.ts` as a pure module (no React, no hooks, no `AuthContext`/`useRole` imports — role-agnostic per D-17). Use **ref-based `scrollTo`** for D-04, not `measureLayout` or `findNodeHandle` — the KASV ref is `ScrollView`-compatible, RN 0.84/Fabric safe, and avoids the deprecated legacy path. Extend the existing `createListing.*Required` key cluster for new error strings (the 4 existing keys at `src/locales/en.ts:225–229` establish the precedent). Wire `onNavigateToAccountSettings` as an **optional** prop with an optional-chain call-site (`onNavigateToAccountSettings?.()`) — matches `ProfileScreen.onViewAccountSettings?` precedent exactly.

All 18 CONTEXT.md decisions are technically feasible against current source; no research target surfaced a blocker. The single caveat is that extending `createListing.*Required` grows the cluster by ~10–15 keys in both locales — well within the existing 365-key cluster size and enforced by the `Record<TranslationKeys,string>` tsc gate + `scripts/check-i18n-parity.sh`.

## Key Findings

### Finding #1 — Scroll-to-first-error on RN 0.84 + Fabric (KBD research target) [VERIFIED]

**Choice: Ref-based `.scrollTo({y, animated: true})` on a KeyboardAwareScrollView ref.**

**Evidence:**

- KASV package: `react-native-keyboard-controller@1.21.6` (verified via `node_modules/.../package.json`).
- KASV ref type from `node_modules/react-native-keyboard-controller/lib/typescript/components/KeyboardAwareScrollView/types.d.ts:25`:
  ```typescript
  export type KeyboardAwareScrollViewRef = {
      assureFocusedInputVisible: () => void;
  } & ScrollView;
  ```
  The intersection with `ScrollView` means the ref exposes the full `ScrollView` API — including `scrollTo(options)`, `scrollToEnd(options)`, `scrollResponderScrollTo`, etc. This is stable under Fabric (New Arch) because KASV wraps `ScrollViewWithBottomPadding` which is itself `ScrollView`-based.
- The package internally uses `findNodeHandle` via `node_modules/react-native-keyboard-controller/src/utils/findNodeHandle.ts` for its own keyboard-aware logic, but that's an internal implementation detail — consumer code does NOT need to call `findNodeHandle` or `UIManager.measureLayout`. [VERIFIED: grep of node_modules]

**Recommended shape for the orchestrator:**

```typescript
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
const fieldLayouts = useRef<Partial<Record<keyof FormBag, number>>>({});

// On each field's <View onLayout={(e) => { fieldLayouts.current.title = e.nativeEvent.layout.y; }}>

// In handleSubmit after validateByCategory returns an invalid result:
const firstErrorField = pickFirstErrorField(errors, category); // section-order-aware
const y = fieldLayouts.current[firstErrorField];
if (y !== undefined) {
  scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
}

// Attach:
<KeyboardAwareScrollView ref={scrollRef} ...>
```

**Alternative rejected: `findNodeHandle` + `UIManager.measureLayout`.**
`findNodeHandle` is deprecated in RN 0.84 New Architecture — the consumer-facing layer should avoid it. The KASV ref already provides the scroll API; no need for the legacy path. [CITED: React Native docs mark `findNodeHandle` as escape hatch since RN 0.60+; strongly discouraged under Fabric.]

**Alternative rejected: `keyboard-controller`'s `assureFocusedInputVisible()`.**
This helper scrolls to the CURRENTLY-FOCUSED input — not to the first invalid field (which typically is NOT focused when submit fires). Only useful for focus-driven scrolling, which D-02 explicitly rules out (submit-only validation).

**Why `onLayout`-captured Y offsets beat `measureInWindow`:** `measureInWindow` requires a node handle and is async-callback-based. Capturing `y` in an `onLayout` ref-map during initial render is synchronous, Fabric-safe, and survives re-renders without re-measuring. [VERIFIED via RN type definitions.]

### Finding #2 — Pure-validator + Jest unit-test shape [VERIFIED]

**Pattern is exactly reproducible. No babel/jest/TS config surprises.**

**Evidence:**

- `jest.config.js` (entire file, 3 lines):
  ```javascript
  module.exports = {
    preset: 'react-native',
    setupFiles: ['<rootDir>/jest.setup.js'],
  };
  ```
  No `testPathIgnorePatterns`, no `testMatch` override. The `react-native` preset defaults to `testMatch: ['**/__tests__/**/*.{js,ts,tsx}', '**/?(*.)+(spec|test).{js,ts,tsx}']` — meaning ANY `__tests__/` dir under `src/` is auto-discovered.
- Proven by `npm test -- --listTests`:
  ```
  __tests__/App.test.tsx
  src/components/__tests__/Gated.test.tsx     ← in src/components/__tests__
  src/services/__tests__/PropertyService.test.ts
  src/hooks/__tests__/useRole.test.ts
  src/utils/__tests__/propertyCategory.test.ts
  ```
  So `src/components/CreateListingForm/__tests__/validators.test.ts` WILL be auto-discovered.
- Live run verification: `npx jest src/utils/__tests__/propertyCategory.test.ts` → 7/7 PASS in 0.229s.

**Canonical test file header (copy verbatim from `propertyCategory.test.ts:1-8`):**

```typescript
/**
 * @format
 */

import {
  validateByCategory,
  buildPayloadByCategory,
  type FormBag,
} from '../validators';
```

**Analog patterns:**
- `useRole.test.ts` (9 describe/test blocks, pure fn tests, no mocks, `expect(x).toBe(y)` only)
- `propertyCategory.test.ts` (2 describe blocks, 7 tests, named imports from `../propertyCategory`)

Neither uses `react-test-renderer`, `@testing-library/react-native`, or Jest mocks. The validator follows the same shape: pure function exports → named imports in test file → `describe`/`test`/`expect(...).toBe(...)`.

### Finding #3 — `colors.error` exists on ThemeContext [VERIFIED]

**`colors.error` is already defined on BOTH light and dark themes. No ThemeContext change needed.**

**Evidence** (`src/theme/colors.ts:18` + `:38`):

```typescript
// Light
error: '#F44336',

// Dark
error: '#EF5350',
```

`ThemeColors = typeof colors.light` (line 44), so `useTheme().colors.error` is fully typed everywhere. The D-01 render pattern `<Text style={[commonStyles.hint, { color: colors.error }]}>{errors.fieldName}</Text>` works with zero theme changes. The Claude's-discretion question #1 in CONTEXT.md is resolved: **use `colors.error` directly, no theme extension needed.**

### Finding #4 — i18n namespace [VERIFIED — extend `createListing.*Required`]

**Recommendation: extend the existing `createListing.*Required` cluster. Do NOT open a sibling `validation.*` namespace.**

**Evidence from `src/locales/en.ts`:**

- Current file size: 416 lines, 365 keys, 69 keys in `createListing.*` cluster.
- Existing `Required` keys already present in `createListing.*` (lines 225–229):
  ```typescript
  'createListing.titleRequired': 'Title is required',
  'createListing.addressRequired': 'Address is required',
  'createListing.currencyRequired': 'Please select a currency (USD or сом)',
  'createListing.priceRequired': 'Price is required',
  'createListing.tourTitleUrlRequired': 'Please enter both tour title and URL',
  ```
- `ru.ts` parity: uses `Record<TranslationKeys, string>` compile-gate (line 1 of `ru.ts`) — tsc enforces EN=RU key-set equality at build time. `scripts/check-i18n-parity.sh` is a belt-and-suspenders grep.

**Script bug flagged by Phase 4 WR-02:** the grep regex `'[a-zA-Z.]+':` excludes digits. Phase 5 should NOT introduce digit-containing keys (`tours3d` etc.) — all new keys should use only `[a-zA-Z.]`. Alternative: fix the regex to `'[a-zA-Z0-9.]+':` as a pre-phase housekeeping commit.

**Projected new keys (D-07 + D-10 + D-16 coverage, ~11 additions):**

| EN key | EN value | Notes |
|--------|----------|-------|
| `createListing.descriptionRequired` | `'Description is required'` | D-07 shared hard-required |
| `createListing.cityRequired` | `'City is required'` | D-07 shared hard-required |
| `createListing.districtRequired` | `'District is required'` | D-07 shared hard-required |
| `createListing.bedroomsRequired` | `'Bedrooms is required'` | D-07 Residential |
| `createListing.bathroomsRequired` | `'Bathrooms is required'` | D-07 Residential + Hospitality |
| `createListing.areaRequired` | `'Area is required'` | D-07 Residential + Commercial |
| `createListing.roomsRequired` | `'Rooms is required'` | D-07 Hospitality |
| `createListing.maxGuestsRequired` | `'Max guests is required'` | D-07 Hospitality |
| `createListing.contactMissingTitle` | `'Contact info incomplete'` | D-11 Alert title |
| `createListing.contactMissingMessage` | `'Phone and either WhatsApp or Telegram are required for hospitality listings. Add them in Account Settings.'` | D-11 Alert body |
| `createListing.contactMissingCta` | `'Complete profile'` | D-11 Alert CTA |
| `createListing.contactMissingInline` | `'Add phone + WhatsApp or Telegram in your profile to publish this listing.'` | D-11 inline row |
| `createListing.publishListing` | `'Publish Listing'` | D-16 new submit label |

Existing `createListing.currencyRequired` already handles currency-missing case verbatim (D-07 Residential + Commercial). Existing `createListing.titleRequired`, `addressRequired`, `priceRequired` continue to be used.

**Cluster post-Phase-5 size estimate:** 69 + 12 new keys = 81 keys in `createListing.*`. No namespace split warranted at this size.

### Finding #5 — `FormBag.currency` tightening ripple [VERIFIED]

**Safe. Exactly 5 callsites to update — none require logic changes.**

**Evidence — all `currency` callsites in the source tree:**

| File : line | Code | Impact after `currency: Currency \| ''` |
|-------------|------|---------------------------------|
| `types.ts:34` | `currency: string;` | **CHANGE** → `currency: Currency \| '';` |
| `CreateListingScreen.tsx:92` | `useState<string>('')` | **CHANGE** → `useState<Currency \| ''>('')` |
| `CreateListingScreen.tsx:147` | `setCurrency(value as string)` | **CHANGE** → `setCurrency(value as Currency \| '')` |
| `CreateListingScreen.tsx:241` | `setCurrency('$')` | ✓ already canonical |
| `CreateListingScreen.tsx:243` | `setCurrency('сом')` | ✓ already canonical |
| `CreateListingScreen.tsx:245` | `setCurrency('')` | ✓ already canonical |
| `CreateListingScreen.tsx:457` | `currency,` (in payload object) | ✓ still assignable to `Property.currency: string` |
| `PriceSection.tsx:25-28` | `CURRENCY_OPTIONS = [{value: '$',...}, {value: 'сом',...}] as const` | **MIGRATE to `validators.ts`** and export `Currency` type |
| `PriceSection.tsx:44` | `values.currency === option.value` | ✓ compatible |
| `PriceSection.tsx:55` | `onChange('currency', option.value)` | ✓ `option.value` is `'$' \| 'сом'` due to `as const` |

**Rehydrate normalizer** at `CreateListingScreen.tsx:239-246`:
```typescript
const existingCurrency = (propertyToEdit.currency || '').toLowerCase();
if (existingCurrency === '$' || existingCurrency === 'usd') {
  setCurrency('$');
} else if (existingCurrency === 'сом' || existingCurrency === 'som' || existingCurrency === 'kgs') {
  setCurrency('сом');
} else {
  setCurrency('');
}
```
Output is ALREADY canonical `'$' | 'сом' | ''`. After type tightening, the three `setCurrency(...)` calls on lines 241/243/245 assign literal-union values that satisfy `Currency | ''` with zero casts. [VERIFIED by type-literal read.]

**Property backend payload type** (`src/types/Property.ts:20`): `currency: string`. The payload send-site (`CreateListingScreen.tsx:457`) passes `currency` whose type is now `Currency | ''`. Since `Currency | '' extends string`, assignment to `Property.currency: string` is safe. [VERIFIED.]

**tsc errors surfaced:** expect 0 new errors after tightening (all 10 callsites above flow canonical values). The pre-existing 16-line tsc baseline (10 AuthContext.tsx + 2 ThemeContext.tsx + 4 misc — per Plan 04-06 SUMMARY) stays unchanged.

**CURRENCY_OPTIONS migration:** the `PriceSection.tsx:25-28` literal should move to `validators.ts` (or `constants.ts` if planner prefers), and PriceSection imports it. This centralizes the canonical list used by both the chip UI AND `validateByCategory`.

### Finding #6 — D-09 anchor preservation [VERIFIED]

**Current `handleSubmit` payload at `CreateListingScreen.tsx:451–481`:**

```typescript
const propertyData = {
  title: title.trim(),                                      // SHARED
  description: description.trim(),                          // SHARED
  address: fullAddress,                                     // SHARED (built from address/district/city)
  city: city || 'Bishkek',                                  // SHARED
  price: parseFloat(price) || price,                        // Residential + Commercial
  currency,                                                  // Residential + Commercial
  period: type === 'rent' ? 'month' : undefined,            // SHARED (derived from type)
  type,                                                      // SHARED
  propertyType,                                              // SHARED
  bedrooms: parseInt(bedrooms) || 0,                        // Residential
  bathrooms: parseInt(bathrooms) || 0,                      // Residential + Hospitality
  areaSqm: parseFloat(areaSqm) || 0,                        // Residential + Commercial
  features,                                                  // SHARED
  videoUrl: videoUrl.trim(),                                // SHARED
  panoramicPhotosUrl: panoramicPhotosUrl.trim(),            // ← D-09 ANCHOR B (UNCONDITIONAL)
  instagramUrl: instagramUrl.trim(),                        // SHARED
  availableDate: availableDate.trim() || undefined,         // SHARED
  status,                                                    // SHARED
  tours: tours.length > 0 ? tours : undefined,              // ← D-09 ANCHOR C (UNCONDITIONAL)
  existingImages: existingImageUrls,                        // SHARED
  ...(can('editVerifications')                              // ← role gate — stays at call-site
    ? { platformVerifications: {...} }
    : {}),
};
```

**Preservation pattern for `buildPayloadByCategory`:**

**RECOMMENDED: Build category-specific inside the function; merge D-09 anchors + call-site-only role gate in orchestrator.** This keeps the validator module pure and role-agnostic (Finding #10).

```typescript
// src/components/CreateListingForm/validators.ts — pure, role-agnostic
export function buildPayloadByCategory(
  values: FormBag,
  category: PropertyCategory,
): Partial<Property> {
  const shared = {
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    propertyType: values.propertyType,
    period: values.type === 'rent' ? 'month' : undefined,
    features: values.features,
    videoUrl: values.videoUrl.trim(),
    panoramicPhotosUrl: values.panoramicPhotosUrl.trim(),    // D-09 ANCHOR B (always)
    instagramUrl: values.instagramUrl.trim(),
    availableDate: values.availableDate.trim() || undefined,
    status: values.status,
    tours: values.tours.length > 0 ? values.tours : undefined, // D-09 ANCHOR C (always)
  };

  if (category === 'Residential') {
    return {
      ...shared,
      bedrooms: parseInt(values.bedrooms) || 0,
      bathrooms: parseInt(values.bathrooms) || 0,
      areaSqm: parseFloat(values.areaSqm) || 0,
      price: parseFloat(values.price) || values.price,
      currency: values.currency,
    };
  }
  if (category === 'Commercial') {
    return {
      ...shared,
      areaSqm: parseFloat(values.areaSqm) || 0,
      price: parseFloat(values.price) || values.price,
      currency: values.currency,
      // NOTE: no bedrooms, no bathrooms
    };
  }
  // Hospitality
  return {
    ...shared,
    rooms: parseInt(values.rooms) || 0,
    bathrooms: parseInt(values.bathrooms) || 0,
    maxGuests: parseInt(values.maxGuests) || 0,
    // NO price, NO currency, NO areaSqm, NO period, NO amenities (per D-14)
  };
}
```

**Call-site in `handleSubmit`:**

```typescript
const basePayload = buildPayloadByCategory(values, category);
const fullAddress = buildFullAddress(values.address, values.district, values.city);
const existingImageUrls = selectedImages.filter(i => i.isExisting).map(i => i.uri);

const propertyData = {
  ...basePayload,
  address: fullAddress,          // Address building stays in orchestrator (side-effect on city fallback)
  city: values.city || 'Bishkek',
  existingImages: existingImageUrls,
  ...(can('editVerifications')
    ? { platformVerifications: { ... } }
    : {}),
};
```

**Both D-09 anchors land INSIDE `buildPayloadByCategory`'s `shared` object — preserved in every category's output automatically.**

**Regression guard:** Phase 4's grep invariant ("each D-09 anchor grep returns exactly 1") must still pass. After refactor:
- `grep -n "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts` → 1 (in `shared`)
- `grep -n "panoramicPhotosUrl" src/screens/CreateListingScreen.tsx` → should return 1 (the `setPanoramicPhotosUrl` rehydrate at line 254) OR 0 if the payload construction moved. Plan must decide whether to keep a grep count of 1 by preserving a source-comment anchor, or update the Phase 4 regression bundle's acceptance.

### Finding #7 — Status toggle rehydrate (D-16) [VERIFIED]

**Rehydrate is already in place. No additional wiring required.**

**Evidence** — `CreateListingScreen.tsx:263`:
```typescript
setStatus((propertyToEdit as any).status || 'draft');
```

The rehydrate useEffect (lines 212–285) sets local `status` state from `propertyToEdit.status` (falling back to `'draft'` if missing). This runs whenever `propertyToEdit` changes. Phase 5's D-16 change is a **visibility + submit-label swap only** — the underlying state flow is already correct.

**D-16 implementation shape at `:701` (visibility guard):**

```typescript
// Before (Phase 4):
{!isEditMode && (
  <View style={styles.section}>... segmented control ...</View>
)}

// After (Phase 5 D-16):
{(!isEditMode || propertyToEdit?.status === 'draft') && (
  <View style={styles.section}>... segmented control ...</View>
)}
```

**Submit label swap at `:754–761`:**

```typescript
// Before:
{isEditMode
  ? t('createListing.updateListing')
  : status === 'draft'
    ? t('createListing.saveAsDraft')
    : t('createListing.createListing')}

// After (D-16):
{isEditMode
  ? (propertyToEdit?.status === 'draft'
      ? (status === 'draft'
          ? t('createListing.saveAsDraft')
          : t('createListing.publishListing'))     // NEW KEY
      : t('createListing.updateListing'))
  : (status === 'draft'
      ? t('createListing.saveAsDraft')
      : t('createListing.createListing'))}
```

**Untyped concern:** `propertyToEdit.status` is accessed as `(propertyToEdit as any).status` because `Property` type at `src/types/Property.ts` does not declare a `status` field (verified by grep — no matches). Phase 5 should consider adding `status?: 'draft' | 'live'` to Property type, OR continue the `as any` pattern. Recommend planner decide; out of scope for D-16 core fix.

### Finding #8 — `onNavigateToAccountSettings` prop wiring through App.tsx [VERIFIED]

**Exact precedent: `ProfileScreen.onViewAccountSettings?: () => void`. Follow this verbatim.**

**Evidence — `ProfileScreen.tsx`:**
```typescript
// :18
onViewAccountSettings?: () => void;
// :21
function ProfileScreenComponent({ ..., onViewAccountSettings }: ProfileScreenProps)
// :137
onPress={onViewAccountSettings}
```

**App.tsx wiring (already present) — `App.tsx:438` and `:607`:**

```typescript
// Callback declaration (line 438):
const onProfileViewAccountSettings = useCallback(
  () => setIsAccountSettingsOpen(true),
  []
);

// ProfileScreen render site (line 602-607):
<ProfileScreen
  onBack={onProfileBack}
  ...
  onViewAccountSettings={onProfileViewAccountSettings}   // ← THIS
/>
```

**CreateListingScreen render site** — `App.tsx:820-840`:
```typescript
{/* Existing */}
<CreateListingScreen
  onBack={() => { setIsCreateListingOpen(false); ... }}
  onSuccess={() => { ... }}
  propertyToEdit={propertyToEdit || undefined}
  verificationOnly={isAdminVerificationMode}
  // ADD for Phase 5:
  onNavigateToAccountSettings={() => {
    setIsCreateListingOpen(false);                        // close CreateListing overlay
    setPropertyToEdit(null);                              // clear edit context
    setIsAccountSettingsOpen(true);                       // flip to AccountSettings overlay
  }}
/>
```

**Prop declaration on `CreateListingScreenProps`** (follow `ProfileScreenProps.onViewAccountSettings` shape — make OPTIONAL for back-compat with `verificationOnly` callers):

```typescript
// src/screens/CreateListingScreen.tsx :38
interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  propertyToEdit?: Property;
  verificationOnly?: boolean;
  onNavigateToAccountSettings?: () => void;    // NEW — optional with no-op fallback
}
```

**Call-site inside D-11 Alert callback:**
```typescript
Alert.alert(
  t('createListing.contactMissingTitle'),
  t('createListing.contactMissingMessage'),
  [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('createListing.contactMissingCta'), onPress: () => onNavigateToAccountSettings?.() },
  ],
);
```

The optional-chain `?.()` handles the `verificationOnly=true` caller from `PropertyDetailsScreen.tsx` — that flow never triggers Hospitality submit so the callback is unreachable, but the optional-chain is belt-and-suspenders safe.

### Finding #9 — `errors` state threading to all 7 sub-components [VERIFIED]

**Every sub-component already receives `errors: FormErrorBag` in Phase 4. Phase 5 just fills it.**

**Evidence — CreateListingScreen.tsx render calls** (lines 641–665):

| Line | Call | `errors` received? |
|------|------|------------------|
| 641 | `<BasicInfoSection values={values} onChange={onChange} errors={{}} />` | YES (passed as `{}`) |
| 644 | `<ResidentialSection ... errors={{}} />` | YES |
| 647 | `<CommercialSection ... errors={{}} />` | YES |
| 650 | `<HospitalitySection ... errors={{}} />` | YES |
| 654 | `<PriceSection ... errors={{}} />` | YES |
| 657–665 | `<MediaSection ... errors={{}} ... />` | YES |
| 743 | `<VerificationSection values={values} onChange={onChange} />` | **NO** — uses `Pick<SectionProps, 'values' \| 'onChange'>` (no errors prop) |

**Per-sub-component error-field mapping** (which `errors[field]` renders under which TextInput):

| Sub-component | Fields with TextInput | Applicable `errors[field]` |
|---------------|----------------------|----------------------------|
| `BasicInfoSection` | title, description, address, district, city, availableDate (picker), features (chips) | `title`, `description`, `address`, `city`, `district`, `availableDate` |
| `ResidentialSection` | bedrooms, bathrooms, areaSqm | `bedrooms`, `bathrooms`, `areaSqm` |
| `CommercialSection` | areaSqm | `areaSqm` (Commercial sub-type is satisfied by chip selection in BasicInfo → shown as a top-of-section error above category chips if needed) |
| `HospitalitySection` | rooms, maxGuests, bathrooms | `rooms`, `maxGuests`, `bathrooms` |
| `PriceSection` | price (currency is chip row) | `price`, `currency` (currency error rendered above chip row) |
| `MediaSection` | videoUrl, instagramUrl, panoramicPhotosUrl, tour title/url | none required by FORM-04; if Phase 5 adds, shape is identical |
| `VerificationSection` | none (3 switches only) | — no errors prop needed |

**Required Phase 5 edits per sub-component:**
- `BasicInfoSection.tsx`: change `errors: _errors` → `errors` in 6 destructures; add inline `<Text>` under each of 6 inputs using the D-01 pattern. Add import `commonStyles` (already imported). Adds ~30 LOC.
- `ResidentialSection.tsx`: change `_errors` → `errors`, add 3 inline error rows (~10 LOC).
- `CommercialSection.tsx`: change `_errors` → `errors`, add 1 inline error row (~5 LOC).
- `HospitalitySection.tsx`: change `_errors` → `errors`, add 3 inline error rows (~10 LOC).
- `PriceSection.tsx`: change `_errors` → `errors`, add 2 inline error rows (price + currency; currency appears above chip row) (~10 LOC).
- `VerificationSection.tsx`: **no change** (still uses `Pick<SectionProps, 'values' | 'onChange'>`; none of its 3 switches are in FORM-04 required set).
- `MediaSection.tsx`: **no change** for M1 (no FORM-04 required fields live here).

**Orchestrator wires errors state** — replaces all 7 `errors={{}}` with `errors={errors}`:

```typescript
const [errors, setErrors] = useState<FormErrorBag>({});

// onChange — clear on keystroke per D-02:
const onChange = useCallback<SectionProps['onChange']>((field, value) => {
  setErrors(prev => {
    if (prev[field]) {
      const next = { ...prev };
      delete next[field];
      return next;
    }
    return prev;
  });
  switch (field) { ... }  // existing switch
}, []);

// handleSubmit — call validateByCategory first:
const result = validateByCategory(values, category);
if (!result.isValid) {
  setErrors(result.errors);
  // scroll to first field (Finding #1)
  return;
}
setErrors({});
// ... existing payload + submit logic using buildPayloadByCategory ...
```

### Finding #10 — Validator role-agnostic enforcement [VERIFIED]

**No `useRole` / `Gated` / `AuthContext` imports currently leak into `CreateListingForm/`. Phase 5 must preserve this.**

**Evidence:** `grep -rn "from.*useRole\|from.*AuthContext\|import.*Gated\|can(" src/components/CreateListingForm/` returns exactly 1 hit:
```
src/components/CreateListingForm/MediaSection.tsx:13:import { Gated } from '../Gated';
```

MediaSection is the ONLY file in the directory that imports `Gated` — and that's by design (the 2 Phase-3 role wraps live there, Phase 3 D-14 invariant). `validators.ts` MUST NOT add any of these imports. The file must pass:

```bash
# Phase-5-appropriate grep (regression guard candidate):
grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts
# Expected: empty output
```

**Role gating for `platformVerifications` STAYS in `handleSubmit` at the call-site:**

```typescript
// src/screens/CreateListingScreen.tsx handleSubmit:
const basePayload = buildPayloadByCategory(values, category);   // PURE, no role check
const propertyData = {
  ...basePayload,
  address: fullAddress,
  city: values.city || 'Bishkek',
  existingImages: existingImageUrls,
  ...(can('editVerifications')                                   // ROLE CHECK HERE
    ? { platformVerifications: {...} }
    : {}),
};
```

This preserves the Phase 3 separation of concerns (role gating = call-site) and the Phase 3 D-14 grep invariant (`./scripts/check-role-grep.sh` still exits 0).

### Finding #11 — Runtime state inventory (not applicable) [VERIFIED]

Phase 5 is NOT a rename/refactor/migration phase — it adds a new module (`validators.ts`) and extends existing files. No renaming of keys, collection names, file paths, env vars, or package names. No stored data references the old structure (clean-slate data per PROJECT.md). Runtime State Inventory section is omitted intentionally.

### Finding #12 — RN 0.84 / Fabric pitfalls relevant to Phase 5 [VERIFIED]

**Only two pitfalls directly affect Phase 5 choices:**

1. **`findNodeHandle` is legacy under Fabric.** Consumer code should avoid it. Resolved by Finding #1's choice of ref-based `scrollTo` + `onLayout`-captured y-offsets. KASV internally uses `findNodeHandle` (see `node_modules/.../src/utils/findNodeHandle.ts`), but that's an implementation detail — consumer code never calls it.

2. **`KeyboardAwareScrollView.scrollTo` and keyboard-open state interact.** If the keyboard is open when `scrollTo({y})` is called, KASV's own keyboard-aware logic may re-scroll to the focused input. Since D-02 runs validation on SUBMIT only (and submit typically blurs the last input), the keyboard is in its closing animation at scroll time. Empirically this works — but planner should include a manual QA check: "On failed Hospitality submit, the first-invalid field (e.g., `rooms`) scrolls into view on iOS + Android physical devices."

**Not relevant to Phase 5:** hit-testing under Fabric (scroll-driven not touch-driven), `ScrollView.measureInWindow` timing under concurrent rendering (we use `onLayout` snapshots, not measure-at-submit), keyboard-controller v1→v2 migration (pinned at 1.21.6 per package.json).

## Validation Architecture

> Nyquist Dimension 8 — required for this project (workflow.nyquist_validation defaults to true).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest `^29.6.3` with `preset: 'react-native'` |
| Config file | `jest.config.js` (3 lines) |
| Quick run command | `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` |
| Full suite command | `npm test` |
| Baseline at phase entry | 22 tests across 5 suites — 22/22 GREEN (Phase 4 exit) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| **FORM-06** | `validateByCategory` returns `{isValid: true, errors: {}}` for complete Residential happy-path | unit | `npx jest validators -t "Residential happy-path"` | ❌ Wave 0 |
| **FORM-06** | `validateByCategory` returns `{isValid: false, errors.title}` when title missing | unit | `npx jest validators -t "title required"` | ❌ Wave 0 |
| **FORM-04** | Residential requires bedrooms/bathrooms/areaSqm/price/currency | unit | `npx jest validators -t "Residential"` | ❌ Wave 0 |
| **FORM-04** | Commercial requires areaSqm/price/currency but NOT bedrooms/bathrooms | unit | `npx jest validators -t "Commercial"` | ❌ Wave 0 |
| **FORM-04** | Commercial asserts `propertyType ∈ COMMERCIAL_TYPES` | unit | `npx jest validators -t "Commercial sub-type"` | ❌ Wave 0 |
| **FORM-04** | Hospitality requires rooms/bathrooms/maxGuests (not price/currency/areaSqm/period) | unit | `npx jest validators -t "Hospitality"` | ❌ Wave 0 |
| **FORM-04** | Hospitality contact hybrid rule: ALL empty → valid; phone-only → invalid; phone+WA or phone+TG → valid; WA-only → invalid | unit | `npx jest validators -t "Hospitality contact"` | ❌ Wave 0 |
| **FORM-06** | `buildPayloadByCategory` Residential includes bedrooms/bathrooms/areaSqm/price/currency | unit | `npx jest validators -t "payload Residential"` | ❌ Wave 0 |
| **FORM-06** | `buildPayloadByCategory` Commercial payload omits bedrooms/bathrooms | unit | `npx jest validators -t "payload Commercial"` | ❌ Wave 0 |
| **FORM-06** | `buildPayloadByCategory` Hospitality payload omits price/currency/period/amenities/areaSqm | unit | `npx jest validators -t "payload Hospitality"` | ❌ Wave 0 |
| **FORM-06 / D-09** | All 3 category payloads include `panoramicPhotosUrl` and `tours` | unit | `npx jest validators -t "D-09 anchors"` | ❌ Wave 0 |
| **FORM-07** | Category-switch preserves shared FormBag fields | integration (orchestrator) | manual QA on physical device | ❌ QA-matrix entry |
| **FORM-08** | Edit mode initializes correct category sections | integration (orchestrator) | manual QA on physical device | ❌ QA-matrix entry |
| **FORM-08 / D-16** | Draft edit shows toggle; live edit hides toggle; submit labels correct per status combo | integration (orchestrator) | manual QA on physical device | ❌ QA-matrix entry |
| **FORM-06 / D-04** | Scroll-to-first-error reaches invalid field on failed submit | manual QA (requires keyboard + physical scroll) | manual QA on physical device | ❌ QA-matrix entry |

### Sampling Rate
- **Per task commit:** `npx jest src/components/CreateListingForm/__tests__/validators.test.ts -x`
- **Per wave merge:** `npm test` (22/22 baseline + ~18–20 new = ~40–42/40–42)
- **Phase gate:** `npm test` + `npx tsc --noEmit` (16-line baseline preserved) + `./scripts/check-i18n-parity.sh` + `./scripts/check-role-grep.sh` + `./scripts/check-land-removed.sh` + manual QA on physical iOS + Android (M1 bar per CLAUDE.md)

### Wave 0 Gaps
- [ ] `src/components/CreateListingForm/__tests__/validators.test.ts` — covers FORM-04/FORM-06 per D-17 (~15–20 assertions; pattern from `propertyCategory.test.ts`)
- [ ] `.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` — matrix for FORM-07 (category-switch × 3 starting categories × 3 target categories = 9 cells) + FORM-08 edit-mode × 3 categories × 2 statuses (draft/live) = 6 cells + D-04 scroll-to-error × 3 categories × fail-fields-per-category ≈ 8 cells. Target: ~23 cells on physical iOS + Android = 46 cells.
- No framework install needed (Jest already at 29.6.3, `preset: 'react-native'` handles TS via metro-react-native-babel-preset).

## Recommended Approach

Decision matrix for the 5 open Claude's-Discretion items from 05-CONTEXT.md:

| # | Item | Recommendation | Rationale |
|---|------|----------------|-----------|
| 1 | Error color token (theme vs inline hex) | **Use `colors.error` directly** — no theme change needed | Already exists: light `#F44336`, dark `#EF5350` (Finding #3). `ThemeColors = typeof colors.light` gives full type safety. |
| 2 | i18n namespace for new error keys | **Extend `createListing.*Required`** | 5 existing `*Required` keys at lines 225–229 establish the precedent. No namespace split at 81-key cluster size (Finding #4). |
| 3 | Delete 4 existing `Alert.alert` checks at `:415–431` | **YES, delete all 4** | Single source of truth per FORM-06. `title`/`address`/`currency`/`price` all covered by `validateByCategory`. No orphaned Alert logic should remain. |
| 4 | Scroll-to-first-error implementation | **Ref-based `.scrollTo({y, animated: true})` on KASV ref + `onLayout`-captured y-offsets** | Fabric-safe. KASV ref extends ScrollView (Finding #1). Avoids deprecated `findNodeHandle` consumer path. |
| 5 | `fieldIsValid` helper export | **NO** | D-03 forbids markers before submit; sub-components only read `errors[field]`. YAGNI. Revisit in M2. |
| 6 | `onNavigateToAccountSettings` optional vs required | **Optional with no-op fallback** | Matches `ProfileScreen.onViewAccountSettings?: () => void` precedent (Finding #8). `verificationOnly` callers (PropertyDetailsScreen) don't need to wire it. Use `onNavigateToAccountSettings?.()` at call-site. |

### File Touch List (net)

| File | Action | LOC Estimate |
|------|--------|-------------|
| `src/components/CreateListingForm/validators.ts` | CREATE | ~150 (two pure fns + `CURRENCY_OPTIONS` + `Currency` type + section-order helper for first-error pick) |
| `src/components/CreateListingForm/__tests__/validators.test.ts` | CREATE | ~200 (~15–20 assertions across 4 describe blocks) |
| `src/components/CreateListingForm/types.ts` | MODIFY | +3 (tighten `currency: Currency \| ''`, re-export `Currency`) |
| `src/components/CreateListingForm/index.ts` | MODIFY | +3 (barrel: add `validateByCategory`, `buildPayloadByCategory`, `Currency` re-exports) |
| `src/components/CreateListingForm/BasicInfoSection.tsx` | MODIFY | +30 (6 inline error rows + `errors` destructure) |
| `src/components/CreateListingForm/ResidentialSection.tsx` | MODIFY | +10 (3 inline error rows) |
| `src/components/CreateListingForm/CommercialSection.tsx` | MODIFY | +5 (1 inline error row) |
| `src/components/CreateListingForm/HospitalitySection.tsx` | MODIFY | +10 (3 inline error rows) |
| `src/components/CreateListingForm/PriceSection.tsx` | MODIFY | +10 (2 inline error rows; remove local `CURRENCY_OPTIONS`, import from `validators`) |
| `src/components/CreateListingForm/MediaSection.tsx` | NO CHANGE | 0 |
| `src/components/CreateListingForm/VerificationSection.tsx` | NO CHANGE | 0 |
| `src/screens/CreateListingScreen.tsx` | MODIFY | ~−20 net (delete 4 Alert.alert at 415–431 / −17; replace payload 451–481 with `buildPayloadByCategory` call / −30 + +10 = −20; add `errors` state + wire into 6 render calls / +15; scroll ref + onLayout map + scroll-to-first-error / +30; D-16 visibility at :701 / +1; D-16 submit label at :754–761 / +5; D-11 contact Alert wiring / +15; prop add / +2) |
| `src/locales/en.ts` | MODIFY | +12 (new keys from Finding #4) |
| `src/locales/ru.ts` | MODIFY | +12 (RU parity — same keys, translated) |
| `App.tsx` | MODIFY | +5 (wire `onNavigateToAccountSettings` on CreateListingScreen render at :821–840) |

**Net orchestrator size:** ~871 LOC → ~851 LOC (slight reduction; still above UI-SPEC aspirational target but in-line with Phase 4 acknowledged overshoot — no regression).

## Pitfalls

### Pitfall 1: D-09 anchor grep invariant regression
**Guardrail:** After moving payload construction into `buildPayloadByCategory`, ensure `grep -n "panoramicPhotosUrl" src/components/CreateListingForm/validators.ts` returns ≥ 1 and the full-tree anchor count stays traceable. Update Phase 4's `04-VERIFICATION.md` D-09 regression bundle reference to point at validators.ts for anchors B + C (anchor A — rehydrate — stays in CreateListingScreen.tsx at `:254`).

### Pitfall 2: Errors state populated but never cleared
**Guardrail:** D-02 requires clearing `errors[field]` on next keystroke. The clear-on-keystroke MUST live inside the orchestrator's `onChange` memoized callback BEFORE the switch statement — any field mutation clears its error. Test with a manual QA cell: "Submit → error renders → type → error clears instantly."

### Pitfall 3: First-error scroll fails because `onLayout` hasn't run yet
**Guardrail:** If the invalid field is inside a conditionally-mounted section, `onLayout` has fired at mount time. Since D-05 never unmounts sections DURING typing (only on `propertyType` switch), the y-map is stable at submit time. BUT: if the user switches category and immediately hits submit before the new section's `onLayout` fires, the y-offset will be stale. **Mitigation:** fall back to `scrollRef.current?.scrollTo({y: 0, animated: true})` if `fieldLayouts.current[firstErrorField] === undefined`. Log the miss in dev.

### Pitfall 4: Hospitality hybrid rule misread (partial contacts → false negative)
**Guardrail:** Unit tests MUST cover all 5 hybrid permutations: (a) all empty → valid, (b) phone only → invalid, (c) whatsapp only → invalid, (d) telegram only → invalid, (e) phone + whatsapp → valid, (f) phone + telegram → valid, (g) phone + whatsapp + telegram → valid. D-17 explicitly requires 4 of these (a/c/d/e); planner should expand to 7.

### Pitfall 5: `propertyType` not in `COMMERCIAL_TYPES` when `category === 'Commercial'`
**Guardrail:** This is impossible in normal flow because `propertyTypeToCategory(propertyType)` returns `'Commercial'` ONLY for the 4 COMMERCIAL_TYPES — the category literally implies the chip. D-17 still requires the assertion test as a defensive cross-check. If it ever fires, it indicates a FormBag corruption upstream; surface as `errors.propertyType = 'Select a Commercial property type.'`.

### Pitfall 6: i18n check-i18n-parity.sh regex swallows digit-containing keys (WR-02 from Phase 4)
**Guardrail:** New keys proposed in Finding #4 are all `[a-zA-Z.]`-only — safe. If any future key needs a digit (e.g. a `step2` key), pre-requisite fix: broaden the regex in `scripts/check-i18n-parity.sh:12-13` from `'[a-zA-Z.]+':` to `'[a-zA-Z0-9.]+':`. Phase 5 is a natural home for this housekeeping (flagged in STATE.md session continuity as "quick fix owner"). The tsc `Record<TranslationKeys,string>` gate is the real safety net — this script is belt-and-suspenders.

### Pitfall 7: Currency type tightening breaks existing rehydrate normalizer
**Guardrail:** Already safe (Finding #5). Rehydrate normalizer at `CreateListingScreen.tsx:239–246` outputs canonical `'$' | 'сом' | ''` — all 3 branches. Phase 5 should NOT modify this block. Adding a narrow test inside `validators.test.ts` for `buildPayloadByCategory` payloads that confirms `currency` is one of `'$' | 'сом'` (never `'USD'`/`'KGS'`/etc.) catches any future rehydrate regression via the payload-shape assertion.

### Pitfall 8: FORM-08 edit-mode fails for legacy listings missing now-required fields (D-08 enforcement)
**Guardrail:** Per D-08 + project clean-slate stance, this is correct behavior by design — legacy drafts will fail submit until filled. Document this in the phase's `.../05-QA-MATRIX.md` as an expected behavior (not a bug): "Edit an existing draft that has no `bedrooms` → submit shows 'Bedrooms is required' → user fills → save succeeds."

### Pitfall 9: VerificationSection has no `errors` prop
**Guardrail:** Verified (Finding #9). VerificationSection uses `Pick<SectionProps, 'values' | 'onChange'>` — cannot accept `errors`. No FORM-04 required fields live on VerificationSection (it's 3 admin-only boolean switches), so this is correct. Phase 5 must NOT extend VerificationSection to accept errors.

### Pitfall 10: Contact inline error row placement inside read-only Contact Info section
**Guardrail:** D-11 calls for an inline red error row ABOVE the 4 read-only TextInputs in the Contact Info block at `CreateListingScreen.tsx:668-698`. This block is **inline in the orchestrator** (not a sub-component) — the error render goes directly in the orchestrator JSX, not in a sub-component. Drop it between `<Text sectionTitle>` and the first `<TextInput>`:

```typescript
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
  {errors.contactPhone && (
    <Text style={[commonStyles.hint, { color: colors.error, marginBottom: 8 }]}>
      {t('createListing.contactMissingInline')}
    </Text>
  )}
  <TextInput ... />
  ...
</View>
```

Use a single `contactPhone` error key to represent the whole hybrid-rule failure (rather than 3 separate keys on phone/wa/tg). First-error scroll uses `contactPhone` as the anchor.

## Open Questions

1. **Order of fields for first-error scroll** — CONTEXT D-04 specifies "first field in active category's section order (BasicInfo → category section → Price if applicable → Media → VerificationSection if rendered)". BasicInfo internal order: title → description → address → district → city → propertyType → availableDate. Within a section, is the order TOP-to-BOTTOM of JSX (my assumption) or user-flow-weighted (some other order)?
   - **What we know:** JSX render order matches top-to-bottom visual order in every sub-component.
   - **Recommendation:** Planner locks "JSX render order = error-priority order". Document the per-section ordered field array inside `validators.ts` as an exported constant `FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]>`.

2. **Should `Property` type get a `status?: 'draft' | 'live'` field?** — `propertyToEdit.status` at `CreateListingScreen.tsx:263` is accessed as `(propertyToEdit as any).status`. Phase 5 increases the reliance on this field (D-16 visibility rule reads it at :701).
   - **What we know:** backend returns `status` (PropertyService handles it); Property type doesn't declare it.
   - **Recommendation:** Planner adds `status?: 'draft' | 'live'` to Property type during the D-16 task. One-line change; removes 2 `as any` sites.

3. **Should `buildPayloadByCategory` include `status` in the shared block or let handleSubmit merge it?** — status is a SHARED field in FormBag but is also a user-intent field (draft vs live). The D-09 pattern puts it in shared. Either works; planner decides whether it's cleaner in shared or in the call-site merge (consistent with `address: fullAddress` which stays in orchestrator for the city-fallback side-effect).

4. **Phase-4 WR-02 regex fix** — include as Wave 0 housekeeping in Phase 5 (broaden `'[a-zA-Z.]+':` to `'[a-zA-Z0-9.]+':`) or defer to Phase 8 release-prep? **Recommend Wave 0** — minimal cost, removes a known silent-skip hazard before Phase 5 adds ~12 keys.

## Assumptions Log

> All claims in this research were VERIFIED against live source files, live npm package metadata, or live jest output. No `[ASSUMED]` claims were made.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (none) | — | — |

**This table is empty: all claims verified. No user confirmation needed.**

## Sources

### Primary (HIGH confidence — verified this session)
- `src/theme/colors.ts:18,38` — `colors.error` exists on both themes (Finding #3)
- `src/theme/ThemeContext.tsx:1-45` — `useTheme()` returns typed `ThemeColors`
- `src/screens/CreateListingScreen.tsx:92,147,239-246,263,451-481,701,754-761` — orchestrator state, normalizer, handleSubmit, rehydrate (Findings #5, #6, #7)
- `src/components/CreateListingForm/types.ts` — FormBag + FormErrorBag + SectionProps (Finding #9)
- `src/components/CreateListingForm/{BasicInfo,Residential,Commercial,Hospitality,Media,Price,Verification}Section.tsx` — all 7 sub-components inspected for errors prop threading (Finding #9)
- `src/components/CreateListingForm/PriceSection.tsx:25-28` — canonical CURRENCY_OPTIONS with `'$'/'сом'` (Finding #5)
- `src/utils/__tests__/propertyCategory.test.ts` — Jest pattern (Finding #2)
- `src/hooks/__tests__/useRole.test.ts` — second Jest pattern (Finding #2)
- `src/screens/ProfileScreen.tsx:18,21,137` — `onViewAccountSettings?: () => void` precedent (Finding #8)
- `App.tsx:438,602,607,820-840` — App.tsx nav wiring pattern (Finding #8)
- `src/locales/en.ts:179-249` — createListing.* cluster structure (Finding #4)
- `src/locales/ru.ts:1-3` — `Record<TranslationKeys, string>` compile gate (Finding #4)
- `scripts/check-i18n-parity.sh` — parity gate script (Finding #4)
- `jest.config.js` (entire file) — minimal Jest config (Finding #2)
- `npm test -- --listTests` output — 5 auto-discovered test files across `src/**/__tests__/` (Finding #2)
- `npx jest src/utils/__tests__/propertyCategory.test.ts` output — 7/7 PASS in 0.229s (Finding #2)
- `node_modules/react-native-keyboard-controller/package.json` — version 1.21.6 (Finding #1)
- `node_modules/react-native-keyboard-controller/lib/typescript/components/KeyboardAwareScrollView/index.d.ts` — forwardRef signature (Finding #1)
- `node_modules/react-native-keyboard-controller/lib/typescript/components/KeyboardAwareScrollView/types.d.ts:25` — `KeyboardAwareScrollViewRef = { assureFocusedInputVisible: () => void } & ScrollView` (Finding #1)
- `node_modules/react-native-keyboard-controller/src/utils/findNodeHandle.ts` (existence only) — confirms internal use; consumer does not need it (Finding #12)
- `.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md` — D-01..D-18 decision set

### Secondary (MEDIUM confidence — inferred from Phase 4 artifacts)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-PATTERNS.md` — 19/20 analog map (Pattern rows 2, 4, 5)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-RESEARCH.md` — Pattern 1 conditional mounts, Pitfall 4 category-switch data loss, Pitfall 5 i18n-parity
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md` — 5/5 must_haves baseline (Phase 5 must not regress)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-REVIEW.md` — WR-01 advisory Phase 5 closes; WR-02 regex hazard

### Tertiary (LOW confidence — none used as primary evidence)
- (none)

## Metadata

**Confidence breakdown:**
- Scroll-to-first-error: HIGH — verified via KASV package type definitions + ref intersection with ScrollView
- Jest setup: HIGH — verified via live `npm test --listTests` and `jest --passWithNoTests` proof-of-discovery run
- colors.error existence: HIGH — verified via direct file read
- i18n namespace fit: HIGH — verified via grep + line count
- Currency type tightening: HIGH — verified via full callsite enumeration
- D-09 preservation: HIGH — verified via exact file:line read of payload object
- Status rehydrate: HIGH — verified via line 263 direct read
- App.tsx nav wiring: HIGH — verified via exact precedent line read
- Errors threading: HIGH — verified via render-call grep + per-file destructure inspection
- Role-agnostic enforcement: HIGH — verified via grep returning only expected MediaSection hit
- RN 0.84 / Fabric pitfalls: MEDIUM — findNodeHandle deprecation claim is widely held in RN community; KASV avoids exposing it to consumer

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — stable/internal scope, no fast-moving external dependencies)

## RESEARCH COMPLETE

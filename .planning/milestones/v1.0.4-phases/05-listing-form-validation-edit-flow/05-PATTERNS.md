# Phase 5: Listing Form Validation & Edit Flow — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 2 net-new + 13 modify-extend = 15 targets
**Analogs found:** 15 / 15 (all strong in-tree matches; Phase 5 is ~90% extension of existing Phase-4 files)

This phase is pure correctness work. Two files are genuinely new (`validators.ts` + `validators.test.ts`); the remaining 13 files get targeted extensions at specific line numbers — their own current shape IS the analog. Every extension has a concrete line-range contract below.

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/components/CreateListingForm/validators.ts` | new-pure-fn | `FormBag + category` → `{isValid, errors}` and `FormBag + category` → `Partial<Property>` | `src/utils/propertyCategory.ts` (pure fn + `as const` arrays + `SCREAMING_SNAKE_CASE` map + safe-default) + `src/hooks/useRole.ts:79-95` (`canFromUser` category-ladder pure fn) | exact (role + pure-fn + const-map + category-branch shape) |
| `src/components/CreateListingForm/__tests__/validators.test.ts` | new-test | unit (pure fn in → assertions) | `src/utils/__tests__/propertyCategory.test.ts` + `src/hooks/__tests__/useRole.test.ts` | exact (`/** @format */` header, `describe`/`test`/`expect().toBe()`, zero mocks, zero RN test-renderer) |
| `src/components/CreateListingForm/types.ts` | modify-extend | — | self (Phase-4 current shape) | self — tighten `currency` line 34 per D-18 |
| `src/components/CreateListingForm/index.ts` | modify-barrel | — | self + `src/locales/index.ts` (barrel pattern) | self — add 3 named re-exports |
| `src/components/CreateListingForm/styles.ts` | modify-extend | — | self (Phase-4 current shape) | self — optionally add `errorText` key (or inline at call-sites) |
| `src/components/CreateListingForm/BasicInfoSection.tsx` | modify-extend | request-response | self (Phase-4 current shape) | self — rename `_errors` → `errors`, add 6 inline error rows |
| `src/components/CreateListingForm/ResidentialSection.tsx` | modify-extend | request-response | self (Phase-4 current shape) | self — rename `_errors` → `errors`, add 3 inline error rows |
| `src/components/CreateListingForm/CommercialSection.tsx` | modify-extend | request-response | self (Phase-4 current shape) | self — rename `_errors` → `errors`, add 1 inline error row |
| `src/components/CreateListingForm/HospitalitySection.tsx` | modify-extend | request-response | self (Phase-4 current shape) | self — rename `_errors` → `errors`, add 3 inline error rows |
| `src/components/CreateListingForm/PriceSection.tsx` | modify-extend | request-response | self (Phase-4 current shape) | self — rename `_errors` → `errors`, add 2 inline error rows; import `CURRENCY_OPTIONS` from `validators` (remove local literal) |
| `src/components/CreateListingForm/MediaSection.tsx` | no-change (listed for completeness) | request-response | self | no FORM-04 required fields live here |
| `src/components/CreateListingForm/VerificationSection.tsx` | no-change (listed for completeness) | request-response | self | uses `Pick<SectionProps, 'values' \| 'onChange'>` — no `errors` prop by design |
| `src/screens/CreateListingScreen.tsx` | modify-state-machine | request-response | self — see line-range contract below | self — 7 targeted edits at known line numbers |
| `src/locales/en.ts` + `src/locales/ru.ts` | modify-extend | — | self — existing `createListing.*Required` cluster at en.ts:225-229 | self — add ~12 keys in parity |
| `App.tsx` | modify-state-machine | — | `App.tsx:438 + :602-607` (existing `onProfileViewAccountSettings` precedent) | exact (same prop-wiring shape for CreateListingScreen) |

---

## Pattern Assignments

### 1. `src/components/CreateListingForm/validators.ts` (new-pure-fn)

**Primary analog:** `src/utils/propertyCategory.ts` (named exports, `as const` arrays, `SCREAMING_SNAKE_CASE` map, pure derivation with safe default, zero React imports, zero side effects).

**Secondary analog:** `src/hooks/useRole.ts:79-95` (`canFromUser` — pure category-branch function that returns a deterministic result based on a discriminator, mirrors the `validateByCategory` / `buildPayloadByCategory` category-switch shape).

**Canonical file header + import pattern** (transcribed from `src/utils/propertyCategory.ts:1-11`):
```typescript
/**
 * validators — Single source of truth for Phase 5 FORM-04/06 validation + payload shaping.
 *
 * validateByCategory(values, category) → { isValid, errors }
 * buildPayloadByCategory(values, category) → Partial<Property>
 *
 * Pure functions. No React, no hooks, no AuthContext, no useRole — role-agnostic
 * per D-17. Role gating for platformVerifications stays at the call-site in
 * CreateListingScreen.handleSubmit (the `can('editVerifications')` spread).
 *
 * Convention: matches src/utils/propertyCategory.ts shape (named exports, pure
 * fn, no React imports, no side effects, SCREAMING_SNAKE_CASE for module const,
 * string-literal union for typed values).
 */
```

**`CURRENCY_OPTIONS` + `Currency` type export** (copies `as const` + `typeof…[number]` pattern from `src/utils/propertyCategory.ts:16-21`):
```typescript
export const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;
export type Currency = (typeof CURRENCY_OPTIONS)[number]['value']; // '$' | 'сом'
```
(Analog line-exact source: `src/components/CreateListingForm/PriceSection.tsx:25-28` — migrate that literal HERE and import it from PriceSection.)

**`FIELD_ORDER_BY_CATEGORY` constant** (mirrors `PROPERTY_TYPE_TO_CATEGORY` map shape from `src/utils/propertyCategory.ts:30-41`):
```typescript
export const FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]> = {
  Residential: ['title', 'description', 'address', 'district', 'city', 'bedrooms', 'bathrooms', 'areaSqm', 'currency', 'price', 'availableDate'],
  Commercial: ['title', 'description', 'address', 'district', 'city', 'areaSqm', 'currency', 'price', 'availableDate'],
  Hospitality: ['title', 'description', 'address', 'district', 'city', 'rooms', 'maxGuests', 'bathrooms', 'contactPhone'],
};
```
(Drives the "first invalid field in section order" scroll target per D-04 + RESEARCH §Finding #1. JSX render-order matches this; RESEARCH Open Question #1 resolution.)

**`ValidateResult` type + `validateByCategory` signature** (mirrors `canFromUser(user, action): boolean` pure-category-branch shape from `src/hooks/useRole.ts:79-95`, but returns a richer result object):
```typescript
export interface ValidateResult {
  isValid: boolean;
  errors: FormErrorBag;
}

export function validateByCategory(
  values: FormBag,
  category: PropertyCategory,
): ValidateResult {
  const errors: FormErrorBag = {};

  // Shared hard-required (all three categories) per D-07
  if (!values.title.trim()) errors.title = 'createListing.titleRequired';
  if (!values.description.trim()) errors.description = 'createListing.descriptionRequired';
  if (!values.address.trim()) errors.address = 'createListing.addressRequired';
  if (!values.city.trim()) errors.city = 'createListing.cityRequired';
  if (!values.district.trim()) errors.district = 'createListing.districtRequired';

  if (category === 'Residential') {
    if (!values.bedrooms.trim()) errors.bedrooms = 'createListing.bedroomsRequired';
    if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
    if (!values.areaSqm.trim()) errors.areaSqm = 'createListing.areaRequired';
    if (!values.price.trim()) errors.price = 'createListing.priceRequired';
    if (values.currency === '') errors.currency = 'createListing.currencyRequired';
  } else if (category === 'Commercial') {
    if (!values.areaSqm.trim()) errors.areaSqm = 'createListing.areaRequired';
    if (!values.price.trim()) errors.price = 'createListing.priceRequired';
    if (values.currency === '') errors.currency = 'createListing.currencyRequired';
    // D-07: propertyType ∈ COMMERCIAL_TYPES (defensive per Pitfall 5)
    if (!(COMMERCIAL_TYPES as readonly string[]).includes(values.propertyType)) {
      errors.propertyType = 'createListing.propertyTypeRequired';
    }
  } else {
    // Hospitality
    if (!values.rooms.trim()) errors.rooms = 'createListing.roomsRequired';
    if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
    if (!values.maxGuests.trim()) errors.maxGuests = 'createListing.maxGuestsRequired';

    // Hybrid contact rule per D-09/D-10
    const phone = values.contactPhone.trim();
    const wa = values.contactWhatsapp.trim();
    const tg = values.contactTelegram.trim();
    const anyFilled = phone !== '' || wa !== '' || tg !== '';
    if (anyFilled) {
      const passes = phone !== '' && (wa !== '' || tg !== '');
      if (!passes) errors.contactPhone = 'createListing.contactMissingInline';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
```

**Safe-default / null-guard pattern** (from `src/constants/adminAllowlist.ts:21-30` via `src/utils/propertyCategory.ts:50`): validators do NOT throw on undefined — rely on FormBag type invariants (all fields initialized to `''` or `[]` in orchestrator `useState` at `CreateListingScreen.tsx:86-128`), so `values.title.trim()` is always safe.

**`buildPayloadByCategory` pattern** (direct analog: the current inline payload literal at `src/screens/CreateListingScreen.tsx:451-481`; category-branch structure mirrors `validateByCategory` above):
```typescript
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
    panoramicPhotosUrl: values.panoramicPhotosUrl.trim(),  // D-09 ANCHOR B (always)
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
      // NO bedrooms, NO bathrooms
    };
  }
  // Hospitality — D-14: NO price, NO currency, NO areaSqm, NO period, NO amenities
  return {
    ...shared,
    rooms: parseInt(values.rooms) || 0,
    bathrooms: parseInt(values.bathrooms) || 0,
    maxGuests: parseInt(values.maxGuests) || 0,
  };
}
```

**Role-agnostic invariant (RESEARCH Finding #10):** `validators.ts` MUST NOT import `useRole`, `AuthContext`, or `Gated`. Grep invariant: `grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts` → empty.

---

### 2. `src/components/CreateListingForm/__tests__/validators.test.ts` (new-test)

**Primary analog:** `src/utils/__tests__/propertyCategory.test.ts` (full 40 lines shown at `.planning/phases/04-listing-form-taxonomy-decomposition/04-PATTERNS.md` §2).

**Secondary analog:** `src/hooks/__tests__/useRole.test.ts` (9 tests, zero mocks, pure fn assertions).

**Canonical header + imports pattern** (copy verbatim from `src/utils/__tests__/propertyCategory.test.ts:1-8`):
```typescript
/**
 * @format
 */

import {
  validateByCategory,
  buildPayloadByCategory,
} from '../validators';
import type { FormBag } from '../types';
```

**Test structure pattern** (from `src/utils/__tests__/propertyCategory.test.ts:10-40` — one `describe` per function, `test` per branch, `expect(...).toBe(...)` only):
```typescript
describe('validateByCategory — Residential', () => {
  const base: FormBag = makeBase(); // helper — see below

  test('happy-path inputs return isValid: true, empty errors bag', () => {
    const values: FormBag = { ...base, propertyType: 'Apartment', bedrooms: '2', bathrooms: '1', areaSqm: '80', price: '1000', currency: '$' };
    const result = validateByCategory(values, 'Residential');
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('missing bedrooms → invalid, errors.bedrooms set', () => {
    const values: FormBag = { ...base, propertyType: 'Apartment', bedrooms: '', bathrooms: '1', areaSqm: '80', price: '1000', currency: '$' };
    const result = validateByCategory(values, 'Residential');
    expect(result.isValid).toBe(false);
    expect(result.errors.bedrooms).toBe('createListing.bedroomsRequired');
  });

  // … repeat per required field …
});

describe('validateByCategory — Hospitality contact hybrid (D-09/D-10)', () => {
  test('all three contacts empty → valid (pass-through)', () => { /* ... */ });
  test('phone only → invalid (needs WA or TG)', () => { /* ... */ });
  test('whatsapp only → invalid (needs phone)', () => { /* ... */ });
  test('telegram only → invalid (needs phone)', () => { /* ... */ });
  test('phone + whatsapp → valid', () => { /* ... */ });
  test('phone + telegram → valid', () => { /* ... */ });
  test('phone + wa + tg → valid', () => { /* ... */ });
});

describe('buildPayloadByCategory — payload shape invariants', () => {
  test('Residential payload contains bedrooms/bathrooms/areaSqm/price/currency', () => { /* ... */ });
  test('Commercial payload does NOT contain bedrooms/bathrooms', () => {
    const payload: any = buildPayloadByCategory(values, 'Commercial');
    expect('bedrooms' in payload).toBe(false);
    expect('bathrooms' in payload).toBe(false);
  });
  test('Hospitality payload does NOT contain price/currency/period/amenities/areaSqm (D-14)', () => { /* ... */ });
  test('D-09 anchors: panoramicPhotosUrl present in all 3 category payloads', () => { /* ... */ });
  test('D-09 anchors: tours present in all 3 category payloads when non-empty', () => { /* ... */ });
});
```

**`makeBase()` helper pattern** (mirrors `useRole.test.ts:8-11` — inline object literal per-describe; no shared fixtures file):
```typescript
function makeBase(): FormBag {
  return {
    title: 'T', description: 'D', address: 'A', city: 'Bishkek', district: 'X',
    type: 'rent', propertyType: 'Apartment', status: 'draft',
    features: [], featureInput: '', selectedImages: [], availableDate: '',
    bedrooms: '', bathrooms: '', areaSqm: '', price: '', currency: '',
    rooms: '', maxGuests: '', amenities: [],
    tours: [], tourTitle: '', tourUrl: '',
    videoUrl: '', panoramicPhotosUrl: '', instagramUrl: '',
    contactEmail: '', contactPhone: '', contactWhatsapp: '', contactTelegram: '',
    verifyOwnership: false, verifyOwnerId: false, verifyStateDocs: false,
  };
}
```

**Auto-discovery:** Jest `preset: 'react-native'` auto-discovers `src/**/__tests__/*.test.ts` per `jest.config.js` (3 lines). Proven by existing test files at `src/{hooks,utils,services,components}/__tests__/` — verified in RESEARCH Finding #2 via `npm test -- --listTests`.

**Target:** ~20 assertions across 4 `describe` blocks (D-17 range 15-20).

---

### 3. `src/components/CreateListingForm/types.ts` (modify-extend)

**Analog:** self (Phase-4 current shape).

**Current line 34** (from `src/components/CreateListingForm/types.ts:29-34`):
```typescript
  // Residential / Commercial
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  price: string;
  currency: string;   // ← line 34; CHANGE
```

**Target (D-18 tightening):**
```typescript
import type { Currency } from './validators';
// …
  currency: Currency | '';   // '$' | 'сом' | ''  (empty = unset)
```

**Plus re-export** for barrel consumers (add after line 67 or immediately below `export type FormErrorBag = …`):
```typescript
export type { Currency } from './validators';
```

**Why safe:** RESEARCH Finding #5 enumerates all 10 callsites — every one already passes canonical `'$' | 'сом' | ''` values (rehydrate normalizer at `CreateListingScreen.tsx:239-246`, PriceSection chip `onPress` at `:55`, initial state `useState<string>('')` at `:92`). Zero logic changes needed; tsc catches any regression.

---

### 4. `src/components/CreateListingForm/index.ts` (modify-barrel)

**Analog:** self + `src/locales/index.ts` (the barrel precedent).

**Current shape** (from `src/components/CreateListingForm/index.ts:17-26`):
```typescript
export { BasicInfoSection } from './BasicInfoSection';
// … 6 more named exports …
export type { FormBag, FormErrorBag, SectionProps } from './types';
export type { MediaSectionProps } from './MediaSection';
```

**Add after line 26** (3 new lines):
```typescript
export { validateByCategory, buildPayloadByCategory, CURRENCY_OPTIONS, FIELD_ORDER_BY_CATEGORY } from './validators';
export type { Currency, ValidateResult } from './validators';
```

(Types-only re-exports use `export type { … }` per the locales/index.ts:25 precedent.)

---

### 5. `src/components/CreateListingForm/styles.ts` (modify-extend — optional)

**Analog:** self (current shape).

**Planner decision:** per CONTEXT §"Files the implementation will touch" line 127 and Claude's Discretion, may add an `errorText` composition key to memoize the `[commonStyles.hint, { color: colors.error }]` stack. RESEARCH recommends the inline composition at call sites (no new key) — matches existing `commonStyles.hint` usage in `HospitalitySection.tsx:84` and others. Keep `styles.ts` unchanged unless executor finds >6 inline repetitions painful.

**If added** (at end of `StyleSheet.create({…})` block, around line 166):
```typescript
  errorText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
```
(Note: `color` is NOT set here — applied inline via `colors.error` from `useTheme()` per theme-token invariant, same shape as every other style composition in this file.)

---

### 6-11. Sub-component error-row extensions (`BasicInfoSection`, `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `PriceSection`)

**Shared pattern for all 5:** rename destructure `errors: _errors` → `errors`, then add inline `{errors.fieldName && <Text>…</Text>}` under each invalid `TextInput` per D-01.

**D-01 render shape** (the shared excerpt to drop under each `TextInput` — copy verbatim):
```typescript
{errors.FIELDNAME && (
  <Text style={[commonStyles.hint, { color: colors.error }]}>
    {t(errors.FIELDNAME as TranslationKeys)}
  </Text>
)}
```

**Why this shape works:**
- `commonStyles.hint` already has `fontSize: 12, fontStyle: 'italic', marginTop: 4` at `styles.ts:88-92` — correct D-01 typography without a new style key.
- `colors.error` exists on both themes (`src/theme/colors.ts:18` light `#F44336`, `:38` dark `#EF5350`) — verified in RESEARCH Finding #3.
- Validator stores translation KEYS (not strings) in `errors.*`, so `t(errors.field as TranslationKeys)` resolves at render time. This keeps `validators.ts` pure (no i18n imports) and preserves dark/light + EN/RU parity.

#### 6. `BasicInfoSection.tsx` — 6 error rows

**Drop-in sites (line numbers from current file):**

| After line | Error field | Placement |
|------------|-------------|-----------|
| 178 | `errors.title` | below `title` TextInput |
| 194 | `errors.description` | below `description` TextInput |
| 218 | `errors.address` | below `address` TextInput |
| 232 | `errors.district` | below `district` TextInput |
| 246 | `errors.city` | below `city` TextInput |
| 470 (or 495 near hint) | `errors.availableDate` | below date-picker button |
| 395 (after Hospitality chip row closes) | `errors.propertyType` | below the three chip groups (Commercial-subtype violation per Pitfall 5) |

**Destructure change at line 45:**
```typescript
// BEFORE:
export function BasicInfoSection({ values, onChange, errors: _errors }: SectionProps) {
  // errors prop reserved for Phase 5 — renamed to _errors to silence unused warning

// AFTER:
export function BasicInfoSection({ values, onChange, errors }: SectionProps) {
```

#### 7. `ResidentialSection.tsx` — 3 error rows (bedrooms, bathrooms, areaSqm)

**Destructure change at line 21:** `errors: _errors` → `errors`.

**Drop-in sites (current file):**

| After line | Error field |
|------------|-------------|
| 45 | `errors.bedrooms` (inside `thirdInput` wrapper, below TextInput) |
| 58 | `errors.bathrooms` |
| 71 | `errors.areaSqm` |

Since these live inside `<View style={commonStyles.thirdInput}>` wrappers, the error `<Text>` goes INSIDE the wrapper after the TextInput, so it sits under its own column.

#### 8. `CommercialSection.tsx` — 1 error row (areaSqm)

**Destructure change at line 22:** `errors: _errors` → `errors`.

**Drop-in site after line 46** (inside the `halfInput` wrapper, below TextInput):
```typescript
{errors.areaSqm && (
  <Text style={[commonStyles.hint, { color: colors.error }]}>
    {t(errors.areaSqm as TranslationKeys)}
  </Text>
)}
```

#### 9. `HospitalitySection.tsx` — 3 error rows (rooms, maxGuests, bathrooms)

**Destructure change at line 31:** `errors: _errors` → `errors`.

**Drop-in sites (current file):**

| After line | Error field |
|------------|-------------|
| 55 | `errors.rooms` |
| 68 | `errors.maxGuests` |
| 81 | `errors.bathrooms` |

#### 10. `PriceSection.tsx` — 2 error rows (currency, price) + import migration

**Destructure change at line 30:** `errors: _errors` → `errors`.

**Drop-in sites:**
- After line 74 (below the currency chip row `</View>`): `errors.currency` row
- After line 98 (below the price `TextInput`): `errors.price` row

**Migration: replace local `CURRENCY_OPTIONS` with import** (per D-18 + RESEARCH Finding #5):
- **Delete lines 25-28** (current local `CURRENCY_OPTIONS` literal).
- **Add import** at line 19 (alongside existing imports):
  ```typescript
  import { CURRENCY_OPTIONS } from './validators';
  ```
- The `CURRENCY_OPTIONS` usage at line 43 (`{CURRENCY_OPTIONS.map(…)}`) stays unchanged — same shape, now re-exported from validators.

#### 11. No change: `MediaSection.tsx`, `VerificationSection.tsx`

- `MediaSection.tsx`: no FORM-04 required fields render here (videoUrl/instagramUrl/panoramicPhotosUrl/tours are all optional per D-07 + D-09 anchors).
- `VerificationSection.tsx` uses `Pick<SectionProps, 'values' | 'onChange'>` (line 29) — intentionally does not accept `errors`. The 3 admin switches are not in any required-field set.

---

### 12. `src/screens/CreateListingScreen.tsx` (modify-state-machine — 7 targeted edits)

**Analog:** self — the current file IS the contract. Each edit has an exact line range.

**Edit A: currency state type** (line 92):
```typescript
// BEFORE:
const [currency, setCurrency] = useState<string>(''); // User must select USD or сом

// AFTER:
const [currency, setCurrency] = useState<Currency | ''>(''); // D-18: canonical Currency type
```
Plus import at line 36 block: add `type Currency,` to the `from '../components/CreateListingForm'` named-import list.

**Edit B: onChange dispatcher currency case** (line 147):
```typescript
// BEFORE:
case 'currency': setCurrency(value as string); break;

// AFTER:
case 'currency': setCurrency(value as Currency | ''); break;
```

**Edit C: add errors state + clear-on-keystroke** (new lines immediately after line 131 `const { can } = useRole();`):
```typescript
const [errors, setErrors] = useState<FormErrorBag>({});

// Scroll-to-first-error infrastructure (D-04 / RESEARCH Finding #1)
const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
const fieldLayouts = useRef<Partial<Record<keyof FormBag, number>>>({});
```
Plus imports: add `useRef` to the `react` import at line 1; add `type { KeyboardAwareScrollViewRef }` to line 15; add `FormErrorBag` type to the CreateListingForm barrel import at lines 26-36.

**Clear-on-keystroke inside onChange memo** (insert immediately after line 139 opening brace, before the switch at line 140):
```typescript
  // D-02: clear field's error on next keystroke — user isn't nagged while typing
  setErrors((prev) => {
    if (prev[field]) {
      const next = { ...prev };
      delete next[field];
      return next;
    }
    return prev;
  });
```

**Edit D: replace Alert.alert validation checks** (DELETE lines 415-431 entirely — the 4 `Alert.alert` branches for title/address/currency/price).

**Replace with** (insert at line 415, before `setLoading(true)`):
```typescript
// FORM-06: single source of truth — validateByCategory + setErrors + scroll
const category = propertyTypeToCategory(propertyType);

// D-11: Hospitality contact hybrid → Alert with Complete profile CTA on failure
// (separate from inline errors because it offers a nav recovery path)
if (category === 'Hospitality') {
  const phone = contactPhone.trim();
  const wa = contactWhatsapp.trim();
  const tg = contactTelegram.trim();
  const anyFilled = phone !== '' || wa !== '' || tg !== '';
  const passes = !anyFilled || (phone !== '' && (wa !== '' || tg !== ''));
  if (!passes) {
    Alert.alert(
      t('createListing.contactMissingTitle'),
      t('createListing.contactMissingMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('createListing.contactMissingCta'), onPress: () => onNavigateToAccountSettings?.() },
      ],
    );
    // Also populate inline error on Contact Info section
    setErrors((prev) => ({ ...prev, contactPhone: 'createListing.contactMissingInline' }));
    return;
  }
}

const result = validateByCategory(values, category);
if (!result.isValid) {
  setErrors(result.errors);
  // D-04: auto-scroll to first invalid field in section order
  const firstField = FIELD_ORDER_BY_CATEGORY[category].find((f) => result.errors[f]);
  if (firstField) {
    const y = fieldLayouts.current[firstField];
    scrollRef.current?.scrollTo({ y: Math.max(0, (y ?? 0) - 20), animated: true });
  }
  return;
}
setErrors({});
```

**Edit E: replace inline payload object** (DELETE lines 451-481 — the entire `const propertyData = { … };` literal).

**Replace with:**
```typescript
const basePayload = buildPayloadByCategory(values, category);

const propertyData = {
  ...basePayload,
  address: fullAddress,                           // orchestrator-side address build (city fallback side-effect)
  city: city || 'Bishkek',
  existingImages: existingImageUrls,              // image-diff lives in orchestrator
  ...(can('editVerifications')                     // D-09: role gate stays at call-site
    ? {
        platformVerifications: {
          ownershipDocuments: verifyOwnership,
          ownerIdentityVerified: verifyOwnerId,
          stateIssuedDocumentsVerified: verifyStateDocs,
        },
      }
    : {}),
};
```

**D-09 anchor preservation:** `basePayload` contains both `panoramicPhotosUrl` (anchor B) and `tours` (anchor C) unconditionally via the `shared` block in `buildPayloadByCategory` (see §1 excerpt above). The `platformVerifications` role gate stays at the call-site per RESEARCH Finding #10.

**Edit F: Status toggle visibility (D-16)** — line 701:
```typescript
// BEFORE:
{!isEditMode && (
  <View style={styles.section}>

// AFTER:
{(!isEditMode || propertyToEdit?.status === 'draft') && (
  <View style={styles.section}>
```

**Edit G: Submit button label (D-16)** — lines 754-761:
```typescript
// BEFORE:
{isEditMode
  ? t('createListing.updateListing')
  : status === 'draft'
    ? t('createListing.saveAsDraft')
    : t('createListing.createListing')}

// AFTER:
{isEditMode
  ? (propertyToEdit?.status === 'draft'
      ? (status === 'draft'
          ? t('createListing.saveAsDraft')
          : t('createListing.publishListing'))
      : t('createListing.updateListing'))
  : (status === 'draft'
      ? t('createListing.saveAsDraft')
      : t('createListing.createListing'))}
```

**Edit H: Prop declaration** — line 38-44:
```typescript
// AFTER:
interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  propertyToEdit?: Property;
  verificationOnly?: boolean;
  onNavigateToAccountSettings?: () => void;    // NEW — optional with no-op fallback
}
```
Plus destructure in function signature (line 71-76): add `, onNavigateToAccountSettings` to the destructured props list.

**Edit I: Contact Info inline error row** (per RESEARCH Pitfall 10, placed in the orchestrator's inline Contact Info block around line 668-698 — between `<Text sectionTitle>` at `:669` and the first `<TextInput>` at `:670`):
```typescript
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
  {errors.contactPhone && (
    <Text style={[styles.hint, { color: colors.error, marginBottom: 8 }]}>
      {t(errors.contactPhone as TranslationKeys)}
    </Text>
  )}
  <TextInput ... /> {/* email */}
  {/* … */}
</View>
```

**Edit J: Thread errors + scrollRef + onLayout into JSX** (lines 634-665):

Replace the `<KeyboardAwareScrollView …>` opening tag with:
```typescript
<KeyboardAwareScrollView
  ref={scrollRef}
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  bottomOffset={20}
>
```

Then replace each `errors={{}}` (6 occurrences at lines 641, 644, 647, 650, 654, 660) with `errors={errors}`.

For onLayout capture — wrap each mounted section with an `onLayout` handler (planner picks exact wrap shape; minimal working example):
```typescript
<View onLayout={(e) => { fieldLayouts.current.title = e.nativeEvent.layout.y; }}>
  <BasicInfoSection values={values} onChange={onChange} errors={errors} />
</View>
```
(Or attach onLayout per-field inside sub-components — planner decision. RESEARCH Finding #1 prefers section-level onLayout with per-section y-offset for simplicity; Pitfall 3 warns about stale y-offsets after category switch — fallback `scrollTo({y:0})` if `fieldLayouts.current[firstErrorField] === undefined`.)

---

### 13. `src/locales/en.ts` + `src/locales/ru.ts` (modify-extend — i18n parity)

**Analog:** existing `createListing.*Required` cluster at `src/locales/en.ts:225-229` (5 keys already established — `titleRequired`, `addressRequired`, `currencyRequired`, `priceRequired`, `tourTitleUrlRequired`).

**Current shape (excerpt from `en.ts:225-229`):**
```typescript
'createListing.titleRequired': 'Title is required',
'createListing.addressRequired': 'Address is required',
'createListing.currencyRequired': 'Please select a currency (USD or сом)',
'createListing.priceRequired': 'Price is required',
'createListing.tourTitleUrlRequired': 'Please enter both tour title and URL',
```

**Add 12 new keys** (placement: within the `createListing.*` cluster — alphabetical-within-namespace preferred; planner may group all `*Required` together near line 229):

**EN additions:**
```typescript
'createListing.descriptionRequired': 'Description is required',
'createListing.cityRequired': 'City is required',
'createListing.districtRequired': 'District is required',
'createListing.bedroomsRequired': 'Bedrooms is required',
'createListing.bathroomsRequired': 'Bathrooms is required',
'createListing.areaRequired': 'Area is required',
'createListing.roomsRequired': 'Rooms is required',
'createListing.maxGuestsRequired': 'Max guests is required',
'createListing.propertyTypeRequired': 'Please select a property type',
'createListing.contactMissingTitle': 'Contact info incomplete',
'createListing.contactMissingMessage': 'Phone and either WhatsApp or Telegram are required for hospitality listings. Add them in Account Settings.',
'createListing.contactMissingCta': 'Complete profile',
'createListing.contactMissingInline': 'Add phone + WhatsApp or Telegram in your profile to publish this listing.',
'createListing.publishListing': 'Publish Listing',
```

**RU additions (identical keys, translated values):**
```typescript
'createListing.descriptionRequired': 'Описание обязательно',
'createListing.cityRequired': 'Город обязателен',
'createListing.districtRequired': 'Район обязателен',
'createListing.bedroomsRequired': 'Количество спален обязательно',
'createListing.bathroomsRequired': 'Количество ванных обязательно',
'createListing.areaRequired': 'Площадь обязательна',
'createListing.roomsRequired': 'Количество комнат обязательно',
'createListing.maxGuestsRequired': 'Макс. число гостей обязательно',
'createListing.propertyTypeRequired': 'Выберите тип недвижимости',
'createListing.contactMissingTitle': 'Контактная информация неполная',
'createListing.contactMissingMessage': 'Для объявлений размещения необходимы телефон и WhatsApp или Telegram. Добавьте их в настройках аккаунта.',
'createListing.contactMissingCta': 'Заполнить профиль',
'createListing.contactMissingInline': 'Добавьте телефон + WhatsApp или Telegram в профиле, чтобы опубликовать это объявление.',
'createListing.publishListing': 'Опубликовать объявление',
```

**Parity gate:** `src/locales/ru.ts:3` declares `export const ru: Record<TranslationKeys, string>` — tsc enforces EN=RU key-set equality. Plus `scripts/check-i18n-parity.sh` (Phase 4) is belt-and-suspenders. Keys MUST use only `[a-zA-Z.]` chars (Phase 4 WR-02 regex bug: digits get silently skipped — all 12 new keys above satisfy this).

---

### 14. `App.tsx` (modify-state-machine — nav wiring)

**Analog:** existing `onProfileViewAccountSettings` callback at `App.tsx:438` + its render-site wiring at `:602-607` (the ProfileScreen already uses this exact pattern).

**Current precedent** (from `App.tsx:438`):
```typescript
const onProfileViewAccountSettings = useCallback(() => setIsAccountSettingsOpen(true), []);
```

**CreateListingScreen render site** (current `App.tsx:819-840`, ADD prop at :838):
```typescript
{!!user && isCreateListingOpen && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <CreateListingScreen
      onBack={() => {
        setIsCreateListingOpen(false);
        setPropertyToEdit(null);
        setIsAdminVerificationMode(false);
        skipRenterListingsReopenRef.current = false;
      }}
      onSuccess={() => { /* … */ }}
      propertyToEdit={propertyToEdit || undefined}
      verificationOnly={isAdminVerificationMode}
      // NEW — Phase 5 D-11:
      onNavigateToAccountSettings={() => {
        setIsCreateListingOpen(false);
        setPropertyToEdit(null);
        setIsAccountSettingsOpen(true);
      }}
    />
  </View>
)}
```

**Precedent source:** `src/screens/ProfileScreen.tsx:18` (`onViewAccountSettings?: () => void` optional-with-no-op-fallback prop signature) — copy this verbatim for `CreateListingScreenProps.onNavigateToAccountSettings`. Call-site uses optional chain `onNavigateToAccountSettings?.()` so `verificationOnly` callers that don't wire the prop don't break.

---

## Shared Patterns

### Error-text render (D-01)

**Source:** `src/components/CreateListingForm/styles.ts:88-92` (`commonStyles.hint`) + `src/theme/colors.ts:18, 38` (`colors.error`).

**Apply to:** Every sub-component that renders a required-field input — 5 of 7 sub-components (BasicInfo, Residential, Commercial, Hospitality, Price).

**Verbatim excerpt:**
```typescript
{errors.FIELDNAME && (
  <Text style={[commonStyles.hint, { color: colors.error }]}>
    {t(errors.FIELDNAME as TranslationKeys)}
  </Text>
)}
```

**Invariants:**
- No new StyleSheet key required (composition of existing `hint` + inline color).
- Error values in `errors: FormErrorBag` are translation KEYS (not strings) — sub-components call `t(…)` at render time.
- No input border color change (per D-01).

### Clear-on-keystroke (D-02)

**Source:** RESEARCH Finding #9 orchestrator snippet.
**Apply to:** Exactly one site — the orchestrator's `onChange` memo at `CreateListingScreen.tsx:139-175`.
**Invariant:** Must run BEFORE the existing switch statement; otherwise the setter runs first and the field isn't "dirty" yet for the clear check.

### Theme + i18n usage (unchanged from Phase 4)

**Source:** `src/theme/ThemeContext.tsx` (`useTheme()`) + `src/context/LanguageContext.tsx` (`useLanguage()`).
**Apply to:** Every sub-component. Phase 5 adds `colors.error` usage on top of existing `colors.inputBackground` / `colors.text` / `colors.border` / `colors.textSecondary`.
**Invariant:** No hardcoded colors (RESEARCH Finding #3 confirms `colors.error` exists on light + dark themes).

### D-09 anchor preservation (load-bearing)

**Source:** Current `handleSubmit` payload at `src/screens/CreateListingScreen.tsx:466, 470`.
**Apply to:** `buildPayloadByCategory` in `validators.ts` — inside the `shared` object, unconditionally for all 3 categories.
**Invariants (Pitfall 1 guardrail):**
- `grep -n "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts` → exactly 1 hit (inside `shared`).
- `grep -n "tours:" src/components/CreateListingForm/validators.ts` → at least 1 hit (inside `shared`).
- Validator tests must include "D-09 anchors present in all 3 payloads" assertion per D-17.

### Role-agnostic enforcement (RESEARCH Finding #10)

**Source:** N/A — the invariant is the absence of imports.
**Apply to:** `validators.ts`.
**Grep guardrail:**
```bash
grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts
# Expected: empty output
```

### App.tsx nav-prop precedent

**Source:** `App.tsx:438` (callback) + `App.tsx:602-607` (ProfileScreen render site) + `src/screens/ProfileScreen.tsx:18` (optional prop type).
**Apply to:** CreateListingScreen's new `onNavigateToAccountSettings` prop + call-site wiring at `App.tsx:819-840`.

### Jest unit-test shape

**Source:** `src/utils/__tests__/propertyCategory.test.ts` (full) + `src/hooks/__tests__/useRole.test.ts` (full).
**Apply to:** `src/components/CreateListingForm/__tests__/validators.test.ts`.
**Invariants:** `/** @format */` header, `describe('<fn-name> — <behavior>')` blocks, `test(…)` per branch, `expect(...).toBe(...)` only, zero mocks, zero RN test-renderer, zero async.

---

## No Analog Found

None. Every file in Phase 5 has a strong in-tree analog — either the file itself (for extensions) or a sibling pure-fn / test / barrel / locale / nav-callback precedent.

---

## Metadata

**Analog search scope:**
- `src/utils/` + `src/utils/__tests__/` (pure-fn + test precedents)
- `src/hooks/` + `src/hooks/__tests__/` (pure-fn + hook + test precedents)
- `src/components/CreateListingForm/` (all 7 Phase-4 sub-components + types + index + styles)
- `src/screens/CreateListingScreen.tsx` (orchestrator — current shape)
- `src/screens/ProfileScreen.tsx` (nav-callback prop precedent)
- `App.tsx` (state-machine wiring precedent)
- `src/locales/{en,ru}.ts` (i18n cluster + parity gate)
- `src/theme/{colors,ThemeContext}.ts` (colors.error existence)

**Files read for excerpt extraction (14):**
- `src/utils/propertyCategory.ts` (full)
- `src/utils/__tests__/propertyCategory.test.ts` (full)
- `src/hooks/__tests__/useRole.test.ts` (full)
- `src/hooks/useRole.ts` (full)
- `src/components/CreateListingForm/types.ts` (full)
- `src/components/CreateListingForm/index.ts` (full)
- `src/components/CreateListingForm/styles.ts` (full)
- `src/components/CreateListingForm/BasicInfoSection.tsx` (full)
- `src/components/CreateListingForm/ResidentialSection.tsx` (full)
- `src/components/CreateListingForm/CommercialSection.tsx` (full)
- `src/components/CreateListingForm/HospitalitySection.tsx` (full)
- `src/components/CreateListingForm/PriceSection.tsx` (full)
- `src/components/CreateListingForm/MediaSection.tsx` (full)
- `src/components/CreateListingForm/VerificationSection.tsx` (full)
- `src/screens/CreateListingScreen.tsx` (lines 1-180, 210-310, 400-490, 620-780 = targeted sections)
- `src/screens/ProfileScreen.tsx` (lines 1-30)
- `App.tsx` (lines 430-470, 815-845)
- `src/locales/en.ts` (lines 220-260)
- `src/locales/ru.ts` (lines 1-10)

**Pattern extraction date:** 2026-04-24

---

## PATTERN MAPPING COMPLETE

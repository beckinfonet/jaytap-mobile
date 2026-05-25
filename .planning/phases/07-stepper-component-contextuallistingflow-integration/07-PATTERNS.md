# Phase 7: Stepper Component + ContextualListingFlow Integration — Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 8 (2 NEW + 6 MODIFY)
**Analogs found:** 8 / 8 (every NEW file has at least one strong analog; every MODIFY file has a verbatim current-state excerpt)
**Source of truth:** `07-CONTEXT.md` (USER DECISIONS D-01..D-12 + Claude's Discretion). No RESEARCH.md — `<code_context>` block already cites integration points.

---

## File Classification

| Target File | NEW/MOD | Role | Data Flow | Closest Analog (NEW) / Current-State Owner (MOD) | Match Quality |
|---|---|---|---|---|---|
| `src/components/StepperInput.tsx` | NEW | component (controlled input) | event-driven (tap → onChange) | `src/components/AuthModalCloseButton.tsx` (circular hit-area + TAP=44) + `src/components/PasswordTextInput.tsx` (controlled-input + hitSlop) + `src/components/PropertyCard.tsx` (theme-aware inline-style array) | composite-exact |
| `src/components/__tests__/StepperInput.test.tsx` | NEW | test (co-located component unit) | request-response (props in → tree out) | `src/components/__tests__/EmailVerifyBanner.test.tsx` (RTR + `act` + mock context hooks + label/testID finder) | exact |
| `src/components/ContextualListingFlow/Step3BasicInfo.tsx` | MOD | component (form step) | event-driven (conditional rendering by `pt`) | self — current chip-row block at L171–190 (rooms) is the pattern to mimic for the new stepper-row blocks | self |
| `src/components/ContextualListingFlow/types.ts` | MOD | type module | n/a | self — `FormBag.basics` interface L22–31 | self |
| `src/components/ContextualListingFlow/adapters.ts` | MOD | utility (pure transform) | request-response (Property↔FormBag) | self — `propertyToFormBag` L27–36 + `formBagToPropertyPayload` L76–85 | self |
| `src/components/ContextualListingFlow/validators.ts` | MOD | utility (pure validator) | request-response (FormBag → errors) | self — `FIELD_ORDER_PER_STEP[3]` L17–26 + step-3 block L55–75 | self |
| `src/components/ContextualListingFlow/index.tsx` | MOD | controller (orchestrator) | event-driven (state machine) | self — propertyType-clear block L73–82 + submit catch L171–177 | self |
| `src/locales/en.ts` + `src/locales/ru.ts` | MOD | config (i18n keys) | n/a (static map) | self — existing `contextualListing.step3.*Label` keys at en.ts L638–671 / ru.ts L640–673 | self |

> **Note:** `07-CONTEXT.md` cites `src/locales/en.json` + `src/locales/ru.json`, but the on-disk files are `en.ts` + `ru.ts` (TypeScript flat string-key maps with `as const`). Planner must edit `.ts` files; CONTEXT phrasing is a doc-bug, not a path. Verified 2026-05-25.

---

## Pattern Assignments — NEW Files

### `src/components/StepperInput.tsx` (NEW component, FORM-01 + FORM-03)

Composite analog. Pull from three existing components:

#### Analog A — `src/components/AuthModalCloseButton.tsx` (circular hit-area + `TAP=44` constant + accessibility)

**File header + TAP constant** (`src/components/AuthModalCloseButton.tsx:1–8`):
```typescript
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

/** Minimum tap target (Apple HIG / Material). */
const TAP = 44;
const ICON_CIRCLE = 34;
```

**Circular pressable with hitSlop + accessibilityRole + active-press feedback** (`src/components/AuthModalCloseButton.tsx:18–42`):
```typescript
<Pressable
  onPress={onPress}
  accessibilityRole="button"
  accessibilityLabel="Close"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  style={({ pressed }) => [
    styles.hitArea,
    {
      top: insets.top + 6,
      right: Math.max(insets.right, 12),
      opacity: pressed ? 0.7 : 1,
    },
  ]}
>
  <View
    style={[
      styles.circle,
      { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
    ]}
  >
    <Text style={[styles.icon, { color: colors.text }]}>✕</Text>
  </View>
</Pressable>
```

**StyleSheet at file bottom** (`src/components/AuthModalCloseButton.tsx:45–66`):
```typescript
const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    zIndex: 20,
    width: TAP,
    height: TAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -1,
  },
});
```

**Copy what:** the `TAP = 44` + `ICON_CIRCLE` constants verbatim (or fork them — D-09's "looser coupling" note); the `borderRadius: SIZE / 2` circular pattern; the `<Pressable>` with `hitSlop` + `accessibilityRole="button"` shape; the `style={({ pressed }) => [...]}` press-feedback shape. StepperInput's `−` and `+` are TWO instances of this pattern side-by-side.

#### Analog B — `src/components/PasswordTextInput.tsx` (hitSlop on small tap target + `disabled` prop precedent)

**hitSlop + disabled propagation** (`src/components/PasswordTextInput.tsx:21–28`):
```typescript
<TouchableOpacity
  style={styles.iconHit}
  onPress={() => setVisible((v) => !v)}
  accessibilityRole="button"
  accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  disabled={props.editable === false}
>
```

**Copy what:** `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` shape — total touchable size = `width + (left+right)` = 44 at minimum (FORM-03 ≥44pt). The `disabled={...}` prop placement directly on `TouchableOpacity` / `Pressable`. Per CONTEXT.md "Claude's Discretion" — disabled buttons can keep hitSlop at 44pt for symmetry.

#### Analog C — `src/components/PropertyCard.tsx` (theme-aware inline-style array + named export + co-located StyleSheet)

**Imports + props interface + named export shape** (`src/components/PropertyCard.tsx:1–60` — partial):
```typescript
import React from 'react';
import {
  View, Text, ..., StyleSheet, TouchableOpacity, ...,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
// ...

interface PropertyCardProps {
  property: Property;
  onPress: (property: Property) => void;
  // ...
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property, onPress, /* ... */
}) => {
  const { colors, isDark } = useTheme();
  // ...
}
```

**Copy what:** the `React.FC<Props>` shape with `useTheme()` destructure at top, named export, props interface immediately above component. CONVENTIONS.md L207–219 confirms this is the project convention. Co-located `StyleSheet.create({...})` at bottom of file. Theme-resolved colors merged via `style={[styles.x, { color: colors.textSecondary }]}` — exactly what D-03's "dim glyph only on disabled `±`" requires (drop glyph color to `colors.textSecondary` while leaving the circle structure styles in `StyleSheet`).

#### Per-CONTEXT specifics (Specific Ideas block)

The component skeleton, props interface, and `formatValue` helper are pre-decided in `07-CONTEXT.md` L217–237:
```typescript
interface StepperInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
  step: number; // 1 or 0.5
  label: string;
  testID?: string;
  // Planner may add (Claude's Discretion):
  accessibilityLabel?: string;
}

const formatValue = (v: number | undefined): string =>
  v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);
```

**Behavior contract (FORM-01):** `+` from `undefined` calls `onChange(min)`; `−` at `value === min` is a no-op; `+` at `value === max` is a no-op. D-11 enumerates 6 unit-test cases.

---

### `src/components/__tests__/StepperInput.test.tsx` (NEW co-located unit tests, D-11)

**Analog:** `src/components/__tests__/EmailVerifyBanner.test.tsx` — closest match for "co-located unit test of a self-contained component with mocked theme/language contexts and tap-driven `onPress` assertions."

Why this analog (not `Step3.test.tsx` or `PropertyCard.specChip.test.tsx`):
- Both `EmailVerifyBanner.test.tsx` and Phase 7's stepper are self-contained components (no domain model) — same surface shape.
- Both use **`react-test-renderer` + `act()`** (no `@testing-library/react-native` in dev deps — confirmed in `PropertyCard.specChip.test.tsx:20–23` comment "no RTL/jest-native in dev deps"). Project precedent locked.
- Both assert `onPress` fires (`resendBtn.props.onPress()` pattern) — matches D-11's "`onChange` called with `min`" assertions on `+` taps.

**Test stack imports + mock setup** (`src/components/__tests__/EmailVerifyBanner.test.tsx:16–30`):
```typescript
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { EmailVerifyBanner } from '../EmailVerifyBanner';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

const { useTheme } = require('../../theme/ThemeContext');
const { useLanguage } = require('../../context/LanguageContext');
```

**Render-helper wrapped in `act()`** (`src/components/__tests__/EmailVerifyBanner.test.tsx:61–67`):
```typescript
const render = (): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<EmailVerifyBanner />);
  });
  return tree;
};
```

**Finder by `accessibilityLabel` (or by `testID`) + onPress assertion** (`src/components/__tests__/EmailVerifyBanner.test.tsx:54–57, 92–100`):
```typescript
const findByLabel = (tree: TestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    n => !!n.props && n.props.accessibilityLabel === label,
  )[0];

test('resend action calls resendVerificationEmail', async () => {
  const { resendVerificationEmail } = setup();
  const tree = render();
  const resendBtn = findByLabel(tree, 'Resend verification email');
  await act(async () => {
    resendBtn.props.onPress();
  });
  expect(resendVerificationEmail).toHaveBeenCalledTimes(1);
});
```

**Also relevant — `Step3.test.tsx`-style `findByTestID` helper** (`src/components/ContextualListingFlow/__tests__/Step3.test.tsx:49–56`):
```typescript
function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}
function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}
```

**Copy what:**
- Top-of-file mock block for `useTheme` + `useLanguage` (StepperInput doesn't use `useAuth` — drop that mock).
- `render()` helper wrapping `TestRenderer.create(...)` in `act()`.
- `findByTestID` helper (more aligned with D-11 which assumes `testID-minus` / `testID-value` / `testID-plus` discrimination than `findByLabel`).
- Per-test `act(async () => { btn.props.onPress(); })` pattern for `+` / `−` taps.
- Assertion shape `expect(onChange).toHaveBeenCalledWith(<expected>)` and `expect(onChange).not.toHaveBeenCalled()` for the 6 cases in D-11.

**Cases to implement (D-11 — verbatim from CONTEXT.md L84–91):**
1. Renders em-dash `—` when `value === undefined`.
2. Renders integer `5` when `value === 5` and step is 1; renders `1.5` when `value === 1.5` and step is 0.5.
3. Tap `+` from `value === undefined` → `onChange` called with `min`.
4. Tap `−` at `value === min` → `onChange` NOT called.
5. Tap `+` at `value === max` → `onChange` NOT called.
6. Disabled-state — at boundary, `disabled={true}` set on boundary button AND glyph color resolves to `colors.textSecondary`.

---

## Pattern Assignments — MODIFY Files

### `src/components/ContextualListingFlow/Step3BasicInfo.tsx` (MOD — add 2 conditional stepper rows at BOTTOM)

**Current `setBasics` definition** (`src/components/ContextualListingFlow/Step3BasicInfo.tsx:42–48`):
```typescript
export function Step3BasicInfo({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const pt = values.propertyType;

  const setBasics = (patch: Partial<FormBag['basics']>) =>
    onChange('basics', { ...values.basics, ...patch });
```

**Existing conditional chip-row block — the `rooms` row** (`src/components/ContextualListingFlow/Step3BasicInfo.tsx:170–190`):
```tsx
{/* Conditional: rooms — apartment / house / office / commercial */}
{pt === 'apartment' || pt === 'house' || pt === 'office' || pt === 'commercial' ? (
  <View style={commonStyles.section}>
    <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
      {t('contextualListing.step3.roomsLabel')}
    </Text>
    {renderChipRow(
      ROOMS,
      values.basics.rooms,
      (r) => setBasics({ rooms: r }),
      'rooms-chip',
      (r) =>
        t(`contextualListing.step3.rooms.${roomsKeySuffix(r)}` as TranslationKeys),
    )}
    {errors['basics.rooms'] ? (
      <Text style={[commonStyles.errorText, { color: colors.error }]}>
        {t(errors['basics.rooms'] as TranslationKeys)}
      </Text>
    ) : null}
  </View>
) : null}
```

**Existing `hotel/hostel` conditional block** (`src/components/ContextualListingFlow/Step3BasicInfo.tsx:232–271`) — the final block in the return, the spot the new stepper rows go AFTER per D-05.

**Copy what (per CONTEXT.md L246–264 specifics — pre-decided shape):**
```tsx
{/* NEW: bedrooms stepper — apartment / house only */}
{pt === 'apartment' || pt === 'house' ? (
  <View style={commonStyles.section}>
    <StepperInput
      testID="basics-bedrooms"
      label={t('contextualListing.step3.bedroomsLabel')}
      value={values.basics.bedrooms}
      onChange={(v) => setBasics({ bedrooms: v })}
      min={0} max={10} step={1}
    />
    {errors['basics.bedrooms'] ? (
      <Text style={[commonStyles.errorText, { color: colors.error }]}>
        {t(errors['basics.bedrooms'] as TranslationKeys)}
      </Text>
    ) : null}
  </View>
) : null}

{/* NEW: bathroomCount stepper — apartment / house / hotel / hostel / office / commercial */}
{pt === 'apartment' || pt === 'house' || pt === 'hotel' || pt === 'hostel' || pt === 'office' || pt === 'commercial' ? (
  <View style={commonStyles.section}>
    <StepperInput
      testID="basics-bathroomCount"
      label={t('contextualListing.step3.bathroomCountLabel')}
      value={values.basics.bathroomCount}
      onChange={(v) => setBasics({ bathroomCount: v })}
      min={0} max={10} step={0.5}
    />
    {errors['basics.bathroomCount'] ? (
      <Text style={[commonStyles.errorText, { color: colors.error }]}>
        {t(errors['basics.bathroomCount'] as TranslationKeys)}
      </Text>
    ) : null}
  </View>
) : null}
```

**Placement:** after the existing hotel/hostel block at line 271, before the closing `</View>` at line 272. Per D-05 ordering: areaSqm → price → currency → existing chip rows → bedrooms stepper → bathroomCount stepper.

**Import to add at the top:** `import { StepperInput } from '../StepperInput';` (relative path `../StepperInput` since Step3BasicInfo lives in `src/components/ContextualListingFlow/` and the new component lives in `src/components/`).

---

### `src/components/ContextualListingFlow/types.ts` (MOD — extend `FormBag.basics`)

**Current `FormBag.basics` interface** (`src/components/ContextualListingFlow/types.ts:21–31`):
```typescript
  // === Step 3 (REQUIRED area + price + currency; conditional sub-fields) ===
  basics: {
    areaSqm: string; // string at form-time, parsed at submit
    price: string;
    currency: 'KGS' | 'USD' | 'EUR' | '';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
  };
```

**Edit — add two optional numeric fields, matching the `?:` optionality convention of every other Step-3 conditional field** (per D-07):
```typescript
  basics: {
    areaSqm: string;
    price: string;
    currency: 'KGS' | 'USD' | 'EUR' | '';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
    bedrooms?: number;        // M4 FORM-02 — integer 0–10; residential-only (apartment/house)
    bathroomCount?: number;   // M4 FORM-02 — 0.5-step 0–10; apartment/house/hotel/hostel/office/commercial
  };
```

**Pattern preserved:** all eight Step-3 conditional fields use `?:` optionality — Phase 7's two new fields follow the same shape. No discriminated-union expansion; planner just appends two lines.

---

### `src/components/ContextualListingFlow/adapters.ts` (MOD — bidirectional, undefined-preserving)

**Current `propertyToFormBag` basics region** (`src/components/ContextualListingFlow/adapters.ts:27–36`):
```typescript
    basics: {
      areaSqm: p.basics?.areaSqm != null ? String(p.basics.areaSqm) : '',
      price: p.basics?.price != null ? String(p.basics.price) : '',
      currency: (p.basics?.currency ?? '') as FormBag['basics']['currency'],
      rooms: p.basics?.rooms as FormBag['basics']['rooms'],
      bathroom: p.basics?.bathroom as FormBag['basics']['bathroom'],
      kitchen: p.basics?.kitchen as FormBag['basics']['kitchen'],
      hotelRooms: p.basics?.hotelRooms as FormBag['basics']['hotelRooms'],
      hotelClass: p.basics?.hotelClass as FormBag['basics']['hotelClass'],
    },
```

**Edit — append two lines (per D-08; new fields stay numeric, no string coercion since they aren't form-typed strings like `areaSqm`/`price`):**
```typescript
    basics: {
      areaSqm: p.basics?.areaSqm != null ? String(p.basics.areaSqm) : '',
      price: p.basics?.price != null ? String(p.basics.price) : '',
      currency: (p.basics?.currency ?? '') as FormBag['basics']['currency'],
      rooms: p.basics?.rooms as FormBag['basics']['rooms'],
      bathroom: p.basics?.bathroom as FormBag['basics']['bathroom'],
      kitchen: p.basics?.kitchen as FormBag['basics']['kitchen'],
      hotelRooms: p.basics?.hotelRooms as FormBag['basics']['hotelRooms'],
      hotelClass: p.basics?.hotelClass as FormBag['basics']['hotelClass'],
      bedrooms: p.basics?.bedrooms,           // number | undefined — Phase 6 SCHEMA-03
      bathroomCount: p.basics?.bathroomCount, // number | undefined — Phase 6 SCHEMA-03
    },
```

**Current `formBagToPropertyPayload` basics region** (`src/components/ContextualListingFlow/adapters.ts:76–85`):
```typescript
    basics: {
      areaSqm: v.basics.areaSqm ? parseFloat(v.basics.areaSqm) : undefined,
      price: v.basics.price ? parseFloat(v.basics.price) : undefined,
      currency: v.basics.currency || undefined,
      rooms: v.basics.rooms,
      bathroom: v.basics.bathroom,
      kitchen: v.basics.kitchen,
      hotelRooms: v.basics.hotelRooms,
      hotelClass: v.basics.hotelClass,
    },
```

**Edit — append two lines (per D-08; passthrough, undefined-preserving):**
```typescript
    basics: {
      areaSqm: v.basics.areaSqm ? parseFloat(v.basics.areaSqm) : undefined,
      price: v.basics.price ? parseFloat(v.basics.price) : undefined,
      currency: v.basics.currency || undefined,
      rooms: v.basics.rooms,
      bathroom: v.basics.bathroom,
      kitchen: v.basics.kitchen,
      hotelRooms: v.basics.hotelRooms,
      hotelClass: v.basics.hotelClass,
      bedrooms: v.basics.bedrooms,           // verbatim passthrough — undefined survives
      bathroomCount: v.basics.bathroomCount, // verbatim passthrough — undefined survives
    },
```

**Pattern preserved:** the existing "Strip undefined leaves for clean payload" comment on L106–108 already covers the new fields — backend silently tolerates `undefined` per Phase 6 schema-permissive validator. No new logic needed; just two lines per direction.

---

### `src/components/ContextualListingFlow/validators.ts` (MOD — defensive checks + field order)

**Current `FIELD_ORDER_PER_STEP[3]`** (`src/components/ContextualListingFlow/validators.ts:17–26`):
```typescript
  3: [
    'basics.areaSqm',
    'basics.price',
    'basics.currency',
    'basics.rooms',
    'basics.bathroom',
    'basics.kitchen',
    'basics.hotelRooms',
    'basics.hotelClass',
  ],
```

**Edit — append two entries after `'basics.hotelClass'` (per D-09 — preserves scroll-to-first-error ordering parity):**
```typescript
  3: [
    'basics.areaSqm',
    'basics.price',
    'basics.currency',
    'basics.rooms',
    'basics.bathroom',
    'basics.kitchen',
    'basics.hotelRooms',
    'basics.hotelClass',
    'basics.bedrooms',
    'basics.bathroomCount',
  ],
```

**Current Step-3 validator block** (`src/components/ContextualListingFlow/validators.ts:55–75`):
```typescript
  } else if (stepN === 3) {
    const area = parseFloat(values.basics.areaSqm);
    const price = parseFloat(values.basics.price);
    if (!area || area <= 0) errors['basics.areaSqm'] = 'contextualListing.step3.areaRequired';
    if (!price || price <= 0) errors['basics.price'] = 'contextualListing.step3.priceRequired';
    if (!values.basics.currency) errors['basics.currency'] = 'contextualListing.step3.currencyRequired';
    const pt = values.propertyType;
    if (pt === 'apartment' || pt === 'house') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
    } else if (pt === 'office' || pt === 'commercial') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
      if (!values.basics.bathroom)
        errors['basics.bathroom'] = 'contextualListing.step3.bathroomRequired';
      if (!values.basics.kitchen)
        errors['basics.kitchen'] = 'contextualListing.step3.kitchenRequired';
    } else if (pt === 'hotel' || pt === 'hostel') {
      if (!values.basics.hotelRooms)
        errors['basics.hotelRooms'] = 'contextualListing.step3.hotelRoomsRequired';
      if (!values.basics.hotelClass)
        errors['basics.hotelClass'] = 'contextualListing.step3.hotelClassRequired';
    }
  } else if (stepN === 4) {
```

**Edit — add defensive out-of-range checks AFTER the `hotel || hostel` branch but BEFORE the `else if (stepN === 4)` line** (per D-09 — FORM-04 lock: never require either field, only validate when present):
```typescript
    } else if (pt === 'hotel' || pt === 'hostel') {
      if (!values.basics.hotelRooms)
        errors['basics.hotelRooms'] = 'contextualListing.step3.hotelRoomsRequired';
      if (!values.basics.hotelClass)
        errors['basics.hotelClass'] = 'contextualListing.step3.hotelClassRequired';
    }

    // NEW M4 FORM-04 — defensive only; stepper UI clamps prevent these from firing.
    // Practically unreachable from the UI; catches direct-write code paths (copy/paste from another listing).
    if (values.basics.bedrooms !== undefined &&
        (!Number.isInteger(values.basics.bedrooms) ||
         values.basics.bedrooms < 0 || values.basics.bedrooms > 10)) {
      errors['basics.bedrooms'] = 'contextualListing.step3.bedroomsInvalid';
    }
    if (values.basics.bathroomCount !== undefined &&
        (!Number.isInteger(values.basics.bathroomCount * 2) ||
         values.basics.bathroomCount < 0 || values.basics.bathroomCount > 10)) {
      errors['basics.bathroomCount'] = 'contextualListing.step3.bathroomCountInvalid';
    }
  } else if (stepN === 4) {
```

**Pattern preserved:** Both new checks gate on `!== undefined` first — never require, only validate-if-present. Same pattern as Phase 6 schema-permissive validators.

---

### `src/components/ContextualListingFlow/index.tsx` (MOD — propertyType-clear + submit-catch discriminator)

**Current propertyType-change clear block** (`src/components/ContextualListingFlow/index.tsx:64–94`):
```typescript
  const onChange = useCallback(<K extends keyof FormBag>(field: K, value: FormBag[K]) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // ROADMAP SC#3 (Plan 02-03): switching propertyType in Step 1 reflows Step 3 —
      // clear leftover sub-fields from the prior selection (rooms/bathroom/kitchen/
      // hotelRooms/hotelClass). Step 3 sub-fields are mutually exclusive across the
      // FLOW-08 matrix (apartment/house vs office/commercial vs hotel/hostel), so a
      // switch from e.g. apartment→hotel must drop the prior `rooms` value to avoid
      // submitting a hotel listing with a stale `rooms` field.
      if (field === 'propertyType' && prev.propertyType !== value) {
        next.basics = {
          ...prev.basics,
          rooms: undefined,
          bathroom: undefined,
          kitchen: undefined,
          hotelRooms: undefined,
          hotelClass: undefined,
        };
      }
      // ROADMAP SC#4 (Plan 02-04b): switching dealType in Step 1 reflows Step 6 —
      // clear leftover terms.* fields. Step 6 fields (negotiable / deposit /
      // prepaymentMonths / minTerm) are dealType-gated per the matrix in
      // Step6DealConditions.tsx, so a switch from e.g. rent_long → sale must drop
      // any prior prepaymentMonths/minTerm to avoid submitting a sale listing
      // with stale rent fields.
      if (field === 'dealType' && prev.dealType !== value) {
        next.terms = {};
      }
      return next;
    });
  }, []);
```

**Edit — add `bedrooms: undefined` to the clear list per CONTEXT.md "Claude's Discretion" L111** (residential-only field must clear on any propertyType switch; `bathroomCount` is intentionally OMITTED from the clear list since it applies to all 6 types):
```typescript
      if (field === 'propertyType' && prev.propertyType !== value) {
        next.basics = {
          ...prev.basics,
          rooms: undefined,
          bathroom: undefined,
          kitchen: undefined,
          hotelRooms: undefined,
          hotelClass: undefined,
          bedrooms: undefined,        // M4 — residential-only; clear on any propertyType switch
          // bathroomCount intentionally NOT cleared — applies to all 6 types (D-08 + Claude's Discretion)
        };
      }
```

**Current submit catch handler** (`src/components/ContextualListingFlow/index.tsx:171–177`):
```typescript
      } catch (e: unknown) {
        const msg =
          (e as { message?: string }).message ?? t('common.errorGeneric');
        Alert.alert(t('common.error'), msg);
      } finally {
        setIsSubmitting(false);
      }
```

**Edit — add M4_* discriminator BEFORE the generic Alert fallback (per D-10 + CONTEXT.md L268–282 specifics):**
```typescript
      } catch (e: unknown) {
        // M4 D-10 — discriminate Phase 6 backend 400 codes; route to inline error
        // row Step3 already renders. Practically unreachable via stepper UI (clamping
        // prevents bad values), but the 400 codes were added in Phase 6 D-11 explicitly
        // so Phase 7 can discriminate.
        const code =
          (e as { response?: { data?: { code?: string } }; code?: string }).response?.data?.code ??
          (e as { code?: string }).code;
        if (code === 'M4_BEDROOMS_INVALID') {
          setErrors((prev) => ({ ...prev, ['basics.bedrooms']: 'contextualListing.step3.bedroomsInvalid' }));
          setCurrentStep(3);
        } else if (code === 'M4_BATHROOM_STEP_INVALID') {
          setErrors((prev) => ({ ...prev, ['basics.bathroomCount']: 'contextualListing.step3.bathroomCountInvalid' }));
          setCurrentStep(3);
        } else {
          const msg =
            (e as { message?: string }).message ?? t('common.errorGeneric');
          Alert.alert(t('common.error'), msg);
        }
      } finally {
        setIsSubmitting(false);
      }
```

**Catch-location verified:** line 171 in the current file (full handler L130–179). The existing `setErrors` setter on L56 and `setCurrentStep` setter on L57 are already in scope inside this `useCallback`. No new imports needed.

---

### `src/locales/en.ts` + `src/locales/ru.ts` (MOD — 4 new keys per locale)

> **CONTEXT.md doc-bug note:** the phase document says `en.json` + `ru.json`, but on-disk files are `en.ts` + `ru.ts`. Files are flat `Record<string, string>` maps marked `as const`.

**Existing `contextualListing.step3.*Label` keys — EN** (`src/locales/en.ts:638–671`, sample):
```typescript
'contextualListing.step3.title': 'Basic information',
'contextualListing.step3.areaLabel': 'Area (m²)',
'contextualListing.step3.priceLabel': 'Price',
'contextualListing.step3.currencyLabel': 'Currency',
'contextualListing.step3.roomsLabel': 'Rooms',
'contextualListing.step3.bathroomLabel': 'Bathroom',
'contextualListing.step3.kitchenLabel': 'Kitchen',
'contextualListing.step3.hotelRoomsLabel': 'Number of hotel rooms',
'contextualListing.step3.hotelClassLabel': 'Class',
```

**Existing `contextualListing.step3.*Label` keys — RU** (`src/locales/ru.ts:640–673`, sample):
```typescript
'contextualListing.step3.title': 'Основные сведения',
'contextualListing.step3.areaLabel': 'Площадь (м²)',
'contextualListing.step3.priceLabel': 'Цена',
'contextualListing.step3.currencyLabel': 'Валюта',
'contextualListing.step3.roomsLabel': 'Комнаты',
'contextualListing.step3.bathroomLabel': 'Санузел',
'contextualListing.step3.kitchenLabel': 'Кухня',
'contextualListing.step3.hotelRoomsLabel': 'Количество номеров',
'contextualListing.step3.hotelClassLabel': 'Класс',
```

**Pattern preserved:** `contextualListing.step3.<field>Label` (label) + `contextualListing.step3.<field>Required` / `Invalid` (error). Per D-09 + Claude's Discretion section, Phase 7 uses `Invalid` suffix (not `Required` — these new fields are never required; only out-of-range messaging applies).

**Edit — add 4 new keys per locale, anywhere after `hotelClass.premium` block (~en.ts:671 / ru.ts:673) — locales are flat maps; ordering is cosmetic but per-locale parity is enforced by `scripts/check-i18n-parity.sh`:**

**en.ts additions:**
```typescript
'contextualListing.step3.bedroomsLabel': 'Bedrooms',
'contextualListing.step3.bedroomsInvalid': 'Bedrooms must be a whole number between 0 and 10.',
'contextualListing.step3.bathroomCountLabel': 'Bathrooms',
'contextualListing.step3.bathroomCountInvalid': 'Bathrooms must be a whole or half number between 0 and 10.',
```

**ru.ts additions:**
```typescript
'contextualListing.step3.bedroomsLabel': 'Спальни',
'contextualListing.step3.bedroomsInvalid': 'Количество спален должно быть целым числом от 0 до 10.',
'contextualListing.step3.bathroomCountLabel': 'Ванные комнаты',
'contextualListing.step3.bathroomCountInvalid': 'Количество ванных должно быть целым или с шагом 0.5 от 0 до 10.',
```

**Parity gate:** key count delta must match (+4 / +4); `scripts/check-i18n-parity.sh` must exit 0 after the edit.

---

## Shared Patterns (apply to multiple Phase 7 files)

### Theme-aware inline-style array

**Source:** `src/components/PropertyCard.tsx`, `src/components/AuthModalCloseButton.tsx`, `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — all consistent.
**Apply to:** `StepperInput.tsx` (new) and the new Step3 rows.

**Excerpt** (`src/components/ContextualListingFlow/Step3BasicInfo.tsx:99–101`):
```typescript
<Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
  {t('contextualListing.step3.areaLabel')}
</Text>
```

Static structural styles via `StyleSheet`; dynamic theme color via inline array. CONVENTIONS.md L236–239 confirms.

### Inline-error pattern below every form control

**Source:** `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — used at L117–121, L144–148, L163–167, L184–188, L206–210, L223–227, L247–251, L264–268 (8 occurrences).
**Apply to:** both new stepper rows in Step3 (1 occurrence per row × 2 rows = 2 new occurrences).

**Excerpt** (`src/components/ContextualListingFlow/Step3BasicInfo.tsx:117–121`):
```tsx
{errors['basics.areaSqm'] ? (
  <Text style={[commonStyles.errorText, { color: colors.error }]}>
    {t(errors['basics.areaSqm'] as TranslationKeys)}
  </Text>
) : null}
```

Same exact shape applies to `'basics.bedrooms'` and `'basics.bathroomCount'`. D-10's submit-catch discriminator writes the i18n key INTO this `errors` bag — zero new rendering infrastructure.

### `testID` discipline on every control

**Source:** `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — `testID="basics-areaSqm"`, `testID="basics-price"`, `testID="rooms-chip-${o}"`, etc.
**Apply to:** `<StepperInput testID="basics-bedrooms" />` + `<StepperInput testID="basics-bathroomCount" />` at the call-sites; internally `StepperInput` exposes a discriminable trio (`${testID}-minus` / `${testID}-value` / `${testID}-plus` per CONTEXT.md L201) for the D-11 / D-12 test cases.

### `setBasics({ key: value })` patch-shape for FormBag writes

**Source:** `src/components/ContextualListingFlow/Step3BasicInfo.tsx:47–48`.
```typescript
const setBasics = (patch: Partial<FormBag['basics']>) =>
  onChange('basics', { ...values.basics, ...patch });
```
**Apply to:** the two new stepper `onChange` handlers — `setBasics({ bedrooms: v })` / `setBasics({ bathroomCount: v })`. D-08 explicitly confirms this is the write path.

### Co-located unit test stack — `react-test-renderer` + `act`

**Source:** `src/components/__tests__/EmailVerifyBanner.test.tsx`, `src/components/__tests__/PropertyCard.specChip.test.tsx`, `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` — all consistent.
**Apply to:** `StepperInput.test.tsx` (new) and the Step3.test.tsx extension cases (D-12).

**Convention:** NO `@testing-library/react-native` in dev deps. Use `react-test-renderer` + `act()` + `findAllByProps({testID})` / `findAll(n => n.props.accessibilityLabel === ...)`. Mock `useTheme` + `useLanguage` at the top of every test file. PropertyCard.specChip.test.tsx L20–23 documents this is a project-pinned convention.

---

## No Analog Found

None. Every Phase 7 file has a strong existing analog — either self (MOD files) or a composite of 2–3 existing components (NEW StepperInput.tsx). The previous Step3 → integration test extension (D-12) inherits the `Step3.test.tsx` setup verbatim.

---

## Phase 7 Boundary Anchors (files Phase 7 does NOT touch — verified against CONTEXT.md L163–167)

- `src/components/PropertyCard.tsx` — Phase 8 (DISP-01/02).
- `src/components/HospitalityCard.tsx` — Phase 8 (DISP-04).
- `src/screens/PropertyDetailsScreen.tsx` — Phase 8 (DISP-03).
- `src/utils/propertyCategory.ts` + `src/screens/HomeScreen.tsx` — Phase 9 (I18N-01..05).
- `src/types/Property.ts` — Phase 6 already added `bedrooms?: number` + `bathroomCount?: number` under `basics` (SCHEMA-03 shipped); Phase 7 READS this type via `Property` → `propertyToFormBag` but does NOT modify it.

---

## Metadata

**Analog search scope:**
- `src/components/` (NEW component analogs — AuthModalCloseButton, PasswordTextInput, PropertyCard)
- `src/components/__tests__/` (NEW test analog — EmailVerifyBanner.test.tsx primary, PropertyCard.specChip.test.tsx secondary)
- `src/components/ContextualListingFlow/` (every MOD target file + Step3.test.tsx for D-12)
- `src/locales/{en,ru}.ts` (i18n key namespace convention)
- `.planning/codebase/CONVENTIONS.md` L207–230 (component conventions: PascalCase.tsx, named exports, co-located StyleSheet, `TAP = 44`, hitSlop, theme inline-style arrays)

**Doc-bug surfaced for planner attention:**
- CONTEXT.md L23, L156 cite `src/locales/en.json` + `src/locales/ru.json` — actual files are `.ts`. Planner should plan against `.ts`. (Same doc-bug class as Phase 6 D-01 / D-02 corrections.)

**Pattern extraction date:** 2026-05-25
**Files scanned:** 11 reads (CONTEXT, REQUIREMENTS, STATE, ROADMAP, CONVENTIONS, AuthModalCloseButton, PasswordTextInput, Step3BasicInfo, types, adapters, validators, index, EmailVerifyBanner.test, PropertyCard.specChip.test, Step3.test, styles, PropertyCard, en.ts grep, ru.ts grep)

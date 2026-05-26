# Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 9 (4 production + 2 locale + 3 test)
**Analogs found:** 9 / 9 (every file has an in-repo analog; canonical anatomy lives in `PropertyDetailsScreen.tsx:1042-1076`)

## Pre-flight Correction

CONTEXT.md L20 + L151-152 + D-08 (L60) state "4 new i18n keys" land in `en.ts` / `ru.ts`. Verified against the live locale files: **`hospitality.bathrooms` already exists** (`en.ts:281` → `"Bathrooms"`, `ru.ts:283` → `"Ванные"`). Phase 8's real i18n delta is **3 keys**: `property.specs.bedrooms`, `property.specs.bathrooms`, `property.specs.rooms`. The `hospitality.bathrooms` reference for HospitalityCard D-07 reads an existing key — no add. Planner must call this out so the EN+RU parity gate (`scripts/check-i18n-parity.sh`) does not flag a phantom missing key.

## File Classification

| Phase-8 File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/PropertyCard.tsx` | component (presentational card) | request-response (read-only Property render) | `src/screens/PropertyDetailsScreen.tsx:1042-1076` (specs row anatomy) + self (`PropertyCard.tsx:280-300, 449-476`) | exact — same component receives the redesign |
| `src/components/HospitalityCard.tsx` | component (presentational card) | request-response (read-only Property render) | self (`HospitalityCard.tsx:209-212` meta line) | exact — surgical edit on existing line |
| `src/screens/PropertyDetailsScreen.tsx` | screen (presentational + sectioned) | request-response (read-only Property render) | self (`PropertyDetailsScreen.tsx:1042-1076`) — CANONICAL anatomy for cell pattern | exact |
| `src/components/ListingMetaTable.tsx` | component (presentational meta grid) | request-response (read-only Property render) | self (`ListingMetaTable.tsx:161-208` extras grid) | exact — surgical removal pattern (mirrors `260525-i2i` commit `15f1010`) |
| `src/locales/en.ts` | config (i18n string table) | request-response (key→value lookup) | self (`en.ts:123-127` existing `property.beds/baths/bathroom*` cluster; `en.ts:673-678` Phase-7 stepper additions) | exact — additive append pattern |
| `src/locales/ru.ts` | config (i18n string table) | request-response | self (`ru.ts:125-129`; `ru.ts:675-678`) | exact — must mirror `en.ts` keys in lockstep (parity gate) |
| `src/components/__tests__/PropertyCard.test.tsx` | test (new — does not exist yet) | n/a | `src/components/__tests__/PropertyCard.specChip.test.tsx` (existing on the same component) + `src/components/__tests__/StepperInput.test.tsx` (canonical co-located component test) | exact — same testing stack, same mocks, same component |
| `src/components/__tests__/HospitalityCard.test.tsx` | test (new — does not exist yet) | n/a | `src/components/__tests__/PropertyCard.specChip.test.tsx` | role-match (analogous card component, identical render-tree shape) |
| `src/screens/__tests__/PropertyDetailsScreen.test.tsx` | test (new — does not exist yet; sibling `PropertyDetailsScreen-mod-403.test.tsx` exists) | n/a | `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` (same screen, different concern) | exact — same screen, same heavy-tree mocking discipline |
| `src/components/__tests__/ListingMetaTable.test.tsx` | test (new — does not exist yet) | n/a | `src/components/__tests__/StepperInput.test.tsx` (canonical component test shape; renders a simpler component to assert text-content / structure) | role-match |

**Important boundary note for the planner:** CONTEXT.md L21 + L204-207 talk about "existing tests for the four touched files" being adapted. Only `PropertyCard.specChip.test.tsx` actually exists. The other three test files are NEW. The planner must either (a) extend `PropertyCard.specChip.test.tsx` in place for PropertyCard's new anatomy and CREATE three new test files for the other surfaces, or (b) add new `*.test.tsx` files alongside `PropertyCard.specChip.test.tsx`. Both options satisfy "co-located unit tests" convention (`CONVENTIONS.md:19`); recommend option (b) — additive — to keep `260525-ggp` regression fence isolated from Phase-8 anatomy assertions.

---

## Pattern Assignments

### `src/components/PropertyCard.tsx` (component, request-response)

**Primary analog:** `src/screens/PropertyDetailsScreen.tsx:1042-1076` for the icon + value + label cell anatomy.
**Self-analog:** `src/components/PropertyCard.tsx:280-300` for the container chrome + position in the JSX tree (the `else` branch of `showEditButton`).

**Imports (no new imports needed — Bed + Bath already imported)** — `PropertyCard.tsx:1-22`:
```tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Heart, Bed, Bath, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react-native';
import { Property } from '../types/Property';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { formatAddress } from '../utils/formatAddress';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ListingMetaTable } from './ListingMetaTable';
import { StatusPill } from './StatusPill';
```

**Current specs-strip branch (TO BE REPLACED)** — `PropertyCard.tsx:279-300`:
```tsx
) : (
  <View style={[styles.specsContainer, { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder }]}>
    <View style={styles.specItem}>
      <Bed size={16} color={colors.textSecondary} strokeWidth={2} />
      {/* Hotel/hostel listings write to basics.hotelRooms per M3 Phase 1 D-07 ... */}
      <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'}</Text>
    </View>
    <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
    <View style={styles.specItem}>
      <Bath size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text style={[styles.specValue, { color: colors.text }]}>
        {property.basics?.bathroom === 'private'
          ? t('property.bathroomPrivate' as any)
          : property.basics?.bathroom === 'shared'
            ? t('property.bathroomShared' as any)
            : property.basics?.bathroom === 'none'
              ? t('property.bathroomNone' as any)
              : '-'}
      </Text>
    </View>
  </View>
)}
```

**Canonical cell anatomy to copy** — from `PropertyDetailsScreen.tsx:1049-1054`:
```tsx
<View style={styles.specItem}>
  <Text style={styles.specIcon}>🛏</Text>  {/* PropertyCard substitutes <Bed size={16} ... /> here */}
  <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'}</Text>
  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.beds')}</Text>
</View>
```

**Existing PropertyCard StyleSheet (lines 449-476) — `specLabel` MUST be added**:
```tsx
specsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 16,
  borderWidth: 1,
  gap: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
},
specItem: {
  flexDirection: 'row',     // ← NOTE: PropertyCard's specItem is row-direction (icon + value side by side)
  alignItems: 'center',
  gap: 4,
},
specValue: {
  fontSize: 15,
  fontWeight: '600',
},
specDivider: {
  width: 1,
  height: 18,
  borderRadius: 1,
},
// ↑ NO `specLabel` style today. Phase 8 ADDS this.
```

**Style anatomy decision for the planner — `specItem` flexDirection conflict:**

PropertyDetailsScreen's `specItem` is `alignItems: 'center'` only (vertical column — `PropertyDetailsScreen.tsx:1993-1995`). PropertyCard's `specItem` is `flexDirection: 'row'` (horizontal — `PropertyCard.tsx:463-467`). CONTEXT D-01 says "same anatomy as PropertyDetailsScreen's specs row" (icon top, value middle, label below — stacked). To match, PropertyCard's `specItem` needs to become column-direction.

**Two options for the planner to pick:**

1. **Mutate `specItem` to column** (`flexDirection: 'column', alignItems: 'center', gap: 4`) — breaks the horizontal icon+value pairing today but matches CONTEXT D-01's "icon top, numeric value middle, localized label below" verbatim. Slightly taller cards.
2. **Add a new `specItemColumn` style** + keep `specItem` row — uses `specItemColumn` only for the new 3-element layout. Less mutation; preserves any in-flight diffs.

Recommend option 1 (mutate `specItem`) — there's exactly one consumer of the style. Add a `specLabel` style mirroring `PropertyDetailsScreen.tsx:2004-2006`:
```tsx
specLabel: {
  fontSize: 12,
},
```

**Office/commercial Beds-cell gate pattern** — CONTEXT specifics L228-235:
```tsx
const showBedsCell = !(property.propertyType === 'office' || property.propertyType === 'commercial');
// ...
{showBedsCell && (
  <View style={styles.specItem}>
    <Bed size={16} color={colors.textSecondary} strokeWidth={2} />
    <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.bedrooms ?? '-'}</Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bedrooms' as any)}</Text>
  </View>
)}
{showBedsCell && (
  <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
)}
<View style={styles.specItem}>
  <Bath size={16} color={colors.textSecondary} strokeWidth={2} />
  <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.bathroomCount ?? '-'}</Text>
  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bathrooms' as any)}</Text>
</View>
```

**Conditional-render-the-View pattern (no `display:'none'` / `visibility:'hidden'`)** — `CONVENTIONS.md:262-273` documents the keep-alive vs render-tree distinction; for components NOT in App.tsx's keep-alive set, ordinary `{flag && <View ... />}` is the convention. PropertyCard already follows this (`showEditButton` branch).

**i18n type-assertion pattern** — `PropertyCard.tsx:291` and CONTEXT L193: `t('property.bathroomPrivate' as any)`. New `property.specs.*` keys will need `as any` casts until the `TranslationKeys` union regenerates.

---

### `src/components/HospitalityCard.tsx` (component, request-response)

**Self-analog:** `HospitalityCard.tsx:206-212` for the existing single-line meta render.

**Imports (no new imports needed)** — `HospitalityCard.tsx:20-38`. `useLanguage` already imported (line 35); `t` already in scope (destructured at component body).

**Current meta line (TO BE EXTENDED — children expression only, NO structural change)** — `HospitalityCard.tsx:206-212`:
```tsx
{/* D-10: rooms + maxGuests meta — no price formatter, no beds/baths/sqft meta table.
    hotelRooms (basics.hotelRooms) takes precedence for hotel/hostel; falls back to
    generic basics.rooms. maxGuests stays TOP-LEVEL per D-21 (Phase 1 D-09 preserved). */}
<Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
  {(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')} {t('hospitality.rooms')} · {property.maxGuests ?? 0}{' '}
  {t('hospitality.maxGuests')}
</Text>
```

**Target inline-fragment pattern** — copy from CONTEXT L238-246; note this preserves M1 Phase 6 D-10 "no specs-strip block" invariant:
```tsx
<Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
  {(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')} {t('hospitality.rooms')}
  {property.basics?.bathroomCount !== undefined ? (
    <>{' · '}{property.basics.bathroomCount} {t('hospitality.bathrooms')}</>
  ) : null}
  {' · '}{property.maxGuests ?? 0} {t('hospitality.maxGuests')}
</Text>
```

**Key reuse — `hospitality.bathrooms` already exists** (`en.ts:281` / `ru.ts:283`). No locale add for this key.

**No StyleSheet changes** — `styles.meta` is shared with the existing render. The `numberOfLines={1}` clamp on line 209 handles RU/EN truncation for narrow widths (CONTEXT D-06).

---

### `src/screens/PropertyDetailsScreen.tsx` (screen, request-response)

**Self-analog:** `PropertyDetailsScreen.tsx:1042-1076` (the specs row itself — Phase 8 modifies in place).

**Current specs row (TO BE REWRITTEN)** — `PropertyDetailsScreen.tsx:1047-1076`:
```tsx
{!isHospitality && (
  <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>🛏</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'}</Text>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.beds')}</Text>
    </View>
    <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>🚿</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>
        {property.basics?.bathroom === 'private'
          ? t('property.bathroomPrivate' as any)
          : property.basics?.bathroom === 'shared'
            ? t('property.bathroomShared' as any)
            : property.basics?.bathroom === 'none'
              ? t('property.bathroomNone' as any)
              : '-'}
      </Text>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.baths')}</Text>
    </View>
    <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>📐</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.areaSqm ?? '-'}</Text>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>m²</Text>
    </View>
  </View>
)}
```

**Existing helpers Phase 8 reuses** — `PropertyDetailsScreen.tsx:67, 273-274`:
```tsx
import { propertyTypeToCategory } from '../utils/propertyCategory';
// ...
const category = propertyTypeToCategory(property.propertyType);
const isHospitality = category === 'Hospitality';
```

**Existing StyleSheet (no edits needed; just reuse)** — `PropertyDetailsScreen.tsx:1984-2010`:
```tsx
specsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingVertical: 16,
  borderRadius: 16,
  borderWidth: 1,
  marginBottom: 24,
},
specItem: {
  alignItems: 'center',     // ← column-stacked already (icon / value / label)
},
specIcon: {
  fontSize: 20,
  marginBottom: 4,
},
specValue: {
  fontSize: 16,
  fontWeight: '700',
},
specLabel: {
  fontSize: 12,
},
verticalDivider: {
  width: 1,
  height: 30,
},
```

**Target rewrite (copy from CONTEXT specifics L249-277)** — three decisions baked in: (a) `!isHospitality` gate LIFTED per CONTEXT L89's "Claude's Discretion" recommendation; (b) Beds-cell hides on office/commercial; (c) bathroom enum → `bathroomCount`:
```tsx
const bedsLabelKey = isHospitality ? 'property.specs.rooms' : 'property.specs.bedrooms';
const bedsValue = isHospitality
  ? (property.basics?.hotelRooms ?? '-')
  : (property.basics?.bedrooms ?? '-');
const showBedsCell = !(property.propertyType === 'office' || property.propertyType === 'commercial');

// ... inside the JSX (no outer !isHospitality gate):
<View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  {showBedsCell && (
    <>
      <View style={styles.specItem}>
        <Text style={styles.specIcon}>🛏</Text>
        <Text style={[styles.specValue, { color: colors.text }]}>{bedsValue}</Text>
        <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t(bedsLabelKey as any)}</Text>
      </View>
      <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
    </>
  )}
  <View style={styles.specItem}>
    <Text style={styles.specIcon}>🚿</Text>
    <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.bathroomCount ?? '-'}</Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bathrooms' as any)}</Text>
  </View>
  <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
  <View style={styles.specItem}>
    <Text style={styles.specIcon}>📐</Text>
    <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.areaSqm ?? '-'}</Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>m²</Text>
  </View>
</View>
```

**Decimal-format inline rule** (CONTEXT L81 — bathroomCount may be `1.5`):
```tsx
// Inline at value site, matching StepperInput's formatValue but local:
const formatBathroomCount = (v: number | undefined) =>
  v === undefined ? '-' : Number.isInteger(v) ? String(v) : v.toFixed(1);
// Then: <Text ...>{formatBathroomCount(property.basics?.bathroomCount)}</Text>
```

Planner may extract `formatBathroomCount` to `src/utils/` if duplicated across all three render surfaces. CONTEXT L81 marks this as Claude's Discretion.

---

### `src/components/ListingMetaTable.tsx` (component, request-response)

**Self-analog:** the exact lines to delete (surgical-removal pattern, mirrors `260525-i2i` commit `15f1010`).

**Lines to delete — `ListingMetaTable.tsx:163-176`**:
```tsx
{rooms != null && (
  <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
    {t('property.beds')}: {rooms}
  </Text>
)}
{bathroom != null && (
  <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
    {t('property.baths')}: {bathroom === 'private'
      ? t('property.bathroomPrivate' as any)
      : bathroom === 'shared'
        ? t('property.bathroomShared' as any)
        : t('property.bathroomNone' as any)}
  </Text>
)}
```

**Lines to delete — `ListingMetaTable.tsx:68-69`** (derivations no longer referenced):
```tsx
const rooms = property?.basics?.rooms;
const bathroom = property?.basics?.bathroom;
```

**Lines to edit — `ListingMetaTable.tsx:78-87`** (drop two `||` chain links):
```tsx
// BEFORE:
const hasExtras =
  rooms != null ||
  bathroom != null ||
  areaSqm != null ||
  condition != null ||
  furnished != null ||
  negotiable != null ||
  deposit != null ||
  prepaymentMonths != null ||
  minTerm != null;

// AFTER:
const hasExtras =
  areaSqm != null ||
  condition != null ||
  furnished != null ||
  negotiable != null ||
  deposit != null ||
  prepaymentMonths != null ||
  minTerm != null;
```

**Note: `areaSqm` derivation (line 70) stays** — the m² extras-grid row was already removed by `260525-i2i` (commit `15f1010`); the variable could be unused too, but verifying that's outside Phase 8 scope. Planner may leave `areaSqm` alone or sweep it in the same surgical pass.

**Pattern source for surgical removal** — `260525-i2i-remove-duplicate-m-rendering-from-listin/` quick-task delta:
- 5-line deletion in `ListingMetaTable.tsx`
- No replacement
- No new test (deletion was self-verifying)
- Commit message anchored the rationale: "extras grid was duplicating PropertyDetailsScreen's specs row"

Phase 8 D-09 follows the identical pattern; planner can cite this commit as precedent.

---

### `src/locales/en.ts` (config, request-response)

**Self-analog:** `en.ts:123-127` (existing `property.bathroomPrivate/Shared/None` cluster — same namespace) and `en.ts:673-678` (Phase-7 stepper keys — same "phase N adds keys" pattern).

**Existing cluster (DO NOT TOUCH — D-08 lock)** — `en.ts:121-128`:
```tsx
'property.available': 'Available:',
'property.now': 'now',
'property.beds': 'Beds',
'property.baths': 'Baths',
'property.bathroomPrivate': 'Private',
'property.bathroomShared': 'Shared',
'property.bathroomNone': 'None',
'property.details': 'Details',
```

**Existing `hospitality.bathrooms`** (`en.ts:281`) — **already shipped, NO add needed**:
```tsx
'hospitality.bathrooms': 'Bathrooms',
```

**Keys to ADD (3 keys; placement: in the `property.*` cluster around L128, OR new dedicated `property.specs.*` block — either works for the parity gate):**
```tsx
// Phase 8 (Plan 08-XX) — specs-row labels for PropertyCard + PropertyDetailsScreen (DISP-01..DISP-05).
'property.specs.bedrooms': 'Bedrooms',
'property.specs.bathrooms': 'Bathrooms',
'property.specs.rooms': 'Rooms',
```

**Phase-N annotation convention** (mirrors `en.ts:672` Phase-7 comment): always include a `// Phase X (Plan XX-YY) — …` header before new keys. The audit walk in Phase 9 will key off these annotations.

---

### `src/locales/ru.ts` (config, request-response)

**Same pattern as en.ts.** Lockstep parity required (`scripts/check-i18n-parity.sh`).

**Keys to ADD (3 keys, identical key strings, RU values):**
```tsx
// Phase 8 (Plan 08-XX) — specs-row labels for PropertyCard + PropertyDetailsScreen (DISP-01..DISP-05).
'property.specs.bedrooms': 'Спальни',
'property.specs.bathrooms': 'Ванные',
'property.specs.rooms': 'Комнаты',
```

**Existing `hospitality.bathrooms`** (`ru.ts:283`) — already `"Ванные"`. NO add needed.

**Parity-gate gotcha** — both `en.ts` and `ru.ts` must include the same KEY strings; placement order doesn't matter to the gate but matters to humans (keep blocks aligned by line number for diff readability — Phase 7's stepper keys land at `en.ts:673` and `ru.ts:675` and they read symmetrically).

---

### `src/components/__tests__/PropertyCard.test.tsx` (test — NEW FILE)

**Closest analog:** `src/components/__tests__/PropertyCard.specChip.test.tsx` (same component, regression-fence test for `260525-ggp`).

**Test stack (canonical for this repo per `CONVENTIONS.md:19` + `PropertyCard.specChip.test.tsx:20-23`):**
- `react-test-renderer` + `act()` — **NO** React Testing Library, **NO** `jest-native`
- Mock pattern: `jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }))` and re-require to get the mock handle
- `t` mock returns the key verbatim (`(key: string) => key`) so assertions can match the i18n key directly

**Imports pattern to copy** — `PropertyCard.specChip.test.tsx:24-49`:
```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '../../types/Property';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../ListingMetaTable', () => ({ ListingMetaTable: () => null }));
jest.mock('../StatusPill', () => ({ StatusPill: () => null }));
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Bed: () => null,
  Bath: () => null,
  Pencil: () => null,
  Trash2: () => null,
  Archive: () => null,
  ArchiveRestore: () => null,
}));
```

**Mock setup + render helper** — copy `PropertyCard.specChip.test.tsx:55-105` verbatim.

**Text-collection assertion pattern** — `PropertyCard.specChip.test.tsx:111-124`:
```tsx
const collectTexts = (tree: TestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  tree.root.findAllByType(Text).forEach((node) => {
    const c = node.props.children;
    if (typeof c === 'string') {
      out.push(c);
    } else if (Array.isArray(c)) {
      c.forEach((sub) => {
        if (typeof sub === 'string') out.push(sub);
      });
    }
  });
  return out;
};
```

**Cases to cover (Phase 8 anatomy assertions):**
1. apartment + `basics.bedrooms=2, bathroomCount=1.5` → texts contain `2`, `1.5`, `property.specs.bedrooms`, `property.specs.bathrooms`
2. house + `basics.bedrooms=3` (no bathroomCount) → contains `3`, `-`, both labels
3. office + `basics.bathroomCount=1` (no bedrooms) → Beds cell hidden; texts do NOT contain `property.specs.bedrooms`
4. commercial + `basics.bathroomCount=2` → Beds cell hidden; texts contain `2`, `property.specs.bathrooms`
5. apartment + empty basics → `-`, `-`, both labels still present
6. hotel/hostel routing — N/A (CONTEXT D-03: PropertyCard never sees hospitality data post-`260525-ggp`)

**Boundary fence:** Keep `PropertyCard.specChip.test.tsx` intact (it pins `260525-ggp` Task 2 — historical regression fence; planner adds `PropertyCard.test.tsx` alongside, not in-place).

---

### `src/components/__tests__/HospitalityCard.test.tsx` (test — NEW FILE)

**Closest analog:** `PropertyCard.specChip.test.tsx` (analogous card component).

**Mocks needed (lean — HospitalityCard imports fewer subcomponents than PropertyCard):**
```tsx
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Pencil: () => null,
  Trash2: () => null,
  Archive: () => null,
  ArchiveRestore: () => null,
}));
// AMENITY_ICONS — mock the utility to render to null
jest.mock('../../utils/hospitalityAmenities', () => ({
  AMENITY_ICONS: new Proxy({}, { get: () => () => null }),
}));
```

**Cases to cover (Phase 8 D-06 + D-07 — conditional inline fragment):**
1. hotel + `basics.hotelRooms=4, bathroomCount=1.5, maxGuests=8` → texts contain `4`, `1.5`, `8`, `hospitality.rooms`, `hospitality.bathrooms`, `hospitality.maxGuests`
2. hostel + `basics.hotelRooms=1` (no bathroomCount) → texts contain `1`, do NOT contain `hospitality.bathrooms` (fragment absent)
3. hotel + `basics={}` (no rooms, no bathroomCount, no maxGuests) → `-`, `0`, fragment absent

**Critical fragment assertion** — D-06 invariant: when `bathroomCount === undefined`, the inline fragment must not render and no orphan `·` separator should appear. Assert by collecting all texts and verifying the count of `·` separators (1 separator when fragment absent, 2 when present).

---

### `src/screens/__tests__/PropertyDetailsScreen.test.tsx` (test — NEW FILE)

**Closest analog:** `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` (same screen, different concern — moderation 403 dock).

**Heavy-tree mocking discipline** — this screen is 53KB; existing test mocks subcomponents aggressively. Planner reads `PropertyDetailsScreen-mod-403.test.tsx` to lift the mock-set verbatim, then adds:
- Mock `propertyTypeToCategory` to return `'Hospitality' | 'Residential' | 'Commercial'` deterministically per case
- Mock `useAuth`, `useTheme`, `useLanguage`, `useSafeAreaInsets`
- Mock subcomponents `ListingMetaTable`, `PropertyMap`, `Tour3DScreen` import surfaces

**Cases to cover (Phase 8 specs row rewrite — including the `!isHospitality` gate lift):**
1. apartment + `basics.bedrooms=2, bathroomCount=1.5, areaSqm=85` → specs row renders 3 cells; Beds cell label = `property.specs.bedrooms`; Baths cell value = `1.5`; m² cell = `85`
2. office + `basics.bathroomCount=1, areaSqm=120` → 2 cells (Beds hidden); Baths label = `property.specs.bathrooms`
3. commercial + `basics.bathroomCount=2` → 2 cells (Beds hidden)
4. hotel + `basics.hotelRooms=4, bathroomCount=1, areaSqm=20` → 3 cells; Beds cell label = `property.specs.rooms` (NOT `property.specs.bedrooms` — hospitality flip)
5. hostel + `basics.hotelRooms=1` → 3 cells; Beds label = `property.specs.rooms`; Baths value = `-`

**Decision-anchor case:** Case 4 + 5 are the ones that EXIST ONLY if the planner lifts the `!isHospitality` gate per CONTEXT L89 Discretion. If the planner KEEPS the gate, drop these cases and document the choice in PLAN.md.

---

### `src/components/__tests__/ListingMetaTable.test.tsx` (test — NEW FILE)

**Closest analog:** `StepperInput.test.tsx` (canonical co-located component test shape — render component + assert by `testID` and text content).

**Mocks:**
```tsx
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
```

**Cases to cover (Phase 8 D-09 + D-10 — surgical removal verification):**
1. Property with `basics.rooms='3'` only → extras grid does NOT render a "Beds: 3" row (regression fence: the row USED TO render pre-Phase-8)
2. Property with `basics.bathroom='private'` only → extras grid does NOT render a "Baths: Private" row
3. Property with `basics.rooms` + `basics.bathroom` + nothing else → `hasExtras` is false → entire extras grid does NOT render (gate verification: chain dropped two contributors but still gates correctly when nothing else triggers it)
4. Property with `basics.rooms='3'` + `terms.deposit={amount: 1000, currency: 'KGS'}` → extras grid renders ONE row (the deposit row), confirms `rooms` no longer contributes
5. Property with `basics.bathroom='shared'` + `conditionAndAmenities.condition='renovated'` → extras grid renders ONE row (the condition row)
6. Property with all extras populated EXCEPT `rooms` and `bathroom` → all other rows render correctly (no collateral damage)

**Assertion strategy:** Use `collectTexts` pattern from `PropertyCard.specChip.test.tsx:111-124` (clone it). Assert presence/absence of specific strings (`property.beds: 3`, `property.baths: property.bathroomPrivate`).

---

## Shared Patterns

### Theme + Language hooks
**Source:** `useTheme()` from `src/theme/ThemeContext` + `useLanguage()` from `src/context/LanguageContext`
**Apply to:** All 4 production files (already wired in every one of them — zero new context plumbing per CONTEXT L184).
```tsx
const { colors } = useTheme();
const { t } = useLanguage();
```

### Theme-aware inline-array style pattern
**Source:** Repo-wide convention (`CONVENTIONS.md:235-239` + every component file)
**Apply to:** All new spec cells (PropertyCard, PropertyDetailsScreen).
```tsx
<Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
<Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bedrooms' as any)}</Text>
```

### i18n type-assertion (until TranslationKeys union regenerates)
**Source:** `PropertyCard.tsx:291` + `PropertyDetailsScreen.tsx:1060-1064` + `ListingMetaTable.tsx:171-174`
**Apply to:** All `t('property.specs.*' as any)` calls in Phase 8 until the TranslationKeys union picks up the new keys. CONTEXT L193 confirms this is the existing pattern.

### Surgical-removal pattern (no replacement, no new fields)
**Source:** `260525-i2i` quick-task — commit `15f1010` removed duplicate m² rendering from `ListingMetaTable.extrasGrid`.
**Apply to:** ListingMetaTable D-09 (the `rooms` row + `bathroom` enum row deletion).

### Phase-N annotation comment header on new i18n keys
**Source:** `en.ts:672` and `ru.ts:674`: `// Phase 07 (Plan 07-02) — bedrooms + bathroomCount stepper keys (FORM-02, FORM-04).`
**Apply to:** Both locale files for Phase 8's 3 new keys.
```tsx
// Phase 8 (Plan 08-XX) — specs-row labels for PropertyCard + PropertyDetailsScreen (DISP-01..DISP-05).
```

### Test stack — react-test-renderer + act() only
**Source:** `CONVENTIONS.md:19` + `PropertyCard.specChip.test.tsx:20-23` + `StepperInput.test.tsx:8-9`
**Apply to:** All 3 new test files (and the extension to `PropertyCard.specChip.test.tsx` if planner chooses option (a)).
- NO React Testing Library, NO `@testing-library/jest-native`
- Mock useTheme/useLanguage/useAuth via `jest.mock` + re-require
- `t` mock returns the key verbatim
- Heavy subcomponents (`ListingMetaTable`, `StatusPill`, `PropertyMap`) mocked to `() => null`

### Co-located test placement (CONVENTIONS.md:19)
**Source:** `src/<subdir>/__tests__/<file>.test.tsx`
**Apply to:** All 3 new test files (`src/components/__tests__/...` and `src/screens/__tests__/...`).

### Conditional-render-the-View pattern (NOT visibility/display)
**Source:** `PropertyCard.tsx:215-300` (showEditButton mutual exclusion) + repo-wide convention.
**Apply to:** Beds-cell hide on office/commercial (PropertyCard + PropertyDetailsScreen). `{showBedsCell && <View ... />}`.

### Conditional inline JSX fragment (no orphan separator)
**Source:** New pattern landing in HospitalityCard D-06. No existing in-repo analog for inline fragment with separator-pair management.
**Apply to:** HospitalityCard meta-line D-06. Critical invariant: when condition is false, the separator preceding the fragment must ALSO not render (don't leak `·`).

```tsx
{condition !== undefined ? (
  <>{' · '}{value} {t(key)}</>
) : null}
```

---

## No Analog Found

All Phase 8 files have in-repo analogs (either self or sibling). No file requires fallback to RESEARCH.md patterns.

**Notable "no test analog yet" cases:** 3 of the 4 test files are new files, not modifications. CONTEXT L21 + L204-207 are misleading on this point — the planner should treat the test work as ADDITIVE (3 new files + optional extension to `PropertyCard.specChip.test.tsx`) rather than IN-PLACE MODIFICATION.

---

## Metadata

**Analog search scope:**
- `src/components/PropertyCard.tsx` (530 LOC)
- `src/components/HospitalityCard.tsx` (~280 LOC)
- `src/screens/PropertyDetailsScreen.tsx` (~2000 LOC; targeted reads only — never loaded whole)
- `src/components/ListingMetaTable.tsx` (290 LOC)
- `src/locales/en.ts` (778 LOC; targeted reads at L118-134 and L275-285 and L668-678)
- `src/locales/ru.ts` (767 LOC; symmetric targeted reads)
- `src/components/__tests__/PropertyCard.specChip.test.tsx` (205 LOC — entire file as canonical test analog)
- `src/components/__tests__/StepperInput.test.tsx` (header only — canonical mock-pattern seed)

**Files scanned (existence checks via Bash + Glob):** 17 test files in repo; 4 named in CONTEXT.md, only 1 exists.

**Pre-flight corrections made:**
1. `hospitality.bathrooms` already exists in both locale files — Phase 8's i18n delta is 3 keys not 4.
2. Three of four test files do not exist — they are new files (CONTEXT.md framing is misleading on this).
3. PropertyCard's `specItem` is row-direction (line 463-467); PropertyDetailsScreen's is column-stacked (line 1993-1995). The D-01 "same anatomy" goal requires mutating PropertyCard's style (or adding a new style). Recommend mutation.

**Pattern extraction date:** 2026-05-25

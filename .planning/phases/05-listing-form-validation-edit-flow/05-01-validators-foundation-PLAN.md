---
phase: 05-listing-form-validation-edit-flow
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CreateListingForm/validators.ts
  - src/components/CreateListingForm/__tests__/validators.test.ts
  - src/components/CreateListingForm/types.ts
  - src/components/CreateListingForm/index.ts
autonomous: true
requirements: [FORM-04, FORM-06]
tags: [validation, pure-function, jest, typescript, react-native]
must_haves:
  truths:
    - "A pure validateByCategory(values, category) function returns {isValid, errors} with per-category required-field logic"
    - "A pure buildPayloadByCategory(values, category) function shapes the submit payload per category with D-09 anchors unconditionally preserved"
    - "Jest unit tests prove validator + payload-builder behavior across all 3 categories and the hybrid contact rule"
    - "FormBag.currency is tightened from `string` to `Currency | ''` where Currency is the literal union `'$' | 'сом'`"
  artifacts:
    - path: "src/components/CreateListingForm/validators.ts"
      provides: "validateByCategory + buildPayloadByCategory + CURRENCY_OPTIONS + Currency + FIELD_ORDER_BY_CATEGORY + ValidateResult"
      min_lines: 120
      exports: ["validateByCategory", "buildPayloadByCategory", "CURRENCY_OPTIONS", "FIELD_ORDER_BY_CATEGORY"]
    - path: "src/components/CreateListingForm/__tests__/validators.test.ts"
      provides: "Jest unit tests (~18-22 assertions)"
      min_lines: 150
    - path: "src/components/CreateListingForm/types.ts"
      provides: "FormBag with currency: Currency | '' + Currency re-export"
      contains: "currency: Currency | ''"
    - path: "src/components/CreateListingForm/index.ts"
      provides: "barrel with validator + builder + Currency re-exports"
      contains: "validateByCategory"
  key_links:
    - from: "src/components/CreateListingForm/validators.ts"
      to: "src/utils/propertyCategory.ts"
      via: "import { RESIDENTIAL_TYPES, COMMERCIAL_TYPES, HOSPITALITY_TYPES, type PropertyCategory }"
      pattern: "from '../../utils/propertyCategory'"
    - from: "src/components/CreateListingForm/__tests__/validators.test.ts"
      to: "src/components/CreateListingForm/validators.ts"
      via: "named imports"
      pattern: "from '../validators'"
---

<objective>
Create `validators.ts` as the single source of truth for per-category validation (FORM-06) and submit payload shaping, plus the Jest test suite that proves its behavior (D-17). Tighten `FormBag.currency` to a literal union type (D-18). This is Wave 1 foundation — every other Phase 5 plan depends on these exports.

Purpose: `validateByCategory` and `buildPayloadByCategory` collapse the 4 inline `Alert.alert` checks at `CreateListingScreen.tsx:415-431` and the 30-line inline payload object at `:451-481` into two pure functions that can be unit-tested without React. Role-agnostic per D-17 / RESEARCH Finding #10 — role gating for `platformVerifications` stays at the orchestrator call-site.

Output:
- `src/components/CreateListingForm/validators.ts` (~150 LOC pure module)
- `src/components/CreateListingForm/__tests__/validators.test.ts` (~200 LOC, ~18-22 assertions)
- `src/components/CreateListingForm/types.ts` with tightened `currency` type
- `src/components/CreateListingForm/index.ts` barrel with 5 new re-exports
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md
@.planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md
@.planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md
@.planning/phases/05-listing-form-validation-edit-flow/05-VALIDATION.md
@src/utils/propertyCategory.ts
@src/utils/__tests__/propertyCategory.test.ts
@src/components/CreateListingForm/types.ts
@src/components/CreateListingForm/index.ts
@src/components/CreateListingForm/PriceSection.tsx
@src/types/Property.ts

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from codebase — use these directly; no codebase exploration needed. -->

From src/components/CreateListingForm/types.ts (current):
```typescript
export interface FormBag {
  title: string;
  description: string;
  address: string;
  city: string;
  district: string;
  type: 'rent' | 'sale';
  propertyType: string;
  status: 'draft' | 'live';
  features: string[];
  featureInput: string;
  selectedImages: any[];
  availableDate: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  price: string;
  currency: string;   // ← line 34; Phase 5 tightens to Currency | ''
  rooms: string;
  maxGuests: string;
  amenities: string[];
  tours: Array<{ id: string; title: string; url: string }>;
  tourTitle: string;
  tourUrl: string;
  videoUrl: string;
  panoramicPhotosUrl: string;
  instagramUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  verifyOwnership: boolean;
  verifyOwnerId: boolean;
  verifyStateDocs: boolean;
}

export type FormErrorBag = Partial<Record<keyof FormBag, string>>;

export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;
}
```

From src/utils/propertyCategory.ts (excerpt):
```typescript
export const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'] as const;
export const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'] as const;
export const HOSPITALITY_TYPES = ['Hostel', 'Hotel'] as const;

export type PropertyCategory = 'Residential' | 'Commercial' | 'Hospitality';

export function propertyTypeToCategory(propertyType: string): PropertyCategory {
  // Returns category for known type; defaults to 'Residential' for unknown
}
```

From src/types/Property.ts (excerpt — `Property` type exists; `Partial<Property>` is the payload shape target).

From src/utils/__tests__/propertyCategory.test.ts (test pattern — copy verbatim header):
```typescript
/**
 * @format
 */

import { ... } from '../propertyCategory';
```

From src/components/CreateListingForm/PriceSection.tsx:25-28 (CURRENCY_OPTIONS source — migrate to validators.ts):
```typescript
const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;
```
</interfaces>

<research_evidence>
- CONTEXT.md D-06: `buildPayloadByCategory` lives at `src/components/CreateListingForm/validators.ts` alongside `validateByCategory`; submit payload built exclusively through it
- CONTEXT.md D-07: Required-field map — Residential: title/description/address/city/district/bedrooms/bathrooms/areaSqm/price/currency; Commercial: same shared + areaSqm/price/currency (no bedrooms/bathrooms) + propertyType ∈ COMMERCIAL_TYPES; Hospitality: title/description/address/city/district/rooms/bathrooms/maxGuests + hybrid contact rule (D-09/D-10)
- CONTEXT.md D-09/D-10: Hybrid contact — if ANY of contactPhone/whatsapp/telegram non-empty, require phone + (WA OR TG); if ALL empty, pass-through valid
- CONTEXT.md D-13/D-14: Hospitality amenities NOT validated, NOT in payload (deferred to Phase 6)
- CONTEXT.md D-17: Jest at `src/components/CreateListingForm/__tests__/validators.test.ts` matching `propertyCategory.test.ts` + `useRole.test.ts` pattern; 15-20 assertions; zero mocks
- CONTEXT.md D-18: `Currency = '$' | 'сом'`, `FormBag.currency: Currency | ''`, validator asserts `currency !== ''` for Residential + Commercial
- RESEARCH Finding #2: `preset: 'react-native'` auto-discovers `src/**/__tests__/*.test.ts` — verified via `npm test -- --listTests`
- RESEARCH Finding #5: All 10 currency callsites enumerated — rehydrate normalizer at `CreateListingScreen.tsx:239-246` already outputs canonical `'$' | 'сом' | ''`; zero logic changes needed
- RESEARCH Finding #6: D-09 anchors (panoramicPhotosUrl + tours) must land INSIDE the `shared` object in `buildPayloadByCategory` — unconditional for all 3 categories
- RESEARCH Finding #10: Validator MUST NOT import useRole/AuthContext/Gated; `platformVerifications` role gate stays at call-site
- PATTERNS.md §1: Full validators.ts structure; analog is `src/utils/propertyCategory.ts`
- PATTERNS.md §2: Full validators.test.ts structure; analog is `src/utils/__tests__/propertyCategory.test.ts`
</research_evidence>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/components/CreateListingForm/validators.ts with pure validator + payload-builder + Currency type</name>
  <files>src/components/CreateListingForm/validators.ts</files>
  <read_first>
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md (D-06, D-07, D-09, D-10, D-13, D-14, D-17, D-18)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §1 (validators.ts structure — transcribe verbatim)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #6 (D-09 anchor preservation inside `shared` block) + Finding #10 (role-agnostic invariant)
    - src/utils/propertyCategory.ts (primary analog — named exports, `as const`, SCREAMING_SNAKE_CASE, safe-default)
    - src/components/CreateListingForm/types.ts (FormBag shape — validator consumes this)
    - src/components/CreateListingForm/PriceSection.tsx:25-28 (source of CURRENCY_OPTIONS literal — migrate verbatim)
    - src/types/Property.ts (Property type — `Partial<Property>` is return type of buildPayloadByCategory)
  </read_first>
  <behavior>
    - validateByCategory returns {isValid: true, errors: {}} for Residential with all required fields filled (title='T', description='D', address='A', city='Bishkek', district='X', propertyType='Apartment', bedrooms='2', bathrooms='1', areaSqm='80', price='1000', currency='$')
    - validateByCategory returns {isValid: false, errors.bedrooms: 'createListing.bedroomsRequired'} when bedrooms is empty string in Residential
    - validateByCategory Commercial branch: requires areaSqm/price/currency, NOT bedrooms/bathrooms
    - validateByCategory Commercial branch: asserts `propertyType ∈ COMMERCIAL_TYPES` (defensive per RESEARCH Pitfall 5)
    - validateByCategory Hospitality branch: requires rooms/bathrooms/maxGuests; NOT price/currency/areaSqm
    - validateByCategory Hospitality hybrid contact rule (D-09/D-10):
      - All three contacts empty → valid pass-through
      - phone only → invalid, errors.contactPhone set
      - whatsapp only → invalid, errors.contactPhone set
      - telegram only → invalid, errors.contactPhone set
      - phone + whatsapp → valid
      - phone + telegram → valid
      - phone + whatsapp + telegram → valid
    - buildPayloadByCategory Residential: payload includes bedrooms/bathrooms/areaSqm/price/currency plus all shared fields
    - buildPayloadByCategory Commercial: payload includes areaSqm/price/currency plus shared; does NOT include bedrooms/bathrooms keys
    - buildPayloadByCategory Hospitality: payload includes rooms/bathrooms/maxGuests plus shared; does NOT include price/currency/areaSqm/period/amenities keys
    - buildPayloadByCategory all 3 categories: payload ALWAYS includes panoramicPhotosUrl (D-09 ANCHOR B) and tours as `tours.length > 0 ? tours : undefined` (D-09 ANCHOR C)
    - Shared-always fields in payload: title/description/type/propertyType/period/features/videoUrl/panoramicPhotosUrl/instagramUrl/availableDate/status/tours
    - Role-agnostic invariant: file does NOT import useRole/useAuth/AuthContext/Gated; no `can(` calls anywhere
  </behavior>
  <action>
    Create `src/components/CreateListingForm/validators.ts` as a pure module. Transcribe the full structure from PATTERNS.md §1. The file MUST export the following identifiers:
    - `CURRENCY_OPTIONS` (migrated verbatim from PriceSection.tsx:25-28 — `const CURRENCY_OPTIONS = [{value:'$',label:'🇺🇸 USD'},{value:'сом',label:'🇰🇬 сом'}] as const`)
    - `type Currency = (typeof CURRENCY_OPTIONS)[number]['value']` — resolves to `'$' | 'сом'`
    - `type ValidateResult = { isValid: boolean; errors: FormErrorBag }`
    - `const FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]>` with:
      - Residential: `['title', 'description', 'address', 'district', 'city', 'bedrooms', 'bathrooms', 'areaSqm', 'currency', 'price', 'availableDate']`
      - Commercial: `['title', 'description', 'address', 'district', 'city', 'areaSqm', 'currency', 'price', 'availableDate']`
      - Hospitality: `['title', 'description', 'address', 'district', 'city', 'rooms', 'maxGuests', 'bathrooms', 'contactPhone']`
    - `function validateByCategory(values: FormBag, category: PropertyCategory): ValidateResult`
    - `function buildPayloadByCategory(values: FormBag, category: PropertyCategory): Partial<Property>`

    Imports (order per CONVENTIONS.md §Import Organization):
    ```typescript
    import type { FormBag, FormErrorBag } from './types';
    import { COMMERCIAL_TYPES, type PropertyCategory } from '../../utils/propertyCategory';
    import type { Property } from '../../types/Property';
    ```

    **DO NOT** import `useRole`, `useAuth`, `AuthContext`, `Gated`, or anything from `../hooks/` / `../context/` / `react`. The file has ZERO React imports (per D-17 / RESEARCH Finding #10).

    File header docblock (copy verbatim from PATTERNS.md §1, including the "role-agnostic per D-17" + "Role gating for platformVerifications stays at the call-site" text).

    `validateByCategory` body — transcribe from PATTERNS.md §1 excerpt. Shared hard-required checks first (title/description/address/city/district), then category-specific. Error VALUES are translation keys (e.g., `'createListing.bedroomsRequired'`) not translated strings — the validator is role-agnostic AND i18n-agnostic; sub-components call `t(errors.field)` at render time.

    Error-key mapping:
    - title → `'createListing.titleRequired'`
    - description → `'createListing.descriptionRequired'`
    - address → `'createListing.addressRequired'`
    - city → `'createListing.cityRequired'`
    - district → `'createListing.districtRequired'`
    - bedrooms → `'createListing.bedroomsRequired'`
    - bathrooms → `'createListing.bathroomsRequired'`
    - areaSqm → `'createListing.areaRequired'`
    - rooms → `'createListing.roomsRequired'`
    - maxGuests → `'createListing.maxGuestsRequired'`
    - price → `'createListing.priceRequired'`
    - currency → `'createListing.currencyRequired'`
    - propertyType → `'createListing.propertyTypeRequired'`
    - contactPhone (hybrid-fail) → `'createListing.contactMissingInline'`

    `buildPayloadByCategory` body — transcribe from PATTERNS.md §1 excerpt. Key invariants:
    - `shared` block contains: title/description/type/propertyType/period/features/videoUrl/**panoramicPhotosUrl** (D-09 ANCHOR B)/instagramUrl/availableDate/status/**tours** (D-09 ANCHOR C, ternary `values.tours.length > 0 ? values.tours : undefined`)
    - Residential return: `...shared, bedrooms: parseInt(values.bedrooms) || 0, bathrooms: parseInt(values.bathrooms) || 0, areaSqm: parseFloat(values.areaSqm) || 0, price: parseFloat(values.price) || values.price, currency: values.currency`
    - Commercial return: `...shared, areaSqm: parseFloat(values.areaSqm) || 0, price: parseFloat(values.price) || values.price, currency: values.currency` (NO bedrooms, NO bathrooms)
    - Hospitality return: `...shared, rooms: parseInt(values.rooms) || 0, bathrooms: parseInt(values.bathrooms) || 0, maxGuests: parseInt(values.maxGuests) || 0` (NO price, NO currency, NO areaSqm, NO amenities — D-14 defers amenities to Phase 6)

    Note on COMMERCIAL_TYPES type-narrowing in validator: `(COMMERCIAL_TYPES as readonly string[]).includes(values.propertyType)` — cast is required because TypeScript narrows `const COMMERCIAL_TYPES = [...] as const` to a readonly tuple of literal types, and `.includes()` on such a tuple rejects arbitrary strings without the cast.
  </action>
  <verify>
    <automated>test -f src/components/CreateListingForm/validators.ts && grep -c "export function validateByCategory" src/components/CreateListingForm/validators.ts | grep -q "1" && grep -c "export function buildPayloadByCategory" src/components/CreateListingForm/validators.ts | grep -q "1" && grep -c "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts && grep -c "tours.length > 0" src/components/CreateListingForm/validators.ts && ! grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts && npx tsc --noEmit 2>&1 | tee /tmp/tsc-01-01.log | grep -c "^src/components/CreateListingForm/validators.ts" | grep -q "^0$"</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/CreateListingForm/validators.ts` exists (file read succeeds)
    - `grep -c "^export function validateByCategory" src/components/CreateListingForm/validators.ts` returns exactly `1`
    - `grep -c "^export function buildPayloadByCategory" src/components/CreateListingForm/validators.ts` returns exactly `1`
    - `grep -c "^export const CURRENCY_OPTIONS" src/components/CreateListingForm/validators.ts` returns exactly `1`
    - `grep -c "^export const FIELD_ORDER_BY_CATEGORY" src/components/CreateListingForm/validators.ts` returns exactly `1`
    - `grep -c "^export type Currency" src/components/CreateListingForm/validators.ts` returns exactly `1`
    - `grep -c "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts` returns `1` (D-09 anchor B inside `shared`)
    - `grep -c "tours.length > 0" src/components/CreateListingForm/validators.ts` returns `1` (D-09 anchor C inside `shared`)
    - `grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts` returns ZERO matches (exit code 1 from grep; role-agnostic invariant per D-17)
    - `grep -c "from 'react'" src/components/CreateListingForm/validators.ts` returns `0` (no React imports)
    - `npx tsc --noEmit` does NOT introduce new errors in `validators.ts` (line count for validators.ts errors = 0)
    - The pre-existing 16-line tsc baseline is preserved (total errors ≤ 16 lines total)
  </acceptance_criteria>
  <done>
    validators.ts exists with validateByCategory, buildPayloadByCategory, CURRENCY_OPTIONS, Currency, FIELD_ORDER_BY_CATEGORY, ValidateResult all exported. File is role-agnostic (zero useRole/AuthContext/Gated imports) and i18n-agnostic (error values are translation keys, not strings). tsc clean (no new errors in validators.ts).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Jest test suite src/components/CreateListingForm/__tests__/validators.test.ts (~18-22 assertions)</name>
  <files>src/components/CreateListingForm/__tests__/validators.test.ts</files>
  <read_first>
    - src/components/CreateListingForm/validators.ts (just created — test target)
    - src/components/CreateListingForm/types.ts (FormBag shape for makeBase helper)
    - src/utils/__tests__/propertyCategory.test.ts (primary test analog — copy header + structure verbatim)
    - src/hooks/__tests__/useRole.test.ts (secondary analog — pure-fn test style)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §2 (full test structure with makeBase helper)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Pitfall 4 (hybrid rule needs all 7 permutations)
  </read_first>
  <behavior>
    Test file provides at least 18 assertions organized in 4 describe blocks:
    - describe("validateByCategory — Residential"): 6+ tests — happy-path valid, missing title, missing description, missing address, missing city, missing district, missing bedrooms, missing bathrooms, missing areaSqm, missing price, missing currency (`currency: ''` case)
    - describe("validateByCategory — Commercial"): 4+ tests — happy-path valid (propertyType='Office'), missing areaSqm, missing price, missing currency, propertyType NOT in COMMERCIAL_TYPES (e.g., 'Apartment' passed with category='Commercial') → errors.propertyType set
    - describe("validateByCategory — Hospitality"): 7+ tests covering hybrid rule (per RESEARCH Pitfall 4):
      - all contacts empty → valid
      - phone only → invalid (errors.contactPhone set)
      - whatsapp only → invalid
      - telegram only → invalid
      - phone + whatsapp → valid
      - phone + telegram → valid
      - phone + whatsapp + telegram → valid
      - Plus: missing rooms → invalid, missing bathrooms → invalid, missing maxGuests → invalid
    - describe("buildPayloadByCategory — payload shape invariants"): 5+ tests
      - Residential payload contains bedrooms/bathrooms/areaSqm/price/currency
      - Commercial payload does NOT contain bedrooms or bathrooms keys (assert via `'bedrooms' in payload === false`)
      - Hospitality payload does NOT contain price/currency/areaSqm/amenities keys (D-14)
      - D-09 anchor: all 3 payloads contain `panoramicPhotosUrl` (assert via `'panoramicPhotosUrl' in payload === true` for each)
      - D-09 anchor: all 3 payloads contain `tours` when non-empty (assert tours array equals input)
  </behavior>
  <action>
    Create `src/components/CreateListingForm/__tests__/validators.test.ts` following the PATTERNS.md §2 structure. File header EXACTLY:

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

    Define `makeBase(): FormBag` helper at top (AFTER imports, BEFORE describe blocks) per PATTERNS.md §2 — returns a FormBag with ALL 32 fields initialized. Shared hard-requireds filled (title='T', description='D', address='A', city='Bishkek', district='X'); everything else empty string/array/false. Use this pattern: `function makeBase(): FormBag { return { title: 'T', description: 'D', address: 'A', city: 'Bishkek', district: 'X', type: 'rent', propertyType: 'Apartment', status: 'draft', features: [], featureInput: '', selectedImages: [], availableDate: '', bedrooms: '', bathrooms: '', areaSqm: '', price: '', currency: '', rooms: '', maxGuests: '', amenities: [], tours: [], tourTitle: '', tourUrl: '', videoUrl: '', panoramicPhotosUrl: '', instagramUrl: '', contactEmail: '', contactPhone: '', contactWhatsapp: '', contactTelegram: '', verifyOwnership: false, verifyOwnerId: false, verifyStateDocs: false }; }`

    4 describe blocks in order:

    **Block 1: `describe('validateByCategory — Residential', () => {...})`** — minimum 6 tests:
    - `test('happy-path inputs return isValid: true, empty errors')` — base + residential fields filled (bedrooms='2', bathrooms='1', areaSqm='80', price='1000', currency='$') → `expect(result.isValid).toBe(true)` + `expect(Object.keys(result.errors).length).toBe(0)`
    - `test('missing bedrooms → errors.bedrooms')` — same but `bedrooms: ''` → `expect(result.errors.bedrooms).toBe('createListing.bedroomsRequired')` + `expect(result.isValid).toBe(false)`
    - `test('missing bathrooms → errors.bathrooms')` — `expect(result.errors.bathrooms).toBe('createListing.bathroomsRequired')`
    - `test('missing areaSqm → errors.areaSqm')` — `expect(result.errors.areaSqm).toBe('createListing.areaRequired')`
    - `test('missing price → errors.price')` — `expect(result.errors.price).toBe('createListing.priceRequired')`
    - `test('currency empty string → errors.currency')` — `expect(result.errors.currency).toBe('createListing.currencyRequired')`
    - `test('missing title → errors.title')` — `expect(result.errors.title).toBe('createListing.titleRequired')`

    **Block 2: `describe('validateByCategory — Commercial', () => {...})`** — minimum 4 tests:
    - `test('happy-path propertyType=Office returns valid')` — base + propertyType='Office', areaSqm='200', price='5000', currency='$'
    - `test('missing areaSqm → errors.areaSqm')`
    - `test('currency empty → errors.currency')`
    - `test('Commercial payload does not require bedrooms')` — bedrooms left empty, other Commercial requireds filled → valid
    - `test('propertyType=Apartment with category=Commercial → errors.propertyType')` — defensive per Pitfall 5

    **Block 3: `describe('validateByCategory — Hospitality', () => {...})`** — minimum 7 tests (hybrid rule MUST cover all 7 permutations per RESEARCH Pitfall 4):
    - `test('ALL contacts empty → valid (pass-through)')` — rooms='3', bathrooms='2', maxGuests='5', contactPhone/whatsapp/telegram all ''
    - `test('phone only → invalid (needs WA or TG)')` — contactPhone='+996555', WA='', TG=''
    - `test('whatsapp only → invalid (needs phone)')` — contactPhone='', WA='+996555', TG=''
    - `test('telegram only → invalid (needs phone)')` — contactPhone='', WA='', TG='@handle'
    - `test('phone + whatsapp → valid')`
    - `test('phone + telegram → valid')`
    - `test('phone + whatsapp + telegram → valid')`
    - `test('missing rooms → errors.rooms')`
    - `test('missing maxGuests → errors.maxGuests')`

    **Block 4: `describe('buildPayloadByCategory — payload shape invariants', () => {...})`** — minimum 5 tests:
    - `test('Residential payload contains bedrooms/bathrooms/areaSqm/price/currency')` — assert via individual `in` checks
    - `test('Commercial payload does NOT contain bedrooms key')` — `const p: any = buildPayloadByCategory(values, 'Commercial'); expect('bedrooms' in p).toBe(false); expect('bathrooms' in p).toBe(false);`
    - `test('Hospitality payload does NOT contain price/currency/areaSqm/amenities (D-14)')`
    - `test('D-09 anchor B: panoramicPhotosUrl present in all 3 category payloads')` — build 3 payloads, assert `'panoramicPhotosUrl' in payload` for each
    - `test('D-09 anchor C: tours present in all 3 category payloads when non-empty')` — set `values.tours = [{id:'t1',title:'T',url:'u'}]`; build 3 payloads; assert `payload.tours` deep-equals input for each
    - `test('D-09 anchor C: tours undefined when empty array')` — `values.tours = []`; assert `payload.tours === undefined` for all 3

    Target: 18-22 total `expect(...)` assertions spread across these tests (count assertions by summing `expect(` occurrences in the file).

    **NO mocks. NO react-test-renderer. NO @testing-library/react-native. Pure imports from `../validators` + `../types`. Jest `describe`/`test`/`expect` only.**
  </action>
  <verify>
    <automated>test -f src/components/CreateListingForm/__tests__/validators.test.ts && grep -c "^describe(" src/components/CreateListingForm/__tests__/validators.test.ts && grep -c "^  test(" src/components/CreateListingForm/__tests__/validators.test.ts && grep -c "expect(" src/components/CreateListingForm/__tests__/validators.test.ts && ! grep -E "(jest.mock|react-test-renderer|@testing-library)" src/components/CreateListingForm/__tests__/validators.test.ts && npx jest src/components/CreateListingForm/__tests__/validators.test.ts --silent 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/CreateListingForm/__tests__/validators.test.ts` exists
    - File begins with `/**` on line 1 (Prettier `@format` docblock)
    - `grep -c "^describe(" src/components/CreateListingForm/__tests__/validators.test.ts` returns EXACTLY `4` (four describe blocks)
    - `grep -c "^  test(" src/components/CreateListingForm/__tests__/validators.test.ts` returns at least `22` (four blocks × minimum coverage — some blocks have more tests)
    - `grep -c "expect(" src/components/CreateListingForm/__tests__/validators.test.ts` returns at least `22` (each test has ≥1 expect)
    - `grep -E "(jest.mock|react-test-renderer|@testing-library)" src/components/CreateListingForm/__tests__/validators.test.ts` returns ZERO matches (grep exit 1) — no mocks, no RN test-renderer
    - `grep "makeBase" src/components/CreateListingForm/__tests__/validators.test.ts` returns at least one match (helper defined)
    - `grep "D-09" src/components/CreateListingForm/__tests__/validators.test.ts` returns at least 2 matches (D-09 anchor tests are labeled)
    - `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` exits with code 0 (all tests pass)
    - Jest output contains `Tests:` line with `passed` count matching total test count (22+)
    - `npm test` full suite exits 0 — baseline 22 tests + new ~22 = ~44/44 all green (no regressions in any other suite)
  </acceptance_criteria>
  <done>
    validators.test.ts exists with 4 describe blocks and ≥22 tests covering Residential/Commercial/Hospitality validation + payload shape invariants. All 7 hybrid-contact permutations tested. D-09 anchor B + C covered. `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` passes with all tests green. Full `npm test` baseline (22) + new (~22) = ~44/44 green, no regressions.
  </done>
</task>

<task type="auto">
  <name>Task 3: Tighten FormBag.currency type + update barrel exports</name>
  <files>src/components/CreateListingForm/types.ts, src/components/CreateListingForm/index.ts</files>
  <read_first>
    - src/components/CreateListingForm/types.ts (current — line 34 `currency: string;`)
    - src/components/CreateListingForm/index.ts (current — current re-exports)
    - src/components/CreateListingForm/validators.ts (just created — exports `Currency` type)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §3 + §4 (type + barrel surgery contracts)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #5 (currency tightening — all 10 callsites enumerated; no logic changes needed; tsc catches regressions)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md (D-18)
  </read_first>
  <behavior>
    - `FormBag.currency` type is `Currency | ''` where `Currency = '$' | 'сом'` (empty string = unset)
    - `Currency` type is re-exported from types.ts so callers can `import type { Currency } from '../components/CreateListingForm'`
    - Barrel `index.ts` re-exports `validateByCategory`, `buildPayloadByCategory`, `CURRENCY_OPTIONS`, `FIELD_ORDER_BY_CATEGORY` as named values, plus `Currency` + `ValidateResult` as types
    - `npx tsc --noEmit` still clean — pre-existing 16-line baseline preserved; zero new errors introduced by the tightening
  </behavior>
  <action>
    **Edit A — `src/components/CreateListingForm/types.ts`:**

    1. Add import at the top of the file (after the docblock, before `export interface FormBag`):
       ```typescript
       import type { Currency } from './validators';
       ```

    2. Change line 34 from:
       ```typescript
         currency: string;
       ```
       to:
       ```typescript
         currency: Currency | ''; // D-18: '$' | 'сом' | '' — empty = unset
       ```

    3. Add type re-export after the last existing `export type ...` in the file (below `export interface SectionProps { ... }`, end of file):
       ```typescript

       export type { Currency } from './validators';
       ```

    **Edit B — `src/components/CreateListingForm/index.ts`:**

    Append after the existing `export type { MediaSectionProps } from './MediaSection';` line (line 26):

    ```typescript

    // Phase 5 — validators module (FORM-04 / FORM-06)
    export {
      validateByCategory,
      buildPayloadByCategory,
      CURRENCY_OPTIONS,
      FIELD_ORDER_BY_CATEGORY,
    } from './validators';
    export type { Currency, ValidateResult } from './validators';
    ```

    **DO NOT modify any other file in this task.** Do NOT touch PriceSection.tsx / CreateListingScreen.tsx / any sub-component — those are Plan 02 / Plan 04.

    **Expected tsc outcome:** no new errors. The 3 existing `setCurrency(...)` calls at `CreateListingScreen.tsx:241/243/245` already pass canonical `'$' | 'сом' | ''` values (rehydrate normalizer output); `CreateListingScreen.tsx:92` uses `useState<string>('')` which is still valid (string is wider than the union — NOT a type error). PriceSection.tsx's local `CURRENCY_OPTIONS` still exists (Plan 02 migrates that). Per RESEARCH Finding #5 pre-analysis: zero logic changes, zero new tsc errors.

    If tsc surfaces a new error at an orchestrator call-site like `setCurrency(value as string)` on line 147, DO NOT fix it here — that's Plan 04's scope. For Plan 01 exit, tsc baseline must not regress: run `npx tsc --noEmit 2>&1 | wc -l` and compare to the Phase 4 baseline of 16 lines. If the number exceeds 16, STOP and escalate — do not proceed to commit.
  </action>
  <verify>
    <automated>grep -c "currency: Currency | ''" src/components/CreateListingForm/types.ts && grep -c "export type { Currency }" src/components/CreateListingForm/types.ts && grep -c "export { validateByCategory" src/components/CreateListingForm/index.ts && grep -c "CURRENCY_OPTIONS" src/components/CreateListingForm/index.ts && grep -c "export type { Currency, ValidateResult }" src/components/CreateListingForm/index.ts && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 16) ? 1 : 0}'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "currency: Currency | ''" src/components/CreateListingForm/types.ts` returns exactly `1`
    - `grep -c "import type { Currency } from './validators'" src/components/CreateListingForm/types.ts` returns exactly `1`
    - `grep -c "^export type { Currency } from './validators'" src/components/CreateListingForm/types.ts` returns exactly `1`
    - `grep -c "^export { validateByCategory" src/components/CreateListingForm/index.ts` returns exactly `1` (or appears on a line starting with `  validateByCategory,` if multi-line import — adjust grep accordingly; test at least 1 match for `validateByCategory` on a valid export line)
    - `grep "buildPayloadByCategory" src/components/CreateListingForm/index.ts` returns at least 1 match
    - `grep "CURRENCY_OPTIONS" src/components/CreateListingForm/index.ts` returns at least 1 match
    - `grep "FIELD_ORDER_BY_CATEGORY" src/components/CreateListingForm/index.ts` returns at least 1 match
    - `grep -c "export type { Currency, ValidateResult }" src/components/CreateListingForm/index.ts` returns exactly `1`
    - `npx tsc --noEmit 2>&1 | wc -l` returns a number ≤ 16 (Phase 4 baseline preserved)
    - Project-level `npm test` exits 0 (validators suite from Task 2 + existing 22 tests all pass)
    - `./scripts/check-i18n-parity.sh` exits 0 (unchanged from Phase 4)
    - `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant preserved)
    - `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01 invariant preserved)
  </acceptance_criteria>
  <done>
    FormBag.currency tightened to `Currency | ''`; Currency + ValidateResult re-exported from types.ts and index.ts; barrel has all 5 new exports from validators. tsc baseline ≤ 16 lines (no regression). All 3 phase-gate scripts (i18n-parity, role-grep, land-removed) exit 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none net-new in this plan) | Pure functions in a single module + test file + type refinement. No network I/O, no persistence, no user-facing render. validators.ts receives already-validated FormBag input from the orchestrator; executes deterministic logic; returns plain data. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01-01 | Tampering | `validateByCategory` return bag | mitigate | Error values are translation KEYS (`createListing.*Required`), not user-supplied strings. Sub-components call `t(errors.field)` at render time — i18n table is bundled, keys cannot be injected. |
| T-05-01-02 | Information Disclosure | validators.ts | accept | Pure function; no secrets, no PII, no network. Role-agnostic — does NOT see user/auth context. Client-side validation is advisory only (true trust boundary is backend — M2 scope per PROJECT.md Key Decisions row 128). |
| T-05-01-03 | Denial of Service | Jest test suite | accept | Unit tests with ~22 assertions run in <10s (measured from propertyCategory.test.ts 7 tests @ 0.229s). No external deps, no network, no timers. No DoS surface. |
| T-05-01-04 | Elevation of Privilege | `buildPayloadByCategory` | mitigate | Validator/builder is role-agnostic per D-17 / RESEARCH Finding #10 — ZERO imports of useRole/AuthContext/Gated/can. Grep-enforced invariant (acceptance criterion). `platformVerifications` role-gating stays at orchestrator call-site (Plan 04). Any attempt to add role logic here is caught by the grep-check-role-grep.sh CI gate. |
| T-05-01-05 | Repudiation | N/A | accept | No logging, no audit trail written from validators — pure derivation only. Backend (M2) is the authoritative log source. |
| T-05-01-06 | Spoofing | N/A | accept | No identity checks in validators (role-agnostic). Identity is enforced at service layer (`PropertyService.patchPlatformVerifications` canFromUser guard from Phase 3) + backend (accepted-risk UNCONFIRMED-AT-SHIP per GATE-05 D-22). |
</threat_model>

<verification>
Phase-plan level checks (run at the end of Plan 01 execution, before commit):

1. **Validators unit tests pass:** `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` exits 0 with ≥22 tests green.
2. **Full Jest suite baseline + new passes:** `npm test` exits 0. Baseline 22 + new ≥22 = ≥44 tests total, all green.
3. **TypeScript baseline preserved:** `npx tsc --noEmit 2>&1 | wc -l` ≤ 16 lines (Phase 4 baseline).
4. **Phase 4 + Phase 3 invariants preserved:**
   - `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 FORM-09 gate — no new i18n keys added in this plan yet)
   - `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 4-part grep invariant)
   - `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01 gate)
5. **Role-agnostic invariant:** `grep -E "(useRole|useAuth|AuthContext|Gated|can\()" src/components/CreateListingForm/validators.ts` returns ZERO matches.
6. **D-09 anchors present in validators.ts:** `grep -c "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts` = `1`; `grep -c "tours.length > 0" src/components/CreateListingForm/validators.ts` = `1`.
7. **Barrel exports complete:** `grep "validateByCategory" src/components/CreateListingForm/index.ts` ≥ 1 hit; same for `buildPayloadByCategory`, `CURRENCY_OPTIONS`, `FIELD_ORDER_BY_CATEGORY`, `Currency`, `ValidateResult`.
</verification>

<success_criteria>
- FORM-04 required-field map is encoded in `validateByCategory` per D-07 (Residential/Commercial/Hospitality branches with correct required fields)
- FORM-06 single source of truth established — `validateByCategory` and `buildPayloadByCategory` live in one pure module
- D-09 anchors (panoramicPhotosUrl + tours) preserved unconditionally across all 3 category payloads (RESEARCH Finding #6)
- D-17 Jest coverage hit: ≥22 assertions across 4 describe blocks, all green, zero mocks
- D-18 currency tightening in place: `FormBag.currency: Currency | ''` with tsc baseline preserved (≤16 lines)
- Role-agnostic invariant enforced by grep: zero hits for useRole/AuthContext/Gated/can in validators.ts
- All Phase 3 + Phase 4 CI gates still exit 0 (role-grep, i18n-parity, land-removed)
- All 7 Hospitality hybrid-contact permutations tested (RESEARCH Pitfall 4)
</success_criteria>

<output>
After completion, create `.planning/phases/05-listing-form-validation-edit-flow/05-01-SUMMARY.md` documenting:
- Files created: validators.ts + validators.test.ts
- Files modified: types.ts + index.ts
- Jest assertion count (target ≥22)
- tsc baseline line count (target ≤16)
- Any deviations from plan (Rule-1 auto-fixes) with source-file evidence
- Exact commit SHAs for each task
- Signal for Plan 02: `CURRENCY_OPTIONS` is now importable from `../components/CreateListingForm` (or deep import `./validators`) — PriceSection.tsx local literal at lines 25-28 can now be deleted + replaced with a named import
</output>

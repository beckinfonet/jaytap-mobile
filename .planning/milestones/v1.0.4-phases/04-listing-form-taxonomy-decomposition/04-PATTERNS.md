# Phase 4: Listing Form Taxonomy & Decomposition — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 15 new + 5 modified = 20 targets
**Analogs found:** 19 / 20 (one net-new pattern: shared `styles.ts` across sibling sub-components)

This phase is ~95% refactor-preserving-behavior. Every sub-component has strong in-tree analogs; the executor should **copy from existing code**, not invent. The two load-bearing invariants to preserve verbatim are (a) the two `<Gated>` wrap sites in `CreateListingScreen.tsx:784-834` and `:848-857`, and (b) the D-09 preserve-on-save anchors at `CreateListingScreen.tsx:187, 392, 396`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/propertyCategory.ts` | utility (pure) | transform | `src/utils/passwordPolicy.ts` | exact (role + pure-fn + const-map export) |
| `src/utils/propertyCategory.test.ts` | test (unit) | transform | `src/hooks/__tests__/useRole.test.ts` | exact (pure-function jest suite) |
| `src/components/CreateListingForm/index.ts` | barrel | — | `src/locales/index.ts` | role-match (only barrel in repo) |
| `src/components/CreateListingForm/styles.ts` | styles (shared) | — | *(net-new — no precedent in repo)* | no-analog |
| `src/components/CreateListingForm/types.ts` | types (local) | — | `src/types/Appointment.ts` | role-match |
| `src/components/CreateListingForm/BasicInfoSection.tsx` | component (form-section) | request-response | `src/components/PasswordRequirements.tsx` + `CreateListingScreen.tsx:621-640` (chip row) | role-match + excerpt-source |
| `src/components/CreateListingForm/ResidentialSection.tsx` | component (form-section) | request-response | `CreateListingScreen.tsx:642-673` (current `row`/`thirdInput` block) | exact (transcribe) |
| `src/components/CreateListingForm/CommercialSection.tsx` | component (form-section) | request-response | `ResidentialSection.tsx` (sibling; area-only variant) | role-match |
| `src/components/CreateListingForm/HospitalitySection.tsx` | component (form-section) | request-response | `CreateListingScreen.tsx:642-673` (3-input row shape) | role-match |
| `src/components/CreateListingForm/MediaSection.tsx` | component (form-section + gated) | request-response | `CreateListingScreen.tsx:746-867` (images + 2x `<Gated>` sites + links) | exact (transcribe + preserve wraps) |
| `src/components/CreateListingForm/PriceSection.tsx` | component (form-section) | request-response | `CreateListingScreen.tsx:564-615` (currency + price block, see §PriceSection) | exact |
| `src/components/CreateListingForm/VerificationSection.tsx` | component (form-section) | request-response | `CreateListingScreen.tsx:114-136` (`verificationSwitchRow`) + existing switches block | exact |
| `scripts/check-land-removed.sh` | CI script | — | `scripts/check-role-grep.sh` | exact (same shape — shebang, `set -u`, grep invariants, FAIL/OK banners) |
| `scripts/check-i18n-parity.sh` | CI script | — | `scripts/check-role-grep.sh` | exact |
| `src/screens/CreateListingScreen.tsx` | screen (orchestrator) | request-response | *(self — edit in place)* | — |
| `src/screens/HomeScreen.tsx` (line 49 edit) | screen (consumer) | — | *(self — minimal `'Land'` removal only)* | — |
| `src/locales/en.ts` (add 12, remove 1) | i18n | — | Existing `propertyType.*` key block (lines 252-260) | exact |
| `src/locales/ru.ts` (add 12, remove 1) | i18n | — | Existing `propertyType.*` key block (lines 255-263) | exact |

---

## Pattern Assignments

### 1. `src/utils/propertyCategory.ts` (utility, pure transform)

**Analog:** `src/utils/passwordPolicy.ts` — the closest existing utility that exports (a) a typed const, (b) a string-literal union type, (c) a pure derivation function, (d) a boolean predicate helper. All four shapes are needed here.

**Export pattern** (`src/utils/passwordPolicy.ts:1-22`):
```typescript
export const PASSWORD_MIN_LENGTH = 7;

export type PasswordRequirementId = 'length' | 'uppercase' | 'number' | 'symbol';

export interface PasswordRequirementCheck {
  id: PasswordRequirementId;
  met: boolean;
}

export function getPasswordRequirementChecks(password: string): PasswordRequirementCheck[] {
  return [
    { id: 'length', met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', met: /[A-Z]/.test(password) },
    { id: 'number', met: /\d/.test(password) },
    { id: 'symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function passwordMeetsPolicy(password: string): boolean {
  return getPasswordRequirementChecks(password).every((c) => c.met);
}
```

**Copy this shape exactly:** named exports (no default), `SCREAMING_SNAKE_CASE` for module-level const, string-literal union for the ID type, pure function with explicit return type, zero React imports, zero side effects.

**Secondary analog (for `as const` + typeof array pattern):** `src/hooks/useRole.ts:9-23`:
```typescript
export type Role = 'admin' | 'moderator' | 'user' | 'guest';

export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToManagement';
```

**Safe-default pattern (for `propertyTypeToCategory(unknown) → 'Residential'`):** mirrors `src/constants/adminAllowlist.ts:21-30`:
```typescript
export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) { return false; }
  const normalized = email.trim().toLowerCase();
  if (!normalized) { return false; }
  return (ALLOWLIST as readonly string[]).includes(normalized);
}
```
— guards null/undefined, returns safe default, no throws. Apply same pattern: `if (!propertyType) return 'Residential';`.

---

### 2. `src/utils/propertyCategory.test.ts` (unit test, pure)

**Analog:** `src/hooks/__tests__/useRole.test.ts` — the only pure-function jest suite in the repo. Uses the exact pattern Phase 4 needs: `describe` block + per-branch `test` entries, no mocks, no test-renderer, no async.

**Copy this shape** (`src/hooks/__tests__/useRole.test.ts:1-37`):
```typescript
/**
 * @format
 */

import { canFromUser } from '../useRole';

describe('canFromUser priority ladder', () => {
  const admin = { email: 'admin@foo.com', backendProfile: { userType: 'admin' } };
  const allowlisted = { email: 'beckprograms@gmail.com', backendProfile: {} };

  test('userType=admin grants editVerifications (branch 2)', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });

  test('allowlisted email grants editVerifications (M1 branch 3 — D-03)', () => {
    expect(canFromUser(allowlisted, 'editVerifications')).toBe(true);
  });

  test('null user (guest) cannot editVerifications', () => {
    expect(canFromUser(null, 'editVerifications')).toBe(false);
  });
});
```

**Conventions preserved:**
- File header `/** @format */` docblock
- Relative import from sibling (`../propertyCategory`)
- `describe('<function-name> <behavior>')` block label
- One `test()` per branch case
- `expect(…).toBe(…)` assertion (no `.toEqual`, no custom matchers for primitives)

**Test placement:** Per CONVENTIONS.md line 19 — "Co-located unit tests: `src/<subdir>/__tests__/<file>.test.ts(x)` for per-module tests." So the file should live at `src/utils/__tests__/propertyCategory.test.ts` to match convention, **not** at `src/utils/propertyCategory.test.ts` (the context prompt's path). *(Planner should reconcile: co-located `__tests__/` subdir matches convention established Phase 3.)*

**Secondary analog for jest config reference:** `/Users/beckmaldinVL/development/mobileApps/JayTap/jest.config.js` — `preset: 'react-native'`, `setupFiles: ['<rootDir>/jest.setup.js']`. No framework-install needed.

---

### 3. `src/components/CreateListingForm/index.ts` (barrel)

**Analog:** `src/locales/index.ts` — the only existing barrel file in the repo (CONVENTIONS.md line 189-190: "Only `src/locales/index.ts` acts as a barrel").

**Export pattern** (`src/locales/index.ts:24-25`):
```typescript
export { en, ru };
export type { TranslationKeys } from './en';
```

**Apply to CreateListingForm/index.ts:**
```typescript
export { BasicInfoSection } from './BasicInfoSection';
export { ResidentialSection } from './ResidentialSection';
export { CommercialSection } from './CommercialSection';
export { HospitalitySection } from './HospitalitySection';
export { MediaSection } from './MediaSection';
export { PriceSection } from './PriceSection';
export { VerificationSection } from './VerificationSection';
export type { FormBag, FormErrorBag, SectionProps } from './types';
```

**Note:** This is the *second* barrel in the repo, but the pattern follows locales/index.ts exactly (named re-exports, `export type` for types-only). CreateListingScreen imports a single line: `import { BasicInfoSection, ResidentialSection, … } from '../components/CreateListingForm';`.

---

### 4. `src/components/CreateListingForm/styles.ts` (shared StyleSheet)

**Analog:** **NONE.** No existing file in `src/components/` or elsewhere exports a StyleSheet consumed by sibling components. Per CONVENTIONS.md line 223: "Styles colocated at bottom of file using `StyleSheet.create({...})`. Every component file ends with a `const styles = StyleSheet.create(...)` block."

**This file is net-new and breaks that convention.** Justification per UI-SPEC §Spacing Scale: transcribing the current `CreateListingScreen.tsx:975-1313` StyleSheet verbatim into sub-components would duplicate ~340 lines × 7 files = ~2400 lines. Shared file is the minimum-regret choice for a refactor that must preserve pixel behavior.

**Pattern to follow** — use the literal values from `CreateListingScreen.tsx:1011-1138` verbatim (no restructuring):
```typescript
// src/components/CreateListingForm/styles.ts
import { StyleSheet } from 'react-native';

/**
 * Shared styles for CreateListingForm/* sub-components. Transcribed VERBATIM
 * from src/screens/CreateListingScreen.tsx:1011-1138 to preserve pixel rhythm.
 * Dynamic (color, theme) values are applied inline via useTheme() in consumers.
 */
export const commonStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: {
    height: 50, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, fontSize: 16, marginBottom: 12,
  },
  textArea: {
    minHeight: 100, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
    marginBottom: 12, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  thirdInput: { flex: 1 },
  halfInput: { flex: 1 },
  label: { fontSize: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, fontStyle: 'italic', marginTop: 4 }, // verify: existing file line ~1174
  // … (transcribe the rest from lines 1011-1313 as needed by each sub-component)
});
```

**Why `commonStyles` (not `styles`):** to avoid clashing with per-component local `const styles = StyleSheet.create(...)` blocks that sub-components may still need for unique rules (e.g., MediaSection's `imagesGrid`). Pattern:
```typescript
// inside BasicInfoSection.tsx
import { commonStyles } from './styles';
const styles = StyleSheet.create({ /* local-only if any */ });

<View style={commonStyles.section}>
  <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>…</Text>
</View>
```

---

### 5. `src/components/CreateListingForm/types.ts` (local types)

**Analog:** `src/types/Appointment.ts` — multi-interface type module, pattern: "Export all related interfaces from the same file" (STRUCTURE.md line 211).

**Pattern:**
```typescript
// src/components/CreateListingForm/types.ts
import type { PropertyType } from '../../utils/propertyCategory';

export interface FormBag {
  title: string;
  description: string;
  address: string;
  city: string;
  district: string;
  type: 'rent' | 'sale';
  propertyType: PropertyType | string; // backend tolerates any string historically
  status: 'draft' | 'live';
  // … all 25+ fields, see RESEARCH §"Pattern 2: Section-props contract"
}

export type FormErrorBag = Partial<Record<keyof FormBag, string>>;

export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;
}
```

**Convention hits:** named `export interface`, `PascalCase` for types, `Partial<Record<…>>` for optional-everywhere error bag.

---

### 6. `src/components/CreateListingForm/BasicInfoSection.tsx` (component, form-section)

**Primary analog:** `src/components/PasswordRequirements.tsx` — the closest existing component that (a) takes a typed `Props` slice (`{ password: string }`), (b) renders a multi-row form-adjacent display, (c) consumes `useTheme()` + `useLanguage()`, (d) uses a typed `TranslationKeys` array for labels.

**Imports pattern** (`src/components/PasswordRequirements.tsx:1-10`):
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

**Copy this import ordering** (note relative-path depth `../` for siblings, `../../` from inside `CreateListingForm/`):
```typescript
// BasicInfoSection.tsx — uses ../../ because it's two dirs deep
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import { RESIDENTIAL_TYPES, COMMERCIAL_TYPES, HOSPITALITY_TYPES } from '../../utils/propertyCategory';
import type { SectionProps } from './types';
import { commonStyles } from './styles';
```

**Typed label-list pattern** (`src/components/PasswordRequirements.tsx:12-17`):
```typescript
const ROWS: { id: PasswordRequirementId; labelKey: TranslationKeys }[] = [
  { id: 'length', labelKey: 'auth.passwordReqLength' },
  { id: 'uppercase', labelKey: 'auth.passwordReqUppercase' },
  { id: 'number', labelKey: 'auth.passwordReqNumber' },
  { id: 'symbol', labelKey: 'auth.passwordReqSymbol' },
];
```

**Apply to BasicInfoSection** (category-grouped property-type map):
```typescript
const RESIDENTIAL_CHIPS: { value: PropertyType; labelKey: TranslationKeys }[] = [
  { value: 'Apartment', labelKey: 'propertyType.apartment' },
  { value: 'House', labelKey: 'propertyType.house' },
  { value: 'Townhome', labelKey: 'propertyType.townhome' },
  { value: 'Condo', labelKey: 'propertyType.condo' },
];
// … COMMERCIAL_CHIPS, HOSPITALITY_CHIPS
```

**Chip-row render pattern to copy VERBATIM** from `CreateListingScreen.tsx:621-640`:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>{t('createListing.propertyType')}</Text>
<View style={styles.chipRow}>
  {PROPERTY_TYPES.map(({ value, labelKey }) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.chip,
        {
          backgroundColor: propertyType === value ? colors.accent : colors.inputBackground,
          borderColor: colors.border,
        },
      ]}
      onPress={() => setPropertyType(value)}
    >
      <Text style={[styles.chipText, { color: propertyType === value ? '#FFF' : colors.text }]}>
        {t(labelKey)}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Modifications required (per UI-SPEC §Category Chip Group):**
- Split into 3 `<View style={styles.chipRow}>` blocks, one per category, each preceded by a `<Text>` group label (e.g., `{t('category.residential')}`)
- Add `accessibilityRole="button"`, `accessibilityState={{ selected: values.propertyType === value }}`, `accessibilityLabel={t(labelKey)}`, `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}` to every `TouchableOpacity`
- Add `numberOfLines={1}` + `ellipsizeMode="tail"` to chip `<Text>` (RU overflow)
- Swap `setPropertyType(value)` → `onChange('propertyType', value)`
- Group-label `<Text>` gets `accessibilityRole="header"`

**Accessibility pattern source** (`src/components/PasswordTextInput.tsx:22-27`):
```typescript
<TouchableOpacity
  style={styles.iconHit}
  onPress={() => setVisible((v) => !v)}
  accessibilityRole="button"
  accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
```

**Numeric-row pattern to transcribe** from `CreateListingScreen.tsx:642-673` (bedrooms/bathrooms/area row; exact same shape reused in Residential + Hospitality):
```typescript
<View style={styles.row}>
  <View style={styles.thirdInput}>
    <TextInput
      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
      placeholder={t('createListing.bedrooms')}
      placeholderTextColor={colors.textSecondary}
      value={bedrooms}
      onChangeText={setBedrooms}
      keyboardType="numeric"
    />
  </View>
  {/* … × 3 */}
</View>
```

---

### 7. `src/components/CreateListingForm/ResidentialSection.tsx` (component, form-section)

**Analog:** `CreateListingScreen.tsx:642-673` — transcribe the 3-input bedrooms/bathrooms/area row VERBATIM. No structural changes. Just swap `bedrooms`/`setBedrooms` with `values.bedrooms`/`(v) => onChange('bedrooms', v)`.

**Component shape** (follow `PasswordRequirements` pattern — `src/components/PasswordRequirements.tsx:19-58`):
```typescript
type Props = SectionProps;

export function ResidentialSection({ values, onChange, errors }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={commonStyles.section}>
      <View style={commonStyles.row}>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[commonStyles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.bedrooms')}
            placeholderTextColor={colors.textSecondary}
            value={values.bedrooms}
            onChangeText={(v) => onChange('bedrooms', v)}
            keyboardType="numeric"
          />
        </View>
        {/* bathrooms, areaSqm — same shape */}
      </View>
    </View>
  );
}
```

**Convention note** — plain function component (not `React.FC<Props>`) matches CONVENTIONS.md line 200: both styles are used in the codebase; plain function is used in newer files (`PasswordRequirements`, `PasswordTextInput`, `AuthModalCloseButton`). Prefer plain function for all 7 new sub-components for consistency.

---

### 8. `src/components/CreateListingForm/CommercialSection.tsx` (component, form-section)

**Analog:** `ResidentialSection.tsx` (sibling just carved). Per UI-SPEC §Component Inventory: "AreaSqm (bedrooms/bathrooms omitted — Phase 5 enforces validation; Phase 4 renders the field set)."

**Pattern:** Same shell as Residential, but the `<View style={styles.row}>` contains only the `areaSqm` `TextInput` (full-width or wrapped in `halfInput`). Phase 5 will add Commercial sub-type selection; Phase 4 renders only area.

---

### 9. `src/components/CreateListingForm/HospitalitySection.tsx` (component, form-section)

**Analog:** Same 3-input `styles.row` shape as ResidentialSection (UI-SPEC §"HospitalitySection field order" line 232-239), but with `rooms` / `maxGuests` / `bathrooms` placeholders instead of bedrooms/bathrooms/area.

**Amenities placeholder pattern** — one `<Text style={commonStyles.hint}>`, matching the existing instagram-hint pattern at `CreateListingScreen.tsx:866`:
```typescript
<Text style={[commonStyles.hint, { color: colors.textSecondary }]}>
  {t('hospitality.amenitiesPhase6Placeholder')}
</Text>
```

**No `<Gated>` wrap** — this is a user-visible section for everyone who selects Hostel/Hotel.

---

### 10. `src/components/CreateListingForm/MediaSection.tsx` (component, form-section, **gated**) — LOAD-BEARING

**Analog:** `CreateListingScreen.tsx:746-867` — transcribe the ENTIRE block verbatim (Images + Matterport + Links sections). The two `<Gated>` wraps MUST be preserved at the exact same scope boundaries. This is the single highest-risk file in the phase.

**GATED WRAP #1 (Matterport — whole-section scope)** — copy VERBATIM from `CreateListingScreen.tsx:783-834`:
```typescript
{/* Matterport 3D Tours — admin only (D-08) */}
<Gated action="editMatterportUrl">
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.tours3d')}</Text>
    <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>{t('createListing.matterportHint')}</Text>

    <TextInput
      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
      placeholder={t('createListing.tourTitle')}
      placeholderTextColor={colors.textSecondary}
      value={tourTitle}
      onChangeText={setTourTitle}
    />
    <TextInput
      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
      placeholder={t('createListing.matterportUrlExample')}
      placeholderTextColor={colors.textSecondary}
      value={tourUrl}
      onChangeText={setTourUrl}
      keyboardType="url"
    />
    <TouchableOpacity
      style={[styles.addTourButton, { backgroundColor: colors.primary, borderColor: colors.border }]}
      onPress={addTour}
    >
      <Text style={[styles.addTourButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>{t('createListing.add3dTour')}</Text>
    </TouchableOpacity>

    {tours.length > 0 && (
      <View style={styles.toursList}>
        {tours.map((tour) => (
          <View key={tour.id} style={[styles.tourItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* …tour item rendering… */}
          </View>
        ))}
      </View>
    )}
  </View>
</Gated>
```

**GATED WRAP #2 (Panoramic — SINGLE-INPUT scope)** — copy VERBATIM from `CreateListingScreen.tsx:847-857`:
```typescript
{/* Panoramic URL — admin only (D-08) */}
<Gated action="editPanoramicUrl">
  <TextInput
    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
    placeholder={t('createListing.panoramicUrl')}
    placeholderTextColor={colors.textSecondary}
    value={panoramicPhotosUrl}
    onChangeText={setPanoramicPhotosUrl}
    keyboardType="url"
  />
</Gated>
```

**Critical do-not-regress invariants (RESEARCH §Pitfall 2 + UI-SPEC §MediaSection):**
1. The `<Gated editPanoramicUrl>` MUST wrap ONLY the single `<TextInput>`. NOT the enclosing `<View style={styles.section}>` for Links. NOT including `videoUrl` or `instagramUrl` or `instagramHint` inside the wrap.
2. `videoUrl`, `instagramUrl`, and `instagramHint` stay as **visible siblings** (admin + non-admin).
3. Images section (lines 746-781) has NO `<Gated>` wrap — always visible.
4. CI assertion: `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx` MUST equal `2`.

**Import pattern for Gated** (`src/screens/CreateListingScreen.tsx:23`):
```typescript
import { Gated } from '../../components/Gated'; // ../../ from CreateListingForm/
```

**State-binding swap:** `value={panoramicPhotosUrl}` → `value={values.panoramicPhotosUrl}`, `onChangeText={setPanoramicPhotosUrl}` → `onChangeText={(v) => onChange('panoramicPhotosUrl', v)}`. The `<Gated>` wrap scope does NOT change — only the bound variable names.

---

### 11. `src/components/CreateListingForm/PriceSection.tsx` (component, form-section)

**Analog:** `CreateListingScreen.tsx:564-615` — current currency-chip-row + price-input block (visible at runtime in the rent/sale sections).

**Conditional mount rule (UI-SPEC §PriceSection mount rule + RESEARCH §Pattern 1):** The orchestrator wraps the mount site with `{category !== 'Hospitality' && <PriceSection … />}`. PriceSection itself has NO internal branching — it renders unconditionally when mounted.

**Currency-chip accent pattern** — same `backgroundColor: active ? colors.accent : colors.inputBackground` shape as propertyType chips (`CreateListingScreen.tsx:626-631`).

---

### 12. `src/components/CreateListingForm/VerificationSection.tsx` (component, form-section)

**Analog:** `CreateListingScreen.tsx:114-136` (`verificationSwitchRow` builder) + the three existing switches for `verifyOwnership` / `verifyOwnerId` / `verifyStateDocs`.

**Gating pattern (UI-SPEC §Component Inventory row 7):** "VerificationSection — Wrapped by caller." The orchestrator renders `<Gated action="editVerifications"><VerificationSection … /></Gated>`. VerificationSection itself has NO `<Gated>` wrap inside.

**Switch `trackColor.true` pattern (UI-SPEC §Color accent rule 4):** Use `colors.accent` for the active track color — this is one of the four sanctioned accent usages.

---

### 13. `scripts/check-land-removed.sh` (CI script)

**Analog:** `scripts/check-role-grep.sh` (Phase 3 — commit fa25b8b). Exact shape: shebang, `set -u`, banner, one grep per invariant, FAIL/OK lines, exit code.

**Copy this structure VERBATIM** (`scripts/check-role-grep.sh:1-73`):
```bash
#!/usr/bin/env bash
# check-land-removed.sh — Phase 4 (FORM-01) atomic removal enforcer.
#
# Runs grep invariants across src/ and fails non-zero if any `Land` touchpoint leaked back.
# Exception: lexical English words landlord / landscape are permitted.

set -u
cd "$(dirname "$0")/.."

fail=0
violations=""

echo "== Phase-4 FORM-01 Land-removal grep invariant =="

# Invariant 1: no 'Land' string literal in src/ (allow landlord/landscape as wordy alternates)
hits1=$(grep -rn "'Land'\|\"Land\"" src/ 2>/dev/null || true)
if [ -n "$hits1" ]; then
  echo "FAIL #1: 'Land' or \"Land\" string literal found in src/"
  echo "$hits1"
  fail=1
  violations="$violations #1"
else
  echo "OK   #1: no 'Land' string literal in src/"
fi

# Invariant 2: no propertyType.land i18n key in src/
hits2=$(grep -rn "propertyType\.land" src/ 2>/dev/null || true)
if [ -n "$hits2" ]; then
  echo "FAIL #2: propertyType.land key reference found in src/"
  echo "$hits2"
  fail=1
  violations="$violations #2"
else
  echo "OK   #2: propertyType.land key removed"
fi

echo "==========================================="
if [ $fail -eq 0 ]; then
  echo "PASS: all FORM-01 grep invariants hold"
  exit 0
else
  echo "FAIL: FORM-01 violations in invariants:$violations"
  exit 1
fi
```

**Convention preserved:**
- `#!/usr/bin/env bash` (not `#!/bin/bash`)
- `set -u` (not `set -e` — matches existing script exactly, allows grep to return non-zero without aborting)
- `cd "$(dirname "$0")/.."` to anchor to repo root
- `grep -rn … 2>/dev/null || true` pattern for inverted-match-friendly counting
- `fail=0` + `violations=""` accumulator, checked at end
- Banner + "PASS" or "FAIL" final line matches role-grep verbiage — CI log readability

**File permissions:** `chmod +x scripts/check-land-removed.sh` after creation (same as role-grep).

---

### 14. `scripts/check-i18n-parity.sh` (CI script)

**Analog:** `scripts/check-role-grep.sh` + the diff idiom from RESEARCH §Pitfall 5:
```bash
diff <(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u) \
     <(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)
```

**Pattern** — wrap the diff idiom in the role-grep script shell:
```bash
#!/usr/bin/env bash
# check-i18n-parity.sh — Phase 4 FORM-09 EN+RU key-set parity gate.
# Belt-and-suspenders: TypeScript already enforces via ru.ts: Record<TranslationKeys, string>.

set -u
cd "$(dirname "$0")/.."

echo "== Phase-4 FORM-09 i18n parity grep =="

en_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u)
ru_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)

diff_out=$(diff <(echo "$en_keys") <(echo "$ru_keys") || true)

if [ -z "$diff_out" ]; then
  echo "OK   #1: en.ts and ru.ts key sets are identical"
  echo "PASS"
  exit 0
else
  echo "FAIL: en.ts and ru.ts key sets differ"
  echo "$diff_out"
  exit 1
fi
```

**Caveat from RESEARCH:** TypeScript (`tsc --noEmit`) enforces this at compile time via `ru.ts: Record<TranslationKeys, string>` — see `src/locales/ru.ts:3`. The grep gate is belt-and-suspenders for CI where `tsc` may not run; do not remove the tsc check in favor of this alone.

---

### 15. `src/screens/CreateListingScreen.tsx` (orchestrator — EDIT)

**Action:** Reduce from 1314 LOC to `< 500 LOC` target (UI-SPEC §Dimension 2 criterion).

**Stay in orchestrator (MUST NOT move):**
- All 25+ `useState` hooks (`CreateListingScreen.tsx:68-112`)
- `useEffect` rehydrating from `propertyToEdit` (`:145-218`) — **D-09 anchor at line 187**
- `loadUserProfile` (`:220-240`)
- `handleSubmit` (`:319-432`) — **D-09 anchors at lines 392, 396**
- `useRole()` destructure (`:112`) + `can('editVerifications')` in payload construction (`:398-406`)

**Delegate to sub-components:**
- The JSX body (`CreateListingScreen.tsx:489-965`) — replace with 7 `<*Section>` elements + 2 `<Gated>` wraps at orchestrator level (Verification + conditional Hospitality skip).

**Orchestrator-level `onChange` builder pattern** (recommended):
```typescript
const onChange = useCallback(<K extends keyof FormBag>(field: K, value: FormBag[K]) => {
  // dispatch to the matching useState setter; keep 25+ setters but hide them behind one stable closure
}, []);
```

No analog for this exact shape, but the pattern matches RESEARCH §Pattern 2 recommendation verbatim.

---

### 16. `src/screens/HomeScreen.tsx` (line 49 edit)

**Analog:** Self-edit. Current line 49 reads:
```typescript
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Land', 'Industrial'];
```

**Target:**
```typescript
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'];
```

Per RESEARCH line 386 + context prompt: "minimal edit; deep consolidation deferred to Phase 6." Do NOT import from `propertyCategory.ts` yet — that introduces a cross-file coupling worth discussing in Phase 6.

---

### 17–18. `src/locales/en.ts` + `src/locales/ru.ts` (key edits)

**Analog:** Existing `propertyType.*` key block (`src/locales/en.ts:252-260`, `src/locales/ru.ts:255-263`).

**Remove (both files, same commit):**
```typescript
'propertyType.land': 'Land',     // en.ts:259
'propertyType.land': 'Земля',    // ru.ts:262
```

**Add (both files, same commit — see UI-SPEC §Copywriting Contract):**
```typescript
// en.ts additions
'category.residential': 'Residential',
'category.commercial': 'Commercial',
'category.hospitality': 'Hospitality',
'propertyType.hostel': 'Hostel',
'propertyType.hotel': 'Hotel',
'hospitality.sectionTitle': 'Hospitality Details',
'hospitality.rooms': 'Rooms',
'hospitality.maxGuests': 'Max Guests',
'hospitality.bathrooms': 'Bathrooms',
'hospitality.amenities': 'Amenities',
'hospitality.amenitiesPhase6Placeholder': 'Amenities list — coming in a future update',
```

**RU mirror** (identical key set; TypeScript `Record<TranslationKeys, string>` enforces — see `src/locales/ru.ts:3`):
```typescript
'category.residential': 'Жилая',
'category.commercial': 'Коммерческая',
'category.hospitality': 'Гостеприимство',
'propertyType.hostel': 'Хостел',
'propertyType.hotel': 'Отель',
'hospitality.sectionTitle': 'Детали размещения',
'hospitality.rooms': 'Комнаты',
'hospitality.maxGuests': 'Макс. гостей',
'hospitality.bathrooms': 'Ванные',
'hospitality.amenities': 'Удобства',
'hospitality.amenitiesPhase6Placeholder': 'Список удобств — скоро',
```

**Order-in-file convention:** Keep alphabetical-within-namespace clustering already used in the file (e.g., all `propertyType.*` keys stay together, all new `category.*` keys form a new cluster, all new `hospitality.*` keys form a new cluster).

---

## Shared Patterns

### Theme tokens (ALL 7 sub-components + VerificationSection)

**Source:** `src/theme/ThemeContext.tsx` via `useTheme()` → `{ colors, isDark }`.

**Apply to:** Every sub-component.

**Pattern** (`src/components/PasswordRequirements.tsx:25, 46-49`):
```typescript
const { colors } = useTheme();
// …
<Text style={[styles.label, { color: met ? colors.text : colors.textSecondary }]}>
```

**Invariant (UI-SPEC §Color):** ONLY 10 keys on `colors` are permitted. Grep gate: `grep -rn "#[0-9A-Fa-f]\{3,6\}" src/components/CreateListingForm/` returns ONLY the grandfathered `'#FFF'` on active-chip text (existing pattern `CreateListingScreen.tsx:635`).

---

### i18n key lookup (ALL sub-components)

**Source:** `src/context/LanguageContext.tsx` via `useLanguage()` → `{ t, language }`.

**Apply to:** Every sub-component that renders user-visible text.

**Pattern** (`src/components/PasswordRequirements.tsx:24, 51`):
```typescript
const { t } = useLanguage();
// …
{t(labelKey)}  // where labelKey: TranslationKeys
```

**Type-safety:** Import `type { TranslationKeys } from '../../locales'` for any typed key list (see PasswordRequirements:6).

---

### Accessibility (ALL interactive elements in sub-components)

**Source:** `src/components/PasswordTextInput.tsx:21-27` + `src/components/PropertyCard.tsx:176-200`.

**Apply to:** Every `TouchableOpacity` in `CreateListingForm/`.

**Pattern:**
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={t('<key>')}
  accessibilityState={{ selected: <bool> }}  // chips + currency options only
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}  // size-dependent; 4×4 for chips, 8×8 for × glyphs, 10×10 for 24×24 remove buttons
  onPress={…}
>
```

**Section header accessibility** (UI-SPEC §Accessibility Targets):
```typescript
<Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
  {t('<sectionKey>')}
</Text>
```

---

### Multi-row text overflow (RU language)

**Source:** `src/components/TourHeroCard.tsx:65`:
```typescript
<Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
```

**Apply to:** Every chip `<Text>` in `BasicInfoSection` (UI-SPEC §Typography "RU-length overflow" line 88-89).

---

### Gated wrap (MediaSection + orchestrator VerificationSection call-site)

**Source:** `src/components/Gated.tsx:21-24`:
```typescript
export const Gated: React.FC<GatedProps> = ({ action, children, fallback = null }) => {
  const { can } = useRole();
  return <>{can(action) ? children : fallback}</>;
};
```

**Apply to:** Only the 3 Phase-4 call sites. Do NOT nest `<Gated>` inside `<Gated>`. Do NOT add new `Action` enum entries to `useRole.ts` (Phase 3 closed that surface — `scripts/check-role-grep.sh` invariant).

**Call-site inventory (Phase 4 — must match Phase 3 exactly):**
1. `MediaSection.tsx` — `<Gated action="editMatterportUrl">` around the whole `<View style={styles.section}>` for Matterport tours
2. `MediaSection.tsx` — `<Gated action="editPanoramicUrl">` around the single `<TextInput>` for panoramic URL
3. `CreateListingScreen.tsx` orchestrator — `<Gated action="editVerifications"><VerificationSection … /></Gated>` at the call site

---

### Module exports (ALL files)

**Source:** CONVENTIONS.md §Module Design + `src/components/PasswordRequirements.tsx`.

**Apply to:** Every new file.

- Named exports (NO `export default`)
- `export function ComponentName({ … }: Props)` — plain function over `React.FC` (newer convention)
- `export const ServiceName = { method1, method2 }` — not applicable here (no services added)
- `export interface XxxProps` — immediately above the component

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `src/components/CreateListingForm/styles.ts` | Shared StyleSheet across sibling components | Repo convention is in-file `const styles = StyleSheet.create(...)`. Shared `styles.ts` is net-new. Justification + structure documented in row 4 above. |

All other files have at least one strong in-tree analog.

---

## Metadata

**Analog search scope:** `src/utils/`, `src/components/`, `src/screens/`, `src/hooks/`, `src/constants/`, `src/locales/`, `src/theme/`, `src/context/`, `scripts/`, `src/**/__tests__/`.

**Files read for excerpt extraction (10):**
- `src/utils/passwordPolicy.ts` (full)
- `src/utils/formatPrice.ts` (full)
- `src/hooks/useRole.ts` (full)
- `src/hooks/__tests__/useRole.test.ts` (first 80 lines)
- `src/components/Gated.tsx` (full)
- `src/components/PasswordTextInput.tsx` (full)
- `src/components/PasswordRequirements.tsx` (full)
- `src/components/__tests__/Gated.test.tsx` (full)
- `src/components/ListingMetaTable.tsx` (first 60 lines)
- `src/components/PropertyCard.tsx` (lines 170-204)
- `src/constants/adminAllowlist.ts` (full)
- `src/locales/index.ts` (full)
- `src/locales/en.ts` (head + tail)
- `src/locales/ru.ts` (head only)
- `src/screens/CreateListingScreen.tsx` (lines 1-120, 180-210, 380-410, 620-880, 975-1154)
- `src/screens/HomeScreen.tsx` (lines 40-80)
- `src/types/Property.ts` (first 50 lines)
- `scripts/check-role-grep.sh` (full)
- `jest.config.js` (full)

**Pattern extraction date:** 2026-04-23

---

## PATTERN MAPPING COMPLETE

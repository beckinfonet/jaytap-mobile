---
phase: 04-listing-form-taxonomy-decomposition
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/utils/propertyCategory.ts
  - src/utils/__tests__/propertyCategory.test.ts
  - src/screens/CreateListingScreen.tsx
  - src/screens/HomeScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/CreateListingForm/types.ts
  - src/components/CreateListingForm/styles.ts
  - src/components/CreateListingForm/index.ts
  - src/components/CreateListingForm/BasicInfoSection.tsx
  - src/components/CreateListingForm/ResidentialSection.tsx
  - src/components/CreateListingForm/CommercialSection.tsx
  - src/components/CreateListingForm/HospitalitySection.tsx
  - src/components/CreateListingForm/MediaSection.tsx
  - src/components/CreateListingForm/PriceSection.tsx
  - src/components/CreateListingForm/VerificationSection.tsx
  - scripts/check-land-removed.sh
  - scripts/check-i18n-parity.sh
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 4 (Listing Form Taxonomy & Decomposition) delivers its stated scope cleanly. The 1404-LOC `CreateListingScreen.tsx` monolith has been reduced to an 871-LOC orchestrator composing seven well-carved sub-components in `src/components/CreateListingForm/`. The new taxonomy module (`propertyCategory.ts`) is a concise single-source-of-truth with pure exports, a safe-default fallback, and a targeted Jest spec that locks in both forward (Hostel/Hotel → Hospitality) and regression (Land NOT a key) invariants. The `FormBag` / `SectionProps` contract is consistent across all seven sub-components, the three D-09 anchors (rehydrate, unconditional panoramicPhotosUrl payload, unconditional tours payload) are preserved, and the three-total `Gated` invariant from Phase 3 (2 in `MediaSection` + 1 wrapping `VerificationSection`) holds. Both CI gate scripts execute and exit 0 against current `src/`.

Three Warning-level issues were identified:

1. **Hospitality listings cannot be submitted today** — the orchestrator unmounts `PriceSection` for Hospitality but still runs `if (!currency) / if (!price.trim())` validation in `handleSubmit`, so any Hostel/Hotel listing creation attempt blocks at the currency alert. This is not a data-loss risk (no production listings) and Phase 5 explicitly owns category-branched validation, so it is a known-deferred gap rather than a surprise — but the present state is that the flow is blocked for the Hospitality category.
2. **`scripts/check-i18n-parity.sh` regex misses 11 keys** (including two of the new Phase 4 FORM-09 keys `createListing.tours3d` and `hospitality.amenitiesPhase6Placeholder`). TypeScript's `Record<TranslationKeys, string>` catches the actual parity drift this file is meant to guard, so the script is redundant belt-and-suspenders rather than the primary gate — but as written it under-covers the very keys added in this phase.
3. **`HomeScreen.tsx` still owns local `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` constants that duplicate the canonical lists** now exported from `src/utils/propertyCategory.ts`. Phase 6 (Hospitality rendering) is the correct owner of the consuming cleanup, but leaving the duplicate in place during Phase 4 means the "single source of truth" claim is not yet literally true across the codebase.

The six Info-level findings cover (a) the documented brownfield hex-literal exceptions in `styles.ts` and several sub-components (already tracked for Phase 7 Alignment Pass), (b) a few minor verbatim-transcribed patterns carried over from the pre-Phase-4 monolith (`Math.random()` IDs, `parseInt` without radix, `key={index}` on the image grid), and (c) one unused import in the orchestrator.

No Critical issues. No security vulnerabilities. No hardcoded secrets. The role-gating surface and D-09 anchors are all intact.

## Warnings

### WR-01: Hospitality listings blocked at submit — required-field check not branched by category

**File:** `src/screens/CreateListingScreen.tsx:424-431`
**Issue:** When `propertyType` is `'Hostel'` or `'Hotel'`, `category === 'Hospitality'` is derived at line 551, which causes `PriceSection` to be unmounted at line 653 (`{category !== 'Hospitality' && <PriceSection ... />}`). However, `handleSubmit` at lines 424-431 still checks `if (!currency)` and `if (!price.trim())` unconditionally:

```tsx
if (!currency) {
  Alert.alert(t('common.error'), t('createListing.currencyRequired'));
  return;
}
if (!price.trim()) {
  Alert.alert(t('common.error'), t('createListing.priceRequired'));
  return;
}
```

`values.currency` starts as `''` and `values.price` starts as `''`, and there is no UI surface for the user to set either when the PriceSection is unmounted, so any submit attempt for a Hostel/Hotel listing halts at the `currencyRequired` alert. This is not a payload issue (the listing never reaches `PropertyService`) — it is a UX dead-end.

This appears to be a known-deferred gap: the Phase 4 brief and the Phase 6 "Hospitality rendering" plan imply Phase 5 `validateByCategory` will address it. QA Matrix cells E and F verify PriceSection mount/unmount but there is no cell verifying that a Hospitality listing can actually be submitted (the matrix stops at the "PriceSection unmounted" assertion). PROJECT.md also notes Hostel/Hotel listings are not user-exposed on Home until Phase 6 renders them, so the bug has no production-user blast radius today.

**Fix:** Guard the currency + price checks on category, keeping the full Residential/Commercial behavior intact. Either:

```tsx
// Option A — narrow in place (minimal change, matches orchestrator-local style)
const category = propertyTypeToCategory(propertyType);
if (category !== 'Hospitality') {
  if (!currency) {
    Alert.alert(t('common.error'), t('createListing.currencyRequired'));
    return;
  }
  if (!price.trim()) {
    Alert.alert(t('common.error'), t('createListing.priceRequired'));
    return;
  }
}
```

```tsx
// Option B — defer entirely to Phase 5 validateByCategory (better long-term)
// In Phase 5, replace the four inline checks with a single call:
const errors = validateByCategory(category, values);
if (Object.keys(errors).length) {
  setFormErrors(errors);
  return;
}
```

Option A unblocks Hospitality submission in ~4 lines and is compatible with Option B landing cleanly in Phase 5 (Phase 5 would replace the whole block). Either fix should also consider whether the orchestrator's payload `currency: currency` + `price: parseFloat(price) || price` is the shape the backend accepts for a Hospitality listing — if not, adding `...(category === 'Hospitality' ? {} : { price: ..., currency })` to the payload builder is the companion change.

**Severity rationale (Warning not Critical):** no production listings exist (PROJECT.md "clean slate"), Hospitality listing UX is not user-exposed until Phase 6, and Phase 5 is explicitly scoped to own category-branched validation.

---

### WR-02: `scripts/check-i18n-parity.sh` regex silently skips keys containing digits

**File:** `scripts/check-i18n-parity.sh:11-12`
**Issue:** The key-extraction regex `'[a-zA-Z.]+':` matches only letters and dots between the quotes — so any i18n key containing a digit is silently excluded from the parity comparison. 11 keys fall into this hole in both `en.ts` and `ru.ts`:

```
createListing.add3dTour
createListing.tours3d
hospitality.amenitiesPhase6Placeholder
modal.deleteAccountBullet1
modal.deleteAccountBullet2
modal.deleteAccountBullet3
modal.deleteAccountBullet4
modal.deleteAccountBullet5
profile.min30
profile.min60
tour.view360
```

Two of these (`createListing.tours3d`, `hospitality.amenitiesPhase6Placeholder`) are among the new FORM-09 Phase 4 keys this gate was specifically added to protect. If a future edit typoed one of them only in `ru.ts` (e.g., `hospitality.amenitiesPhase6Placholder` — missing `e`), the check would still report `PASS` because the typo'd key would be excluded from both sides of the `diff`.

The script's own header comment acknowledges this is belt-and-suspenders alongside `tsc --noEmit` via `ru.ts: Record<TranslationKeys, string>`, and TypeScript would catch the parity bug. So the script is not the only line of defense — it is a secondary nudge. But as written, the regex under-matches 11 keys including two of the Phase 4 targets, so it is providing less coverage than the docstring claims.

**Fix:** Broaden the character class to include digits (and, defensively, common separator chars actually used — none are currently, but future-proofing is cheap):

```bash
en_keys=$(grep -oE "'[a-zA-Z0-9.]+':" src/locales/en.ts | sort -u)
ru_keys=$(grep -oE "'[a-zA-Z0-9.]+':" src/locales/ru.ts | sort -u)
```

After the fix, manually verify the new count matches `365` (which was the raw `grep -n "^  '"` line count reported during review). Consider also adding a self-check: `if [ "$(echo "$en_keys" | wc -l)" -lt 360 ]; then echo "WARN: suspiciously low key count"; fi` to catch future regex regressions.

---

### WR-03: `HomeScreen.tsx` duplicates category type lists — breaks "single source of truth" claim

**File:** `src/screens/HomeScreen.tsx:48-49`
**Issue:** Phase 4's stated goal is a single-source taxonomy in `src/utils/propertyCategory.ts`, which exports `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, and `HOSPITALITY_TYPES`. But `HomeScreen.tsx` still defines its own module-scoped copies:

```tsx
// src/screens/HomeScreen.tsx:48-49
const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'];
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'];
```

These are used at line 120 (`isPropCommercial` check for filter logic) and line 376 (filter chip list). Any future taxonomy change (e.g., adding a Residential type) would need to be made in two places, and a drift between them would silently change filter behavior on the Home screen.

A secondary consequence: `HomeScreen` has no symbol for `HOSPITALITY_TYPES`, so Hostel/Hotel listings that arrive from the backend will fall through both branches of the `isCommercial` filter:
- `isCommercial === true` → `!isPropCommercial` → excluded (correct)
- `isCommercial === false` → `!isPropCommercial` is false, so NOT filtered out — Hostel/Hotel render in the "Residential" tab

This mixed rendering is the exact condition PROJECT.md's Active Requirements line "Hospitality listings render in a separate section on Home / Favorites / OwnerListings (not mixed with residential/commercial)" is meant to prevent. Phase 6 "Hospitality rendering" is the scoped owner of fixing the consumer behavior, so this is not a Phase 4 regression — but the duplicate constant is a scope leak: Phase 4 should have been the moment to delete the local copies and import from `propertyCategory.ts`, leaving Phase 6 to focus on rendering strategy rather than cleanup.

**Fix (low-risk, can land in Phase 4 follow-up or kick to Phase 6):**

```tsx
// src/screens/HomeScreen.tsx — delete lines 48-49 and replace with:
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
} from '../utils/propertyCategory';
```

Then at line 120, update the filter to also exclude Hospitality when `isCommercial === false` (which is the Phase 6 job proper):

```tsx
const isPropCommercial = COMMERCIAL_TYPES.some(t => t.toLowerCase() === pPropertyType);
const isPropHospitality = HOSPITALITY_TYPES.some(t => t.toLowerCase() === pPropertyType);

if (isCommercial) {
  if (!isPropCommercial) return false;
} else {
  if (isPropCommercial || isPropHospitality) return false; // Phase 6 renders these in a separate section
}
```

If Phase 6 is the preferred owner, leave the local duplicates in place but add a TODO comment citing Phase 6 so the scope boundary is explicit in-source.

## Info

### IN-01: Brownfield hex literals transcribed verbatim from monolith (documented Phase 7 exception)

**File:** `src/components/CreateListingForm/BasicInfoSection.tsx:81,88,108-112,122,142-148` / `MediaSection.tsx:310,315,329` / `CreateListingScreen.tsx:195,196,603,704,708,714,722,728,755,790,867`
**Issue:** Multiple hardcoded hex values (`'#2C2C2E'`, `'#E5E5EA'`, `'#000000'`, `'#FFFFFF'`, `'#FFF'`, `'#121212'`, `'#8E8E93'`, `'#666'`, `'#767577'`, `'#f4f3f4'`, `'rgba(0,0,0,0.6)'`) appear inline instead of going through `useTheme()` tokens. Per CLAUDE.md "use `useTheme()` tokens — no hardcoded colors."
**Fix:** These are verbatim transcriptions from the pre-Phase-4 monolith (see styles.ts docstring lines 17-22 and MediaSection.tsx docstring lines 269-272 explicitly calling this out) and are deferred to Phase 7 Alignment Pass per PROJECT.md active requirements. No action for Phase 4 — flagged here for tracker completeness only.

---

### IN-02: `Platform` import never used in CreateListingScreen.tsx

**File:** `src/screens/CreateListingScreen.tsx:12`
**Issue:** `Platform` is imported from `'react-native'` in the orchestrator but `grep "Platform\." src/screens/CreateListingScreen.tsx` returns zero matches. Likely a residual from before `BasicInfoSection` absorbed the `Platform.OS === 'ios'` branches for the date picker.
**Fix:** Remove `Platform` from the import statement:
```tsx
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Switch,
} from 'react-native';
```

---

### IN-03: `Math.random().toString()` used as tour ID (verbatim from monolith)

**File:** `src/screens/CreateListingScreen.tsx:274,369`
**Issue:** Tour IDs use `Math.random().toString()` in two places — one for rehydrating from propertyToEdit (line 274) when `tour.id` is missing, one for generating new tour IDs (line 369). Collisions are astronomically unlikely at this scale but `Math.random()` is not a cryptographically-or-even-uniqueness-guaranteed source, and the idiomatic React Native approach is `crypto.randomUUID()` (available via `react-native-get-random-values` polyfill) or at minimum a timestamp-prefixed random suffix.
**Fix:** This pattern is verbatim from the pre-Phase-4 monolith; no Phase 4 regression. Optional follow-up: swap to a `uuid-v4`-shaped ID if/when a UUID utility is added for another purpose. For now, acceptable at M1 scale (at most ~dozens of tours per user, no cross-user collision concern).

---

### IN-04: `parseInt` / `parseFloat` called without radix / locale awareness

**File:** `src/screens/CreateListingScreen.tsx:456,461-463`
**Issue:** `parseFloat(price) || price` and `parseInt(bedrooms) || 0` (no radix) are applied to free-form text inputs:
- `parseInt` without radix defaults to 10 in modern JS but is still flagged by most linters and can trip old-school eslint configs.
- `parseFloat(price) || price` has a subtle fallback: if `price` is `'0'`, `parseFloat` returns `0`, which is falsy, so the fallback kicks in and the raw string `'0'` is sent instead of the number `0`. This may or may not be intentional but is surprising.
- Numeric keyboards on Android can accept locale-specific decimal separators (comma in ru-RU); `parseFloat` only understands `.`.

**Fix:** Pre-existing, verbatim from the monolith. Not a Phase 4 regression. Track as part of Phase 5 validation work (Zod schema will handle normalization cleanly).

---

### IN-05: `key={index}` on deletable image grid

**File:** `src/components/CreateListingForm/MediaSection.tsx:98`
**Issue:** `<View key={index} style={styles.imageItem}>` uses array index as React key for a list that supports mid-list deletion (via `onRemoveImage(index)`). When the user deletes a middle image, React will reuse component instances across shifted indices, which can cause visual glitches on thumbnail components with ongoing image-load animations.
**Fix:** Each image has a `uri` string — use it as the key:
```tsx
<View key={`${image.uri}-${index}`} style={styles.imageItem}>
```
The `-${index}` suffix defends against the edge case where the user selects the same image twice. Pre-existing pattern (verbatim from the monolith), not a Phase 4 regression.

---

### IN-06: `React` default import unused by modern JSX transform

**File:** `src/components/CreateListingForm/*.tsx` (all 7 sub-components) and `src/screens/CreateListingScreen.tsx:1`
**Issue:** `import React from 'react'` (or `import React, { useState, ... }`) is present in every sub-component but the React 19 / RN 0.84 JSX transform does not require the default import — only the named hooks need to be imported. This is harmless but creates a tiny busywork diff any time someone runs an auto-import cleanup, and it costs a few bytes per file in the bundle.
**Fix:** Codebase-wide style decision — if the rest of the repo keeps `import React`, keep it here for consistency (which is what this phase does — the orchestrator does the same). No change recommended without a codebase-wide sweep.

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

# Phase 4: Listing Form Taxonomy & Decomposition — Research

**Researched:** 2026-04-23
**Domain:** React Native 0.84 (New Architecture) listing-form refactor — three-category taxonomy + sub-component decomposition
**Confidence:** HIGH overall (grep-backed; all structural facts verified against the actual tree at HEAD)

## Summary

The phase is largely a **mechanical, grep-driven refactor** on top of infrastructure already shipped. Phase 3 closed the role-gating seam; Phase 2 installed `react-native-keyboard-controller` and wraps `CreateListingScreen`'s scroll. The remaining work is (a) atomic removal of `Land` from four grep-visible touchpoints, (b) adding `Hostel`/`Hotel` + a single-source `PROPERTY_TYPE_TO_CATEGORY` utility, (c) carving a 1314-LOC screen into seven sub-components without breaking Phase 3's `<Gated>` wraps around Matterport + panoramic URL inputs, and (d) EN+RU parity on any new keys (enforced at compile time by TypeScript `Record<TranslationKeys, string>`, not just lint).

The single highest-leverage load-bearing decision: **`category` does NOT exist on the backend API payload today** (grep-verified against `PropertyService.createProperty` and `updateProperty` — only `propertyType` is written). That means Phase 4 is a pure client-side derivation — `PROPERTY_TYPE_TO_CATEGORY[propertyType]` is computed but never persisted. No backend coordination is needed for this phase. Land-on-backend is not a client concern either (clean-slate data per PROJECT.md; backend rejects-or-accepts is out of scope).

**Primary recommendation:** State stays in the `CreateListingScreen` orchestrator, passed to sub-components via a single prop shape (`values` + `onChange(field, value)` + `errors`). Do **not** split state per-section (triggers re-render cascades across shared fields), do **not** lift state into Context (overkill for one screen), and do **not** adopt `react-hook-form` in this phase (PROJECT.md D-01 explicitly rejects it for M1; zod v4+RHF is broken on RN per colinhacks/zod#4989 anyway). `useState` + orchestrator-held form bag is the locked pattern.

## User Constraints (from CONTEXT.md)

No `04-CONTEXT.md` exists at research time — `/gsd-discuss-phase 4` has not yet run. Constraints below are derived from PROJECT.md "Key Decisions", CLAUDE.md, and PITFALLS.md Pitfall 4 (the governing research for this phase). Discuss-phase may add/modify; when CONTEXT.md lands, planner should treat its contents as authoritative over this section.

### Locked Decisions (from PROJECT.md Key Decisions)

- **Remove `Land` entirely.** User decision, non-negotiable. Target: zero non-lexical `Land` matches (`landlord`/`landscape` are the only acceptable hits).
- **Hospitality (Hostel/Hotel) is showcase-only, no price.** Daily dynamic pricing can't be tracked; contact drives offline booking. **Out of scope for this phase:** price field for Hospitality, booking calendar, per-night pricing, per-room listings. These belong to Phase 6 (Hospitality rendering) and are already captured as anti-features in `REQUIREMENTS.md` Out of Scope.
- **Hospitality listings appear under both Rent and Sell (no price in either).** Phase 5/6 concern; Phase 4 only needs to ensure the category taxonomy permits this.
- **Required-field sets branch by category, not individual type.** Locked — Phase 4 ships the taxonomy; Phase 5 ships validation.
- **No schema-driven form engine; no `react-hook-form` for M1.** Sub-component composition over `useState` is the M1 pattern. (PROJECT.md D-01 / ARCHITECTURE.md / STACK.md all agree.)
- **Custom `App.tsx` navigation state machine stays.** Not relevant to this phase but worth restating.
- **`useRole()` / `<Gated>` / `canFromUser()` from Phase 3 are the ONLY admin-gating surface.** Phase 4 consumes — never reinvents. `scripts/check-role-grep.sh` D-14 4-part invariant must still pass after refactor.

### Claude's Discretion

- Sub-component naming (`BasicInfoSection` vs `BasicInfoFields`) — recommend `*Section` to match ROADMAP success criterion 3's exact naming.
- Exact shape of the category chip group UX (two-level: category chips → type chips; or single flat grouped chips). Recommendation in §C below; locked after discuss-phase.
- Whether `useCategory(propertyType)` is exposed as a React hook or as a pure function `propertyTypeToCategory(t)`. Recommend pure function (library-free, testable, matches existing `src/utils/` convention — `formatPrice.ts` etc. are all pure); export a thin memo hook only if a component needs reactivity beyond the derivation.
- Whether to seed full Hospitality-specific fields (rooms, maxGuests, amenities) now or defer them to Phase 5/6. Recommend seeding the `useState` hooks only (empty values, no required validation) in this phase so Phase 5 has scaffolding; full rendering lives in `HospitalitySection` but can ship as a stub returning `null`.

### Deferred Ideas (OUT OF SCOPE for this phase)

- **`validateByCategory()` + per-field error surfacing** — Phase 5 (FORM-04/06/07/08).
- **Category-change data-preservation logic** — Phase 5 (FORM-07).
- **Hospitality section on Home/Favorites/OwnerListings** — Phase 6 (HOSP-01).
- **`HospitalityCard` component + `PropertyDetailsScreen` Hospitality rendering** — Phase 6 (HOSP-03/04).
- **12-item amenities taxonomy + multi-select UI** — Phase 6 (HOSP-05). Phase 4 may add `amenities: string[]` state field + i18n keys for the 12 taxonomies (EN+RU) to avoid locale-drift rework in Phase 6, but the UI control itself is Phase 6.
- **Commercial sub-type field (office/retail/warehouse/industrial)** — Phase 5 (FORM-04 requires it, Phase 5 owns it).
- **Price-unit field (total / per-m²-month) for Commercial** — FEATURES P2, deferred.
- **Backend `category` field** — explicitly not needed; `propertyType` is the only persisted discriminator.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FORM-01 | `Land` removed from PROPERTY_TYPES, filter UI, TranslationKeys, type defs, mock/seed data | §B: complete grep inventory of exactly 4 touchpoints (one per file) — no type-def hit (Property.ts has no enum) and no mock/seed data (src/data/ is empty, no production listings) |
| FORM-02 | `Hostel`/`Hotel` added as property types under Hospitality | §C: extend `PROPERTY_TYPES` array and `PROPERTY_TYPE_TO_CATEGORY` map; add i18n keys for `propertyType.hostel` + `propertyType.hotel` + category labels |
| FORM-03 | `useCategory(propertyType)` / `PROPERTY_TYPE_TO_CATEGORY` utility at `src/utils/propertyCategory.ts` as single source of truth | §C/§D: pure-function utility + exported constant map; no hook needed; `HomeScreen`'s `isCommercial` flag is redundant-but-unchanged by this phase (Phase 5/6 can consolidate) |
| FORM-05 | `CreateListingScreen.tsx` decomposed into `src/components/CreateListingForm/` sub-components | §A + §D: 7 sub-components, state stays in orchestrator, passed via `{ values, onChange, errors }` |
| FORM-09 | Every new UI string in both EN and RU | §G: TypeScript already enforces parity at compile time (`ru.ts: Record<TranslationKeys, string>`); additionally add a grep gate `scripts/check-locale-parity.sh` for defense in depth |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Property type → category derivation | Client / utility (`src/utils/propertyCategory.ts`) | — | Pure derivation; backend only stores `propertyType`. Keeping it client-side avoids any backend contract change. |
| Category chip selection UX | Client / screen (`CreateListingScreen` orchestrator + `BasicInfoSection`) | — | Pure UI state; never touches network. |
| Category-specific field rendering | Client / sub-components (`ResidentialSection`/`CommercialSection`/`HospitalitySection`) | — | Branching is visual only; state remains in orchestrator. |
| Form state ownership | Client / screen orchestrator | — | Single source of truth prevents split-state re-render storms. |
| Admin URL-field gating | Client / `<Gated>` from Phase 3 | Backend (accepted-risk per D-22) | Phase 3 deliverable; Phase 4 only preserves existing wraps. |
| `propertyType` persistence | Backend (`PATCH /properties/:id`, `POST /properties`) | — | Already shipped; Phase 4 changes nothing in `PropertyService`. |
| `category` persistence | — (client-derived, not persisted) | — | Explicitly not a backend concern. |
| i18n string translation | Client / `src/locales/{en,ru}.ts` | — | TypeScript enforces key parity at compile time. |

## Standard Stack

### Core

No new dependencies are added in this phase. Verified against `package.json` at HEAD:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-keyboard-controller` | 1.21.6 | Already wrapping scroll in `CreateListingScreen` via `KeyboardAwareScrollView` (line 19 import, line 504 usage) | Phase 2 deliverable; sub-components inherit scroll context — do NOT add nested scroll views |
| `@react-native-community/datetimepicker` | ^8.6.0 | Already used for `availableDate` picker; stays with `BasicInfoSection` or a dedicated `AvailabilitySection` | Existing; no change |

**[VERIFIED: `package.json` at HEAD; grep + file read]**

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useState` in orchestrator | `react-hook-form@7.73.1` + `zod@^3.24` | Explicitly rejected by PROJECT.md D-01 for M1. `zod@4` is broken on RN with RHF per colinhacks/zod#4989 **[CITED: research/STACK.md §2]**. Could adopt in Phase 5 if validation complexity justifies; not in this phase. |
| Pure function `propertyTypeToCategory()` | Reactive `useCategory()` hook | Pure function matches existing `src/utils/*` convention (formatPrice, parseOobCode — all pure); adds zero React coupling; trivially testable. Add hook later only if a component demands memoized derivation from multiple inputs. |
| Orchestrator holds state | Split state per sub-component | Triggers re-mount on category change (data loss per Pitfall 4); breaks i18n lookup optimization. Locked: orchestrator. |
| Orchestrator holds state | Lift to Context | Overkill for one screen; Context churn propagates unrelated re-renders. |

## Architecture Patterns

### System Architecture Diagram

```
                ┌──────────────────────────────────────────────────────────┐
                │       CreateListingScreen (orchestrator)                 │
                │                                                          │
                │   useState × 25 fields  ──►  values: FormBag             │
                │   handleChange(k, v) ────►  setters per field            │
                │   validationErrors: ErrorBag  (stub; Phase 5 fills)      │
                │   propertyType ──► propertyTypeToCategory() ──► category │
                │                                                          │
                │   ┌──────────────────────────────────────────────────┐   │
                │   │ <KeyboardAwareScrollView>  (inherited Phase 2)   │   │
                │   │                                                  │   │
                │   │  <Header onBack>                                 │   │
                │   │  <BasicInfoSection {values, onChange, errors}/>  │   │
                │   │       renders: type (rent/sell) + title +        │   │
                │   │                description + location +          │   │
                │   │                category chip + propertyType chip │   │
                │   │                                                  │   │
                │   │  {category === 'Residential' &&                  │   │
                │   │    <ResidentialSection {values,onChange,errors}/>}│   │
                │   │  {category === 'Commercial' &&                   │   │
                │   │    <CommercialSection {values,onChange,errors}/>}│   │
                │   │  {category === 'Hospitality' &&                  │   │
                │   │    <HospitalitySection {values,onChange,errors}/>}│  │
                │   │                                                  │   │
                │   │  <MediaSection {values,onChange,errors}/>        │   │
                │   │     renders: images (always) +                   │   │
                │   │              <Gated editMatterportUrl>tours</>  │   │
                │   │              videoUrl + instagramUrl +           │   │
                │   │              <Gated editPanoramicUrl>URL</>     │   │
                │   │                                                  │   │
                │   │  {category !== 'Hospitality' &&                  │   │
                │   │    <PriceSection {values,onChange,errors}/>}     │   │
                │   │                                                  │   │
                │   │  <ContactSection {values}/>  (read-only)         │   │
                │   │  <StatusSection {values,onChange}/>  (create-only)│  │
                │   │                                                  │   │
                │   │  <Gated editVerifications>                       │   │
                │   │    <VerificationSection {values,onChange}/>      │   │
                │   │  </Gated>                                        │   │
                │   │                                                  │   │
                │   │  <SubmitButton onPress=handleSubmit/>             │   │
                │   └──────────────────────────────────────────────────┘   │
                │                                                          │
                │   handleSubmit ──► buildPayload(values, category) ──►    │
                │                    PropertyService.createProperty /      │
                │                    updateProperty                        │
                └──────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                             axios multipart/form-data
                                       │
                                       ▼
                          Railway backend /api/properties
                          (propertyType is the only persisted discriminator;
                           no `category` field sent or stored)
```

### Recommended Project Structure (additions only)

```
src/
├── components/
│   └── CreateListingForm/            # NEW — 7 sub-components + shared types
│       ├── types.ts                  # FormBag, FormErrorBag, SectionProps
│       ├── BasicInfoSection.tsx
│       ├── ResidentialSection.tsx
│       ├── CommercialSection.tsx
│       ├── HospitalitySection.tsx    # Phase 4: stub returning null is acceptable; Phase 6 fills
│       ├── MediaSection.tsx          # Holds images + <Gated editMatterportUrl> + <Gated editPanoramicUrl>
│       ├── PriceSection.tsx
│       └── VerificationSection.tsx   # Caller wraps in <Gated editVerifications>
├── utils/
│   └── propertyCategory.ts           # NEW — PROPERTY_TYPE_TO_CATEGORY map + propertyTypeToCategory() + category arrays
├── screens/
│   └── CreateListingScreen.tsx       # EDITED — becomes orchestrator (~300–400 LOC target)
└── locales/
    ├── en.ts                          # EDITED — add: propertyType.hostel/hotel, category.residential/commercial/hospitality, remove propertyType.land
    └── ru.ts                          # EDITED — mirror en.ts; TypeScript enforces parity
```

### Pattern 1: Pure utility for category derivation

**What:** A single `propertyCategory.ts` exports the category map and a pure derivation function. Consumers include the form orchestrator, Phase 5 validation, and Phase 6 list screens.

**When to use:** Anywhere `propertyType` needs to be classified into Residential / Commercial / Hospitality.

**Example:**
```typescript
// src/utils/propertyCategory.ts
// Source: matches src/utils/ convention (formatPrice, parseOobCode, passwordPolicy)

export type PropertyCategory = 'Residential' | 'Commercial' | 'Hospitality';

/** Canonical property-type list.
 *  Order matters for the chip UI; groups together for visual scanning. */
export const PROPERTY_TYPES = [
  'Apartment', 'House', 'Townhome', 'Condo',      // Residential
  'Office', 'Retail', 'Warehouse', 'Industrial',   // Commercial
  'Hostel', 'Hotel',                                // Hospitality
] as const;
export type PropertyType = typeof PROPERTY_TYPES[number];

export const RESIDENTIAL_TYPES: readonly PropertyType[] =
  ['Apartment', 'House', 'Townhome', 'Condo'] as const;
export const COMMERCIAL_TYPES: readonly PropertyType[] =
  ['Office', 'Retail', 'Warehouse', 'Industrial'] as const;
export const HOSPITALITY_TYPES: readonly PropertyType[] =
  ['Hostel', 'Hotel'] as const;

export const PROPERTY_TYPE_TO_CATEGORY: Record<PropertyType, PropertyCategory> = {
  Apartment: 'Residential', House: 'Residential', Townhome: 'Residential', Condo: 'Residential',
  Office: 'Commercial', Retail: 'Commercial', Warehouse: 'Commercial', Industrial: 'Commercial',
  Hostel: 'Hospitality', Hotel: 'Hospitality',
};

/** Pure derivation. Unknown input → 'Residential' (safe default for brownfield data). */
export function propertyTypeToCategory(
  propertyType: string | null | undefined
): PropertyCategory {
  if (!propertyType) return 'Residential';
  return PROPERTY_TYPE_TO_CATEGORY[propertyType as PropertyType] ?? 'Residential';
}
```
**[VERIFIED: matches conventions in `src/utils/formatPrice.ts` and `src/utils/passwordPolicy.ts` (named exports, no default, `as const` arrays)]**

### Pattern 2: Section-props contract

**What:** Every sub-component accepts the same three-prop interface, keeping the orchestrator as the single state owner.

**Example:**
```typescript
// src/components/CreateListingForm/types.ts

export interface FormBag {
  // Always-present (shared across categories)
  title: string; description: string; address: string; city: string; district: string;
  type: 'rent' | 'sale'; propertyType: string;
  status: 'draft' | 'live';
  features: string[]; featureInput: string;
  selectedImages: any[];
  availableDate: string;
  // Residential / Commercial
  bedrooms: string; bathrooms: string; areaSqm: string; price: string; currency: string;
  // Hospitality (seeded empty in Phase 4; wired in Phase 5/6)
  rooms: string; maxGuests: string; amenities: string[];
  // Media (always; admin-gated inputs still render, gating happens in MediaSection)
  tours: Array<{ id: string; title: string; url: string }>;
  tourTitle: string; tourUrl: string;
  videoUrl: string; panoramicPhotosUrl: string; instagramUrl: string;
  // Contact (auto-filled read-only)
  contactEmail: string; contactPhone: string; contactWhatsapp: string; contactTelegram: string;
  // Admin-only verification flags
  verifyOwnership: boolean; verifyOwnerId: boolean; verifyStateDocs: boolean;
}

export type FormErrorBag = Partial<Record<keyof FormBag, string>>;

export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;   // Phase 4 passes `{}` — Phase 5 fills
}
```

**Why this shape wins over split state:** one `onChange` closure in the orchestrator → a single `useCallback` reference → child memoization works. Alternative (one `setX` per field, 25+ setter callbacks passed down) regenerates props on every parent render and kills `React.memo` downstream.

### Anti-Patterns to Avoid

- **Mounting all three category sections, CSS-hiding inactive ones:** exactly the data-rot failure mode PITFALLS Pitfall 4 describes for submit-payload leakage. Use conditional mount (`{category === 'Residential' && <ResidentialSection…/>}`); unmounting is the correct escape hatch because shared fields live in the orchestrator's `FormBag`, not the section.
- **Wrapping `<MediaSection>` in one outer `<Gated>`:** regresses Phase 3 scope — the `<Gated editMatterportUrl>` and `<Gated editPanoramicUrl>` wraps must stay **inside** MediaSection at the element level so non-admins still see `images`, `videoUrl`, and `instagramUrl`. (See Phase 3's 03-05-SUMMARY §"Three Gated Wrappers".)
- **Deriving category from a stored field:** adds a denormalization bug surface. Always derive from `propertyType` via `propertyTypeToCategory()`.
- **Introducing a new `ScrollView` inside any sub-component:** `KeyboardAwareScrollView` at the orchestrator level scopes to the focused input; nested scrolls trigger Phase 2 regression (library explicitly warns).
- **Hardcoding colors / skipping `useTheme()`:** CLAUDE.md forbids; dark/light parity is a ship gate.
- **Sending `category` in the submit payload:** backend doesn't accept it and will silently strip or reject. Derive-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin gating on URL inputs | Email check or `userType === 'admin'` in MediaSection | `<Gated action="editMatterportUrl">` / `<Gated action="editPanoramicUrl">` from Phase 3 | `scripts/check-role-grep.sh` D-14 4-part invariant will fail CI. Phase 3 is the single gating surface. |
| Category → chip group branching | Duplicate the type list inside each section | Read from `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` in `propertyCategory.ts` | Single source of truth; Phase 5 validation + Phase 6 list-screen filters all need the same arrays. |
| i18n key-set drift detection | Bash string-diff of en.ts and ru.ts | TypeScript already enforces: `ru.ts: Record<TranslationKeys, string>` | Compile-time guarantee (TS will reject the merge). Grep gate below is belt-and-suspenders. |
| Form state management | Redux / Zustand / MobX / React Query | Orchestrator `useState` | ARCHITECTURE.md says no external store; consistent with rest of codebase; 25 fields is not enough to justify a library. |
| Validation framework | zod / yup | (Phase 5 scope; NOT this phase) | This phase ships the taxonomy + decomposition; validation logic is Phase 5 (FORM-04/06/07/08). Leaving it stubbed here keeps the decomposition PR reviewable. |

**Key insight:** Phase 3 did the hard work on gating; Phase 2 did it on keyboard. Phase 4's risk profile is almost entirely **"did we miss a grep hit"** and **"did we accidentally regress a Phase-3 wrap"**. Both are easily detected by script.

## Runtime State Inventory

This phase is a code-only refactor on a clean-slate database. No runtime state to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None in-app. Backend has no production listings (PROJECT.md "Clean-slate data" — verified by absence of any reference to a production dataset). If any test/dev data on Railway has `propertyType: 'Land'`, that's a backend-cleanup task outside M1 mobile scope. | None for mobile. |
| Live service config | None — `propertyType` is just a string the backend accepts. No enum validation on server-side per existing `PropertyService` grep (line 73, 140: `formData.append('propertyType', propertyData.propertyType || 'apartment')` — backend tolerates whatever string). | None. |
| OS-registered state | None — no push notifications, Spotlight entries, Siri intents, etc. referencing `Land`. | None. |
| Secrets/env vars | None — no env var embeds property-type enum. | None. |
| Build artifacts | None — no compiled binary with Land string; TypeScript is JIT-transformed via Metro on each build. | None. |

**The canonical question:** After every file in the repo is updated, what runtime systems still have "Land" cached? Answer: **none that this phase owns**. Backend DB may have test listings with `propertyType: 'Land'`; clean-slate assumption per PROJECT.md means those are not user-visible and do not need migration. If non-mobile cleanup is desired, route as a backend task post-Phase-4.

## Common Pitfalls

### Pitfall 1: Missing a `Land` touchpoint (atomic removal failure)

**What goes wrong:** Removing Land from `PROPERTY_TYPES` in `CreateListingScreen.tsx` but leaving the locale entries intact. User switches language, still sees "Земля" in a dropdown that rendered an old cached property; or TypeScript key is still in `TranslationKeys` union and lints don't catch because nobody reads `t('propertyType.land')` after the chip removal.

**Why it happens:** `Land` is in exactly 4 places (see §B inventory below), but they live in 3 different files and 2 different layers (UI vs i18n). Miss any one and the phase ROADMAP gate fails.

**How to avoid:**
1. Use the exact grep from ROADMAP success criterion 1 — `grep -r -i 'propertyType.land\|"Land"' src/` — as a CI-blocking check.
2. Remove locale keys at the SAME commit as the type-list removal (CLAUDE.md rule: EN+RU parity per commit; PITFALLS Pitfall 4 rule: delete locale keys at the same commit as the definition).
3. Remove the TypeScript key from `en.ts` first; TypeScript will flag the now-missing key in `ru.ts`'s `Record<TranslationKeys, string>` at compile time — use this as the second fence.

**Warning signs:**
- `grep -rn "'Land'" src/` returns any hit after the phase lands.
- `npm run lint` passes but `tsc --noEmit` reports an unused `propertyType.land` key.

### Pitfall 2: Regressing a Phase-3 `<Gated>` wrap during decomposition

**What goes wrong:** Moving the Matterport tours section into `MediaSection.tsx` and wrapping the whole section in `<Gated editMatterportUrl>` instead of preserving the element-scoped wrap. Non-admins lose access to `videoUrl` + `instagramUrl` (which Phase 3 specifically left as visible siblings — 03-05-SUMMARY "Panoramic wrap scoped to ONLY the panoramic `<TextInput>`").

**Why it happens:** The "Links" section in the current file (lines 836–867) groups three URL inputs together and visually looks like a single unit; during decomposition the instinct is to `<Gated>`-wrap the whole group.

**How to avoid:**
1. **Read `03-05-SUMMARY.md` §"Six Migrated Sites" before carving up MediaSection.** The wrap boundaries are: (a) entire `styles.section` block for Matterport tours (lines 783–834); (b) just the single `<TextInput>` for panoramic URL (lines 848–857) — NOT its enclosing section.
2. Grep after carving: `grep -n '<Gated' src/components/CreateListingForm/MediaSection.tsx` should return exactly 2 lines. `grep -n 'videoUrl\|instagramUrl' src/components/CreateListingForm/MediaSection.tsx` should NOT be inside either Gated block.
3. Rerun `./scripts/check-role-grep.sh` after decomposition — all 4 invariants MUST still pass. This is the canonical regression detector.

**Warning signs:**
- Non-admin build loses the `videoUrl` input.
- `scripts/check-role-grep.sh` still passes, but manual inspection shows `<Gated>` too high in the tree (the grep gate doesn't check wrap scope, only inline `userType === 'admin'` + allowlist leakage).

### Pitfall 3: D-09 preserve-on-save anchor breakage

**What goes wrong:** `CreateListingScreen.tsx` lines 187 (`setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '')`), 392 (`panoramicPhotosUrl: panoramicPhotosUrl.trim()`), and 396 (`tours: tours.length > 0 ? tours : undefined`) must remain in the orchestrator. Phase 3 committed to "non-admin listers cannot EDIT Matterport/panoramic URLs but existing URLs are PRESERVED on save" (PROJECT.md Key Decisions row 124; 03-VERIFICATION.md GATE-02 row 3).

**Why it happens:** During decomposition, an eager refactorer moves the `panoramicPhotosUrl` state and its associated `propertyToEdit` rehydration into `MediaSection`. Because MediaSection wraps that input in `<Gated>`, non-admins now have a component that never rehydrates the field and never submits it → existing URL silently lost on save.

**How to avoid:**
1. **State (useState hook) stays in the orchestrator** — including `panoramicPhotosUrl` and `tours`. MediaSection receives them via `values`, renders the `<Gated>` input that binds to `values.panoramicPhotosUrl` + calls `onChange('panoramicPhotosUrl', …)`.
2. The rehydration in `useEffect` for `propertyToEdit` at orchestrator lines 145–218 stays verbatim.
3. The submit payload construction in `handleSubmit` at lines 377–407 stays in the orchestrator (or moves to a pure `buildPayload(values, category)` in `CreateListingForm/payload.ts`). In either case, `panoramicPhotosUrl` and `tours` are UNCONDITIONAL fields in the payload.
4. Acceptance check: edit an existing listing with `panoramicPhotosUrl: 'https://example.com/pano'` as a non-admin, tap Save, refetch. The URL is still present.

**Warning signs:**
- `grep -n 'panoramicPhotosUrl' src/screens/CreateListingScreen.tsx` returns fewer than 4 hits after refactor (expected: state decl + rehydrate + payload + input binding).
- Non-admin edit round-trip drops the panoramic URL.

### Pitfall 4: Category chip UX accidentally changing `propertyType` on chip tap

**What goes wrong:** Two-tier chip UX (category chips first, then type chips) — user taps "Commercial" and the orchestrator silently sets `propertyType = 'Office'` (first commercial type). If the user had `propertyType = 'Apartment'` with 5 filled fields, the shared fields survive (good) but the user may see type = "Office" highlighted unexpectedly.

**Why it happens:** Categories are derived, not stored. The UX has to make the derivation visible somehow. The simplest implementation (auto-select first type of new category) creates a silent state change.

**How to avoid:** Two viable UX patterns:
- **Flat grouped chips (RECOMMENDED):** render all 10 property-type chips in a single wrapping row, grouped with a small divider + subtle category label. Only `propertyType` is tappable; category is purely a visual label. Matches the current UI flow (user already taps chip directly). No category state. Derivation is display-only.
- **Two-level chips (only if user explicitly requests):** tapping a category chip enters a "filter" state that hides types outside the category; `propertyType` is unchanged until user taps a type chip. Requires explicit empty state ("pick a type") if user switches categories with no active type.

Recommend FLAT GROUPED — minimal state change vs current, single tap = single mutation.

**Warning signs:**
- Silent `propertyType` change on category tap (unreproducible user reports).
- Category chip tap triggers `onChange('propertyType', …)`.

### Pitfall 5: Locale files being out of sync despite TypeScript enforcement

**What goes wrong:** Someone adds a key to `en.ts`, runs Metro (which doesn't do full TS check), ships. `tsc --noEmit` would have caught the missing `ru.ts` entry but the developer didn't run it.

**How to avoid:**
1. `ru.ts` is typed `Record<TranslationKeys, string>` — see line 3 of `src/locales/ru.ts`. TypeScript WILL flag the missing key — but only if `tsc --noEmit` runs. Metro / `react-native run-ios` does NOT do full type check.
2. Add a script `npm run typecheck` = `tsc --noEmit` (if it doesn't exist); make it a phase-exit gate.
3. Belt-and-suspenders grep:
   ```bash
   diff <(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u) \
        <(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)
   ```
   No diff = parity.

## Current `CreateListingScreen.tsx` — Section-by-Section Map

**File:** `src/screens/CreateListingScreen.tsx`
**Total lines:** 1314 (verified via `wc -l`)
**Largest sections are JSX render blocks inside the non-verificationOnly return starting at line 489.**

| Lines | Section | Belongs To (new sub-component) | Notes |
|-------|---------|--------------------------------|-------|
| 1–29 | Imports | orchestrator | `KeyboardAwareScrollView`, `Gated`, `useRole` all stay at orchestrator. |
| 31–34 | `CURRENCY_OPTIONS` const | `PriceSection` (private) | Move into `PriceSection.tsx` or `src/utils/currencies.ts`. Small. |
| 37–47 | `PROPERTY_TYPES` array | `src/utils/propertyCategory.ts` | **Edit:** remove Land, add Hostel/Hotel. Move to utils and re-export if `CreateListingScreen` needs the typed array. |
| 49–55 | `CreateListingScreenProps` interface | orchestrator | Unchanged. |
| 57–66 | Component signature + context hooks | orchestrator | Unchanged. |
| 68–88 | `useState` × 25 form fields | **orchestrator** (all stay here) | Add 3 new fields in Phase 4: `rooms`, `maxGuests`, `amenities`. Do NOT split. |
| 91–102 | `useState` for images, tours, contacts | orchestrator | Unchanged. |
| 104–112 | `useState` for loading, verification flags; `useRole()` destructure | orchestrator | Unchanged. |
| 114–136 | `verificationSwitchRow` JSX builder | `VerificationSection` (move) | Pure render helper; relocate. |
| 138–143 | `applyVerificationFromProperty` | orchestrator OR `VerificationSection` | Rehydration logic — keep in orchestrator for single source of edit-mode rehydration. |
| 145–218 | `useEffect` — rehydrate from `propertyToEdit` | **orchestrator** (MUST stay) | D-09 anchor; see Pitfall 3. |
| 220–240 | `loadUserProfile` | orchestrator | Auto-fills `contactEmail`/`contactPhone`/etc. Shared across all categories. |
| 242–251 | `addFeature`, `removeFeature` | `BasicInfoSection` (or a feature chips component) | Feature is shared; could live in BasicInfoSection as an inline helper or a separate `FeaturesSection`. |
| 253–299 | `handleSelectImages`, `removeImage` | `MediaSection` | Images always render; no gating. |
| 301–317 | `addTour`, `removeTour` | `MediaSection` (inside `<Gated editMatterportUrl>` section) | Only used when admin. Callbacks live in orchestrator OR `MediaSection`; orchestrator is cleaner because `tours` state is there. |
| 319–432 | `handleSubmit` | **orchestrator** | D-09 anchor (lines 392/396). Optionally extract a pure `buildPayload(values, category)` helper; do not break the Gated `can('editVerifications')` branch at lines 398–406. |
| 434–442 | `loadingProfile` early return | orchestrator | Unchanged. |
| 444–487 | `verificationOnly` branch (admin-only minimal screen) | orchestrator | **Do NOT decompose in Phase 4.** This entry-point is called from `PropertyDetailsScreen`'s "Edit verifications" admin link; collapsing it into sub-components adds complexity for no benefit. Leave as-is; the non-`verificationOnly` branch is what decomposes. |
| 489–502 | Header | orchestrator | Unchanged. |
| 504–510 | `KeyboardAwareScrollView` wrapper | orchestrator | Phase 2 deliverable; keep. |
| 511–538 | Transaction Type (rent/sale segment) | `BasicInfoSection` | Shared. |
| 540–559 | Basic Info (title + description) | `BasicInfoSection` | Shared. |
| 561–585 | Location (address + district + city) | `BasicInfoSection` | Shared. |
| 587–713 | Property Details (currency + price + propertyType chips + bedrooms/bathrooms/area + availableDate) | **SPLIT:** category-chip + propertyType-chip → `BasicInfoSection`; currency + price → `PriceSection` (conditional on category !== Hospitality); bedrooms/bathrooms → `ResidentialSection`; area → `ResidentialSection` + `CommercialSection`; availableDate → `BasicInfoSection` (shared) | This is the biggest carve. Currently all three collapse into one `<View style={styles.section}>`. Phase 5 owns the fine-grained validation; Phase 4 ships the split. |
| 715–744 | Features (tag input + chip list) | `BasicInfoSection` or dedicated `FeaturesSection` | Always shown. Features = free-form tags (e.g., "parking", "AC"). Do NOT conflate with Phase 6 HOSP-05 amenities taxonomy — they're different fields. |
| 746–781 | Images | `MediaSection` | Always shown. Photos bound to `selectedImages`. |
| 783–834 | Matterport 3D Tours — **`<Gated action="editMatterportUrl">`** | `MediaSection` — preserve wrap verbatim | Phase 3 Site 5. |
| 836–867 | Links (videoUrl + **`<Gated action="editPanoramicUrl">`**panoramicPhotosUrl + instagramUrl) | `MediaSection` — panoramic wrap is element-scoped | Phase 3 Site 6. videoUrl + instagramUrl stay visible to non-admins. |
| 869–900 | Contact Info (read-only auto-filled) | `ContactSection` (new, read-only) | Shared. Could also stay inline in orchestrator — ~30 LOC. |
| 902–938 | Status (draft/live segment, create-only) | `StatusSection` (new, create-only) | Already has conditional `{!isEditMode && (...)}`. |
| 940–950 | **`<Gated action="editVerifications">`** Admin verification switches | `VerificationSection` — caller wraps in `<Gated>` | Phase 3 Site 4. |
| 952–969 | Submit Button | orchestrator | Unchanged. |
| 970–1314 | `StyleSheet.create` | **SPLIT:** shared styles (input, textArea, section, etc.) → `CreateListingForm/styles.ts`; per-section private styles → co-located in each section file | Matches CONVENTIONS.md "styles colocated at bottom of file". |

**Proposed orchestrator LOC after split:** ~350–450 lines (mostly state + useEffect + handleSubmit + KeyboardAwareScrollView JSX + imports + verificationOnly branch). Each sub-component: 50–200 lines. Goal isn't strict line count — it's that "a contributor can understand ResidentialSection without reading CommercialSection."

## Complete Inventory of `Land` References Across `src/`

Verified 2026-04-23 via:
```bash
grep -rn -i "land" src/ | grep -v "landlord\|landscape\|landing\|Landlord"
```

**[VERIFIED: live grep at HEAD]** Exactly 4 in-scope hits:

| # | File | Line | Context | Removal Action |
|---|------|------|---------|----------------|
| 1 | `src/screens/CreateListingScreen.tsx` | 45 | `{ value: 'Land', labelKey: 'propertyType.land' },` inside `PROPERTY_TYPES` array | Delete line. Array moves to `src/utils/propertyCategory.ts` anyway. |
| 2 | `src/screens/HomeScreen.tsx` | 49 | `const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Land', 'Industrial'];` | Delete `'Land'`. Better: replace whole const with import from `propertyCategory.ts` (`COMMERCIAL_TYPES`). Out-of-scope nit: Phase 5/6 can consolidate `isCommercial` flag derivation. |
| 3 | `src/locales/en.ts` | 259 | `'propertyType.land': 'Land',` | Delete line. |
| 4 | `src/locales/ru.ts` | 262 | `'propertyType.land': 'Земля',` | Delete line. TypeScript will flag if en.ts still has it (enforces key parity). |

**Intentional misses to NOT modify:**
- None detected. No `landlord`, `landscape`, `landing`, or other substring hits exist in the `src/` tree per the filtered grep.

**Cross-tier confirmation:**
- `src/types/Property.ts`: `propertyType?: string` — no enum, nothing to edit. **[VERIFIED: file read in full, 63 lines, only the optional string field]**
- `src/data/`: empty directory. No mock/seed data. **[VERIFIED: ls output]**
- `__tests__/App.test.tsx`: smoke test only; no propertyType literal. Safe.
- Markdown docs at root (`README.md`, `IOS_APP_STORE_READINESS.md`, etc.): out of `src/` scope; grep limited to `src/`.
- Android / iOS native code: unreachable for string enums in a JS-first RN app; the propertyType value is stored in the backend, not embedded natively.

**Confidence:** HIGH — 4 hits, 4 files, no exotic references. Atomic removal is a single commit.

## Inventory of `Hostel` / `Hotel` / `Hospitality` References

**[VERIFIED: grep at HEAD]** Exactly **ZERO** matches in `src/` for `'Hostel'`, `'Hotel'`, or `hospitality\.` (dotted locale-key pattern). This phase introduces these tokens fresh. All locale keys, type chips, and category labels are net-new.

## Sub-Component Decomposition Contract

### State Ownership: ORCHESTRATOR WINS

| Concern | Owner | Reason |
|---------|-------|--------|
| All form values (`FormBag`) | Orchestrator (`useState` per field, or a single `useReducer` in Phase 5) | Prevents re-mount data loss on category switch (Pitfall 4); single source of truth for `handleSubmit`; rehydration from `propertyToEdit` already lives here. |
| `onChange(field, value)` callback | Orchestrator (memoized via `useCallback`) | One stable reference; child `React.memo` works. |
| `errors` | Orchestrator (stub `{}` in Phase 4; filled by `validateByCategory` in Phase 5) | Validation lives at orchestrator; sections only render. |
| `loading` / `loadingProfile` | Orchestrator | Kicks off `loadUserProfile` + `handleSubmit`. |
| `can(...)` from `useRole()` | Orchestrator destructure + also inside each section that needs it (cheap — hook) | Matches current pattern (line 112); sections call `useRole()` independently where convenient. |
| Section-local ephemeral UI (e.g., date-picker open boolean, feature input buffer) | Section-local `useState` | Truly local; never affects payload. |

### Prop Interface (canonical)

```typescript
export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;
}
```

**`MediaSection` variant:** takes additional imperative callbacks for image-picker side effects (or receives `handleSelectImages` + `removeImage` from orchestrator — simpler because `ImagePicker` native module is already imported there).

**`ContactSection` variant:** read-only → needs only `{ values: Pick<FormBag, 'contactEmail'|'contactPhone'|'contactWhatsapp'|'contactTelegram'> }`.

**`VerificationSection` variant:** takes `{ values, onChange }` — always admin (caller wraps in `<Gated>`). No `errors` needed.

### Why NOT a single `<FormState>` context

Considered. Rejected because:
- Adds re-render churn across all sections on every keystroke (context consumers re-render when context value's reference changes).
- Testing each section requires a provider wrapper → slower, harder.
- 7 props × 7 sections = 49 destructures, but they're stable shapes; context coupling is tighter for no payoff.

### Styles

Shared `StyleSheet` values (`input`, `textArea`, `section`, `sectionTitle`, `label`, `hint`, `chipRow`, `chip`, `chipText`) → extract to `src/components/CreateListingForm/styles.ts` as a shared `commonStyles`. Private styles (e.g., `currencyRow` inside `PriceSection`) co-locate in the section file per CONVENTIONS.md.

## Backend Payload Confirmation: `category` IS CLIENT-ONLY

**[VERIFIED: grep at HEAD]** `PropertyService.ts`:
- `createProperty` (lines 51–116): `FormData.append` for 15 fields. **No `category` field.** Only `propertyType` discriminates.
- `updateProperty` (lines 118–188): same shape.
- `patchPlatformVerifications` (lines 191–218): orthogonal admin-only path.

**Implication:**
- `category` is **derived** on the client from `propertyType` via `propertyTypeToCategory()` and **never sent** to the backend.
- Phase 4's submit payload (line 377–407 of `CreateListingScreen.tsx`) needs **zero** changes to the service call shape. Only the UI rendering branches.
- Phase 5 (required-field validation by category) still derives client-side and filters the payload before calling `PropertyService`.
- Phase 6 (separate hospitality section on list screens) derives category client-side from the fetched `Property.propertyType` field.

**What about the backend accepting `propertyType: 'Land'` post-removal?** Existing behavior: the backend is a pass-through per PropertyService line 73 (`propertyData.propertyType || 'apartment'` — default is enum-free). The backend will accept any string. Land on clean-slate backend is a non-issue.

**What about the backend accepting `propertyType: 'Hostel' / 'Hotel'`?** Same — pass-through. No backend enum to extend. No backend coordination required.

## Code Examples

### Example 1: Orchestrator mounting the conditional category section

```typescript
// Source: derived from current src/screens/CreateListingScreen.tsx + pattern §§A/D
import { propertyTypeToCategory } from '../utils/propertyCategory';
import { ResidentialSection } from '../components/CreateListingForm/ResidentialSection';
import { CommercialSection } from '../components/CreateListingForm/CommercialSection';
import { HospitalitySection } from '../components/CreateListingForm/HospitalitySection';

// inside render
const category = propertyTypeToCategory(propertyType);
// ...
{category === 'Residential' && (
  <ResidentialSection values={values} onChange={onChange} errors={errors} />
)}
{category === 'Commercial' && (
  <CommercialSection values={values} onChange={onChange} errors={errors} />
)}
{category === 'Hospitality' && (
  <HospitalitySection values={values} onChange={onChange} errors={errors} />
)}
```

### Example 2: MediaSection preserving BOTH Phase-3 wrap scopes

```typescript
// Source: src/components/CreateListingForm/MediaSection.tsx (NEW)
// Mirrors scope from src/screens/CreateListingScreen.tsx:783–867 at HEAD
import { Gated } from '../Gated';

export const MediaSection: React.FC<MediaSectionProps> = ({ values, onChange, /* image callbacks */ }) => (
  <>
    {/* Images — always visible */}
    <View style={styles.section}>{/* … selectedImages + handleSelectImages */}</View>

    {/* Matterport tours — entire section hidden for non-admin */}
    <Gated action="editMatterportUrl">
      <View style={styles.section}>
        {/* tourTitle + tourUrl inputs, addTour button, tours list */}
      </View>
    </Gated>

    {/* Links section: videoUrl + panoramic (gated inline) + instagramUrl */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('createListing.links')}</Text>
      <TextInput
        // videoUrl — VISIBLE to non-admin
        value={values.videoUrl}
        onChangeText={(v) => onChange('videoUrl', v)}
      />
      <Gated action="editPanoramicUrl">
        <TextInput
          // panoramicPhotosUrl — HIDDEN for non-admin
          value={values.panoramicPhotosUrl}
          onChangeText={(v) => onChange('panoramicPhotosUrl', v)}
        />
      </Gated>
      <TextInput
        // instagramUrl — VISIBLE to non-admin
        value={values.instagramUrl}
        onChangeText={(v) => onChange('instagramUrl', v)}
      />
    </View>
  </>
);
```

### Example 3: Payload builder preserving D-09 anchors

```typescript
// Source: can live in src/components/CreateListingForm/payload.ts OR stay inline in orchestrator
// Preserves lines 377–407 of current CreateListingScreen.tsx verbatim in field semantics.
export function buildSubmitPayload(
  values: FormBag,
  can: (a: Action) => boolean
): SubmitPayload {
  const fullAddress = buildFullAddress(values); // extract the city-concat logic from line 362–371
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    address: fullAddress,
    city: values.city || 'Bishkek',
    price: parseFloat(values.price) || values.price,
    currency: values.currency,
    period: values.type === 'rent' ? 'month' : undefined,
    type: values.type,
    propertyType: values.propertyType,
    bedrooms: parseInt(values.bedrooms) || 0,
    bathrooms: parseInt(values.bathrooms) || 0,
    areaSqm: parseFloat(values.areaSqm) || 0,
    features: values.features,
    videoUrl: values.videoUrl.trim(),
    panoramicPhotosUrl: values.panoramicPhotosUrl.trim(),  // D-09: UNCONDITIONAL
    instagramUrl: values.instagramUrl.trim(),
    availableDate: values.availableDate.trim() || undefined,
    status: values.status,
    tours: values.tours.length > 0 ? values.tours : undefined,  // D-09: UNCONDITIONAL
    ...(can('editVerifications')
      ? {
          platformVerifications: {
            ownershipDocuments: values.verifyOwnership,
            ownerIdentityVerified: values.verifyOwnerId,
            stateIssuedDocumentsVerified: values.verifyStateDocs,
          },
        }
      : {}),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 1300-LOC single-file screen | Orchestrator + 7 sub-components | This phase | Review surface shrinks; per-section edits no longer touch foreign code. |
| `PROPERTY_TYPES` inline in screen | `src/utils/propertyCategory.ts` single source | This phase | Phase 5/6 consumers import instead of duplicating. |
| Land type | Removed entirely | This phase | User decision; clean slate. |
| 9 property types | 10 property types (−Land, +Hostel, +Hotel) | This phase | Hostel/Hotel are new. |
| Category = implicit (boolean `isCommercial` in HomeScreen) | Category = derived from propertyType via pure function | This phase (partial — HomeScreen consolidation deferred to Phase 5/6) | Taxonomy formalized. |

**Not deprecated in this phase, flagged for later:**
- `HomeScreen` `isCommercial` / `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` constants — duplicate source of truth. Consolidate in Phase 5/6 when Hospitality filter lands.
- `CreateListingScreen.tsx:396` — the `tours: tours.length > 0 ? tours : undefined` ternary in the payload. Works today; Phase 5's `buildPayload` helper can normalize.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backend will transparently accept `propertyType: 'Hostel'` and `propertyType: 'Hotel'` strings without any enum validation (same pass-through as all other types today). | "Backend Payload Confirmation" | If backend enforces an enum, non-admin Hospitality listings fail at create. Mitigation: confirm with Railway team in a single-line question (matches the M1 GATE-05 outreach pattern). Research confidence: HIGH — PropertyService client code uses defaults (`|| 'apartment'`), strongly suggests permissive server. |
| A2 | Clean-slate backend has no production listings with `propertyType: 'Land'` that need data cleanup. | "Runtime State Inventory" | Any dev/test fixtures with Land would render as "Land" via `t('propertyType.land')` — except Phase 4 removes that key. Fallback: unknown `propertyType` falls through to `?? 'Residential'` in `propertyTypeToCategory()` and the chip shows `propertyType` string raw (no i18n key). Cosmetic drift, not crash. |
| A3 | `HomeScreen`'s `COMMERCIAL_TYPES` / `RESIDENTIAL_TYPES` consolidation can wait for Phase 5/6. | §B, "State of the Art" | Medium — if Phase 5's filter logic needs the category arrays, it'll pull from `propertyCategory.ts`. Phase 4 still passes the grep gate because it removes `'Land'` from HomeScreen's list. |
| A4 | Hospitality-specific fields (rooms, maxGuests, amenities) can be seeded as empty `useState` in this phase but their UI lives in `HospitalitySection` as a Phase 6 fill. | "Claude's Discretion", "Sub-Component Decomposition Contract" | If discuss-phase says "Phase 4 must also render HospitalitySection UI," scope expands by ~4 hours. Currently sized for stub-only. |
| A5 | No automated tests are required for Phase 4 (M1 testing bar is manual physical-device QA per CLAUDE.md). | "Validation Architecture" below | If discuss-phase says "add pure-function unit tests for propertyTypeToCategory()," add ~30 min. Negligible risk. |

## Open Questions

1. **Does `HospitalitySection` render anything in Phase 4, or is it a `return null` stub?**
   - What we know: ROADMAP success criterion 5 requires all 10 property types smoke-test in the refactored screen. A Hostel listing in create mode with a null section means the user can select type=Hostel but only sees BasicInfo + Media + Status. Submit still succeeds (all required fields are in BasicInfoSection). Phase 6 (HOSP-05) owns the 12-item amenities taxonomy.
   - What's unclear: whether "smoke-test for each of the 10 property types" means "the chip is selectable" (stub passes) or "the correct field set is shown" (stub fails — Hostel needs rooms/maxGuests/amenities to be visible per REQUIREMENTS.md FORM-04).
   - **Recommendation:** Ship Hospitality stub that renders minimum fields (rooms + maxGuests TextInputs, amenities as a plain-text placeholder). Full multi-select amenities = Phase 6. This satisfies FORM-04 as "the category renders the right field set" without pre-empting Phase 6.

2. **Flat grouped chips vs two-level chip UX?**
   - What we know: current UI is flat (single row of wrapping chips). Users already tap property-type directly. Category is a derived display label.
   - Recommendation: keep flat, add subtle category label above each group. Discuss-phase may lock differently.

3. **Should `COMMERCIAL_TYPES` in `HomeScreen.tsx:49` be replaced with an import from `propertyCategory.ts` in THIS phase, or deferred to Phase 5/6?**
   - What we know: HomeScreen's category filter is strictly out of Phase 4 scope per REQUIREMENTS.md traceability (FORM-01 only says "Land removed from filter UI in HomeScreen"). Deferring the full consolidation keeps the PR reviewable.
   - Recommendation: in Phase 4, minimally edit HomeScreen line 49 to remove `'Land'`. Leave the whole flat-import consolidation for Phase 6 (HOSP-01/02 — when Hospitality filter lands on Home).

4. **Test scaffolding: add any pure-function tests for `propertyTypeToCategory` in Phase 4?**
   - What we know: M1 testing bar is manual QA. Phase 3 did land Jest tests for `useRole()` / `Gated` / `adminAllowlist` because those were functionally new + security-sensitive.
   - Recommendation: add a tiny `src/utils/__tests__/propertyCategory.test.ts` (5 tests, <50 LOC) — the function is pure, the test is cheap, and it's the single source of truth for Phase 5/6 downstream consumers. Even 5 assertions catches the Land-accidentally-kept-in-map-but-removed-from-array drift.

## Environment Availability

Phase 4 is a code-only refactor; it depends on tooling already verified in Phases 1–3.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Metro bundler, tsc, jest | ✓ | 22+ per `package.json` `engines` | — |
| TypeScript | Compile-time parity enforcement on locales | ✓ | 5.8.3 per `package.json` | — |
| Jest | Optional `propertyCategory.test.ts` (Open Question #4) | ✓ | existing (Phase 3 shipped tests) | Skip tests; rely on TypeScript + grep |
| react-native-keyboard-controller | CreateListingScreen scroll already wraps; orchestrator inherits | ✓ | 1.21.6 (Phase 2) | — |
| `scripts/check-role-grep.sh` | Regression gate on Phase 3 wraps | ✓ | committed `fa25b8b` (Phase 3) | — |
| Physical iOS + Android devices | Manual QA per CLAUDE.md M1 bar | User-provided | — | Simulator acceptable for non-gesture regressions |

**No missing dependencies. No fallbacks needed.**

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.x via `preset: 'react-native'` (default from `@react-native` preset; existing in repo per `jest.config.js`) |
| Config file | `jest.config.js` + `jest.setup.js` (already extended in Phase 3-04 with native-module stubs) |
| Quick run command | `npx jest src/utils/__tests__/propertyCategory.test.ts -x` (if tests added) |
| Full suite command | `npm test` (runs all Jest tests; Phase 3 baseline: 15/15 GREEN) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORM-01 | `Land` absent from src/ | grep-gate (script) | `./scripts/check-land-removed.sh` OR manual `grep -rn -i 'propertyType.land\|"Land"' src/` | ❌ Wave 0 — script to add |
| FORM-01 | `Land` absent from TranslationKeys union | compile-check | `npx tsc --noEmit` | ✅ (`tsc` already configured; add `npm run typecheck` script if absent) |
| FORM-02 | `Hostel`/`Hotel` selectable chips | manual QA | physical iOS + Android — tap chip, confirm highlight | N/A (manual) |
| FORM-03 | `propertyTypeToCategory(x)` returns correct category | unit | `npx jest src/utils/__tests__/propertyCategory.test.ts` | ❌ Wave 0 — `src/utils/__tests__/propertyCategory.test.ts` to create |
| FORM-05 | 7 sub-component files exist + `CreateListingScreen` reduced | structural | `ls src/components/CreateListingForm/` + `wc -l src/screens/CreateListingScreen.tsx` (target: < 500 LOC) | N/A (manual/script) |
| FORM-05 | Phase 3 wraps preserved | grep-gate | `./scripts/check-role-grep.sh` (existing) + `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx` expected `2` + same for CreateListingScreen (if VerificationSection callsite wraps) | ✅ (existing script) |
| FORM-05 | D-09 preserve-on-save anchors intact | smoke test | manual physical-device edit round-trip as non-admin: load listing with `panoramicPhotosUrl` + `tours`, save, verify fields preserved | N/A (manual) |
| FORM-09 | EN+RU key parity | compile-check + grep-gate | `npx tsc --noEmit` catches missing RU keys (since `ru.ts: Record<TranslationKeys, string>`) + `diff <(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts \| sort -u) <(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts \| sort -u)` | ✅ (tsc exists; diff script is Wave 0 addition) |

### Manual QA Matrix — 10 property types × create + edit

Manual physical-device QA is the M1 bar per CLAUDE.md. The REQUIRED coverage for Phase 4 exit:

| Property Type | Category (derived) | Create flow | Edit flow (pre-existing listing of that type) | Pass criterion |
|---------------|--------------------|-------------|----------------------------------------------|----------------|
| Apartment | Residential | ✓ | ✓ | Chip highlighted; Residential section visible (bedrooms/bathrooms/area); Price section visible |
| House | Residential | ✓ | ✓ | Same as Apartment |
| Townhome | Residential | ✓ | ✓ | Same as Apartment |
| Condo | Residential | ✓ | ✓ | Same as Apartment |
| Office | Commercial | ✓ | ✓ | Commercial section visible (area only, no bedrooms/bathrooms YET — Phase 5 hides them; Phase 4 acceptable if they're still shown but blank) |
| Retail | Commercial | ✓ | ✓ | Same as Office |
| Warehouse | Commercial | ✓ | ✓ | Same as Office |
| Industrial | Commercial | ✓ | ✓ | Same as Office |
| **Hostel** | **Hospitality** | ✓ | N/A (no pre-existing Hostel data) | Hostel chip appears under Hospitality category label; HospitalitySection renders (at minimum rooms + maxGuests inputs per Open Q #1); Price section HIDDEN |
| **Hotel** | **Hospitality** | ✓ | N/A | Same as Hostel |
| **~~Land~~** | ~~—~~ | Chip MUST NOT be selectable | Editing a hypothetical Land listing shouldn't crash | Land chip absent from chip row; grep gate green |

**Matrix size:** 10 types × 2 flows (create / edit) = 20 cells, minus 2 N/A for Hostel/Hotel edit = **18 cells** to walk. Budget ~30 min on each device (iPhone + Android). Plus 2 Land-absence checks on each device.

**Admin vs non-admin sub-matrix:** Sign in as admin (beckprograms@gmail.com) and non-admin, confirm MediaSection behavior:
- Admin: Matterport tours section visible + panoramic URL input visible
- Non-admin: Matterport section hidden + panoramic URL hidden; videoUrl + instagramUrl still visible

### Grep Invariants (CI gates — must pass at phase exit)

Ordered by criticality:

1. **Role-gating regression (Phase 3 D-14):** `./scripts/check-role-grep.sh` → 4/4 OK. Non-negotiable.
2. **Land removal:** `grep -r -i 'propertyType.land\|"Land"' src/` returns zero in-scope hits (only `landlord`/`landscape`-style non-real-estate strings survive, and none exist in current tree per §B inventory).
3. **Category single-source:** `grep -rn "PROPERTY_TYPE_TO_CATEGORY\|propertyTypeToCategory\|RESIDENTIAL_TYPES\|COMMERCIAL_TYPES\|HOSPITALITY_TYPES" src/` — all hits should reference `src/utils/propertyCategory.ts` (imports) or BE `src/utils/propertyCategory.ts` (definition). No inline duplicates outside the util file, no literal `['Apartment', 'House', ...]` in screens or sections.
4. **Locale key parity:** `diff <(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u) <(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)` → empty. Belt-and-suspenders to TypeScript's `Record<TranslationKeys, string>`.
5. **D-09 preserve-on-save anchors:** `grep -cE "panoramicPhotosUrl\s*:" src/screens/CreateListingScreen.tsx` ≥ 2 (rehydrate + payload); `grep -cE "tours\s*:" src/screens/CreateListingScreen.tsx` ≥ 2 (rehydrate + payload). Stricter check: inspect lines around current 187/392/396 anchors remain functionally present (may move lines during refactor).

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit` + targeted grep (Land removal, Gated wrap count if Task touches MediaSection).
- **Per wave merge:** Full `scripts/check-role-grep.sh` + full Jest suite + locale parity diff + Land grep.
- **Phase gate:** All 5 grep invariants green + full Jest suite green + 18-cell manual QA matrix green on iOS and Android physical devices + both admin and non-admin acceptance paths green + `/gsd-verify-work` PASSED.

### Wave 0 Gaps

- [ ] `src/utils/__tests__/propertyCategory.test.ts` — unit tests for `propertyTypeToCategory` covering all 10 types + unknown input + null/undefined. Tiny, recommended. (Open Q #4.)
- [ ] `scripts/check-locale-parity.sh` — optional; TypeScript already enforces at compile time, but a shell-level gate is more greppable for CI. Budget 15 min.
- [ ] `npm run typecheck` script in `package.json` (`"typecheck": "tsc --noEmit"`) — if absent. Verify before Phase 4 planning.
- [ ] Framework install: none needed.

## Project Constraints (from CLAUDE.md)

Extracted directives that the planner MUST respect (treat as locked-decision-equivalent):

1. **Navigation stays custom `App.tsx` state machine.** No `react-navigation` migration. Not relevant to this phase but restated.
2. **State via React Context providers** (`ThemeProvider` → `LanguageProvider` → `AuthProvider`), local `useState` for components. Does NOT override the recommendation to keep form state in the orchestrator — that's a single-screen decision, not a global one.
3. **HTTP via `axios` to Railway backend + Firebase Identity Toolkit REST.** Unchanged by this phase.
4. **i18n: EN + RU parity required for every new UI string** (`src/locales/en.ts`, `src/locales/ru.ts`). **Note: locale files are `.ts`, not `.json`** — ROADMAP criterion 4 says `.json` but the codebase uses `.ts`. Planner should align wording to match reality; intent is identical (both files). TypeScript `Record<TranslationKeys, string>` enforces parity at compile time.
5. **Theme: use `useTheme()` tokens — no hardcoded colors; dark/light parity required.** Every new sub-component reads `const { colors, isDark } = useTheme()`.
6. **Testing bar: manual physical-device QA for M1** (iOS + Android). Automated tests welcome where cheap (e.g., `propertyCategory.test.ts`) but not required.
7. **Stack decisions locked:** no schema-driven form engine in M1. `react-hook-form` + `zod` are M2+ fallbacks (and `zod@^3.24` if adopted, NEVER v4 per colinhacks/zod#4989).
8. **Clean-slate data:** no production listings, no migration concerns. Permits atomic Land removal without backend cleanup.
9. **`useRole()` / `<Gated>` / `canFromUser()` are the Phase 3 deliverables — reuse, don't reinvent.** `scripts/check-role-grep.sh` D-14 4-part invariant must still pass.
10. **For ad-hoc fixes: keep the three-category taxonomy and role-gating API shape intact — out-of-scope additions belong in PROJECT.md Out of Scope.** Reinforces the Deferred Ideas list above.

## Sources

### Primary (HIGH confidence)

- `src/screens/CreateListingScreen.tsx` (1314 LOC) — full read, section map verified line-by-line at HEAD. [VERIFIED]
- `src/screens/HomeScreen.tsx` lines 48–49, 118–126, 370–400 — Land reference + COMMERCIAL_TYPES filter flow. [VERIFIED]
- `src/locales/en.ts` line 259, `src/locales/ru.ts` line 262 — only Land locale entries. [VERIFIED]
- `src/types/Property.ts` — 63 lines, no propertyType enum (it's `propertyType?: string`). [VERIFIED]
- `src/utils/` — no existing category utility. [VERIFIED]
- `src/data/` — empty. [VERIFIED]
- `src/components/` — no `CreateListingForm/` dir yet. [VERIFIED]
- `src/hooks/useRole.ts` (122 LOC) — Action union, canFromUser, priority ladder. [VERIFIED]
- `src/components/Gated.tsx` (24 LOC) — declarative guard. [VERIFIED]
- `src/constants/adminAllowlist.ts` — allowlist + isAllowlistedAdmin. [VERIFIED]
- `src/services/PropertyService.ts` lines 51–188 — payload shape, no `category` field. [VERIFIED]
- `scripts/check-role-grep.sh` — D-14 4-part invariant; full file read. [VERIFIED]
- `package.json` — confirmed dependencies: `react-native-keyboard-controller@^1.21.6`, `react-native-reanimated@^4.3.0`, `react-hook-form` and `zod` ABSENT. [VERIFIED]
- `jest.config.js` + `jest.setup.js` — confirmed test framework + existing native-module stubs. [VERIFIED]
- `.planning/PROJECT.md` Key Decisions rows 113–124 — M1 scope + D-22 accepted risk. [CITED]
- `.planning/REQUIREMENTS.md` — FORM-01/02/03/05/09 text + traceability matrix. [CITED]
- `.planning/ROADMAP.md` Phase 4 section — 5 explicit success criteria. [CITED]
- `.planning/STATE.md` — Phase 3 COMPLETE, Phase 4 ready, CI gate `fa25b8b`. [CITED]
- `.planning/research/STACK.md` — library pins, zod@^3.24 not v4, RHF deferred for M1. [CITED]
- `.planning/research/FEATURES.md` — category required-field contracts, hospitality-showcase-only rationale. [CITED]
- `.planning/research/PITFALLS.md` Pitfall 4 — category-change data loss, i18n drift prevention. [CITED]
- `.planning/research/SUMMARY.md` — cross-cutting phase ordering rationale. [CITED]
- `.planning/codebase/ARCHITECTURE.md` / `CONVENTIONS.md` / `STRUCTURE.md` — existing layering + naming rules. [CITED]
- `.planning/phases/03-role-gating-precursor/03-05-SUMMARY.md` — Six Migrated Sites table + wrap scoping constraints (D-08/D-09 anchors). [CITED]
- `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` — GATE-01..05 sign-off + D-09 anchor reference. [CITED]

### Secondary (MEDIUM confidence)

- `.planning/phases/03-role-gating-precursor/*.md` — full Phase 3 history for wrap-scope details. [CITED — contextual]
- `CLAUDE.md` — project directives; used to populate "Project Constraints". [CITED]

### Tertiary (LOW confidence — none relevant)

- No unverified web-sourced claims in this research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; everything verified from `package.json`.
- Architecture (section map): HIGH — line-by-line file read at HEAD; no inference.
- Land inventory: HIGH — live grep, 4 hits, no ambiguity.
- Hospitality scaffold: HIGH — no pre-existing tokens; net-new.
- Backend payload: HIGH — PropertyService grep confirms no `category` field written.
- Phase 3 preservation: HIGH — 03-05-SUMMARY is explicit about wrap scopes.
- Validation architecture: HIGH — Jest + tsc + grep-gates all confirmed working in current tree.
- Open questions: MEDIUM — answered with recommendations; final calls belong to discuss-phase.
- Pitfalls: HIGH — grounded in explicit PITFALLS.md Pitfall 4 + Phase 3 migration record.

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days for stable brownfield research; if Phase 4 delays past this, re-grep the Land inventory and re-confirm `package.json` hasn't drifted).

## RESEARCH COMPLETE

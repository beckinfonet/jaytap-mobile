# Phase 5: Listing Form Validation & Edit Flow - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce per-category required fields through a single `validateByCategory()` validator, preserve shared fields on category switch, correctly initialize the form when editing an existing listing, and close the Phase-4 WR-01 advisory so Hospitality submit no longer blocks on the currency/price check. No new UI surfaces (no new sections, no new chips, no new screens) — this is correctness work on top of the Phase-4 decomposition.

Out of scope for this phase (belongs elsewhere):
- 12-item Hospitality amenity multi-select (Phase 6 — HOSP-05)
- Hospitality card / detail rendering (Phase 6 — HOSP-01..04)
- New property categories or property types (Phase 4 taxonomy is frozen)
- Backend validation coordination (M2 trust-boundary work)
- Migration to `react-hook-form` + `zod` (M2+ fallback per PROJECT.md; M1 stays `useState` + pure validator)

</domain>

<decisions>
## Implementation Decisions

### Error surfacing

- **D-01:** Inline per-field red text rendered immediately below each invalid `TextInput` using `commonStyles.hint` typography (fontSize 12, italic) with an error color token from `useTheme()`. No input border color change. Render shape: `{errors.fieldName && <Text style={[commonStyles.hint, { color: colors.error }]}>{errors.fieldName}</Text>}`. If `colors.error` does not exist on the theme, Claude's discretion whether to add it to `ThemeContext` or use an inline `#D32F2F` token (pick the cleaner path at planning time).
- **D-02:** Validation runs on **submit only**. On failed submit, `errors: FormErrorBag` is populated and errors render inline. The orchestrator's `onChange` dispatcher clears `errors[field]` on the next keystroke for that field — users aren't nagged while typing. No `onBlur` wiring on individual TextInputs.
- **D-03:** No required-field markers (no asterisks, no "required" labels, no hint rows) before submit is attempted. Layout stays clean until feedback is needed.
- **D-04:** On failed submit, auto-scroll to the first invalid field. Use the existing `KeyboardAwareScrollView` ref + scroll API (or `keyboard-controller`'s `scrollToInput`/equivalent — researcher to pick the cleanest shape). "First invalid" = first field in the active category's section order (BasicInfo → category section → Price if applicable → Media → VerificationSection if rendered).

### Category switch + payload shape

- **D-05:** On `propertyType` change (which re-derives `category = propertyTypeToCategory(values.propertyType)`), the orchestrator **preserves all FormBag values** unchanged. No clearing. Switching House → Office → House leaves bedrooms intact. Unmounted sections simply stop rendering their fields; state persists in the orchestrator's `useState` hooks.
- **D-06:** A pure function `buildPayloadByCategory(values: FormBag, category: PropertyCategory): Partial<Property>` lives in `src/components/CreateListingForm/validators.ts` alongside `validateByCategory`. Single file; both are pure derivations. Submit payload is built exclusively through this function — the orchestrator's current inline object construction at `CreateListingScreen.tsx:451-481` is replaced by a single call.
  - **D-09 anchors preserved unconditionally** regardless of category: `panoramicPhotosUrl` and `tours` are always sent (the latter as `tours.length > 0 ? tours : undefined`). The `platformVerifications` payload key remains role-gated via `can('editVerifications')` at call-site — this is NOT a category-level concern and does NOT move into `buildPayloadByCategory`.
- **D-07:** Required-field map matches `REQUIREMENTS.md` FORM-04 verbatim. Treat this as the contract — planner and researcher verify line-by-line:
  - **Shared-always (all three categories):** `title`, `description`, `address`, `city`, `district`, `type`, `propertyType`, `features`, `selectedImages`, `videoUrl`, `instagramUrl`, `panoramicPhotosUrl`, `tours`, `availableDate`. (Of these, the hard-required-to-submit set is: `title`, `description`, `address`, `city`, `district`.)
  - **Residential required:** `bedrooms`, `bathrooms`, `areaSqm`, `price`, `currency` (plus shared hard-requireds above).
  - **Commercial required:** `areaSqm`, `price`, `currency` (NOT `bedrooms`, NOT `bathrooms`). Commercial sub-type is satisfied by the `propertyType` chip selection — validator asserts `values.propertyType ∈ COMMERCIAL_TYPES` when `category === 'Commercial'`.
  - **Hospitality required:** `rooms`, `bathrooms`, `maxGuests` (NOT `price`, NOT `currency`, NOT `areaSqm`, NOT `period`). Hospitality amenities: **deferred — see D-13.** Hospitality contact: **hybrid rule — see D-09..D-12.**
- **D-08:** Edit mode (`propertyToEdit` provided) uses the **same** `validateByCategory` rules as create mode. Legacy listings missing now-required fields must be filled before save succeeds. The project is clean-slate per PROJECT.md — no production listings exist — so this is a design decision, not a migration hazard.

### Hospitality contact validation

- **D-09:** Hybrid trigger rule. If ANY of `values.contactPhone` / `values.contactWhatsapp` / `values.contactTelegram` (after trim) is non-empty, the full rule (D-10) fires. If ALL THREE are empty strings, Hospitality submit passes through silently — Phase 6's `HospitalityCard` / `PropertyDetailsScreen` will surface a "contact via in-app chat" fallback in that case.
- **D-10:** Full rule: `contactPhone.trim() !== '' AND (contactWhatsapp.trim() !== '' OR contactTelegram.trim() !== '')`. Matches FORM-04 verbatim: phone + (WhatsApp OR Telegram).
- **D-11:** On rule failure, `Alert.alert` with two buttons: `Cancel` and `Complete profile`. Tapping `Complete profile` navigates to `AccountSettingsScreen` via a new `onNavigateToAccountSettings: () => void` prop on `CreateListingScreenProps`, wired through the custom `App.tsx` state machine. Error strings use a new i18n cluster (see Claude's Discretion for namespace choice). Contact Info section also renders an inline red error row above the read-only fields summarizing the missing piece (consistent with D-01 pattern).
- **D-12:** Edit mode applies the **same** hybrid contact rule as create mode — consistent with D-08. Editing an existing Hospitality listing whose owner cleared their profile contacts after the listing went live will fail submit with the same `Complete profile` recovery path.

### Hospitality amenities (deferred to Phase 6)

- **D-13:** Phase 5 skips `amenities.length` validation entirely. Hospitality listings are not user-exposed until Phase 6 (per Phase-4 WR-01 advisory + ROADMAP Phase 6 ordering), so no user can actually create one that lacks amenities in the M1 window. `validateByCategory` treats `amenities` as non-required in all categories in Phase 5.
- **D-14:** `buildPayloadByCategory('Hospitality', values)` does NOT include the `amenities` key. Not even as `amenities: []`. Phase 6 adds it back together with the 12-item picker and HOSP-05 validation. Rationale: backend should not receive an always-empty array that looks like a feature but isn't; Phase 6 change stays isolated to one file cluster.
- **D-15:** Explicit Phase-6 handoff recorded in Deferred Ideas below. Phase 6 researcher + planner MUST read this CONTEXT.md before drafting RESEARCH.md / PLAN.md so amenity validation doesn't slip through the cracks when HOSP-05 lands.

### Draft/Publish toggle on edit (user-reported bug → FORM-08 scope expansion)

- **D-16:** Status toggle visibility rule corrects the existing `!isEditMode` guard at `CreateListingScreen.tsx:701` which hides the Draft/Publish segmented control on **any** edit. New rule:
  - **Create mode** (`!propertyToEdit`): toggle visible (unchanged). Submit label = `status === 'draft' ? t('createListing.saveAsDraft') : t('createListing.createListing')` (unchanged).
  - **Edit mode, listing is draft** (`propertyToEdit?.status === 'draft'`): toggle **visible**; user may keep status as `draft` or promote to `live`. Submit label = `status === 'draft' ? t('createListing.saveAsDraft') : t('createListing.publishListing')` (new key). Rehydrate path initializes local `status` state from `propertyToEdit.status` — this already exists at `CreateListingScreen.tsx:263`.
  - **Edit mode, listing is live** (`propertyToEdit?.status === 'live'`): toggle **hidden**; local `status` locked to `'live'`; submit label = `t('createListing.updateListing')` (unchanged). No live → draft transition available in M1 (unpublish is an admin action deferred to M2).
  - This decision expands FORM-08 to explicitly cover status-on-edit correctness. User-reported bug: "After saving as Draft, coming back later to fill or edit listing information, save-as-Draft disappears, it shows only as 'save' or 'publish'. Consistency is required, draft should not disappear until the post is saved as 'publish'."

### Validator test coverage

- **D-17:** Jest unit tests ship at `src/components/CreateListingForm/__tests__/validators.test.ts`. Pattern matches `src/utils/__tests__/propertyCategory.test.ts` and `src/hooks/__tests__/useRole.test.ts` exactly: `/** @format */` header, `describe` block per function, `test` per branch, `expect(...).toBe(...)` assertions, no mocks, no RN test-renderer. Required coverage:
  - **Residential:** happy-path valid inputs → `isValid: true`, empty errors bag; each required field individually missing → `isValid: false`, `errors.<field>` non-empty.
  - **Commercial:** happy-path → valid; missing each required (areaSqm, price, currency, title, address, city, district) → invalid; `propertyType` not in `COMMERCIAL_TYPES` when category derives to Commercial → invalid.
  - **Hospitality:** happy-path with ALL contacts empty → valid (hybrid pass-through per D-09); happy-path with full contacts (phone + whatsapp) → valid; partial contacts (phone only, no handles) → invalid; partial contacts (whatsapp only, no phone) → invalid; missing `rooms` / `bathrooms` / `maxGuests` → invalid.
  - **Payload shape assertions** (via `buildPayloadByCategory`): Residential payload contains `bedrooms`/`bathrooms`/`areaSqm`/`price`/`currency`; Commercial payload contains `areaSqm`/`price`/`currency` but NOT `bedrooms`/`bathrooms`; Hospitality payload contains `rooms`/`bathrooms`/`maxGuests` but NOT `price`/`currency`/`period`/`amenities`/`areaSqm`.
  - **D-09 payload invariants:** all three categories' payloads include `panoramicPhotosUrl` and `tours` regardless of admin role (the validator/payload-builder is role-agnostic; role gating for `platformVerifications` lives at the call site).
  - Target: ~15–20 assertions. No manual-QA-bar carve-out: pure function, zero native deps, matches Phase 3 and Phase 4 testing precedent.

### Currency type tightening

- **D-18:** `FormBag.currency` is tightened from `string` to the string-literal union `'$' | 'сом' | ''` in `src/components/CreateListingForm/types.ts`. Export a canonical constant from the same file (or from `src/components/CreateListingForm/constants.ts` if planner prefers separation):
  ```typescript
  export const CURRENCY_OPTIONS = ['$', 'сом'] as const;
  export type Currency = typeof CURRENCY_OPTIONS[number]; // '$' | 'сом'
  // FormBag.currency: Currency | ''  (empty-string = "unset")
  ```
  `validateByCategory` asserts `currency !== ''` for Residential and Commercial. `buildPayloadByCategory` passes only canonical `'$'` or `'сом'` — never `'usd'` / `'som'` / `'kgs'` / `'USD'`. The existing rehydrate normalizer at `CreateListingScreen.tsx:239-246` (4-case match) is preserved as the canonical inbound normalizer; its output becomes assignable to `Currency | ''` under the tightened type. tsc + the Phase 4 i18n-parity gate provide the regression safety net — no new script needed.

### Claude's Discretion

- Exact error color token choice — add `colors.error` to `ThemeContext` (cleaner, dark/light parity built in) vs inline `#D32F2F` (simpler, one-shot). Prefer the theme-token path if it doesn't already exist; planner confirms during `/gsd-plan-phase 5`.
- i18n key namespace for new validation error strings — current cluster is `createListing.*`; validator could extend (`createListing.errors.titleRequired`) or open a sibling (`validation.form.titleRequired`). Planner picks based on file-growth considerations at `src/locales/en.ts` + `ru.ts`. Either way, EN+RU parity is mandatory (`scripts/check-i18n-parity.sh` enforces).
- Whether to delete the existing 4 `Alert.alert` checks in `handleSubmit` (lines 415–431) once `validateByCategory` is wired — recommended YES (single source of truth per FORM-06) — but planner confirms no orphaned Alert logic remains.
- Exact "scroll to first error" implementation — `ScrollView.scrollTo` vs `measureLayout` vs `keyboard-controller`'s input-focus scroll API. Researcher surfaces the cleanest RN 0.84 / Fabric-compatible shape; planner picks.
- Whether `validators.ts` also exports helper `fieldIsValid(field, values, category): boolean` for use by sub-components if they later want per-field indicators — M1 default is NO (D-03 says no markers before submit; sub-components only read `errors[field]`).
- Whether the new `onNavigateToAccountSettings` prop on `CreateListingScreenProps` is always required or optional with a no-op fallback — recommended optional with a no-op fallback so `verificationOnly` callers don't need to wire it; planner decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 5: Listing Form Validation & Edit Flow" — phase goal + 5 success criteria (all five in scope for this CONTEXT.md)
- `.planning/REQUIREMENTS.md` §FORM-04 / FORM-06 / FORM-07 / FORM-08 — verbatim required-field map per category; `validateByCategory` is FORM-06's single source of truth
- `.planning/PROJECT.md` §"Active — Listing form overhaul" — decisions carried forward (no RHF/zod in M1; zod `^3.24` pin if ever adopted)
- `.planning/PROJECT.md` §"Research flags carried into planning" — zod v4 bug (colinhacks/zod#4989) that breaks RHF submit on RN; clean-slate data (no migrations)
- `.planning/STATE.md` — WR-01 deferred advisory from Phase 4 (currency/price check blocks Hospitality submit — THIS phase fixes it via `validateByCategory`)

### Phase-4 artifacts (directly load-bearing)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-PATTERNS.md` — 19/20 analog map; Phase 5 reuses the `SectionProps`/`FormBag`/`FormErrorBag` contract (pattern row 5) + `commonStyles.hint` typography for error text (pattern row 4) + Jest test shape from `propertyCategory.test.ts` (pattern row 2)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-RESEARCH.md` — Pattern 1 (conditional section mounts), Pattern 2 (section-props contract), Pitfall 4 (category-switch data loss — the FORM-07 problem), Pitfall 5 (i18n-parity grep)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-UI-SPEC.md` — design contract; Phase 5 adds inline-error row but MUST preserve the UI-SPEC Color / Spacing / Typography tokens without extension
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md` — 5/5 must_haves PASS baseline; Phase 5 must not regress any of these
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-REVIEW.md` — code-review advisories (0 critical / 3 warning / 6 info); WR-01 is the specific advisory Phase 5 closes

### Prior-phase context (carry-forward)
- `.planning/phases/03-role-gating-precursor/03-CONTEXT.md` — `useRole()` / `can('editVerifications')` / Gated contract — DO NOT re-open; `validateByCategory` is role-agnostic, `platformVerifications` payload gating stays at call-site
- `.planning/phases/02-universal-keyboard-handling/02-CONTEXT.md` — `KeyboardAwareScrollView` is the canonical scroll component; "scroll to first error" (D-04) uses its ref / API (no alternative scroll lib)

### Codebase conventions + structure
- `.planning/codebase/CONVENTIONS.md` — file-placement (co-located `__tests__/` subdirs), naming (SCREAMING_SNAKE_CASE constants, `export function` plain components), theme-token usage, i18n parity requirement
- `.planning/codebase/STRUCTURE.md` — `src/components/CreateListingForm/` is the sub-component home; `src/utils/` hosts pure utilities; barrel convention (`index.ts`) rules
- `CLAUDE.md` — M1 testing bar (manual physical-device QA), `useTheme()` / `useLanguage()` requirement, no hardcoded colors

### Files the implementation will touch (current shape)
- `src/components/CreateListingForm/types.ts` — extend `FormBag.currency` type per D-18; `FormErrorBag` is already the right shape
- `src/components/CreateListingForm/validators.ts` — **net-new** in Phase 5; hosts `validateByCategory` + `buildPayloadByCategory` + `fieldIsValid` (if Claude's discretion opts in)
- `src/components/CreateListingForm/__tests__/validators.test.ts` — **net-new**; Jest unit tests per D-17
- `src/components/CreateListingForm/{BasicInfoSection,ResidentialSection,CommercialSection,HospitalitySection,MediaSection,PriceSection,VerificationSection}.tsx` — each consumes `errors: FormErrorBag` and renders inline `{errors.fieldName && <Text>...}` under each invalid input (per D-01); no structural changes
- `src/components/CreateListingForm/styles.ts` — may add an `errorText` key if the `hint` token + `colors.error` composition is worth memoizing; planner decides
- `src/components/CreateListingForm/index.ts` — barrel: add `validateByCategory` + `buildPayloadByCategory` exports + `Currency` type re-export
- `src/screens/CreateListingScreen.tsx`:
  - Replace the 4 `Alert.alert` checks at lines 415–431 with a single `validateByCategory` call + `setErrors(…)` + auto-scroll on fail (per D-01/D-02/D-04)
  - Replace the inline payload object at lines 451–481 with `buildPayloadByCategory(values, category)` (preserving D-09 anchors for `panoramicPhotosUrl` + `tours` + call-site role gate for `platformVerifications`)
  - Fix the Status toggle `!isEditMode` guard at line 701 per D-16 (show when create OR editing a draft; hide only when editing a live listing)
  - Update submit button label logic at lines 754–761 to include the `publishListing` branch per D-16
  - Add new `onNavigateToAccountSettings` prop per D-11 (Claude's Discretion whether optional with no-op fallback)
  - Wire `errors` state via `useState<FormErrorBag>({})` + pass through to sub-components
- `src/locales/en.ts` + `src/locales/ru.ts` — add ~10–15 new validation error keys in parity (scheme per Claude's Discretion); add `createListing.publishListing` per D-16
- `App.tsx` — wire `onNavigateToAccountSettings` through the state machine (standard pattern; follows existing nav-callback prop style)

### External spec references
- None net-new — this phase is entirely internal correctness work against FORM-04/06/07/08.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/propertyCategory.ts` — `propertyTypeToCategory(type)` + `PROPERTY_TYPE_TO_CATEGORY` Record + `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` exported arrays. Validator consumes these directly for the "propertyType ∈ COMMERCIAL_TYPES" assertion.
- `src/components/CreateListingForm/types.ts` — `FormBag` (29 keys), `FormErrorBag = Partial<Record<keyof FormBag, string>>`, `SectionProps { values; onChange; errors }`. Contract is already piped to every sub-component with `errors: {}` passed in Phase 4 — Phase 5 just fills it.
- `src/components/CreateListingForm/styles.ts` (`commonStyles`) — `hint` style (fontSize 12, italic) is the exact typography for inline error text; just apply `colors.error` color override.
- `src/components/CreateListingForm/index.ts` — barrel; add `validateByCategory` + `buildPayloadByCategory` + `Currency` type exports without touching consumer imports.
- `src/screens/CreateListingScreen.tsx:239-246` — existing currency normalizer (4-case match: `$`/`usd` → `'$'`, `сом`/`som`/`kgs` → `'сом'`, else `''`) becomes the canonical inbound normalizer under D-18.
- `src/context/AuthContext.tsx` + `user.backendProfile` — contact values already flow through `loadUserProfile` (orchestrator lines 287–307); hybrid-rule hook point lives here.
- `src/hooks/useRole.ts` + `src/components/Gated.tsx` — role gating is locked, validator is role-agnostic, `platformVerifications` payload stays at call-site.
- `KeyboardAwareScrollView` from `react-native-keyboard-controller` (already at orchestrator line 634) — scroll-to-error target for D-04.

### Established Patterns
- **Pure-function + Jest unit tests:** `src/utils/__tests__/propertyCategory.test.ts` + `src/hooks/__tests__/useRole.test.ts` — `/** @format */` header, named imports from `../`, `describe` + `test` + `expect().toBe()`. Zero mocks, zero RN test-renderer. `validators.test.ts` follows this shape verbatim.
- **`SCREAMING_SNAKE_CASE` constants + `as const` string-literal arrays:** `PROPERTY_TYPE_TO_CATEGORY`, `RESIDENTIAL_TYPES` in propertyCategory.ts + `ALLOWLIST` in adminAllowlist.ts. `CURRENCY_OPTIONS` (D-18) mirrors this.
- **`<Gated>` for role UI gating:** already established; not extended in Phase 5.
- **Named exports, no default, plain `export function ComponentName`:** every sub-component in Phase 4 follows this — Phase 5 additions (if any — unlikely) must too.
- **Theme tokens only (`useTheme()`); i18n keys only (`useLanguage().t`):** enforced by CI (`check-i18n-parity.sh` + tsc `Record<TranslationKeys,string>` gate).
- **Shared `commonStyles` import:** every sub-component imports from `./styles`. Error text reuses `hint` token.
- **`onChange` dispatcher in orchestrator** (`CreateListingScreen.tsx:139-175`): central switch routes every `onChange(field, value)` to the matching `setState`. D-02's "clear errors on next keystroke" hooks here — the dispatcher also calls `setErrors(prev => { if (prev[field]) { const next = { ...prev }; delete next[field]; return next; } return prev; })`.

### Integration Points
- **Validator consumption:** `CreateListingScreen.handleSubmit` is the single call site for `validateByCategory(values, category)`. All sub-components are dumb renderers — they do NOT import or call `validateByCategory`.
- **Error state flow:** `useState<FormErrorBag>({})` at orchestrator → passed to every `<BasicInfoSection errors={errors} … />` / `<ResidentialSection errors={errors} … />` etc. → sub-components render `errors.bedrooms`, `errors.price`, etc. under the matching `TextInput`.
- **Payload filtering:** `handleSubmit` calls `buildPayloadByCategory(values, category)` → merges in D-09 anchors (`panoramicPhotosUrl`, `tours`) unconditionally → merges in `platformVerifications` at call-site if `can('editVerifications')` → passes to `PropertyService.createProperty` / `updateProperty`.
- **AccountSettings navigation (D-11):** New `onNavigateToAccountSettings` prop on `CreateListingScreenProps`, wired through `App.tsx` state machine (follows `onBack` / `onSuccess` prop pattern exactly).
- **Status toggle edit-mode visibility fix (D-16):** `CreateListingScreen.tsx:701` `!isEditMode` guard becomes `(!isEditMode || propertyToEdit?.status === 'draft')`. Submit button label at `:754-761` gets a `publishListing` branch for the draft-edit case. Rehydrate path at `:263` already sets local `status` from `propertyToEdit.status` — no rehydrate change needed.
- **Currency type tightening ripple (D-18):** `FormBag.currency: Currency | ''` means the orchestrator's `setCurrency` call sites and PriceSection's currency-chip TouchableOpacity `onPress={() => onChange('currency', '$')}` must pass canonical values only. Existing Phase-4 PriceSection already does this (currency chips set `'$'` / `'сом'` literally) — tightened type just makes the safety explicit.

</code_context>

<specifics>
## Specific Ideas

- **User's bug report verbatim (D-16 driver):** "There is an issue with saving the listing as 'Draft' and 'Publish'. After saving the listing as a draft, coming back later to fill or edit listing information, save as 'Draft' disappears, it shows only as 'save' or 'publish'. Consistency is required, draft should not disappear until the post is saved as 'publish'." — Phase 5 fixes this via the status toggle visibility rule in D-16 and adds `createListing.publishListing` i18n key.
- **Hybrid hospitality contact trigger (D-09 rationale):** If user started filling profile contacts, help them finish (fail with recovery CTA). If they have nothing filled, don't block the showcase-only Hospitality listing — chat fallback applies in Phase 6. This respects the "profile is the source of truth for contacts" invariant established in Phase 4.
- **Zero-regression stance:** Phase 4's D-09 handleSubmit anchors (panoramicPhotosUrl + tours unconditional) are load-bearing. Phase 5 MUST preserve them during the `buildPayloadByCategory` refactor — researcher's first verification is a file-diff against `CreateListingScreen.tsx:451-481` showing both fields still ship unconditionally in every category's payload.
- **Validator is role-agnostic:** Do NOT import `useRole` or `can()` into `validators.ts`. Role-gating decisions stay at call-site in the orchestrator (the `...(can('editVerifications') ? { platformVerifications: {…} } : {})` spread at `CreateListingScreen.tsx:472-480`).

</specifics>

<deferred>
## Deferred Ideas

### Explicit Phase-6 handoff (MUST READ)
- **Amenity validation + payload inclusion deferred to Phase 6** (per D-13 + D-14). The 12-item multi-select picker (REQUIREMENTS.md HOSP-05) and `amenities.length >= 1` validation MUST land together in Phase 6. Phase 6 researcher and planner MUST read this 05-CONTEXT.md's Decisions section before drafting 06-RESEARCH.md / 06-PLAN.md so the amenity validation is not missed. Specifically:
  - Extend `validateByCategory` Hospitality branch: require `values.amenities.length >= 1`.
  - Extend `buildPayloadByCategory('Hospitality', values)`: include `amenities: values.amenities`.
  - Extend `validators.test.ts`: add amenity-required and amenity-in-payload assertions.
  - Add `amenity.*` i18n keys in EN+RU parity for the 12-item taxonomy from REQUIREMENTS.md HOSP-05.

### M2 territory (not Phase 6)
- **Live → Draft unpublish transition** — D-16 explicitly excludes live listings from the status toggle. Unpublish is an admin/moderator action; deferred to M2 (MOD-01 lifecycle work).
- **Make Hospitality contact fields editable in-form** — D-09 chose the hybrid pre-submit check over making the read-only contact inputs editable. M2 may revisit if hospitality owners ask for listing-specific contacts that differ from profile contacts.
- **`react-hook-form` + `zod` migration** — Captured in PROJECT.md as an M2+ fallback. Phase 5 stays on `useState` + pure validator. Zod pin `^3.24` (NOT v4) when / if the migration happens.

### Claude's-discretion parking lot (if planner raises)
- If `colors.error` is absent from `ThemeContext`, planner may either (a) add it to `ThemeContext.tsx` with dark/light variants, or (b) use an inline `#D32F2F` token. Prefer (a) if the add is small; (b) is acceptable for a minimum-lift M1.
- Exact i18n key namespace for new validation error strings — planner picks between `createListing.errors.*`, `validation.form.*`, or extending the existing `createListing.*` cluster. Pattern must be consistent across EN+RU.

</deferred>

---

*Phase: 05-listing-form-validation-edit-flow*
*Context gathered: 2026-04-24*

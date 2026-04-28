---
screen: PropertyDetailsScreen
variant: Hospitality (intent) / Residential (actual render — see root cause)
mode: dark
device: iPhone (smaller screen — exact model TBD; status bar shows iOS, no Dynamic Island visible)
captured: 2026-04-28
status: scratch (pre-PLAN; folds into 07-01-property-details-PLAN.md at planning time per D-01)
note: Root cause confirmed via direct data inspection (2026-04-28 update below) — Aruhostel's stored `propertyType` is `"Apartment"` (listing-author data-entry error), NOT a code-path normalization gap. All three issues are real, universal non-Hospitality-branch bugs that ship as Phase 7 code fixes. Aruhostel data correction is a separate task.
---

# 07-01 PropertyDetailsScreen (Hospitality / dark) — Issues Capture

Captured per CONTEXT.md D-01 from chat-described issues. Fold into `07-01-property-details-PLAN.md` Issues block at planning time.

## Issues (user-flagged)

### Issue 1 — Address text overflows the header info card on smaller devices
**Screenshot:** `screenshots/property-details-hospitality-dark-address-overflow.jpg` (green circle, right edge of address row)

**Symptom:**
- The address row "Улица Касыма Тыныстанова, 27, Bishkek..." inside the header info card (the card with the listing title "Aruhostel" and "ID: 007-481") truncates past the right padding of the card. The ellipsis appears to extend visually beyond the card's content boundary on smaller iPhones, breaking the "text-stays-inside-card" expectation set by every other card on the screen.

**Intent (per D-03):**
- Address text must stay within the card's right padding on the smallest supported iPhone width. Direction is open: tighten truncation (single-line with ellipsis honoring padding), allow wrap to a second line, or shrink font on overflow — planner picks the minimal-intrusive fix.

**Likely venue:** `PropertyDetailsScreen.tsx:592-597` (`addressRow`, `MapPin` icon + `Text style={styles.address}` with `numberOfLines={1}`). The `numberOfLines={1}` is already set, so this is a layout/padding issue, not a missing-truncation issue.

**Independent of root cause finding** — fix needed regardless of category derivation.

---

### Issue 2 — Amenity cell icon misaligns when label wraps to multiple lines
**Screenshot:** `screenshots/property-details-hospitality-dark-amenity-misalign.jpg` (green circle, right cell "Хороший персонал")

**Symptom:**
- In the amenities section ("Что предлагает это место"), the right cell ("Хороший персонал" — wraps to two lines on smaller widths) renders with the checkmark icon vertically centered against the wrapped text. The adjacent left cell ("Терраса", single line) sits with icon-and-text on a single baseline. The eye expects the checkmark to anchor to the first line of the label across both cells.

**Intent (per D-03):**
- Checkmark icon should anchor to the first line of the amenity label consistently — single-line and multi-line cells should look like a coherent grid. Direction is open: anchor icon to first text baseline (`alignItems: 'flex-start'` + matched line-height), force single-line truncation per cell, or normalize cell heights — planner picks.

**Disposition (2026-04-28, post-data-inspection):** Universal non-Hospitality-branch bug — confirmed in scope for Phase 7. Aruhostel's `propertyType` is stored as `"Apartment"` (data-entry error, see Root cause finding update below), so the non-Hospitality branch at `:662-679` is genuinely the render path here. The Hospitality branch at `:635-661` already mitigates this with `numberOfLines={1}` (`:650`); the non-Hospitality branch should adopt the same treatment for parity, since Residential/Commercial listings can equally produce multi-line feature labels. Fix lands in non-Hospitality `Text` at `:672` plus shared `featureItemText` style.

---

### Issue 3 — `$USD 500/мес` — currency symbol doubled (folded per user disposition A, 2026-04-28)
**Screenshot:** `screenshots/property-details-hospitality-dark-address-overflow.jpg` (visible in sticky bottom price bar)

**Symptom:**
- Sticky bottom price bar renders `$USD 500/мес` — the currency symbol "$" appears alongside the ISO code "USD". Either the symbol or the code should display, not both.

**Intent (per D-03):**
- Render either the currency symbol OR the ISO code, not both. Direction is open: drop the symbol (show "USD 500/мес") or drop the code (show "$500/мес") — planner picks based on existing `formatPrice()` convention in the codebase.

**Likely venue:** `formatPrice(property, t('property.perMonth'))` call at `PropertyDetailsScreen.tsx:817`. Trace `formatPrice` to its definition.

**Disposition (2026-04-28, post-data-inspection):** Universal `formatPrice()` formatter bug — affects every Residential/Commercial listing in the app, not just this mis-typed listing. Confirmed in scope for Phase 7. `formatPrice` (`src/utils/formatPrice.ts:16-17`) explicitly produces `"$USD"` as the USD label by design (per the function's JSDoc). Fix lands in `formatPrice` itself — drop the `"USD"` and use `"$"` as a tight prefix (`$500/мес`) for symmetry with the existing `"<amount> сом"` suffix-form treatment for KGS. Hospitality variants still omit the price block entirely (D-15) once Aruhostel's data is corrected — that path is unchanged.

---

## Root cause finding (investigation, 2026-04-28)

> **UPDATE — 2026-04-28 (post-data-inspection): superseded.** The hypothesis below — that `propertyTypeToCategory()` lacks case-insensitive normalization or a Hostel/Hotel alias — was a reasonable inference from the render-branch evidence, but is **wrong for this listing**. User inspected Aruhostel's stored data directly and confirmed `propertyType` is the literal canonical `"Apartment"` — set by the listing author by mistake. There is no normalization gap and no code-path bug to fix in `propertyTypeToCategory()` or `PropertyService`. The render-branch table below (every Hospitality gate evaluating false) is therefore explained trivially: the listing legitimately routes to Residential because that's how it's typed. Action items: **(a)** correct Aruhostel's `propertyType` to `"Hostel"` via in-app edit (separate from Phase 7), **(b)** treat all three issues as universal non-Hospitality-branch / formatter bugs (see updated Disposition lines per issue), **(c)** post-M1, consider listing-form validation that flags name/type mismatches (e.g., title contains "hostel" but type is "Apartment") — backlog candidate for M2 alongside role-gating.
>
> The original investigative reasoning is preserved below as historical context (it accurately reflected the evidence available at the time and motivated the data check that resolved the question).

---

User confirmed the screenshots are from the latest build (not stale) and that hostel listings have been rendering this way "before" as well. Code inspection of `PropertyDetailsScreen.tsx` shows:

| Render branch | Gate | Renders in screenshot? | Implies |
|---|---|---|---|
| Hospitality TourHeroCard above carousel (`:458`) | `isHospitality` | NO (no TourHeroCard above gallery) | `isHospitality = false` |
| Specs row 0/0/0 (`:602`) | `!isHospitality` | YES | `isHospitality = false` |
| Amenities title "Что предлагает это место" (`:664`) | `:635 isHospitality ? : (else branch)` | YES (non-Hospitality branch, per locale check) | `isHospitality = false` |
| Footer price block "$USD 500/мес" (`:814`) | `!isHospitality` | YES | `isHospitality = false` |
| Hospitality sticky 3-button bar (`:1063`) | `isHospitality` | NO (regular "Связаться сейчас" button shown) | `isHospitality = false` |

**Conclusion: every Hospitality gate evaluates to `false` for this listing.** The listing renders entirely via the Residential code path despite being a hostel ("Aruhostel"). This is NOT an HI-01 regression — HI-01 closed correctly at `b1da946` and the wrap is in place at `:602`. The issue is upstream: `isHospitality` is correctly derived from `propertyTypeToCategory(property.propertyType)` (`:191-192`), and that function correctly maps `'Hostel'` → `'Hospitality'` (`src/utils/propertyCategory.ts:30-43`). So `property.propertyType` is NOT the literal `'Hostel'` for this listing.

**Likely causes of the propertyType mismatch:**
1. **Case mismatch** — `PropertyService.ts:73` and `:144` default `propertyType` to lowercase `'apartment'`. If the backend lowercases inbound types or legacy data is lowercase (`'hostel'`/`'hotel'`), `PROPERTY_TYPE_TO_CATEGORY['hostel']` is `undefined` → falls through to `?? 'Residential'`. Phase 4 added `Hostel`/`Hotel` to the canonical TitleCase list but did NOT add a normalization layer.
2. **Legacy data shape** — Listings created before Phase 4's taxonomy work may store an older type string (e.g., `'guesthouse'` or no `propertyType` at all → safe default `'Residential'`).
3. **Backend mapping** — Railway backend may store/return `propertyType` differently from what the form submits.

**Recommended next action: `/gsd-debug` cycle on this data path BEFORE planning Phase 7.** The fix likely lives in `propertyTypeToCategory()` (add case-insensitive lookup with explicit `'hostel'`/`'hotel'` aliases) or in `PropertyService` (normalize inbound types). Once fixed:
- Specs row 0/0/0 stops rendering on hostels (HI-01 effective)
- Price block stops rendering on hostels (D-15 effective)
- Amenities renders via Hospitality branch with `numberOfLines={1}` (Issue 2 likely resolves itself)
- Hospitality sticky 3-button bar renders (D-16 effective)
- Hospitality TourHeroCard renders above carousel (D-14 effective)

Issue 1 (address overflow) is independent and stays in Phase 7 scope regardless.

---

*Capture per CONTEXT.md D-01. Root-cause investigation appended 2026-04-28; superseded same day by direct data inspection (no upstream code bug — Aruhostel's `propertyType` was set to `"Apartment"` by the listing author). All three issues now scoped as universal Phase 7 fixes; `/gsd-debug` cycle skipped.*

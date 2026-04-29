# Phase 5: Listing Form Validation & Edit Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 05-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 05-listing-form-validation-edit-flow
**Areas discussed:** Error surfacing, Category-switch behavior, Hospitality contact validation, Hospitality amenities timing, Draft/Publish toggle on edit (user-raised), Validator test strategy, Currency normalization

---

## Gray area selection (round 1)

**Question:** Which gray areas should we discuss for Phase 5?

| Option | Description | Selected |
|--------|-------------|----------|
| Error surfacing pattern | How per-field validation errors render (Alert vs inline vs summary) | ✓ |
| Category-switch behavior | State preservation + payload filtering when propertyType changes mid-form | ✓ |
| Hospitality contact validation | Enforcement strategy given read-only profile-auto-filled contact inputs | ✓ |
| Hospitality amenities validation timing | Validate now (hard-block until Phase 6) vs defer with picker | ✓ |

**User's choice:** All four selected.

---

## Error surfacing

### How should per-field validation errors render visually?

| Option | Description | Selected |
|--------|-------------|----------|
| Red text below input (Recommended) | One-line red message below each invalid TextInput; reuses `commonStyles.hint` typography | ✓ |
| Red text + red border | Red text below + input borderColor swap to error token | |
| Summary block at top + red text below | Dismissable error-summary View at top of scroll + inline red text | |

**User's choice:** Red text below input.

### When should validateByCategory run?

| Option | Description | Selected |
|--------|-------------|----------|
| On submit only; clear-on-next-keystroke (Recommended) | Validation only on submit tap; typing into invalid field clears its error immediately via onChange dispatcher | ✓ |
| On submit + onBlur per field | Progressive: each field also validates on blur | |
| On submit only; errors stay until resubmit | Simplest; errors persist until next submit attempt | |

**User's choice:** On submit only; clear-on-next-keystroke.

### Should required-field markers appear before submit is attempted?

| Option | Description | Selected |
|--------|-------------|----------|
| No marker (Recommended) | No visual indicator until submit fails; matches current clean layout | ✓ |
| Asterisk on required field labels | `*` appended to placeholder/label per required field | |
| Subtle hint row above each section | "All fields required" one-liner per section | |

**User's choice:** No marker.

### Should submit scroll to the first invalid field when validation fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, scroll to first error (Recommended) | KeyboardAwareScrollView auto-scrolls to first invalid field on failed submit | ✓ |
| No auto-scroll | Errors render inline; user scrolls manually | |

**User's choice:** Yes, scroll to first error.

---

## Category-switch behavior

### State preservation rule on propertyType change

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve all values in state, filter at submit (Recommended) | FormBag keeps every entered value; unmounted sections don't render; submit payload filters by category | ✓ |
| Clear category-specific fields on switch | Orchestrator clears fields invalid for new category on every switch | |
| Confirm-then-clear on switch | Alert confirmation before clearing non-empty category-specific values | |

**User's choice:** Preserve all values in state, filter at submit.

### Submit payload shape per category

| Option | Description | Selected |
|--------|-------------|----------|
| buildPayloadByCategory() in validators.ts (Recommended) | Pure function in same file as validateByCategory; returns category-specific payload; D-09 anchors (panoramicPhotosUrl + tours) preserved unconditionally | ✓ |
| Inline payload construction in handleSubmit | Switch-on-category in orchestrator | |
| Send whole FormBag; backend tolerates extras | Send everything; punt guarantee to backend | |

**User's choice:** buildPayloadByCategory() in validators.ts.

### Category → required-field mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Category-inclusive mapping (Recommended) | Matches REQUIREMENTS.md FORM-04 verbatim — shared-always + per-category required sets | ✓ |
| Also require availableDate per-category | Extension: availableDate required for Residential only | |
| Claude's discretion on field map | Planner verifies line-by-line against FORM-04 | |

**User's choice:** Category-inclusive mapping (FORM-04 verbatim).

### Edit-mode validation rule

| Option | Description | Selected |
|--------|-------------|----------|
| Same rules as create mode (Recommended) | Edit submit runs identical validateByCategory; legacy blanks must be filled | ✓ |
| Permissive edit | Tolerates legacy blanks; must track which fields were blank on load | |
| Prevents clearing required | Asymmetric: forgiving on load, strict on deletions | |

**User's choice:** Same rules as create mode.

---

## Hospitality contact validation

### Enforcement strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-submit profile check, link to AccountSettings (Recommended) | Validator reads profile-auto-filled contacts; inline error + Alert with "Complete profile" CTA | |
| Make contact fields editable on Hospitality | Remove `editable={false}` for category === Hospitality | |
| Skip contact validation in M1 | Document as accepted risk; pass-through | |
| Allow hybrid: validate if shown, pass-through otherwise | If profile contacts present → validate; if empty → silent pass (chat fallback) | ✓ |

**User's choice:** Hybrid (validate-if-shown).

### Precise contact rule

| Option | Description | Selected |
|--------|-------------|----------|
| phone AND (WhatsApp OR Telegram) (Recommended) | Matches FORM-04 verbatim | ✓ |
| phone OR (WhatsApp OR Telegram) | Any one contact method sufficient | |
| phone AND WhatsApp AND Telegram | All three required | |

**User's choice:** phone AND (WhatsApp OR Telegram).

### Recovery flow on failure

| Option | Description | Selected |
|--------|-------------|----------|
| Alert with "Complete profile" CTA → AccountSettings (Recommended) | Two-button Alert; CTA navigates via new onNavigateToAccountSettings prop | ✓ |
| Inline error only; user navigates manually | Red error below Contact Info section; no auto-nav | |
| Block Hospitality chips if profile incomplete | BasicInfoSection disables Hostel/Hotel chips when profile contacts missing | |

**User's choice:** Alert with "Complete profile" CTA.

### Edit mode contact rule

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same rule as create (Recommended) | Edit submit re-validates contacts under the hybrid rule | ✓ |
| Edit tolerates missing profile if listing was live | Permissive; listing's own prior state grandfathered | |

**User's choice:** Same rule as create.

### Hybrid rule trigger clarification (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Any contact non-empty fires full rule (Recommended) | If ANY of phone/whatsapp/telegram is non-empty, full rule runs; if ALL empty, pass through | ✓ |
| Only phone non-empty fires full rule | Phone is the sentinel | |
| Contact rule fully skipped on Hospitality in M1 | Pure pass-through | |

**User's choice:** Any contact non-empty fires full rule.

---

## Hospitality amenities validation timing

### Amenity validation in Phase 5?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer amenity validation to Phase 6 (Recommended) | Phase 5 skips amenities.length check; Phase 6 picker + validation land together | ✓ |
| Validate amenities.length>=1 now (hard-block) | Correct per FORM-04 but creates deadlock until Phase 6 | |
| Add minimal 3-item picker in Phase 5 | Scope creep into Phase 6 territory | |

**User's choice:** Defer to Phase 6.

### Phase-5 amenities payload handling

| Option | Description | Selected |
|--------|-------------|----------|
| Omit amenities from Hospitality payload (Recommended) | buildPayloadByCategory does NOT include amenities key | ✓ |
| Include amenities: [] unconditionally | Sends empty array always | |
| Include whatever's in state | Sends FormBag.amenities as-is | |

**User's choice:** Omit amenities from Hospitality payload.

### Phase-6 handoff in CONTEXT.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, explicit deferred decision with Phase-6 TODO (Recommended) | CONTEXT.md Deferred Ideas has a MUST-READ entry for Phase 6 researcher/planner | ✓ |
| No — Phase 6 will catch via FORM-04 re-read | Relies on Phase 6 planner catching the cross-phase dependency unprompted | |

**User's choice:** Yes, explicit deferred decision with Phase-6 TODO.

---

## Additional gray area selection (round 2)

**Question:** We've discussed 4 areas; ready for context or explore more?

**User's choice:** Explore more gray areas.

**Question:** Which additional gray areas should we discuss?

| Option | Description | Selected |
|--------|-------------|----------|
| validateByCategory test strategy (Recommended) | Jest unit tests or manual-only | ✓ |
| i18n key naming scheme | Namespace convention for new error strings | |
| handleSubmit refactor scope | Delete existing Alert checks vs keep as safety net | |
| Currency normalization on rehydrate | Tighten currency to string-literal union | ✓ |
| **Other (user-added):** Draft/Publish toggle disappears on edit | After saving as Draft, re-opening to edit hides the Draft/Publish toggle; only "save" or "publish" shows. Consistency needed: draft should not disappear until explicitly published. | ✓ |

**User's choice:** Three areas (tests, currency, draft/publish toggle).

---

## Draft/Publish toggle on edit (user-raised)

### Visibility rule on edit

| Option | Description | Selected |
|--------|-------------|----------|
| Show toggle only when editing a DRAFT; promote draft→live on submit (Recommended) | Edit-draft shows toggle; edit-live hides it; submit label mirrors status | ✓ |
| Show toggle for ALL edits; allow live→draft unpublish | Most flexible; introduces unpublish action | |
| Show toggle only for DRAFT edits; live edits stay live | Same behavior as option 1 with different copy framing | |

**User's choice:** Show toggle only when editing a DRAFT; promote draft→live on submit.

**Notes:** User's bug report: "After saving the listing as a draft, coming back later to fill or edit listing information, save as 'Draft' disappears, it shows only as 'save' or 'publish'. Consistency is required, draft should not disappear until the post is saved as 'publish'." — Current code (`CreateListingScreen.tsx:701`) guards the Status segmented control with `!isEditMode`, hiding it for every edit. D-16 corrects to `!isEditMode || propertyToEdit?.status === 'draft'`.

---

## Validator test strategy

### Jest unit tests for validateByCategory + buildPayloadByCategory?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — one test file covering all three categories (Recommended) | validators.test.ts with ~15–20 assertions; matches Phase 3/4 testing precedent | ✓ |
| No — manual physical-device QA only (M1 bar) | Skip unit tests; rely on manual QA matrix | |
| Partial — happy-path per category, skip edge cases | One GREEN test per category | |

**User's choice:** Yes — one test file covering all three categories.

---

## Currency normalization

### Tighten currency type?

| Option | Description | Selected |
|--------|-------------|----------|
| Tighten to literal union at FormBag + validator (Recommended) | `FormBag.currency: '$' \| 'сом' \| ''`; validator asserts non-empty for Residential/Commercial | ✓ |
| Leave as-is (string type, 4-case runtime match) | Current behavior preserved | |
| Tighten via enum constant | `CURRENCIES = ['$', 'сом'] as const; type Currency = typeof CURRENCIES[number]` | |

**User's choice:** Tighten to literal union at FormBag + validator.

**Notes:** Planner picks implementation detail between inline union (`'$' | 'сом' | ''` literal) vs `as const` array-backed type. Both equivalent for tsc.

---

## Claude's Discretion

The following decisions were left to Claude / planner (not presented as user questions):

- Exact error color token: add `colors.error` to `ThemeContext` vs inline `#D32F2F` — recommended: theme token if add is small.
- i18n key namespace for new validation error strings — candidates: `createListing.errors.*`, `validation.form.*`, or extend existing `createListing.*` cluster.
- Whether `validators.ts` exports a helper `fieldIsValid(field, values, category)` for sub-components' use — M1 default: no (D-03 says no markers before submit).
- Whether `onNavigateToAccountSettings` prop is required or optional with no-op fallback — recommended: optional.
- Exact scroll-to-first-error implementation (`ScrollView.scrollTo` vs `measureLayout` vs keyboard-controller scroll API) — researcher surfaces best shape.
- Whether to delete the 4 existing `Alert.alert` checks at `CreateListingScreen.tsx:415-431` once `validateByCategory` is wired — recommended: YES (single source of truth per FORM-06).

---

## Deferred Ideas

- **Amenity validation + payload inclusion → Phase 6** (hard handoff in CONTEXT.md Deferred Ideas).
- **Live → Draft unpublish** → M2 (MOD-01 moderation lifecycle).
- **Editable contact fields per-listing on Hospitality** → M2 (revisit if hospitality owners ask).
- **RHF + zod migration** → M2+ (zod `^3.24` pin if / when adopted).

---

*Discussion log — 2026-04-24 — 5 round-1 areas (4 selected) + 3 round-2 areas (all selected; one user-added).*

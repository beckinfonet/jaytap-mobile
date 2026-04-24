# Phase 5 — Manual QA Matrix

**Plan:** 05-05 (Wave 4 — nav wiring + phase-exit scaffold)
**Commit under test:** (fill with 05-05 final commit SHA after all code tasks land)
**Base commit (pre-plan):** `9055394` (Plan 04 exit — "docs(05-04): complete orchestrator-integration plan")
**Created:** 2026-04-24

**Purpose:** Physical-device verification of FORM-04, FORM-06, FORM-07, FORM-08 + D-16 status toggle + D-04 scroll-to-error + D-11 Hospitality contact recovery. M1 testing bar per CLAUDE.md — manual physical-device QA on iOS + Android is the ship gate.

**Devices required:**
- iPhone 15 Pro Max / iOS 26 (admin account: `beckprograms@gmail.com` + any non-admin account)
- Moto G XT2513V / Android 16 Fabric (same admin + non-admin pair)

**Fill in:** Results per cell as `PASS`, `FAIL` (with note), or `N/A` (with rationale).

**Cell markers:** ✅ Pass · ❌ Fail · — N/A · ⬜ Pending

Record every run in the Session Log at the bottom with device + OS + commit SHA.

---

## Matrix 1 — FORM-07 category-switch preservation (9 cells × 2 devices = 18 cells)

A 3×3 grid — user starts filling fields in category X (row), then switches property-type to a type in category Y (column). Shared fields (title / description / address / city / district) MUST persist. Category-specific fields' values persist in the orchestrator's `useState` (D-05) but go invisible when the intermediate category's sub-component is unmounted; switching back to the origin category must re-render with original values.

Shared baseline to type in BEFORE any category switch (fill every cell): `title = "QA Test Listing"`, `description = "Phase 5 QA"`, `address = "Bishkek"`, `city = "Bishkek"`, `district = "Центр"`.

| # | From → To | Switch path | Expected | iOS | Android |
|---|-----------|-------------|----------|-----|---------|
| 1 | Residential → Residential (same-cat) | Apartment → House | bedrooms / bathrooms / areaSqm values persist across chip change; PriceSection still mounted with currency + price retained | ⬜ | ⬜ |
| 2 | Residential → Commercial | Apartment → Office | shared fields persist; Residential section unmounts; Commercial section mounts with `areaSqm` rehydrated to last value (same FormBag key); PriceSection stays mounted | ⬜ | ⬜ |
| 3 | Residential → Hospitality | Apartment → Hostel | shared fields persist; Residential section unmounts; Hospitality section mounts (rooms / maxGuests / bathrooms inputs visible); PriceSection UNMOUNTS (D-14 — no price for Hospitality) | ⬜ | ⬜ |
| 4 | Commercial → Residential | Office → Apartment | shared persist; `areaSqm` value from Office carries (shared FormBag key); bedrooms / bathrooms visible again with previously-typed values | ⬜ | ⬜ |
| 5 | Commercial → Commercial (same-cat) | Office → Retail | shared + `areaSqm` persist; Commercial section stays mounted through chip change | ⬜ | ⬜ |
| 6 | Commercial → Hospitality | Office → Hostel | shared + areaSqm value stays in FormBag (hidden but present); PriceSection unmounts; Hospitality fields appear empty initially (different FormBag keys — rooms / maxGuests) | ⬜ | ⬜ |
| 7 | Hospitality → Residential | Hostel → Apartment | shared persist; Hospitality section unmounts; Residential section mounts; PriceSection mounts (re-renders with pre-typed currency/price if any) | ⬜ | ⬜ |
| 8 | Hospitality → Commercial | Hostel → Office | shared persist; Hospitality section unmounts; Commercial section mounts; PriceSection mounts | ⬜ | ⬜ |
| 9 | Hospitality → Hospitality (same-cat) | Hostel → Hotel | shared + rooms / maxGuests / bathrooms persist across chip change | ⬜ | ⬜ |

**Anti-pattern gate:** If ANY cell shows shared fields clearing on propertyType change, D-05 is violated and Plan 04 Edit D regressed — file a Rule 1 bug.

---

## Matrix 2 — FORM-08 edit-mode initialization + D-16 Draft/Publish rule (6 cells × 2 devices = 12 cells)

User's original bug report (D-16 driver): "After saving as Draft, coming back later to fill or edit listing information, save-as-Draft disappears, it shows only as 'save' or 'publish'. Consistency is required, draft should not disappear until the post is saved as 'publish'."

Each cell walks create → save → reopen → observe toggle + submit label. **Listing fixtures must be reachable via OwnerListings (non-admin) or RenterListings (admin).**

| # | Cell | Steps | Expected | iOS | Android |
|---|------|-------|----------|-----|---------|
| 1 | Create Residential draft; reopen in edit; toggle VISIBLE; label "Save as Draft" | 1. Open CreateListing; select Apartment; fill shared + bedrooms / bathrooms / areaSqm / currency / price. 2. Flip Status chip to Draft. 3. Tap Submit. 4. Navigate to OwnerListings; tap the just-saved listing to edit. | Status section (Draft / Live segmented control) is visible on re-entry; submit button reads `t('createListing.saveAsDraft')` ("Save as Draft") | ⬜ | ⬜ |
| 2 | Edit same Residential draft; flip Status to Live; submit label switches to "Publish Listing" | Continue Cell 1 edit screen. Tap Live chip. | Submit button label updates to `t('createListing.publishListing')` ("Publish Listing") — NOT "Save as Draft", NOT "Update Listing" | ⬜ | ⬜ |
| 3 | Edit live Residential (previously published); toggle HIDDEN; label "Update Listing" | Create a Residential with Status=Live, save. Reopen in edit. | Status section NOT rendered on re-entry; submit button reads `t('createListing.updateListing')` ("Update Listing") | ⬜ | ⬜ |
| 4 | Create draft Commercial; reopen in edit — toggle visible / label "Save as Draft" | Same as Cell 1 but select Office + fill areaSqm (no bedrooms/bathrooms) | Same — Status section visible, label "Save as Draft" | ⬜ | ⬜ |
| 5 | Create draft Hospitality; reopen in edit — toggle visible / label "Save as Draft" | Same as Cell 1 but select Hostel + fill rooms / maxGuests / bathrooms + profile contacts complete (D-11 satisfied) | Same — Status section visible, label "Save as Draft"; PriceSection stays unmounted (D-14) | ⬜ | ⬜ |
| 6 | Edit draft Hospitality; flip Live; label switches to "Publish Listing" | Continue Cell 5 edit screen. Tap Live chip. | Submit label = "Publish Listing"; no unexpected PriceSection mount | ⬜ | ⬜ |

**D-16 regression gate:** If any re-entry into a draft listing hides the Status toggle OR shows "Update Listing" as the submit label, the user-reported bug has re-emerged.

---

## Matrix 3 — D-01 inline error rendering + D-02 clear-on-keystroke + D-04 scroll-to-first-error (5 cells × 2 devices = 10 cells)

| # | Cell | Steps | Expected | iOS | Android |
|---|------|-------|----------|-----|---------|
| 1 | D-01 / D-04 Residential: submit with empty title → inline red error + scroll to first invalid | Fresh CreateListing; leave ALL fields empty; tap Submit. | Red italic error text (`commonStyles.hint` + `colors.error`) renders under title input reading `t('createListing.errors.titleRequired')`; KASV scrolls to top (title is first in FIELD_ORDER_BY_CATEGORY.Residential) | ⬜ | ⬜ |
| 2 | D-02 clear-on-keystroke: type one char in title after Cell 1 failure | Continue from Cell 1. Tap title input, type any character. | Red error text under title vanishes on first keystroke; other field errors still show until their own key is pressed | ⬜ | ⬜ |
| 3 | D-04 Commercial: submit with areaSqm empty → scroll to Commercial section | Fresh CreateListing; fill shared + select Office; leave areaSqm empty; fill currency + price. Tap Submit. | Scroll lands near top of Commercial section; inline red error under areaSqm reads `t('createListing.errors.areaSqmRequired')` | ⬜ | ⬜ |
| 4 | D-04 Hospitality: submit with rooms empty → scroll to Hospitality section | Fresh CreateListing; fill shared + select Hostel; leave rooms empty; fill maxGuests + bathrooms. Ensure profile contacts complete (D-11 satisfied). Tap Submit. | Scroll lands near top of Hospitality section; inline red error under rooms reads `t('createListing.errors.roomsRequired')` | ⬜ | ⬜ |
| 5 | D-03 negative check: NO asterisks / NO "required" labels BEFORE first submit attempt | Open fresh CreateListing; scan every field label. | Layout is clean — no red indicators, no asterisks, no "required" helper text until submit is attempted and fails | ⬜ | ⬜ |

**D-01/D-02/D-03/D-04 regression gate:** Any FAIL here invalidates Plan 02's SectionProps.errors contract OR Plan 04's scroll-to-first-error wiring (KASV ref + FIELD_ORDER_BY_CATEGORY + fieldLayouts).

---

## Matrix 4 — D-11 Hospitality contact hybrid rule + D-12 edit-mode parity (4 cells × 2 devices = 8 cells)

D-09 trigger rule: if ANY of phone / whatsapp / telegram (after trim) is non-empty, the full D-10 rule fires (phone required AND at least one of whatsapp/telegram required). If ALL THREE are empty, Hospitality submit passes through silently.

**Pre-cell setup:** Navigate to Account Settings and explicitly set contact values as Cell dictates BEFORE returning to CreateListing.

| # | Cell | Steps | Expected | iOS | Android |
|---|------|-------|----------|-----|---------|
| 1 | D-09 pass-through: profile contacts ALL empty → Hospitality submit succeeds silently | 1. Account Settings → clear phone, whatsapp, telegram to empty strings; save. 2. Open CreateListing; select Hostel; fill shared + rooms / bathrooms / maxGuests. 3. Tap Submit. | Listing saves; `onSuccess` fires; no Alert.alert appears; no inline Contact error row renders | ⬜ | ⬜ |
| 2 | D-10 partial contact (phone only) → Alert with "Complete profile" CTA | 1. Account Settings → set phone = "+996 500 000 001"; clear whatsapp + telegram; save. 2. Open CreateListing; select Hostel; fill shared + rooms / bathrooms / maxGuests. 3. Tap Submit. | Alert.alert fires with title `t('createListing.contactMissingTitle')` + body `t('createListing.contactMissingBody')`; two buttons (Cancel + Complete profile); inline red error row renders above Contact Info summary | ⬜ | ⬜ |
| 3 | D-11 "Complete profile" CTA → navigates to AccountSettingsScreen | From Cell 2 Alert, tap "Complete profile" button. | CreateListing overlay closes (propertyToEdit clears, adminVerificationMode clears, isCreateListingOpen=false); AccountSettingsScreen opens (isAccountSettingsOpen=true). This is the Plan 05 Task 1 App.tsx wiring under test. | ⬜ | ⬜ |
| 4 | D-12 edit mode same hybrid rule: edit existing Hostel with partial contacts → Alert fires | 1. Create Hostel with full contacts (phone + whatsapp) — save as live. 2. Account Settings → clear whatsapp; save. 3. Return to OwnerListings; tap the Hostel listing to edit. 4. Tap Submit (no field changes needed). | Alert fires with same "Complete profile" CTA; edit-mode parity with create-mode per D-12 | ⬜ | ⬜ |

**D-11/D-12 regression gate:** If Cell 3 shows CreateListing still open behind the closed Alert, the Plan 05 Task 1 App.tsx wiring didn't land correctly — file Rule 3 blocker.

---

## Matrix 5 — D-09 anchor preservation regression (3 cells × 2 devices = 6 cells)

Phase 3 D-14 invariant: non-admin users cannot *author* panoramicPhotosUrl or tours, but edits by non-admins must PRESERVE admin-set values on save. Validators.ts `shared` block includes these unconditionally per D-06.

**Dev-console / network inspector (Proxyman / Charles / Flipper) required to verify payload contents.**

| # | Cell | Steps | Expected | iOS | Android |
|---|------|-------|----------|-----|---------|
| 1 | Non-admin creates Residential → payload panoramicPhotosUrl present (empty string) | 1. Sign in as non-admin. 2. Create Apartment with shared + required Residential fields (no panoramic input visible by role gate). 3. Tap Submit; capture POST payload. | Network payload contains `panoramicPhotosUrl: ""` (empty string, not missing key); `tours: undefined` (omitted by `tours.length > 0 ? tours : undefined` ternary) | ⬜ | ⬜ |
| 2 | Non-admin edits admin-set panoramic URL → preserved on save | 1. Admin logs in; creates Apartment; sets panoramicPhotosUrl = "https://ricoh360.com/abc". Save as live. 2. Sign out; sign in as non-admin (listing must be visible to non-admin — set as live first). 3. Edit the listing (change title only — no access to panoramic input). 4. Tap Submit; capture PUT/PATCH payload. | Payload contains `panoramicPhotosUrl: "https://ricoh360.com/abc"` (value PRESERVED, not wiped to `""`); backend record post-save still has the admin-set URL | ⬜ | ⬜ |
| 3 | Non-admin edits admin-set tours → preserved on save | 1. Admin logs in; creates Apartment; adds at least 1 Tour via 3D tour form. Save as live. 2. Sign out; sign in as non-admin. 3. Edit the listing (change title only). 4. Tap Submit; capture payload. | Payload contains `tours: [{id, title, url, ...}]` with the admin-set tour intact; backend record post-save still has the tour | ⬜ | ⬜ |

**D-09 regression gate:** Any cell showing the admin-set anchor wiped indicates the `buildPayloadByCategory.shared` block OR the CLS rehydrate path regressed — file Rule 1 bug.

---

## Aggregate Summary

Fill at end of walk on BOTH devices.

| Matrix | Unique cells | Total cells (×2 devices) | iOS PASS | Android PASS | FAIL details |
|--------|--------------:|-------------------------:|---------:|-------------:|--------------|
| 1. FORM-07 category-switch | 9 | 18 | — | — | — |
| 2. FORM-08 + D-16 edit mode | 6 | 12 | — | — | — |
| 3. D-01 / D-02 / D-03 / D-04 errors | 5 | 10 | — | — | — |
| 4. D-11 / D-12 Hospitality contact | 4 | 8 | — | — | — |
| 5. D-09 anchor regression | 3 | 6 | — | — | — |
| **Total** | **27** | **54** | **—** | **—** | **—** |

---

## Session Log

| Session | Device | OS | Commit SHA | Tester | Date | Pass/Fail count | Notes |
|---------|--------|----|------------|--------|------|-----------------|-------|
| 1 | iPhone 15 Pro Max | iOS 26 | ________ | ________ | ________ | __ / 27 | |
| 2 | Moto G XT2513V | Android 16 Fabric | ________ | ________ | ________ | __ / 27 | |

---

## FAIL Routing

Any FAIL triggers either:
1. A targeted fix commit (if the FAIL is a Rule 1/2/3 auto-fixable bug in Plan 05-01 through 05-05 scope — file + fix)
2. A deferred-with-rationale entry in `PROJECT.md` Key Decisions (only with user approval per CLAUDE.md M1 testing bar)

Any Phase-4 regression observed during the walk is escalated via `/gsd-verify-work 5` as a failed gate on 04-VERIFICATION.md's 5/5 must-haves.

---

## Phase-Exit Regression Bundle

See `05-VERIFICATION.md` for the automated regression bundle and phase-entry → phase-exit delta.

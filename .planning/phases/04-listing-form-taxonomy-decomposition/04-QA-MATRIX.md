# Phase 4 — 18-Cell Manual QA Matrix

**Plan:** 04-06 (Wave 3 orchestrator reduction — phase-exit gate)
**Commit under test:** `ac02eb2` (`refactor(04-06): reduce CreateListingScreen to orchestrator`)
**Base commit (pre-reduction):** `633637c` (Plan 04-02 — last prior touch on `src/screens/CreateListingScreen.tsx`)
**Created:** 2026-04-24

This document records the manual physical-device QA walk required per CLAUDE.md
(M1 testing bar is manual QA on iOS + Android). Fill in device / OS version /
SHA for every run. Any FAIL cell blocks phase exit.

---

## Setup

- Build: `npm run ios` and `npm run android` (or Xcode / Android Studio).
- Devices: at least one iPhone (iOS 26) + one Android (Moto G / Android 16 / Fabric).
- Accounts:
  - **Admin:** `beckprograms@gmail.com` (in `src/constants/adminAllowlist.ts`)
  - **Non-admin:** any other email

Record every run below with device + OS + commit SHA (should match `ac02eb2`).

---

## Matrix 1 — 10 Property Types × 7 Rows

For each of: **Apartment, House, Townhome, Condo, Office, Retail, Warehouse, Industrial, Hostel, Hotel**

| Row | Action | Expected result | iOS | Android |
|-----|--------|-----------------|-----|---------|
| A | Open CreateListing | Form loads without crash; three grouped chipRows (Residential / Commercial / Hospitality) visible with group labels | ☐ | ☐ |
| B | Tap the property-type chip under the correct category group | Chip highlights accent; correct category section mounts below (Residential→bedrooms/baths/area; Commercial→area only; Hospitality→rooms/maxGuests/baths + placeholder) | ☐ | ☐ |
| C | Toggle language EN ↔ RU | All chip labels + group labels + section headers + placeholders translate; no truncation; no missing-key blanks | ☐ | ☐ |
| D | Toggle theme dark ↔ light | All 7 sub-components render correctly in both themes; no contrast regressions | ☐ | ☐ |
| E | (Residential/Commercial only) Verify PriceSection is visible | Currency chips + price input present; active currency chip has accent fill | ☐ | ☐ |
| F | (Hospitality only — Hostel/Hotel) Verify PriceSection is UNMOUNTED | No currency chips, no price input visible anywhere on screen | ☐ | ☐ |
| G | Edit flow (skip for Hostel/Hotel — no pre-existing data) | Open existing listing; correct category section appears with pre-filled values | ☐ | ☐ |

Budget: ~45 min per device.

---

## Matrix 2 — Admin vs Non-Admin MediaSection Gating

(FORM-03 + Phase 3 regression)

| Cell | Account | Expected result | iOS | Android |
|------|---------|-----------------|-----|---------|
| M1 | **Admin** — Create flow | Images block visible; Matterport tours section (title + hint + tourTitle + tourUrl + Add 3D Tour + existing tours list) visible; Links section: videoUrl + panoramic URL + instagramUrl + instagramHint all visible | ☐ | ☐ |
| M2 | **Non-admin** — Create flow | Images block visible; **Matterport tours section NOT RENDERED AT ALL** (no header / hint / inputs / button / placeholder / upgrade CTA); Links section: videoUrl visible, **panoramic URL input NOT RENDERED**, instagramUrl visible, instagramHint visible | ☐ | ☐ |
| M3 | **Admin** — Edit flow of a listing with panoramic URL set | Panoramic URL input shows pre-filled value | ☐ | ☐ |
| M4 | **Non-admin** — Edit flow of a listing admin-previously-set with `panoramicPhotosUrl` + tours | **D-09 BEHAVIOR:** panoramic input is hidden. Edit an unrelated field (title), tap Save. Re-open the same listing from admin / API — panoramicPhotosUrl + tours STILL PRESENT on server record. This verifies D-09 preserve-on-save anchors are behaviorally intact after the refactor. | ☐ | ☐ |

---

## Matrix 3 — Verification Switches Gating

(Phase 3 Site 4 regression — editVerifications caller-wrap)

| Cell | Account | Expected result | iOS | Android |
|------|---------|-----------------|-----|---------|
| V1 | **Admin** — Create or Edit | VerificationSection (3 switches + header + hint) visible; switches use accent color when toggled on | ☐ | ☐ |
| V2 | **Non-admin** — Create or Edit | VerificationSection **NOT RENDERED** (no header / switches / hint) | ☐ | ☐ |

---

## Matrix 4 — Land Absence (FORM-01 final confirmation)

| Cell | Action | Expected result | iOS | Android |
|------|--------|-----------------|-----|---------|
| L1 | Scan all propertyType chips in Residential + Commercial + Hospitality groups | NO "Land" / "Земля" chip appears anywhere | ☐ | ☐ |
| L2 | HomeScreen filter toggle / commercial-view | Land not listed as a commercial option | ☐ | ☐ |

---

## Session Log

Fill as you walk the matrix.

| Session | Device | OS | Commit SHA | Tester | Date | Pass/Fail count | Notes |
|---------|--------|----|------------|--------|------|-----------------|-------|
| 1 |        |    | ac02eb2    |        |      |                 |       |
| 2 |        |    | ac02eb2    |        |      |                 |       |

---

## FAIL Routing

Any FAIL triggers either:
1. A targeted fix commit (if the FAIL is a Rule 1/2/3 auto-fixable bug in the refactor — file an issue and fix)
2. A deferred-with-rationale entry in PROJECT.md Key Decisions (only with user approval)

---

## Phase-Exit Regression Bundle

See `04-VERIFICATION.md` for the automated regression bundle output.

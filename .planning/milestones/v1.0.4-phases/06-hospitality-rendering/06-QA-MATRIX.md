---
phase: 06-hospitality-rendering
plan: 07
created: 2026-04-25
status: APPROVED
walked: 2026-04-25
disposition: APPROVED — user walked all 80 cells on iPhone 15 Pro / iOS 26 + Moto G XT2513V / Android 16 Fabric with admin + non-admin accounts; no FAIL cells reported
total_cells: 80
matrix_count: 10
testing_bar: M1 manual physical-device QA per CLAUDE.md
---

# Phase 6 — Manual QA Matrix (Physical Devices)

**Created:** 2026-04-25
**Testing bar:** M1 manual physical-device QA per CLAUDE.md (iOS + Android)
**Source of truth:** `06-RESEARCH.md` § Validation Architecture § QA matrix table (10 cell groups totaling ~80 cells)

This document records the 80-cell physical-device QA walk required to close Phase 6 (Hospitality Rendering). Mirrors Phase 4's `04-QA-MATRIX.md` (18 cells) and Phase 5's `05-QA-MATRIX.md` (54 cells) structural precedent. Budget ~2-3 hours per device.

---

## Cell Markers

✅ Pass · ❌ Fail · — N/A · ☐ Pending

---

## Test Environment

| Device         | OS               | Build Variant     | Account                                                                  |
| -------------- | ---------------- | ----------------- | ------------------------------------------------------------------------ |
| iPhone 15 Pro  | iOS 26.x         | Fabric / Release  | admin: `beckprograms@gmail.com` + non-admin: `<test-account>`            |
| Moto G XT2513V | Android 16       | Fabric / Release  | admin: `beckprograms@gmail.com` + non-admin: `<test-account>`            |

Record device serial, OS build, and git SHA in the Sign-off section before walking.

### Seed-data requirements

Before the walk, ensure the Railway backend has at least the following Hospitality fixtures:

- **2 Hostel listings + 2 Hotel listings** with varying:
  - **Amenity counts:** at least one each of 0 / 1-3 / 4+ / all-12 selections (so HospitalityCard's preview-row + overflow chip can both render in coverage)
  - **Tour states:** at least one with `tours[0].thumbnailUrl` populated and at least one with `tours: undefined`
  - **Owner-contact combinations** across the 4 listings: none / WhatsApp only / Telegram only / phone only / all three (Phase-5 D-09 hybrid permits all-empty contacts)
- **At least 1 Hostel + 1 Hotel created by the QA walker's own account** so the RenterListings strip Matrix 1.5 / 1.6 cells have data
- **At least 1 Hostel + 1 Hotel created by another user** so the OwnerListings (landlord-profile view) Matrix 1.7 / 1.8 cells have data

### Memory note (`nav-overlay-hides-bottom-nav.md`)

Per the user's auto-memory: overlays hide the bottom tab bar by design. Cells that would require seeing the tab bar under an overlay are marked `—` (N/A). No such cells are included in the matrices below — listed for awareness only.

---

## Matrix 1 — Strip render on 4 list screens (16 cells)

| Cell | Screen                                | Hospitality state               | iOS | Android | Notes                                                                                       |
| ---- | ------------------------------------- | ------------------------------- | --- | ------- | ------------------------------------------------------------------------------------------- |
| 1.1  | Home                                  | Empty (no Hospitality listings) | ✅   | ✅       | Strip returns null — no header, no placeholder                                              |
| 1.2  | Home                                  | Populated (≥1)                  | ✅   | ✅       | Strip renders; title "Hostels & Hotels (N)" visible; horizontal scroll works                |
| 1.3  | Favorites                             | Empty                           | ✅   | ✅       | Null render                                                                                 |
| 1.4  | Favorites                             | Populated                       | ✅   | ✅       | Strip at top; tap a card opens detail screen                                                |
| 1.5  | RenterListings (My Listings)          | Empty                           | ✅   | ✅       | Null render                                                                                 |
| 1.6  | RenterListings (My Listings)          | Populated                       | ✅   | ✅       | Strip with `showEditButton={true}`; edit/delete icons on each card; tap edit opens form     |
| 1.7  | OwnerListings (landlord-profile view) | Empty                           | ✅   | ✅       | Null render                                                                                 |
| 1.8  | OwnerListings (landlord-profile view) | Populated                       | ✅   | ✅       | Strip without edit/delete chrome (viewer is not the owner)                                  |

(2 states × 4 screens × 2 devices = 16 cells)

---

## Matrix 2 — HomeScreen tri-state filter (6 cells)

| Cell | selectedCategory | iOS | Android | Notes                                                                                                                              |
| ---- | ---------------- | --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Residential      | ☐   | ☐       | Vertical list = residential PropertyCards; strip at top if Hospitality populated                                                   |
| 2.2  | Commercial       | ☐   | ☐       | Vertical list = commercial PropertyCards; strip at top if Hospitality populated                                                    |
| 2.3  | Hospitality      | ☐   | ☐       | Vertical list = HospitalityCards; strip NOT rendered (would be redundant per D-04)                                                 |

(3 categories × 2 devices = 6 cells)

---

## Matrix 3 — HomeScreen transactionType × Hospitality (4 cells — Pitfall 2)

| Cell | transactionType | iOS | Android | Notes                                                                                                                  |
| ---- | --------------- | --- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Rent            | ☐   | ☐       | Strip count reflects Rent-only Hospitality listings (`property.type === 'rent'`)                                       |
| 3.2  | Sell            | ☐   | ☐       | Strip count changes when toggled; reflects Sell-only Hospitality                                                       |

(2 transaction types × 2 devices = 4 cells)

---

## Matrix 4 — HomeScreen type chip under Hospitality (4 cells)

Pre-condition: `selectedCategory = 'Hospitality'`. Below the category-toggle row, the property-type chip row narrows to `HOSPITALITY_TYPES = ['Hostel', 'Hotel']`.

| Cell | Chip tapped | iOS | Android | Notes                                                                              |
| ---- | ----------- | --- | ------- | ---------------------------------------------------------------------------------- |
| 4.1  | Hostel      | ☐   | ☐       | Vertical list narrows to Hostel only; HospitalityCards render                       |
| 4.2  | Hotel       | ☐   | ☐       | Vertical list narrows to Hotel only; HospitalityCards render                        |

(2 type chips × 2 devices = 4 cells)

---

## Matrix 5 — HospitalityCard variants (8 cells)

| Cell | Tour      | Amenities | iOS | Android | Notes                                                                                       |
| ---- | --------- | --------- | --- | ------- | ------------------------------------------------------------------------------------------- |
| 5.1  | None      | 0         | ☐   | ☐       | Fallback hero (`property.imageUrl`); no 3D Tour badge; no amenity preview row               |
| 5.2  | None      | 1-3       | ☐   | ☐       | Fallback hero; no 3D Tour badge; amenity preview chips render with lucide icons             |
| 5.3  | Has tour  | 0         | ☐   | ☐       | Tour `thumbnailUrl` hero; 3D Tour badge bottom-left; no amenity preview row                 |
| 5.4  | Has tour  | 4+        | ☐   | ☐       | Tour hero; 3D Tour badge; first 3 chips + `+N more` overflow chip per `hospitality.amenitiesMore` |

(4 variants × 2 devices = 8 cells)

---

## Matrix 6 — PropertyDetailsScreen Hostel (16 cells)

For each cell, open a Hostel listing's detail screen and confirm the listed observations.

| Cell | Tour      | WA | TG | Phone | iOS | Android | Notes                                                                                                                       |
| ---- | --------- | -- | -- | ----- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | No tour   | ✗  | ✗  | ✗     | ☐   | ☐       | No price block; sticky bar 3 disabled buttons (opacity 0.4); no inline warning                                              |
| 6.2  | No tour   | ✓  | ✗  | ✗     | ☐   | ☐       | No price block; sticky bar — WA active (green); TG + Phone disabled                                                         |
| 6.3  | No tour   | ✗  | ✓  | ✗     | ☐   | ☐       | No price block; sticky bar — TG active (blue); WA + Phone disabled                                                          |
| 6.4  | No tour   | ✓  | ✓  | ✓     | ☐   | ☐       | No price block; sticky bar — all 3 active; tap each → external app opens (WhatsApp / Telegram / dialer)                     |
| 6.5  | Has tour  | ✗  | ✗  | ✗     | ☐   | ☐       | TourHeroCard above gallery; no price block; sticky bar all 3 disabled                                                       |
| 6.6  | Has tour  | ✓  | ✗  | ✗     | ☐   | ☐       | Tour above gallery; no price block; WA active; TG + Phone disabled                                                          |
| 6.7  | Has tour  | ✗  | ✓  | ✗     | ☐   | ☐       | Tour above gallery; TG active                                                                                               |
| 6.8  | Has tour  | ✓  | ✓  | ✓     | ☐   | ☐       | Tour above gallery; all 3 active; WA/TG/phone deep-link opens correct app; amenity chip grid renders with lucide icons      |

(8 combinations × 2 devices = 16 cells)

---

## Matrix 7 — PropertyDetailsScreen Hotel (16 cells)

Identical structure to Matrix 6 but with a Hotel listing. Type badge on card reads "Hotel"; detail-screen amenity section title reads `t('hospitality.amenities')` ("Amenities" / "Удобства").

| Cell | Tour      | WA | TG | Phone | iOS | Android | Notes                                                                                       |
| ---- | --------- | -- | -- | ----- | --- | ------- | ------------------------------------------------------------------------------------------- |
| 7.1  | No tour   | ✗  | ✗  | ✗     | ☐   | ☐       | No price block; sticky bar 3 disabled (opacity 0.4)                                          |
| 7.2  | No tour   | ✓  | ✗  | ✗     | ☐   | ☐       | WA active; TG + Phone disabled                                                              |
| 7.3  | No tour   | ✗  | ✓  | ✗     | ☐   | ☐       | TG active                                                                                   |
| 7.4  | No tour   | ✓  | ✓  | ✓     | ☐   | ☐       | All 3 active; deep-links open correct apps                                                  |
| 7.5  | Has tour  | ✗  | ✗  | ✗     | ☐   | ☐       | TourHeroCard above gallery; sticky bar all disabled                                          |
| 7.6  | Has tour  | ✓  | ✗  | ✗     | ☐   | ☐       | Tour above; WA active                                                                       |
| 7.7  | Has tour  | ✗  | ✓  | ✗     | ☐   | ☐       | Tour above; TG active                                                                       |
| 7.8  | Has tour  | ✓  | ✓  | ✓     | ☐   | ☐       | Tour above; all 3 active; amenity chip grid renders                                          |

(8 combinations × 2 devices = 16 cells)

---

## Matrix 8 — Create form amenity picker (6 cells)

Pre-condition: open CreateListing, select category "Hospitality", select property type "Hostel" or "Hotel", scroll to the HospitalitySection at the form bottom.

| Cell | Selection                  | iOS | Android | Notes                                                                                                                                                                              |
| ---- | -------------------------- | --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | 0 amenities (submit)       | ☐   | ☐       | Inline error "Please select at least one amenity" / "Выберите хотя бы одно удобство" renders below the chip grid; submit blocked; FIELD_ORDER_BY_CATEGORY scrolls to amenity slot |
| 8.2  | 1 amenity (e.g., Wi-Fi)    | ☐   | ☐       | No error; submit succeeds; round-trip preserves amenity in the saved listing                                                                                                       |
| 8.3  | All 12 amenities           | ☐   | ☐       | All chips visible with accent bg + white icon/text; grid wraps cleanly; RU labels ("Камеры хранения", "Санузел в номере", "Круглосуточная стойка") truncate via `numberOfLines={1}`, do NOT wrap two lines |

(3 selection states × 2 devices = 6 cells)

---

## Matrix 9 — Edit-mode rehydrate for Hospitality (Gap 9.2) (2 cells)

| Cell | Action                                  | iOS | Android | Notes                                                                                                                                                |
| ---- | --------------------------------------- | --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | Edit an existing Hospitality listing    | ☐   | ☐       | From RenterListings → tap edit on a Hostel/Hotel; rooms / maxGuests / amenities fields pre-populate from server response; no blanking on first paint |

(1 action × 2 devices = 2 cells)

---

## Matrix 10 — EN+RU live language toggle during active filter (2 cells)

| Cell  | Action                                                                                                          | iOS | Android | Notes                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------- | --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1  | Switch language (EN ↔ RU) while Hospitality category is active with populated strip + a Hostel/Hotel detail open | ☐   | ☐       | All 12 amenity labels retranslate; strip title "Hostels & Hotels" ↔ "Хостелы и отели" retranslates; detail amenity chip labels retranslate     |

(1 action × 2 devices = 2 cells)

---

## Totals

| Matrix | Cells |
| ------ | ----- |
| 1      | 16    |
| 2      | 6     |
| 3      | 4     |
| 4      | 4     |
| 5      | 8     |
| 6      | 16    |
| 7      | 16    |
| 8      | 6     |
| 9      | 2     |
| 10     | 2     |

**Sum: 16 + 6 + 4 + 4 + 8 + 16 + 16 + 6 + 2 + 2 = 80 cells**

(Per `06-RESEARCH.md` § Validation Architecture § QA matrix table)

---

## Sign-off

**User action:** Walk all 80 cells on both physical devices with both accounts where applicable. Mark each cell ☐ → ✅ (PASS) or ❌ (FAIL). For each FAIL, add a Notes-column entry describing actual vs expected behaviour with enough detail to route a fix.

**On all-PASS:** Record device serial / OS build / git SHA in the Metadata table below, then run `/gsd-verify-work` to close Phase 6.

**On any FAIL:** Surface cell ID + device/OS + actual behaviour to the planner; orchestrator routes to a targeted gap-closure plan (`/gsd-plan-phase 6 --gaps`) OR an accepted-risk disposition recorded in PROJECT.md Key Decisions per user approval.

| Metadata                  | Value                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| QA walker                 | <fill>                                                                                          |
| iOS device serial         | <fill>                                                                                          |
| iOS build                 | <fill (e.g., 1.0.4 build 21)>                                                                  |
| Android device serial     | <fill>                                                                                          |
| Android build             | <fill (e.g., 1.0.24 versionCode 25)>                                                            |
| Git SHA at walk start     | <fill — should match the commit on which the build was generated>                              |
| Walk start timestamp      | <fill ISO-8601 UTC>                                                                            |
| Walk end timestamp        | <fill ISO-8601 UTC>                                                                            |
| iOS PASS / FAIL count     | <fill>                                                                                          |
| Android PASS / FAIL count | <fill>                                                                                          |
| Total PASS / FAIL count   | <fill>                                                                                          |
| Final disposition         | <APPROVED / PARTIAL — list FAIL cell IDs / FAIL — list FAIL cell IDs>                           |

---

## FAIL routing template

If any FAIL cells surface, copy this template per FAIL into the user reply to the planner:

```
- Cell: <e.g., 6.4>
- Device: <iOS / Android>
- OS build: <e.g., iOS 26.1>
- Account context: <admin / non-admin / N/A>
- Expected: <copy from Notes column>
- Actual: <describe what actually happened>
- Reproducibility: <always / intermittent — N of M attempts>
- Suggested category: <Rule 1 bug / Rule 2 missing-critical / Rule 3 blocker / Rule 4 architectural / accepted-risk-candidate>
```

---

## Phase-Exit Regression Bundle

See `06-VERIFICATION.md` for the automated regression bundle output (CI gates, test baseline, tsc, D-09 anchors, MediaSection Gated count, PropertyCard zero-diff, traceability). All 18 automated gates PASS at recording commit `496461c`.

---

*Phase: 06-hospitality-rendering*
*Plan: 07 of 7 (Wave 4 — phase-exit gate)*
*Created: 2026-04-25*

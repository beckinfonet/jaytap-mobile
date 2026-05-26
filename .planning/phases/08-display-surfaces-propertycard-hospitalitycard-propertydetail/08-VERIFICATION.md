---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
verified: 2026-05-25T21:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Home screen — open the app in RU locale on a physical device; browse the apartment section; confirm a listing with bedrooms > 0 shows the Beds cell value with 'Спальни' label below it, and the Baths cell shows bathroomCount (or '-') with 'Ванные' label below it."
    expected: "Column-stacked cell: icon top / numeric value middle / localized label below. Beds label = 'Спальни' for apartments. Baths label = 'Ванные'. Fallback to '-' when value absent."
    why_human: "Visual layout, locale rendering, and real backend data can only be confirmed on a physical device. The automated test stack mocks the locale (t returns key verbatim) and cannot verify the actual EN/RU string display or the column-stack visual appearance."
  - test: "Home screen — browse to the Hospitality section; open a hotel or hostel listing card; confirm HospitalityCard's meta line shows e.g. '4 Rooms · 2 Bathrooms · 8 Max Guests' when bathroomCount is present, and '4 Rooms · 8 Max Guests' (no extra separator, no 'Bathrooms' fragment) when bathroomCount is absent."
    expected: "bathroomCount fragment inserts between Rooms and Max Guests with a leading '·' separator; the separator is ABSENT (not orphaned) when bathroomCount is undefined. Both EN and RU verified."
    why_human: "The separator-orphan invariant is proven by the automated HospitalityCard.test.tsx Test 2 countSeparators check, but visual confirmation on a real device with live data is needed to confirm the fragment renders acceptably within numberOfLines={1} truncation at narrow widths."
  - test: "PropertyDetailsScreen — open a residential listing (apartment/house) and confirm the specs row shows three cells: Beds | Baths | m² with 'Bedrooms' (EN) / 'Спальни' (RU) label on the Beds cell. Then open a hospitality listing (hotel/hostel) and confirm the same specs row shows 'Rooms' / 'Комнаты' on the Beds cell."
    expected: "Label flip between residential ('Bedrooms') and hospitality ('Rooms') is visible on the actual device with real API data. The !isHospitality gate is confirmed lifted — hotel/hostel detail pages now show the specs row."
    why_human: "The 5-case PropertyDetailsScreen.test.tsx proves the label-flip logic, but visual verification with real API data is needed to confirm the lifted gate looks correct in the hospitality info architecture (no conflicting duplicate data visible)."
  - test: "PropertyDetailsScreen — open an office or commercial listing; confirm the Beds cell is entirely absent (row shows only Baths | m², no empty Beds placeholder)."
    expected: "Office/commercial detail page renders a 2-cell specs row: Baths and m² only. No 'Bedrooms: -' or 'Rooms: -' cell visible."
    why_human: "Automated tests prove View-omission via key-string absence, but visual confirmation confirms no ghost whitespace or layout artifact from the hidden cell."
  - test: "RU locale — run through all four surfaces in Russian. Verify: PropertyCard Beds label = 'Спальни', Baths = 'Ванные'; HospitalityCard bathrooms fragment = 'Ванные'; PropertyDetailsScreen residential Beds = 'Спальни', hospitality Beds = 'Комнаты', Baths = 'Ванные'."
    expected: "All new specs-row labels render in Russian when the app is in RU locale. No raw English strings visible on any of the four surfaces."
    why_human: "Automated tests use the t-mock-key-verbatim convention (returns key string, not the resolved EN/RU value). Actual locale rendering must be confirmed on a physical device with locale set to Russian."
---

# Phase 8: Display Surfaces Verification Report

**Phase Goal:** Every browse + details surface (PropertyCard, HospitalityCard, PropertyDetailsScreen specs row) renders the correct beds/baths/rooms count per property type with localized labels distinguishing "Bedrooms" (residential) from "Rooms" (hospitality), and falls back to `'-'` when the count is absent — preserving the M3 + 260525-i2i canonical specs-row layout.
**Verified:** 2026-05-25T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | EN locale has 3 new `property.specs.*` keys; RU locale has matching 3 keys; i18n parity gate exits 0; existing keys untouched | VERIFIED | `grep -c 'property.specs.bedrooms'` → en.ts:1, ru.ts:1; `grep -c 'property.specs.bathrooms'` → 1/1; `grep -c 'property.specs.rooms'` → 1/1; `hospitality.bathrooms` count still 1/1; `bash scripts/check-i18n-parity.sh` → exit 0 (PASS: FORM-09 key-set parity holds) |
| 2 | PropertyCard Beds cell reads `basics.bedrooms` with "Bedrooms" label; hides on office/commercial; dead hotelRooms fallback removed; Baths cell reads `bathroomCount`; bathroom enum branch removed; specItem column-direction; specLabel added | VERIFIED | Code confirmed at src/components/PropertyCard.tsx lines 285-306: `showBedsCell` gate present (3 occurrences); `basics?.bedrooms` single read; `basics?.bathroomCount` single read; `property.specs.bedrooms` + `property.specs.bathrooms` consumed; `hotelRooms` absent; enum branch absent; `specItem.flexDirection: 'column'`; `specLabel { fontSize: 12 }` present. PropertyCard.test.tsx: 5/5 cases pass. |
| 3 | HospitalityCard meta line adds conditional `· {bathroomCount} Bathrooms` fragment when bathroomCount is defined; renders nothing when absent (no orphan separator); uses existing `hospitality.bathrooms` key; `!== undefined` gate (not truthiness); `styles.specsContainer` absent | VERIFIED | Code confirmed at HospitalityCard.tsx line 215: `property.basics?.bathroomCount !== undefined ?` conditional present; `t('hospitality.bathrooms')` consumed (count=1); `styles.specsContainer` count=0; `numberOfLines={1}` present. HospitalityCard.test.tsx: 4/4 cases pass including Test 2 (orphan-separator = 1, load-bearing D-06 gate) and Test 4 (bathroomCount=0 renders fragment). |
| 4 | PropertyDetailsScreen specs row renders on ALL categories (gate lifted); residential Beds label = `property.specs.bedrooms`; hospitality Beds label = `property.specs.rooms`; office/commercial Beds cell omitted; Baths reads `bathroomCount`; enum branch removed; m² cell preserved; `bedsLabelKey`/`bedsValue`/`showBedsCell` named identifiers hoisted | VERIFIED | Code confirmed at PropertyDetailsScreen.tsx lines 277-284 (derivations) + 1051-1081 (specs row): `bedsLabelKey` count=3, `showBedsCell` count=3, `basics?.bathroomCount` present, `basics?.bedrooms` present, `areaSqm` present, `📐` emoji present. Old fallback chain absent (count=0). Bathroom enum absent (count=0). PropertyDetailsScreen.test.tsx: 5/5 cases pass including Test 4 (hotel → `property.specs.rooms`) and Test 5 (hostel, gate-lifted). |
| 5 | ListingMetaTable rooms row and bathroom-enum row removed; `const rooms` and `const bathroom` derivations removed; `hasExtras` chain cleaned; all other extras rows intact; EN/RU parity preserved; KBD-02 invariant held | VERIFIED | Code confirmed at ListingMetaTable.tsx lines 60-83: `rooms != null` count=0, `bathroom != null` count=0, `const rooms = property` count=0, `const bathroom = property` count=0, `property.beds` count=0, `property.baths` count=0, `bathroomPrivate` count=0; `hasExtras` count=3 (declaration + gate + chain); `areaSqm` count=2. ListingMetaTable.test.tsx: 6/6 cases pass. `keyboardVerticalOffset` count in src/ = 0. i18n parity exit 0. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/locales/en.ts` | 3 new `property.specs.*` keys + annotation comment | VERIFIED | Keys at lines 129-131; annotation comment at line 128 |
| `src/locales/ru.ts` | 3 matching RU keys + annotation comment (lockstep) | VERIFIED | Keys at lines 131-133; annotation comment at line 130; Спальни/Ванные/Комнаты values confirmed |
| `src/components/PropertyCard.tsx` | Redesigned specs-strip: icon/value/label anatomy, office/commercial gate, bathroomCount-only Baths, dead fallback removed | VERIFIED | Lines 285-306 contain the redesigned branch; StyleSheet at lines 470-484 has `flexDirection: 'column'` and `specLabel { fontSize: 12 }` |
| `src/components/__tests__/PropertyCard.test.tsx` | NEW co-located test, 5 cases, all passing | VERIFIED | File exists (6787 bytes); 5 cases pass in isolation via `npx jest` |
| `src/components/HospitalityCard.tsx` | Conditional bathroomCount fragment in meta line; zero StyleSheet changes | VERIFIED | Lines 215-217 contain the conditional Fragment; `styles.specsContainer` count=0 confirms no structural change |
| `src/components/__tests__/HospitalityCard.test.tsx` | NEW co-located test, 4 cases, load-bearing orphan-separator fence | VERIFIED | File exists (8011 bytes); 4 cases pass; Test 2 countSeparators=1 proves D-06 orphan invariant |
| `src/screens/PropertyDetailsScreen.tsx` | Specs row rewritten: gate lifted, category-aware flip, office/commercial hide, bathroomCount, m² preserved | VERIFIED | Lines 277-284 (derivations) + 1051-1081 (specs row JSX) confirmed; bedsLabelKey/bedsValue/showBedsCell all present |
| `src/screens/__tests__/PropertyDetailsScreen.test.tsx` | NEW co-located test, 5 cases, gate-lift proven | VERIFIED | File exists (10990 bytes); 5 cases pass; Test 4/5 prove hospitality gate-lift |
| `src/components/ListingMetaTable.tsx` | Surgical removal of rooms + bathroom-enum rows + derivations + hasExtras chain links | VERIFIED | All 4 grep-zero invariants confirmed; hasExtras chain reduced to 7 contributors |
| `src/components/__tests__/ListingMetaTable.test.tsx` | NEW co-located test, 6 cases, surgical-removal regression fence | VERIFIED | File exists (10194 bytes); 6 cases pass; Tests 1-3 prove hasExtras gate no longer treats rooms/bathroom as contributors |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/PropertyCard.tsx` | `src/locales/en.ts + ru.ts` | `t('property.specs.bedrooms' as any)` + `t('property.specs.bathrooms' as any)` | VERIFIED | Both key strings confirmed present in locale files; consumed via `t()` at lines 293 and 302 of PropertyCard.tsx |
| `src/components/HospitalityCard.tsx` | `src/locales/en.ts + ru.ts` | `t('hospitality.bathrooms')` (existing key reused) | VERIFIED | Key already at en.ts:285/ru.ts:287; consumed at HospitalityCard.tsx line 216 |
| `src/screens/PropertyDetailsScreen.tsx` | `src/locales/en.ts + ru.ts` | `t(bedsLabelKey as any)` consuming `property.specs.bedrooms`/`rooms` + `t('property.specs.bathrooms' as any)` | VERIFIED | All 3 new property.specs.* keys consumed; `bedsLabelKey` resolves to one of two locale keys based on `isHospitality` |
| `src/screens/PropertyDetailsScreen.tsx` | `src/utils/propertyCategory.ts` | `isHospitality = category === 'Hospitality'` derived from `propertyTypeToCategory(propertyType)` at line 274 | VERIFIED | Import confirmed at line 67; `isHospitality` derivation at line 274; `bedsLabelKey` uses this at line 280 |

### Data-Flow Trace (Level 4)

All four display-surface components (PropertyCard, HospitalityCard, PropertyDetailsScreen, ListingMetaTable) receive `property` via `props` from their parent screen. The parent screens fetch from the Railway backend via `PropertyService`. The display-side components are read-only renderers — they do not fetch data themselves. Data flow is:

`PropertyService` (API fetch) → parent screen state → `property` prop → display component → `basics.bedrooms` / `basics.bathroomCount` / `basics.hotelRooms` reads

The new fields (`basics.bedrooms`, `basics.bathroomCount`) are real schema fields added in Phase 6 (SCHEMA-01/02) with MongoDB persistence and round-trip validation. Phase 8 only changes the read-side render. Data flow is FLOWING for the new fields; the Phase 6 schema is the upstream source.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PropertyCard.test.tsx 5 cases | `npx jest src/components/__tests__/PropertyCard.test.tsx --no-coverage --forceExit` | 5 passed, 5 total | PASS |
| HospitalityCard.test.tsx 4 cases | `npx jest src/components/__tests__/HospitalityCard.test.tsx --no-coverage --forceExit` | 4 passed, 4 total | PASS |
| ListingMetaTable.test.tsx 6 cases | `npx jest src/components/__tests__/ListingMetaTable.test.tsx --no-coverage --forceExit` | 6 passed, 6 total | PASS |
| PropertyDetailsScreen.test.tsx 5 cases | `npx jest src/screens/__tests__/PropertyDetailsScreen.test.tsx --no-coverage --forceExit` | 5 passed, 5 total | PASS |
| All 4 Phase-8 suites combined | Combined jest run | 20 passed, 20 total | PASS |
| i18n parity gate | `bash scripts/check-i18n-parity.sh` | exit 0; "PASS: FORM-09 key-set parity holds" | PASS |
| KBD-02 invariant | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | 0 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DISP-01 | 08-02, 08-04 | PropertyCard + PropertyDetailsScreen Beds cell reads bedrooms (residential) / hotelRooms (hospitality) with correct labels | VERIFIED | PropertyCard: `basics?.bedrooms ?? '-'` with `property.specs.bedrooms` label; on HomeScreen, hotel/hostel routed to HospitalityCard (uses `hotelRooms` + `hospitality.rooms` = "Rooms"). PropertyDetailsScreen: `bedsValue` reads bedrooms or hotelRooms per `isHospitality`; `bedsLabelKey` flips between `property.specs.bedrooms` and `property.specs.rooms`. The routing architecture (post-260525-ggp) means PropertyCard never receives hotel/hostel data — this is CONTEXT D-03 by design, confirmed in ROADMAP SC-1 which refers to HomeScreen where routing is already correct. |
| DISP-02 | 08-02, 08-04 | Every Baths cell reads `basics.bathroomCount` with "Bathrooms" label; decimal values preserved | VERIFIED | PropertyCard: `basics?.bathroomCount ?? '-'` + `property.specs.bathrooms` label at line 301-302. PropertyDetailsScreen: `property.basics?.bathroomCount ?? '-'` + `property.specs.bathrooms` at lines 1072-1073. Decimal coercion via React Native default Text rendering (1.5→"1.5"). Test Cases 1-2 in PropertyCard.test.tsx confirm decimal values. |
| DISP-03 | 08-04, 08-05 | PropertyDetailsScreen specs row shows "Bedrooms"/"Rooms" labels per category; m² preserved; no duplicate in ListingMetaTable | VERIFIED | PropertyDetailsScreen: category-aware label flip via `bedsLabelKey`; m² cell preserved verbatim (areaSqm + 📐 emoji confirmed). ListingMetaTable: rooms and bathroom-enum rows surgically removed (all 4 grep-zero invariants confirmed). "Canonical specs row only; no duplicate" sub-clause satisfied. |
| DISP-04 | 08-03 | HospitalityCard adds bathroomCount inline fragment when present; hides when absent | VERIFIED | Code at HospitalityCard.tsx lines 215-217: `!== undefined` conditional; React Fragment shorthand; `hospitality.bathrooms` key reused. 4-case test suite passes including critical Test 2 (orphan-separator count=1 fence) and Test 4 (bathroomCount=0 renders fragment). |
| DISP-05 | 08-01, 08-02, 08-03, 08-04 | All specs-row labels routed through `t()`; no raw English strings; EN/RU parity gate exits 0 | VERIFIED | All 4 display-side files use `t()` for new label keys. `scripts/check-i18n-parity.sh` exits 0. 3 new property.specs.* keys present in both locale files. hospitality.bathrooms key reused (no raw string). m² is a Unicode symbol, not a translatable English phrase (CONTEXT discretion clause). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/__tests__/PropertyCard.test.tsx` | ~20 | References `PropertyCard.specChip.test.tsx` as "left UNTOUCHED" and lists its line numbers as canonical helper source — file was subsequently deleted in commit `bc5e790` | Info | Dead docstring reference only; tests still pass; future readers may chase a ghost file. Noted by Phase 8 code review (WR-03). |
| `src/components/__tests__/PropertyCard.test.tsx` (and 3 other test files) | various | `t('property.specs.bedrooms' as any)` — `as any` cast; the Phase 8 keys ARE present in TranslationKeys so the cast provides no real interim justification | Info | Erodes type safety marginally but doesn't block function. Noted by Phase 8 code review (WR-02). |
| `src/screens/__tests__/PropertyDetailsScreen.test.tsx` | ~47 | `PropertyService.getPropertyById` mocked to resolve `{}` — would clobber initial property if microtasks flushed via `await act(...)` | Warning | Fragile test — currently safe because `react-test-renderer act()` doesn't auto-flush async effects, but will regress if any test adds `await`. Noted by Phase 8 code review (WR-01). |

No TBD, FIXME, or XXX debt markers found in any Phase-8-modified file.

### Human Verification Required

Five test items need physical-device QA before the phase can be declared fully closed. All automated checks pass; the remaining items are visual and locale-rendering concerns that cannot be verified programmatically.

#### 1. PropertyCard Visual Layout (EN + RU)

**Test:** Browse Home screen in EN locale, then switch to RU locale. Find an apartment listing with `bedrooms > 0` and `bathroomCount` populated.
**Expected:** PropertyCard renders the Beds cell as icon (Bed icon) / numeric value / label below — column-stacked. Beds label = "Bedrooms" (EN) / "Спальни" (RU). Baths label = "Bathrooms" (EN) / "Ванные" (RU). `-` shown when values absent. Office/commercial listings show only the Baths cell (no Beds cell, no empty placeholder).
**Why human:** Automated tests use t-mock-key-verbatim (returns key string, not resolved locale value). Visual column-stack layout and actual locale string rendering require physical device.

#### 2. HospitalityCard Meta Line — Fragment Present/Absent

**Test:** On Home screen → Hospitality section, find a hotel/hostel listing with `bathroomCount` populated AND one without.
**Expected:** With bathroomCount: `"4 Rooms · 1.5 Bathrooms · 8 Max Guests"` (fragment between Rooms and Max Guests, correct separator count). Without: `"4 Rooms · 8 Max Guests"` (no extra separator, no 'Bathrooms' fragment).
**Why human:** countSeparators=1 is proven by Test 2, but visual confirmation of clean truncation under `numberOfLines={1}` at narrow widths and correct layout with real data is needed.

#### 3. PropertyDetailsScreen — Hospitality Gate Lifted + Label Flip

**Test:** Open a hotel listing's PropertyDetailsScreen. Confirm the specs row (Beds | Baths | m²) is now visible (was hidden pre-Phase-8). Confirm Beds label = "Rooms" / "Комнаты" (not "Bedrooms"). Then open a residential listing and confirm Beds label = "Bedrooms" / "Спальни".
**Expected:** Hotel/hostel detail pages now show the specs row. Label flip is correct. No layout conflicts with the existing hospitality sections (maxGuests, amenities, etc.).
**Why human:** Automated Tests 4/5 prove the label-flip logic but the gate-lift represents a new UI section appearing on hospitality detail pages that has never been visually reviewed.

#### 4. PropertyDetailsScreen — Office/Commercial Beds Cell Hidden

**Test:** Open an office or commercial listing's PropertyDetailsScreen. Confirm the specs row shows only 2 cells: Baths and m² (no Beds cell, no empty placeholder).
**Expected:** 2-cell row; no "Bedrooms: -" or "Rooms: -" element visible.
**Why human:** Test 2/3 prove key-string absence but physical confirmation eliminates any residual whitespace or ghost-layout concern.

#### 5. RU Locale End-to-End

**Test:** Set device to Russian locale. Verify all 4 surfaces show Russian labels: PropertyCard (Спальни/Ванные), HospitalityCard (Ванные in fragment), PropertyDetailsScreen residential (Спальни/Ванные), PropertyDetailsScreen hospitality (Комнаты/Ванные).
**Expected:** All new specs-row label strings render in Cyrillic. No raw English strings visible on any Phase-8 surface.
**Why human:** t-mock convention means automated tests never see resolved locale strings; only physical device shows real EN/RU rendering.

### Gaps Summary

No technical gaps identified. All 5 must-have truths verified. All 5 DISP requirements satisfied. 20/20 Phase-8 tests pass. KBD-02 invariant held. i18n parity clean.

The phase status is `human_needed` (not `passed`) because 5 human verification items remain — these cover visual rendering, locale string display, and the hospitality gate-lift UI appearance, all of which require physical device QA per the project's M1 QA bar.

**Orchestrator-authorized action:** `PropertyCard.specChip.test.tsx` was removed by the orchestrator in commit `bc5e790` as it pinned the now-removed defensive fallback paths (D-03/D-04 supersession). The new `PropertyCard.test.tsx` is its canonical replacement per plan 08-02 SUMMARY deviation note and the prompt context. This is not a gap.

---

_Verified: 2026-05-25T21:00:00Z_
_Verifier: Claude (gsd-verifier)_

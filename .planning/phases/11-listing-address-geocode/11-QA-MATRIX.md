---
phase: 11-listing-address-geocode
plan: 06
artifact: QA-MATRIX
status: pending
walk_state: not-started
created: 2026-05-26
walked_date: "[TBD — fill on walk start]"
devices:
  ios:
    model: "iPhone 15 Pro Max"
    os_version: "[TBD — fill at app launch, e.g. iOS 18.4]"
    app_build_sha: "[TBD — copy commit SHA visible at app launch / settings screen]"
  android:
    model: "Moto G XT2513V"
    os_version: "[TBD — fill at app launch, e.g. Android 14]"
    app_build_sha: "[TBD — copy commit SHA visible at app launch / settings screen]"
locales:
  - en
  - ru
backend:
  railway_env: production
  deploy_sha: "[TBD — copy from Railway dashboard before walk]"
  pre_flight_endpoint_ping: "[TBD — see P.1 below]"
walker: "[TBD — human name / identifier]"
approval_text: "[TBD — fill with the exact text typed at the close checkpoint: 'approved' | 'approved with carry-forward: …' | 'blocked: …']"
covers_requirements:
  - GEO-01
  - GEO-02
  - GEO-03
  - GEO-04
  - GEO-05
  - GEO-06
roadmap_success_criteria_mapped:
  SC1_forward_geocode_and_pin_defense: ["1.1", "1.2", "1.3", "1.6", "1.7", "2.1", "2.2"]
  SC2_reverse_geocode_anticlobber: ["1.4", "1.5", "2.3"]
  SC3_round_trip_and_backcompat: ["3.1", "3.2"]
  SC4_kg_kz_uz_viewbox_timeout_lang: ["5.1", "5.2", "5.3", "6.1", "6.2", "1.3", "3.4"]
  SC5_en_ru_parity: ["1.3", "1.7", "3.4"]
  SC6_details_browse_no_m5p1_regression: ["3.1", "3.2", "3.5", "3.6", "3.7"]
documented_race_cells:
  - "2.7 — T-11-18 (drop-pin-then-type within reverse-geocode response window; acknowledged-and-accepted per Plan 11-04 threat register)"
---

# Phase 11 QA Matrix — Listing Address Geocode (Forward + Reverse)

This matrix is the empirical gate that converts Plans 11-01..11-05's passing-tests state into a user-experienced phase delivery. Per memory `gsd-verifier-misses-regressions.md`, the verifier missed 2 CRITICAL regressions in M2 Phase 1 while reporting PASS 15/15 — physical-device walk catches the surfaces that unit tests can't see (animation feel, debounce timing under a real keyboard, RU rendering width, anti-"random pin" behavior under noisy network, etc.).

Status default for every cell is `pending`. The human walker fills in **Result** and **Evidence** on each cell during the walk. Cell 2.7 (T-11-18 race documentation) ends in status `DOCUMENTED` rather than PASS/FAIL — the cell's job is to record the OBSERVED race behavior, not to gate on it.

**Status legend:**

- `PASS` — feature works as specified.
- `FAIL` — feature broken; blocks phase close unless the walker explicitly carries it forward.
- `PARTIAL` — feature works on some condition (e.g. iOS) but not another (Android); document the split.
- `DEFERRED-USER-APPROVED` — walker explicitly accepts the gap for this phase; must include rationale.
- `N/A` — cell not applicable to this device/locale.
- `BLOCKED` — could not walk because of an environment issue (must be resolved before close).
- `DOCUMENTED` — informational-only cell (Cell 2.7); record OBSERVED behavior, not PASS/FAIL.
- `pending` — not walked yet (every cell starts here).

---

## Pre-Requirements

Fill these in BEFORE walking any cell. If any pre-req is unmet, fix the environment and re-fill. Do NOT proceed to cells with `[TBD]` markers in this section.

| # | Item | Value | Notes |
|---|------|-------|-------|
| R.1 | Backend Railway deploy SHA includes Plans 11-01 + 11-02 commits | `[TBD]` | Verify via Railway dashboard → JayTap-services → latest deploy. Plan 11-01 SHAs: `5b42e09`, `a479c1a`, `cc1052a`, `9b77ae6`. Plan 11-02 SHAs: `b4bfb9e`, `86b5240`. |
| R.2 | iOS app build SHA includes Plans 11-03 + 11-04 + 11-05 RN client commits | `[TBD]` | RN client final phase commit at this checkpoint: `c751a90`. Verify via app's settings screen build line OR Xcode-installed debug build SHA. |
| R.3 | Android app build SHA includes Plans 11-03 + 11-04 + 11-05 RN client commits | `[TBD]` | Same SHA as iOS if built from same branch. |
| R.4 | Pre-Phase-11 test listing exists in Mongo (no `location.address` field) | `[TBD — listing id]` | Verify via Mongo Compass / Atlas: `db.listings.findOne({ 'location.address': { $exists: false }, status: 'approved' })`. Record the listing ID for Cell 3.2 / 2.7-baseline reference. |
| R.5 | Known KG test address: "100 Manas Street, Bishkek" | OK | Used by cells 1.2, 1.6, 3.1, 5.3. |
| R.6 | Known KZ test address: "Abay 100, Almaty" | OK | Used by cell 5.1. |
| R.7 | Known UZ test address: "Amir Temur 5, Tashkent" | OK | Used by cell 5.2. |
| R.8 | Known-bad string: "zzzzzz-not-a-real-place" (or "gibberish-asdfasdf") | OK | Used by cells 2.1, 2.2. |
| R.9 | Both devices charged ≥ 30%, Wi-Fi reachable to Railway | `[TBD]` | Verify with P.1 ping. |
| R.10 | A landlord-capable Firebase account on both devices (verified `userType: landlord` in Mongo) | `[TBD — landlord uid]` | Needed for the `requireListingCapability` auth gate on `POST /api/locations/geocode` + `/reverse-geocode`. |

## Pre-Flight Health Checks

| # | Check | Expected | Result | Evidence |
|---|-------|----------|--------|----------|
| P.1 | Railway live route ping: `curl -s -X POST https://jaytap-services-production.up.railway.app/api/locations/geocode -H "Content-Type: application/json" -d '{}' -w '\nHTTP:%{http_code}\n'` | HTTP 401 (no Bearer) OR HTTP 400 with `{"code":"ADDRESS_REQUIRED"}` — both confirm route is wired | pending | `[TBD]` |
| P.2 | App launch on iPhone 15 Pro Max | No crash; lands on Home screen; bottom tabs visible | pending | `[TBD]` |
| P.3 | App launch on Moto G XT2513V | No crash; lands on Home screen; bottom tabs visible | pending | `[TBD]` |
| P.4 | Language toggle works (EN → RU → EN on iOS) | All baseline UI strings flip; no crash on toggle | pending | `[TBD]` |

---

## Section 1 — Golden-Path Cells (walk-and-confirm; mass disposition NOT allowed)

Per M3 RETROSPECTIVE.md lesson 4: golden-path cells must be walked literally on both devices, not extrapolated.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 1.1 | iPhone | EN | Create Listing → Step 1: dealType=sale + propertyType=apartment → Step 2 → select `city=Bishkek` → toggle "Show exact address" ON | Address input appears below toggle with placeholder "e.g. 100 Manas Avenue, apt 5" (or near-equivalent) | pending | `[TBD]` |
| 1.2 | iPhone | EN | (continuing 1.1) Type "100 Manas Street" → pause 1 second | Spinner appears next to / under input within ~300ms after typing pause; spinner disappears within ~2s; pin moves on map to resolved location; input value updates to canonical Nominatim displayName | pending | `[TBD]` |
| 1.3 | iPhone | RU | Re-walk cells 1.1 + 1.2 with app language toggled to RU | Placeholder shows "напр. проспект Манаса 100, кв 5"; loading hint shows "Поиск адреса…"; success path identical; canonical displayName comes back in Russian (Cyrillic) | pending | `[TBD]` |
| 1.4 | iPhone | EN | Fresh Step 2 with city=Bishkek selected, address input EMPTY → tap on map to drop pin (do NOT type address) | Pin drops at tap location within ~1s; address input AUTO-FILLS with reverse-geocoded displayName | pending | `[TBD]` |
| 1.5 | iPhone | EN | Fresh Step 2 → drop pin first (captures address X via reverse) → THEN type "Erkindik 5" in the input → wait | Spinner appears; on success: pin re-moves to Erkindik 5 AND input shows canonical Erkindik 5 displayName. The reverse-filled address is OVERWRITTEN by the forward result (typed text wins over reverse text). | pending | `[TBD]` |
| 1.6 | Android (Moto G) | EN | Re-walk cells 1.1 + 1.2 on Android | Same behavior as iOS; no platform-specific glitch (no Android-only keyboard cover-up, no map gesture conflict) | pending | `[TBD]` |
| 1.7 | Android (Moto G) | RU | Re-walk cell 1.3 on Android | Same RU strings + same success path | pending | `[TBD]` |

## Section 2 — Anti-Regression Cells (defense-in-depth verification; includes T-11-18 documented race)

These cells verify the CONTEXT.md decision-9 anti-"random pin" defense layers AND the documented race cell.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 2.1 | iPhone | EN | Step 2 → drop a known pin first (record its location); then type "zzzzzz-not-a-real-place" → wait | Spinner → red "Couldn't find that address — drop a pin instead" inline error label appears under input; **pin DOES NOT MOVE from its previous location**; typed gibberish remains in input. (Anti-"random pin" defense empirical confirmation.) | pending | `[TBD]` |
| 2.2 | Android (Moto G) | EN | Re-walk cell 2.1 on Android | Same behavior; pin static, error label visible | pending | `[TBD]` |
| 2.3 | iPhone | EN | Step 2 → type "100 Manas" → wait for forward success (pin moves, input has displayName) → drop pin at a DIFFERENT location | Input is **NOT overwritten** by reverse-geocode (the empty-text guard fires because address was non-empty post-forward); pin moves to the new tap location but address text preserved. | pending | `[TBD]` |
| 2.4 | iPhone | EN | Step 1: dealType=sale + propertyType=hotel → Step 2 | "Show exact address" toggle is HIDDEN (hotel forces `showExactAddress=true`); address input is VISIBLE WITHOUT toggling. (11-CONTEXT.md decision 9 — hospitality always shows the input.) | pending | `[TBD]` |
| 2.5 | iPhone | EN | Step 1: dealType=sale + propertyType=apartment → Step 2 → DO NOT toggle "Show exact address" | Address input is NOT visible (gated on toggle for non-hospitality). | pending | `[TBD]` |
| 2.6 | iPhone | EN | Step 1: sale + apartment → Step 2: fill city + district + drop pin → DO NOT touch address input (leave it empty / hidden) → advance to Step 3+ → submit listing | Listing creates successfully; backend returns 2xx; no validation error about missing address. (Address is OPTIONAL per 11-CONTEXT.md decision 8.) | pending | `[TBD]` |
| 2.7 | iPhone | EN | **T-11-18 documented race** — On iPhone EN, drop pin on map → within ~1 second (before the reverse-geocode response comes back), type 1 character into the address field → wait for the reverse-geocode response | Reverse-geocode is ALLOWED to overwrite the just-typed character per the anti-clobber guard reading a stale `values.location.address` snapshot in the `useCallback` closure (acknowledged-and-accepted race per Plan 11-04 threat register entry T-11-18). **Document the actual observed behavior in the Evidence column**: which one won? did the input flash? was there a perceptible "fight"? Status stays `DOCUMENTED` (not PASS/FAIL) since the race is acknowledged-and-accepted upstream. Only flip to FAIL if the app CRASHES or the pin moves unexpectedly. If the observed UX is significantly worse than the threat-register prediction (e.g. visible flicker users would notice / file bug about), escalate to a Plan 11-07 hotfix; otherwise record + close. | DOCUMENTED | `[TBD — fill in OBSERVED behavior: what won, any flicker, repro reliability]` |

## Section 3 — Round-Trip / Display Cells

These cells verify the read-path precedence flips from Plan 11-05 across details + browse surfaces.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 3.1 | iPhone | EN | Submit a fresh listing with `location.address = "100 Manas Street, Bishkek, KG"` (from cells 1.1+1.2) → reopen PropertyDetailsScreen | Address line shows the FULL Nominatim displayName (NOT just "Bishkek, Bishkek" district+city synthesis). Layout matches M5 Phase 1 redesign (HeaderInfoCard pill row + title + address row + red divider + map). | pending | `[TBD]` |
| 3.2 | iPhone | EN | Open the pre-Phase-11 listing identified in pre-req R.4 (no `location.address`) — find via listings list / search | Address line shows district + city slug synthesis as before (fallback path); zero visual regression from M5 Phase 1 baseline; no crash. | pending | `[TBD]` |
| 3.3 | iPhone | EN | Open a Phase-11 listing → tap Share button | Share sheet message body includes the Nominatim displayName line (not the synthesized fallback). | pending | `[TBD]` |
| 3.4 | iPhone | RU | Re-walk cell 3.1 with RU locale + an RU-typed address (e.g. "Манас 100, Бишкек") | Address shown in Russian (Nominatim Cyrillic when `Accept-Language: ru` propagates). | pending | `[TBD]` |
| 3.5 | Android (Moto G) | EN | Re-walk cell 3.1 on Android | Same behavior; same layout | pending | `[TBD]` |
| 3.6 | iPhone | EN | Open a Phase-11 hotel/hostel listing FROM THE HORIZONTAL HOSPITALITY STRIP on HomeScreen → inspect the HospitalityCard's visible address row → tap Share | Card body's address row shows full Nominatim displayName; share message includes the displayName (per Plan 11-05 Task 3 HospitalityCard precedence flip). | pending | `[TBD]` |
| 3.7 | iPhone | EN | Open a Phase-11 listing FROM SEARCH RESULTS or FAVORITES (PropertyCard surface) → tap Share | Share message includes the Nominatim displayName (per Plan 11-05 PropertyCard `addressDisplay` const precedence flip). **Note**: the Row 3 MapPin label intentionally stays district + city (geographic-context label parallel to MapPreviewCard — documented in PropertyCard.tsx audit comment). Both behaviors are correct. | pending | `[TBD]` |

## Section 4 — Edit-Mode Cells (owner + moderator round-trip)

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 4.1 | iPhone | EN | As listing owner, open a Phase-11 listing → tap Edit → navigate to Step 2 | Address input is pre-populated with the persisted displayName; "Show exact address" toggle reflects `showExactAddress = true` | pending | `[TBD]` |
| 4.2 | iPhone | EN | (continuing 4.1) Modify address only ("100 Manas Street" → "101 Manas Street") → wait for geocode → submit edit | PUT succeeds (2xx); reopen detail screen → updated address visible | pending | `[TBD]` |
| 4.3 | iPhone | EN | As moderator (edit-on-behalf), open a Phase-11 listing → navigate to Step 2 | Same pre-populated input behavior; mod can edit + submit; no role-gate friction | pending | `[TBD]` |

## Section 5 — Geographic-Scope Cells (KG / KZ / UZ viewbox bias verification)

These cells empirically confirm the `countrycodes=kg,kz,uz` + `viewbox` from selected-city centroid defense layers.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 5.1 | iPhone | EN | Step 2 → select `city=Almaty` (KZ) → type "Abay 100" → wait | Pin lands on an Almaty location (viewbox bias from Almaty centroid prevents Bishkek same-name match). | pending | `[TBD]` |
| 5.2 | iPhone | EN | Step 2 → select `city=Tashkent` (UZ) → type "Amir Temur 5" → wait | Pin lands on a Tashkent location. | pending | `[TBD]` |
| 5.3 | iPhone | EN | Step 2 → DO NOT select a city → type "100 Manas Street" → wait | Backend route still succeeds (no `citySlug` → no viewbox sent → `countrycodes=kg,kz,uz` still narrows to the three countries); pin lands on a KG/KZ/UZ location. (Plan 11-02 Test 8 graceful-degradation behavior.) | pending | `[TBD]` |

## Section 6 — Timeout / Failure Cells

These cells empirically confirm the 5s AbortController from Plan 11-01 + null-on-failure behavior of the geocodeService.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 6.1 | iPhone | EN | Step 2 → enable Airplane Mode → type valid address ("100 Manas") → wait | Spinner → "Couldn't find that address" label (axios fails or AbortController fires → null result → notFound state); pin stays static; no crash. | pending | `[TBD]` |
| 6.2 | iPhone | EN | Step 2 → start typing → quickly disable Wi-Fi mid-flight (simulates backend 5s AbortController firing on Nominatim slowness) | Same notFound label; no spinner stuck forever (≤ ~6s to settle). | pending | `[TBD]` |

## Section 7 — KBD-02 Keyboard Regression Cells

Per memory `m1-keyboard-kbd-02-invariants.md`: `keyboardVerticalOffset` is grep-banned in `src/`. Plan 11-04 confirmed grep gate = 0. Empirically verify on device.

| Cell | Device | Locale | Action | Expected | Result | Evidence |
|------|--------|--------|--------|----------|--------|----------|
| 7.1 | iPhone | EN | Step 2 → tap address input → keyboard appears | Keyboard does NOT cover the input; the cursor / current typing position is visible above the keyboard. (M1 KBD-02 invariant.) | pending | `[TBD]` |
| 7.2 | Android (Moto G) | EN | Re-walk cell 7.1 on Android | Same KBD-02 behavior; input visible above software keyboard. | pending | `[TBD]` |

---

## Summary

Fill these counts AFTER walking. Counts must sum to total cells (excluding pre-flight P.* rows, but including Cell 2.7's `DOCUMENTED` status).

- **Total cells walked:** XX (matrix scaffold has 30 cells: 7 + 7 + 7 + 3 + 3 + 2 + 2)
- **PASS:** XX
- **FAIL:** XX (list cell IDs if any; FAIL count > 0 BLOCKS phase close unless walker carries them forward)
- **PARTIAL:** XX
- **DEFERRED-USER-APPROVED:** XX (must list each cell + rationale)
- **DOCUMENTED:** XX (minimum 1 expected — Cell 2.7 T-11-18 race documentation)
- **N/A:** XX
- **BLOCKED:** XX (must be 0 before close)
- **pending:** XX (must be 0 before close; every cell must be walked or explicitly dispositioned)

### Mass-Disposition Notes

Per M3 RETROSPECTIVE.md lesson 4: golden-path cells (Section 1) MUST walk-and-confirm. Anti-regression cells (Section 2, including Cell 2.7) MUST walk-and-confirm. Feature-surface cells (Sections 3–7) MAY use mass disposition (single-platform walk inferring the other platform) provided no defect was surfaced on the walked platform. If mass disposition is used, note it in the Evidence column ("mass-disposition from cell X.Y on iPhone").

## Disposition Checklist

- [ ] All FAIL cells either (a) carried forward as documented M6 backlog items WITH walker approval, OR (b) fixed in a Plan 11-07 follow-up within this phase.
- [ ] All BLOCKED cells resolved.
- [ ] All `pending` cells walked (or explicitly N/A'd).
- [ ] Cell 2.7 (T-11-18 documented race) has empirical observation recorded in Evidence column.
- [ ] If Cell 2.7 observed UX is "much worse than the threat-register prediction" (visible flicker, unreliable input — i.e., something users would notice and file a bug about), escalate to Plan 11-07 hotfix BEFORE close.
- [ ] Walker reviewed and approved phase close.

## Carry-Forward Items (M6 backlog seeds, if any)

(Walker appends here at close time with one-line items. Format: `- [M6 backlog] Cell X.Y: <one-line description> — rationale: <why deferred>`)

## Human Approval

**Walker signature:** `[TBD — walker name + date]`

**Approval text typed at the close checkpoint** (exact text): `[TBD — "approved" OR "approved with carry-forward: <items>" OR "blocked: <reason>"]`

**Plan-11-06 SUMMARY.md follow-up:** The orchestrator will create `11-06-SUMMARY.md` AFTER this approval is recorded. This file is the empirical source for the SUMMARY's PASS/FAIL/DOCUMENTED tally and Cell 2.7 race observation.

---

*Scaffold created by Plan 11-06 executor agent (worktree `worktree-agent-a5be918f87a7cd6fd`). Awaiting physical-device walk by human + approval signal before phase close.*

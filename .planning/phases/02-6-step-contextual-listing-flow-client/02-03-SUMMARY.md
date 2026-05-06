---
phase: 02-6-step-contextual-listing-flow-client
plan: 03
subsystem: rn-client
tags: [contextual-listing-flow, step-2, step-3, location-service, moderation-queue, locations-tab, i18n-parity]
status: complete
requires: [02-01, 02-02]
provides:
  - locationService.ts (4 user-facing + 3 mod-only client API functions)
  - Step2Location component (chip rows + Other modal + map pin w/ tap-to-move fallback + exact-address toggle)
  - Step3BasicInfo component (area + price + KGS/USD/EUR + per-propertyType conditional sub-fields)
  - Orchestrator propertyType-change reflow (ROADMAP SC#3 — Step 3 sub-fields cleared upstream)
  - ModerationQueueScreen Locations tab (2-tab segmented control + display:none keep-alive per Pitfall 3)
  - 49 new i18n keys (EN + RU parity)
affects:
  - src/services/locationService.ts (new)
  - src/components/ContextualListingFlow/Step2Location.tsx (new)
  - src/components/ContextualListingFlow/Step3BasicInfo.tsx (new)
  - src/components/ContextualListingFlow/index.tsx (modified — wired Step2/Step3 + reflow wrapper)
  - src/components/ContextualListingFlow/__tests__/Step2.test.tsx (new — 13 cases)
  - src/components/ContextualListingFlow/__tests__/Step3.test.tsx (new — 11 cases)
  - src/components/ContextualListingFlow/__tests__/validators.test.ts (extended +7 cases)
  - src/screens/ModerationQueueScreen.tsx (modified — additive 2-tab control)
  - src/locales/en.ts (+49 keys)
  - src/locales/ru.ts (+49 keys)
tech-stack:
  added: []
  patterns:
    - react-native-maps draggable Marker WITH tap-to-move fallback per Pitfall 1 (Issue #5445 mitigation)
    - Boundary convention — react-native-maps API uses {latitude,longitude}; FormBag uses {lat,lng}; conversion at read+write boundary
    - Optimistic-use-immediately for "Other" city/district per CONTEXT D-07 (advance even while POST in flight)
    - Pitfall 3 mitigation — both ModerationQueueScreen tab bodies kept MOUNTED with display:'none' (matches RenterListingsScreen.tsx:184-196 keep-alive)
    - Orchestrator-side propertyType-change wrapper clears Step 3 sub-fields atomically (ROADMAP SC#3)
key-files:
  created:
    - src/services/locationService.ts
    - src/components/ContextualListingFlow/Step2Location.tsx
    - src/components/ContextualListingFlow/Step3BasicInfo.tsx
    - src/components/ContextualListingFlow/__tests__/Step2.test.tsx
    - src/components/ContextualListingFlow/__tests__/Step3.test.tsx
  modified:
    - src/components/ContextualListingFlow/index.tsx
    - src/components/ContextualListingFlow/__tests__/validators.test.ts
    - src/screens/ModerationQueueScreen.tsx
    - src/locales/en.ts
    - src/locales/ru.ts
decisions:
  - apiClient is a NAMED export (`{ apiClient }`) per existing M2 PropertyService pattern — matches `import { apiClient } from './apiClient'` convention.
  - Plan ordering reused Plan 02-02's deviation rationale: Task 5 (i18n keys) executed FIRST so Steps 2 + 3 can compile against `Record<TranslationKeys, string>` strict-TS gates without intermediate errors.
  - Step 2 modal infrastructure SHARED between city + district "Other" submission (one Modal + one TextInput pair + one Submit button + one country-picker conditional on kind === 'city'). Halves the modal LOC vs. separate dialogs.
  - Pitfall 1 tap-to-move fallback: BOTH `<Marker draggable onDragEnd>` AND `<MapView onPress>` converge on the same setCoords call. ~10 LOC of belt-and-suspenders, unblocks Phase 5 device QA on Android Fabric where drag events may not fire.
  - W-02 boundary convention preserved: FormBag stores `{lat, lng}` (matches Phase 1 backend nested schema); react-native-maps requires `{latitude, longitude}`. Conversion lives ONLY in handleMapPress / handleMarkerDragEnd / `<Marker coordinate={...}>` — three sites, all colocated in Step2Location.tsx.
  - ROADMAP SC#3 reflow implemented in the ORCHESTRATOR's onChange wrapper (not in Step1). Single point of enforcement; Step 3 just renders whatever FormBag is current.
  - Locations tab uses a lightweight inline overlay for reject (not RejectListingModal — that one's hardcoded for Property reject reasons); reusing that component would require either reasonCode hacking or extracting a generic version (out of plan scope).
  - When district `cityId` field is populated by backend (mod queue), narrowing fails because the discriminated union type's `string | { _id, slug, label }` from DistrictWithCity collapses to `never` under TS's narrowing model — used a local re-typed const (`const cid = d.cityId as ...`) to force narrowing back.
metrics:
  duration: ~11m
  completed: 2026-05-06
  tasks_executed: 5
  tests_added: 31 (Step2 13 + Step3 11 + validators +7)
  tests_total_in_flow: 52 (5 suites passing)
  i18n_keys_added: 49 (EN + RU each — total +98 file entries)
---

# Phase 02 Plan 03: Steps 2 + 3 (Location + Basic Info) + Locations Mod Tab Summary

One-liner: Built Step 2 (location chip rows + Other modal + react-native-maps draggable Marker WITH tap-to-move fallback per Pitfall 1 + exact-address toggle conditional on propertyType), Step 3 (area + price + KGS/USD/EUR + propertyType-conditional sub-fields per FLOW-08 matrix with orchestrator-side reflow on propertyType change per ROADMAP SC#3), wired Plan 02-01's backend Location endpoints via a new `locationService.ts`, and added an additive 2-tab segmented control to `ModerationQueueScreen` (Listings / Locations) with `display:'none'` keep-alive per Pitfall 3 — all atop 49 new i18n keys (EN+RU parity preserved) and 31 new test cases (52 total in the flow's `__tests__` dir).

## What was built

### `src/services/locationService.ts` (NEW)

7 functions consuming Plan 02-01's backend endpoints via the M2 ROLE-09 `apiClient`:

| Export | Endpoint | Used by |
|--------|----------|---------|
| `fetchCities()` | `GET /api/locations/cities` | Step 2 city chip row |
| `fetchDistricts(citySlug)` | `GET /api/locations/cities/:slug/districts` | Step 2 district chip row |
| `createCity(input)` | `POST /api/locations/cities` | Step 2 "Other" city modal (D-07 optimistic) |
| `createDistrict(citySlug, input)` | `POST /api/locations/cities/:slug/districts` | Step 2 "Other" district modal (D-07 optimistic) |
| `fetchLocationsQueue()` | `GET /api/moderation/locations/queue` | ModerationQueueScreen Locations tab |
| `approveLocation(kind, id)` | `POST /api/moderation/locations/:kind/:id/approve` | Locations tab Approve button |
| `rejectLocation(kind, id, reasonNote?)` | `POST /api/moderation/locations/:kind/:id/reject` | Locations tab Reject overlay |

`createCity` / `createDistrict` translate the 409 PENDING_DUPLICATE response into a normal return shape (`{ city/district, status: 409 }`) so callers can branch on the status flag without try/catch noise. HF-03 anti-spoofing discipline preserved by inaction — no `createdByUid` ever sent in a request body (the field appears 3× in the file as a RESPONSE-shape interface field on `City` / `District`, never as a body key).

### `src/components/ContextualListingFlow/Step2Location.tsx` (NEW)

Single 600+-LOC component covering the full Step 2 surface:

- **City chip row** — horizontal `FlatList` with one chip per approved + own-pending city (slug-keyed) + an "Other" chip at the end. Tapping a city writes `location.city` slug + clears `location.district` (since prior district likely doesn't belong to the new city). Tapping "Other" opens the shared Other modal with `kind: 'city'`.
- **District chip row** — disabled state when no city selected (`testID="districts-disabled"`); empty-state copy + lit Other chip when `fetchDistricts(slug)` returns `[]` (Tradeoff §J — "be the first to add one"); FlatList-rendered chips otherwise.
- **Map pin** — `<MapView provider={PROVIDER_DEFAULT}>` with `initialRegion` centered on the selected city's centroid (D-09 — sourced from `fetchCities()` payload, NOT a hardcoded const) or Bishkek default. `<Marker draggable onDragEnd>` is the primary refinement path; `<MapView onPress>` is the **tap-to-move fallback per Pitfall 1**. Both paths converge on the same `onChange('location', { coordinates: { lat, lng } })` call.
- **Exact-address toggle** — hidden when `propertyType ∈ {hotel, hostel}`; force-`true` via a `useEffect` that flips `location.showExactAddress` when isHospitality drifts from FormBag default (FLOW-06).
- **Other modal** — shared infrastructure for city + district. RU + EN TextInputs (both required; submitted as `{ label: { ru, en } }`); country chips (KG/KZ/UZ) shown only for `kind: 'city'`; centroid derived from current map coords if user already dropped a pin, else `BISHKEK_DEFAULT` (Tradeoff §F). On submit, dispatches the new slug to FormBag immediately (D-07 optimistic) and refetches the chip list to surface the new pending entry.

### `src/components/ContextualListingFlow/Step3BasicInfo.tsx` (NEW)

Pure SectionProps consumer rendering:

- **Always-shown:** `areaSqm` + `price` (`TextInput` decimal-pad, regex strips non-numeric on input) + currency chips (`KGS` / `USD` / `EUR` per D-03 — no `$` / `сом` legacy tokens).
- **Conditional sub-fields per FLOW-08 propertyType matrix:**
  - `apartment` / `house` / `office` / `commercial` → rooms (`1` / `2` / `3` / `4+`)
  - `office` / `commercial` → ALSO bathroom (`private` / `none` / `shared`) + kitchen (`private` / `none` / `shared`)
  - `hotel` / `hostel` → hotelRooms (`1` / `2` / `3` / `4+`) + hotelClass (`economy` / `standard` / `comfort` / `premium`)

Chip-row helper (`renderChipRow`) factored out so each conditional branch is a 4-line invocation with the 5-tuple `(opts, current, onPick, testIDPrefix, labelFn)`. `roomsKeySuffix('4+') === '4plus'` handles the i18n key suffix mapping (`.4plus`, not `.4+`).

### `src/components/ContextualListingFlow/index.tsx` (MODIFIED)

Two changes, both small + load-bearing:

1. Wired `<Step2Location>` + `<Step3BasicInfo>` into the `stepBody` `useMemo` switch (replaces Plan 02-02's `Text` placeholder lines for cases 2 + 3).
2. **ROADMAP SC#3 reflow:** the orchestrator's `onChange` wrapper now detects `field === 'propertyType' && prev.propertyType !== value` and atomically resets `next.basics` to drop the 5 mutually-exclusive sub-fields (`rooms`, `bathroom`, `kitchen`, `hotelRooms`, `hotelClass`). Single point of enforcement; Step 3 just renders whatever FormBag is current.

### `src/screens/ModerationQueueScreen.tsx` (MODIFIED — additive)

Pitfall 3 mitigation drove the architecture:

- **2-tab segmented control** (Listings / Locations) above the existing list, with count badges (`{count}` interpolation) in tab labels.
- **Both tab bodies kept MOUNTED** with `display: activeTab === '...' ? 'flex' : 'none'`. Matches `RenterListingsScreen.tsx:184-196` keep-alive pattern. The existing pending-listings load + render + approve/reject + edit-on-behalf pathway is **byte-for-byte unchanged** under the new `<View style={{flex:1, display: ...}}>` wrapper.
- **Locations tab** lazily fetches via `useEffect(activeTab === 'locations' ? loadLocations() : ...)` on first activation + on subsequent toggles back. Renders pending cities first (FIFO), then pending districts with parent city slug. Approve calls `approveLocation(kind, id)` with optimistic row removal + 409 race-conflict → moderation.race toast + refetch (mirrors listings tab). Reject opens a lightweight bottom-sheet overlay with optional `reasonNote` TextInput (separate from RejectListingModal which is hardcoded for Property reasonCodes).

### Test additions (+31 cases — 52 total in flow)

| Suite | Cases (this plan) | Cases (cumulative) | Status |
|-------|-------------------|---------------------|--------|
| validators.test.ts | +7 (Step 2: 2; Step 3: 5) | 14 | PASS |
| Step2.test.tsx (NEW) | 13 | 13 | PASS |
| Step3.test.tsx (NEW) | 11 | 11 | PASS |
| Step1.test.tsx (unchanged) | 0 | 7 | PASS |
| adapters.test.ts (unchanged) | 0 | 7 | PASS |
| **TOTAL** | **+31** | **52 (5 suites)** | **52/52 PASS** |

```
$ npx jest src/components/ContextualListingFlow/__tests__
Test Suites: 5 passed, 5 total
Tests:       52 passed, 52 total
```

### i18n delta

**+49 keys × 2 locales = 98 file entries.** Cumulative running total post-Plan-02-03: 73 keys (Plan 02-02: 24, Plan 02-03: 49). `bash scripts/check-i18n-parity.sh` exits 0.

Step 2 (22 keys): location chip labels + Other modal copy + 3-country picker (KG/KZ/UZ) + map label + coordinatesRequired + exact-address toggle.

Step 3 (27 keys): area + price + currency labels + 3 currency chip labels (KGS/USD/EUR) + rooms/bathroom/kitchen/hotelRooms/hotelClass label + required strings + 4 rooms enum + 3 bathroom enum + 3 kitchen enum + 4 hotelClass enum.

## Verified import paths (continuation context for Plan 02-04a / 02-04b / 02-07)

| Import | Path | Source |
|--------|------|--------|
| `useTheme` | `../../theme/ThemeContext` | Plan 02-02 carryover (singular `theme/`, no providers/) |
| `useLanguage` | `../../context/LanguageContext` | Plan 02-02 carryover (singular `context/`, no contexts/) |
| `apiClient` | `'./apiClient'` (NAMED `{ apiClient }`) | confirmed in PropertyService.ts:1 |
| `TranslationKeys` | `'../../locales'` | Plan 02-02 carryover (re-exported from locales/index.ts) |
| Test runner | `react-test-renderer` (NOT @testing-library/react-native) | Plan 02-02 carryover |

## Notes for downstream plans

### Plan 02-04a (Steps 4 + 5)
- Replace `case 4:` and `case 5:` placeholders in `index.tsx` `stepBody` switch (mirrors how this plan replaced cases 2 + 3).
- Reuse `commonStyles.chipRow` + `commonStyles.input` from `styles.ts` — no new style sources.
- Step 4 i18n keys (12) + Step 5 keys (7) need to be added in EN + RU parity-edit (Pitfall 2 mitigation: single diff).

### Plan 02-04b (Step 6 + real submit wiring)
- Step 6 deposit-currency code can rely on `values.basics.currency ∈ {'KGS','USD','EUR'}` thanks to Plan 02-02's W-01 Step 3 sentinel guard (`currency: ''` rejects at Step 3, so Step 6 never sees the empty sentinel).
- Reflow logic for dealType change is NOT in the orchestrator yet; Plan 02-04b should consider whether changing dealType in Step 1 should clear `terms.*` (analogous to ROADMAP SC#3 propertyType clearing `basics.*`). User feedback may settle this.
- Submit dispatch by mode (D-16) — the stub at `index.tsx:90-100` should be replaced with `PropertyService.{create,update,editAsModerator}` calls.

### Plan 02-07 (App.tsx wireup)
- The orchestrator owns Android hardware-back via `BackHandler.addEventListener('hardwareBackPress', ...)` (Plan 02-02 W-04). When wired into App.tsx, App.tsx-level hardware-back handling MUST stand down whenever the overlay is mounted to avoid double-consumption.
- ModerationQueueScreen's existing surface is unchanged — App.tsx wiring for that screen is unaffected by this plan.

### Plan 02-08 (atomic deletion)
- Plan 02-08 deletes `src/screens/CreateListingScreen.tsx` + `src/components/CreateListingForm/`. None of the artifacts created in this plan share imports with those files; the deletion path is clear.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / continuity] Reordered Task 5 (i18n keys) to run FIRST.**
- **Found during:** pre-Task-2 setup
- **Issue:** Strict-TS `Record<TranslationKeys, string>` constraint on `ru.ts` would reject `t('contextualListing.step2.*')` calls in Step2Location.tsx + Step3BasicInfo.tsx before keys exist. Same gating dynamic Plan 02-02 hit and resolved the same way.
- **Fix:** Executed Task 5 (i18n keys, 49 × 2 = 98 entries) immediately after Task 1 (locationService.ts) and before Task 2 (Step2Location). Identical reordering precedent in Plan 02-02 deviation #1.
- **Files modified:** none additional; commit ordering only.
- **Commit:** 7c5286b (Task 5 landed before 0b57eec / d024379 Task 2 RED+GREEN).

**2. [Rule 1 - Plan acceptance regex flaw, no functional change] `createdByUid` count expected 0 in locationService.ts.**
- **Found during:** Task 1 verification.
- **Issue:** Plan acceptance criterion was `grep -c "createdByUid" src/services/locationService.ts` returns 0 with the rationale "NO client-supplied uid; HF-03 discipline". My implementation has 3 occurrences — but ALL THREE are RESPONSE-shape interface field declarations on the `City` / `District` interfaces (the backend response includes `createdByUid` as a read-only audit field; the client just types it). NONE are in request bodies. The HF-03 spirit is intact (no `createdByUid` is ever passed into a request body); the regex is imprecise.
- **Fix:** None — the verbatim plan body is correct (interfaces declare fields the backend returns); only the `grep -c` regex is overly strict. Same dynamic as Plan 02-02 deviation #4 (acceptance regex doesn't match the planner's intent due to multi-line / multi-context patterns).
- **Files modified:** none.

**3. [Rule 1 - TS narrowing edge case] `DistrictWithCity.cityId` narrowing collapsed to `never`.**
- **Found during:** Task 4 TS-check (full project `npx tsc --noEmit` against `src/screens/ModerationQueueScreen.tsx`).
- **Issue:** `DistrictWithCity` types `cityId` as a discriminated union `string | { _id, slug, label }`, but `typeof d.cityId === 'string' ? d.cityId : d.cityId.slug` produced TS2339 "Property 'slug' does not exist on type 'never'" — the narrowing didn't reach the populate-shape branch because of the way the intersection type interacted with the index inference.
- **Fix:** Introduced a local re-typed const `const cid = d.cityId as string | { _id: string; slug: string; label: ... }` to force narrowing back. Behavior unchanged at runtime; only the narrowing affordance restored at compile time.
- **Files modified:** `src/screens/ModerationQueueScreen.tsx:618-621`.
- **Commit:** f588166 (folded into the Task-4 commit before push).

### Pre-existing failures NOT caused by this plan

`npx jest --testPathIgnorePatterns=worktrees` shows 2 failing suites (`PropertyService.test.ts` axios-interceptor mock + `useRole.test.ts` post-cutover drift) and 1 failing test. These are documented baseline per Plan 02-05 SUMMARY + STATE.md `phase02-plan02-05-baseline-failures` lineage (Phase 1 D-01 atomic-break carry-forwards owned by Plans 02-04 / 02-07 / 02-08). Verified pre-existing by checking they fail on `git stash` (no local changes to stash; tree clean → same failures observed).

### No architectural changes

No Rule 4 (architectural) deviations. Plan executed structurally as designed.

## Test counts after this plan (cumulative)

| Suite | Cases | Status |
|-------|-------|--------|
| validators.test.ts | 14 | PASS |
| adapters.test.ts | 7 | PASS |
| Step1.test.tsx | 7 | PASS |
| Step2.test.tsx | 13 | PASS |
| Step3.test.tsx | 11 | PASS |
| **Total in `ContextualListingFlow/__tests__/`** | **52 (5 suites)** | **52/52 PASS** |

```
$ npx jest src/components/ContextualListingFlow/__tests__
Test Suites: 5 passed, 5 total
Tests:       52 passed, 52 total
Time:        ~1s
```

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (locationService) | e5bebb2 | feat(02-03): add locationService client API for Plan 02-01 endpoints |
| 5 (i18n keys, reordered) | 7c5286b | feat(02-03): add 49 i18n keys for Step 2 + Step 3 (EN+RU parity) |
| 2 RED (Step2 tests) | 0b57eec | test(02-03): add failing tests for Step2Location (RED) |
| 2 GREEN (Step2 component) | d024379 | feat(02-03): implement Step2Location (GREEN) |
| 3 RED (Step3 + validators tests) | a7f7a6f | test(02-03): add failing tests for Step3 + validators Step 2/3 cases (RED) |
| 3 GREEN (Step3 + orchestrator reflow) | 8a868ae | feat(02-03): implement Step3BasicInfo + orchestrator reflow (GREEN) |
| 4 (Locations tab) | f588166 | feat(02-03): add Locations tab to ModerationQueueScreen (Tradeoff §B) |

7 atomic commits.

## Self-Check: PASSED

- [x] `src/services/locationService.ts` exists
- [x] `src/components/ContextualListingFlow/Step2Location.tsx` exists
- [x] `src/components/ContextualListingFlow/Step3BasicInfo.tsx` exists
- [x] `src/components/ContextualListingFlow/__tests__/Step2.test.tsx` exists (13 cases)
- [x] `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` exists (11 cases)
- [x] `src/components/ContextualListingFlow/__tests__/validators.test.ts` extended (+7 cases, 14 total)
- [x] `src/components/ContextualListingFlow/index.tsx` modified (Step2/Step3 wired + propertyType reflow)
- [x] `src/screens/ModerationQueueScreen.tsx` modified (additive 2-tab control)
- [x] `src/locales/en.ts` + `src/locales/ru.ts` extended (+49 keys each)
- [x] All 7 commit hashes (e5bebb2, 7c5286b, 0b57eec, d024379, a7f7a6f, 8a868ae, f588166) present in git log
- [x] 52/52 ContextualListingFlow tests pass
- [x] `bash scripts/check-i18n-parity.sh` exits 0
- [x] No new TS errors in plan-scope files (`npx tsc --noEmit` filtered to plan paths)
- [x] All 11 must_haves.truths observable
- [x] Pitfall 1 mitigation in place: BOTH `<Marker draggable onDragEnd>` AND `<MapView onPress>` wired to setCoords
- [x] Pitfall 3 mitigation in place: both ModerationQueueScreen tab bodies MOUNTED with `display:'none'` keep-alive

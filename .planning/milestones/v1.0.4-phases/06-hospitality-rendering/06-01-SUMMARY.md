---
phase: 06-hospitality-rendering
plan: 01
subsystem: types
tags: [foundation, taxonomy, i18n, hospitality, lucide-react-native, formbag]

requires:
  - phase: 04-listing-form-taxonomy-decomposition
    provides: PROPERTY_TYPES + PROPERTY_TYPE_TO_CATEGORY (analog module shape) + FormBag contract
  - phase: 05-listing-form-validation-edit-flow
    provides: validateByCategory + buildPayloadByCategory pure functions + Currency as-const precedent (D-18)

provides:
  - HOSPITALITY_AMENITIES 12-token as-const tuple + HospitalityAmenity union type
  - AMENITY_ICONS Record<HospitalityAmenity, LucideIcon> map
  - Property.rooms? / Property.maxGuests? / Property.amenities? top-level fields (NOT inside specs)
  - FormBag.amenities narrowed from string[] to HospitalityAmenity[]
  - 17 new EN + 17 new RU translation keys in parity (12 amenity.* + createListing.amenitiesRequired + home.hospitalitySectionTitle + 2 hospitality.badge.* + hospitality.amenitiesMore)
  - Validator test fixture seeds amenities: ['wifi'] so Plan 02 required-amenity rule does not retroactively fail

affects:
  - 06-02 (validator extension — consumes HOSPITALITY_AMENITIES, createListing.amenitiesRequired, fixture seed)
  - 06-03 (HospitalitySection picker grid — consumes HOSPITALITY_AMENITIES, AMENITY_ICONS, amenity.* labels)
  - 06-04 (HospitalityCard — consumes hospitality.badge.*, hospitality.amenitiesMore, AMENITY_ICONS)
  - 06-05 (HospitalitySection strip on Home/Favorites/Owner — consumes home.hospitalitySectionTitle)
  - 06-06 (PropertyDetailsScreen branch — consumes AMENITY_ICONS, amenity.* labels for detail amenity grid)
  - 06-07 (deletes hospitality.amenitiesPhase6Placeholder once Plan 03 picker replaces consumer)

tech-stack:
  added: []  # No new deps — lucide-react-native@^0.564.0 already in package.json
  patterns:
    - "as-const string-literal union taxonomy module mirrors propertyCategory.ts (named exports, no React imports, no side effects)"
    - "Atomic EN+RU additions in single per-file Edit so check-i18n-parity.sh + Record<TranslationKeys,string> never see asymmetry"

key-files:
  created:
    - src/utils/hospitalityAmenities.ts
    - .planning/phases/06-hospitality-rendering/06-01-SUMMARY.md
  modified:
    - src/types/Property.ts
    - src/components/CreateListingForm/types.ts
    - src/components/CreateListingForm/__tests__/validators.test.ts
    - src/screens/CreateListingScreen.tsx (Rule 3 auto-fix — useState narrowing + onChange cast)
    - src/locales/en.ts
    - src/locales/ru.ts

key-decisions:
  - "Fixture seed amenities: ['wifi'] in hospitalityBase() now (per plan Step B), so Plan 02's amenities.length < 1 rule does not retroactively fail the 9 existing Hospitality assertions when it lands."
  - "Rule 3 auto-fix landed in same commit as FormBag narrowing: CreateListingScreen.tsx useState<string[]> → useState<HospitalityAmenity[]> + onChange cast updated. Anticipated by D-21 in 06-CONTEXT.md but not enumerated in plan tasks; without it tsc blocks downstream work entirely."
  - "property.phoneCall already exists in both en.ts (line 107) and ru.ts (line 109). Net-new key count is 17 per locale (34 total), not 18/36 as the plan worst-cased — recorded for Plan 06's accessibilityLabel task so it can reuse the existing key without re-adding."
  - "Order of new keys in both locale files preserved EXACTLY: amenity.wifi/aircon/.../ensuite (12) → createListing.amenitiesRequired → home.hospitalitySectionTitle → hospitality.badge.hostel/hotel → hospitality.amenitiesMore. Comment headers reference HOSP-05/D-22/D-02/D-09/D-10 for traceability."
  - "hospitality.amenitiesPhase6Placeholder PRESERVED in both files (Plan 07 deletes after Plan 03 picker replaces its consumer at HospitalitySection.tsx:100-102)."

patterns-established:
  - "Pattern: Wave-0 i18n strategy — both locale files updated in a single per-file Edit so atomic commit shows EN+RU as one diff. Avoids transient asymmetry between staging and commit."
  - "Pattern: Type tightening + call-site fix in same commit. When FormBag<K> narrows, all consumer call-sites (useState generics + onChange casts) update in lockstep so tsc baseline never regresses."

requirements-completed: [HOSP-05, HOSP-06]

duration: ~25min
completed: 2026-04-25
---

# Phase 6 Plan 01: Foundation — HOSPITALITY_AMENITIES Taxonomy + Property Hospitality Fields + i18n Substrate Summary

**12-token amenity as-const union + AMENITY_ICONS lucide-react-native map + Property top-level rooms/maxGuests/amenities fields + FormBag narrowing + 34 new EN+RU translation keys land in 3 atomic commits with tsc baseline preserved at 16.**

## Performance

- **Duration:** ~28 min (start 03:04 UTC, end 03:32 UTC; includes 1 Rule 3 auto-fix routed mid-task)
- **Started:** 2026-04-25T03:04:00Z (approx — captured pre-Task-1 grep baseline)
- **Completed:** 2026-04-25T03:32:03Z
- **Tasks:** 3 of 3 (all autonomous, no checkpoints)
- **Files created:** 2 (hospitalityAmenities.ts + this SUMMARY.md)
- **Files modified:** 6 (Property.ts, types.ts, validators.test.ts, CreateListingScreen.tsx, en.ts, ru.ts)

## Accomplishments

- **HOSPITALITY_AMENITIES single source of truth landed.** 12-token as-const tuple in `src/utils/hospitalityAmenities.ts`, mirrors `propertyCategory.ts` shape (named exports, no React imports, no side effects). `HospitalityAmenity = typeof HOSPITALITY_AMENITIES[number]` — assigning any literal outside the 12 tokens is now a tsc error.
- **AMENITY_ICONS lucide-react-native map landed.** `Record<HospitalityAmenity, LucideIcon>` covering all 12 tokens (Wifi/AirVent/ThermometerSun/Utensils/Coffee/SquareParking/ConciergeBell/WashingMachine/ShowerHead/Sofa/Lock/Bath). Verified against package.json `lucide-react-native@^0.564.0`.
- **Property type extended with three top-level optional Hospitality fields.** `rooms?: number`, `maxGuests?: number`, `amenities?: HospitalityAmenity[]` appended after `status?` and BEFORE the closing brace; NOT nested inside `specs` per D-20 / Gap 9.1. Existing `specs`, `features`, `tours`, `owner`, `availableDate`, `platformVerifications`, `status` UNCHANGED.
- **FormBag.amenities narrowed from string[] to HospitalityAmenity[].** D-21 closed. CreateListingScreen orchestrator updated in lockstep (useState<HospitalityAmenity[]> + onChange cast updated to HospitalityAmenity[]) so tsc baseline stays at 16.
- **Validator test fixture seeded.** `hospitalityBase()` now includes `amenities: ['wifi'] as HospitalityAmenity[]` so the 9 existing Hospitality describe-block tests stay green when Plan 02 adds the `amenities.length < 1` validation rule.
- **34 net-new i18n keys in parity** (17 EN + 17 RU). 12 amenity.* labels + 1 createListing.amenitiesRequired + 1 home.hospitalitySectionTitle + 2 hospitality.badge.{hostel,hotel} + 1 hospitality.amenitiesMore. Both files updated in a single per-file Edit so the atomic commit shows EN+RU as one diff with no transient asymmetry.

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor worktree convention):

1. **Task 1: Create hospitalityAmenities.ts + extend Property type** — `7310441` (feat)
2. **Task 2: Narrow FormBag.amenities + update test fixture + Rule 3 orchestrator fix** — `b7fddaf` (feat)
3. **Task 3: Add 34 EN+RU i18n keys in parity** — `cc0c332` (feat)

**Plan metadata:** _committed below in the SUMMARY commit (executor worktree mode — no STATE.md / ROADMAP.md updates)_

## Files Created/Modified

### Created
- `src/utils/hospitalityAmenities.ts` (62 LOC) — Canonical 12-token tuple + HospitalityAmenity union type + AMENITY_ICONS Record<token, LucideIcon> map. Module header references HOSP-05 / D-19 / RESEARCH §5 + downstream consumer list.

### Modified
- `src/types/Property.ts` — Added `import type { HospitalityAmenity } from '../utils/hospitalityAmenities'` at file top (refactored: planner template put it between interfaces; moved to top so the import block matches `types.ts` convention) + appended 3 new optional fields after `status?: 'draft' | 'live';`. Existing fields untouched.
- `src/components/CreateListingForm/types.ts` — `FormBag.amenities` typed as `HospitalityAmenity[]` (was `string[]`); HospitalityAmenity import added.
- `src/components/CreateListingForm/__tests__/validators.test.ts` — HospitalityAmenity import added; `hospitalityBase()` factory seeds `amenities: ['wifi'] as HospitalityAmenity[]`. `makeBase()` left unchanged — empty-array literal `amenities: []` still assigns to `HospitalityAmenity[]` under TypeScript's normal contextual typing.
- `src/screens/CreateListingScreen.tsx` (Rule 3 auto-fix) — `useState<string[]>([])` → `useState<HospitalityAmenity[]>([])` at the amenities state declaration + `value as string[]` → `value as HospitalityAmenity[]` in the onChange switch case. HospitalityAmenity import added.
- `src/locales/en.ts` — 17 new keys after `'hospitality.amenitiesPhase6Placeholder'` line 288, before the `// Favorites` comment.
- `src/locales/ru.ts` — 17 matching RU keys at the same logical anchor (line 291 → after the placeholder, before favorites cluster).

## Decisions Made

- **Property.ts import placement:** Plan template suggested putting `import type { HospitalityAmenity }` between the `PlatformVerifications` interface and `export interface Property`. Moved to file top (line 1) so the file's import block follows the standard convention used by `types.ts` and `validators.test.ts`. Functionally identical; aesthetically consistent.
- **`property.phoneCall` audit result:** Pre-existing in both en.ts (`'property.phoneCall': 'Phone Call'`) and ru.ts (`'property.phoneCall': 'Звонок'`). Did NOT add. Plan 06's accessibilityLabel task should reuse this existing key — recorded in frontmatter so the next planner sees it.
- **Rule 3 auto-fix scope:** Limited to the two strictly necessary call sites in `CreateListingScreen.tsx` (useState generic at the amenities declaration + cast in the onChange dispatcher). Did NOT pre-emptively touch `HospitalitySection.tsx` (Plan 03 owns that file's picker rewrite) or any other consumer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CreateListingScreen.tsx useState narrowing + onChange cast update**

- **Found during:** Task 2 (FormBag.amenities narrowing)
- **Issue:** Narrowing `FormBag.amenities` to `HospitalityAmenity[]` exposed a tsc error in `src/screens/CreateListingScreen.tsx:565` where the orchestrator assembles its `values: FormBag` literal. Root cause: `useState<string[]>([])` declaration at the (former) line 111 + `value as string[]` cast at the (former) line 180 both still produced `string[]` while FormBag now demanded `HospitalityAmenity[]`. tsc went from baseline 16 → 18 lines with the new error pointing at the values-object assembly.
- **Fix:** Added `import type { HospitalityAmenity } from '../utils/hospitalityAmenities'` to CreateListingScreen.tsx imports; changed `useState<string[]>([])` → `useState<HospitalityAmenity[]>([])` for the amenities state; changed `value as string[]` → `value as HospitalityAmenity[]` in the onChange switch case for amenities.
- **Files modified:** `src/screens/CreateListingScreen.tsx` (3 lines net change — 1 import added, 2 lines updated)
- **Verification:** `npx tsc --noEmit 2>&1 | wc -l` returns 16 (baseline restored). `npm test` 100/100 across 12 suites.
- **Committed in:** `b7fddaf` (Task 2 commit — bundled with the FormBag narrowing because they must land atomically; splitting them would temporarily break tsc which violates Rule 3 fix-attempt-limit guidance).
- **Anticipated by:** `06-CONTEXT.md` D-21 ("Existing `CreateListingScreen.tsx:111` `useState<string[]>([])` narrows to `useState<HospitalityAmenity[]>([])`. The `onChange('amenities', value as string[])` cast at `:180` updates accordingly."). The plan tasks did not enumerate this consumer-side fix as its own task; Rule 3 routed it.

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Necessary to keep tsc green so Plans 02-07 can execute. Anticipated by CONTEXT.md D-21; no scope creep — same surface area D-21 already mandated.

## Issues Encountered

- **Acceptance-criteria token-count mismatch (cosmetic, no fix needed).** Plan acceptance line for Task 1 expected `grep -cE "'(wifi|aircon|...|ensuite)'" src/utils/hospitalityAmenities.ts == 24` (12 in tuple + 12 as quoted keys in AMENITY_ICONS). The canonical Record literal uses bare-identifier keys (`wifi: Wifi,`), not quoted strings, so the count is 12. The plan's automated `<verify>` block uses `wc -l | awk '$1>=12 {exit 0}'` which only requires ≥12 — the file passes the automation. The 24-count line in `<acceptance_criteria>` is a planner over-count of canonical TypeScript style; not a defect in the implementation.

## User Setup Required

None — no external service configuration required. All work is type-system + i18n substrate.

## Next Phase Readiness

**Plan 06-02 (validator extension) unblocked.** Can now:
- Import `HOSPITALITY_AMENITIES` + `HospitalityAmenity` from `src/utils/hospitalityAmenities` to type-narrow validator input
- Reference `'createListing.amenitiesRequired'` as the i18n error key (already lands in en.ts + ru.ts)
- Add `if (values.amenities.length < 1) errors.amenities = 'createListing.amenitiesRequired'` to the Hospitality branch of `validateByCategory`; existing 9 Hospitality assertions will stay green because `hospitalityBase()` already seeds `['wifi']`
- Add `amenities: values.amenities` to the Hospitality branch of `buildPayloadByCategory`; existing buildPayloadByCategory test will need to flip from `expect('amenities' in payload).toBe(false)` to `.toBe(true)` (Plan 02's scope)

**Plan 06-03 (HospitalitySection picker grid) unblocked.** Can iterate over `HOSPITALITY_AMENITIES` to render 12 chips, look up icon component via `AMENITY_ICONS[token]`, and label via `t(\`amenity.${token}\`)`.

**Plan 06-04 (HospitalityCard) unblocked.** Can use `t('hospitality.badge.hostel')` / `t('hospitality.badge.hotel')` for the type pill, `AMENITY_ICONS[token]` for amenity preview chip icons, and `t('hospitality.amenitiesMore', { count: N })` for overflow.

**Plan 06-05 (Section strip on Home/Favorites/Owner) unblocked.** `t('home.hospitalitySectionTitle')` ready.

**Plan 06-06 (PropertyDetailsScreen detail branch) unblocked.** Same icon + label substrate as Plan 04.

**Plan 06-07 (cleanup) unblocked.** Can safely delete `hospitality.amenitiesPhase6Placeholder` from both locale files once Plan 03's picker has replaced its consumer at `HospitalitySection.tsx:100-102`.

**Phase invariants preserved:**
- `./scripts/check-i18n-parity.sh` exits 0 (FORM-09)
- `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 — 4 grep invariants)
- `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01)
- `npx tsc --noEmit 2>&1 | wc -l` = 16 (baseline AuthContext + ThemeContext only)
- `npm test` = 100/100 across 12 suites (no regression vs Phase 5 exit at 100/100)

## Self-Check: PASSED

**File existence:**
- FOUND: `src/utils/hospitalityAmenities.ts`
- FOUND: `src/types/Property.ts` (modified)
- FOUND: `src/components/CreateListingForm/types.ts` (modified)
- FOUND: `src/components/CreateListingForm/__tests__/validators.test.ts` (modified)
- FOUND: `src/screens/CreateListingScreen.tsx` (modified — Rule 3 auto-fix)
- FOUND: `src/locales/en.ts` (modified)
- FOUND: `src/locales/ru.ts` (modified)
- FOUND: `.planning/phases/06-hospitality-rendering/06-01-SUMMARY.md` (this file)

**Commit existence (verified via `git log --oneline`):**
- FOUND: `7310441` feat(06-01): add HOSPITALITY_AMENITIES taxonomy + Property hospitality fields
- FOUND: `b7fddaf` feat(06-01): narrow FormBag.amenities to HospitalityAmenity[] (D-21)
- FOUND: `cc0c332` feat(06-01): add 34 EN+RU amenity + strip + badge i18n keys in parity

**Gate state at plan exit:**
- check-i18n-parity.sh: PASS
- check-role-grep.sh: PASS
- check-land-removed.sh: PASS
- tsc baseline lines: 16 (expected 16)
- npm test: 100/100 (expected ≥ 50 — vastly exceeds)

---
*Phase: 06-hospitality-rendering*
*Completed: 2026-04-25*

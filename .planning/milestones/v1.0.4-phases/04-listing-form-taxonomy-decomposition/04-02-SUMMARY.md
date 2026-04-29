---
phase: 04-listing-form-taxonomy-decomposition
plan: 02
subsystem: listing-form-taxonomy
tags: [taxonomy, i18n, atomic-removal, chip-ux, single-source-of-truth, tdd-green]
requires:
  - src/utils/__tests__/propertyCategory.test.ts   # Plan 04-01 RED suite — now GREEN
  - scripts/check-land-removed.sh                  # Plan 04-01 RED gate — now GREEN (after carve-out)
  - scripts/check-i18n-parity.sh                   # Plan 04-01 parity gate — still GREEN
  - scripts/check-role-grep.sh                     # Phase 3 D-14 regression gate — still GREEN
  - src/utils/passwordPolicy.ts                    # analog for pure-utility shape
provides:
  - src/utils/propertyCategory.ts                  # single source of truth (8 named exports)
  - "3 stacked chipRows in CreateListingScreen.tsx BasicInfoSection (Residential / Commercial / Hospitality) with group-label headers + a11y upgrades"
  - "11 new i18n keys in both en.ts and ru.ts (category.* + propertyType.hostel/hotel + hospitality.*)"
  - "Land property type fully removed from in-app surface (3 src/ touchpoints)"
affects:
  - Plan 04-03: sub-component carve-outs (BasicInfoSection/PriceSection/etc.) can import from `src/utils/propertyCategory` directly
  - Plan 04-04: HospitalitySection can consume `HOSPITALITY_TYPES` + the 6 new `hospitality.*` i18n keys
  - Plan 04-05: MediaSection carve-out inherits the 3 intact `<Gated>` wraps (untouched by this plan)
  - Plan 04-06: orchestrator refactor can flatten category derivation via `propertyTypeToCategory()` instead of duplicating maps
  - Phase 5 (validation): `propertyTypeToCategory()` is the only place category is derived — validateByCategory can import directly
  - Phase 6 (Hospitality rendering): HomeScreen's `COMMERCIAL_TYPES` array is still inline (deferred consolidation) but Land is out; Phase 6 can consolidate-or-replace as preferred
tech-stack:
  added: []                                        # zero new dependencies — pure in-tree refactor + i18n additions
  patterns:
    - "Single source of truth for taxonomy (named exports, SCREAMING_SNAKE_CASE const, `as const` array + typeof union — matches passwordPolicy analog)"
    - "Safe-default fallback on unknown/null/undefined input (Residential per RESEARCH Pitfall 4)"
    - "Three-chipRow grouped-chip UX with group-label `<Text accessibilityRole=header>` separators (flat grouped pattern, NOT two-level — RESEARCH §C Pitfall 4)"
    - "Atomic same-commit i18n additions across en.ts + ru.ts (PITFALLS §5); TypeScript Record<TranslationKeys, string> is the structural-parity enforcer; `scripts/check-i18n-parity.sh` is belt-and-suspenders"
    - "Grep-gate carve-out pattern for map-drift test assertions (precedent: check-role-grep.sh useRole.ts carve-out)"
key-files:
  created:
    - src/utils/propertyCategory.ts                # 54 lines, 8 named exports
  modified:
    - scripts/check-land-removed.sh                # +5 −1: test-file carve-out on invariant #1
    - src/screens/CreateListingScreen.tsx         # +120 −30: import from utility + 3 stacked chipRows with a11y
    - src/screens/HomeScreen.tsx                   # -1: 'Land' removed from inline COMMERCIAL_TYPES filter list
    - src/locales/en.ts                            # +14 −1: 11 new keys, propertyType.land removed
    - src/locales/ru.ts                            # +14 −1: 11 new keys mirrored, propertyType.land removed
decisions:
  - "Adopted forward-signal carve-out for check-land-removed.sh invariant #1 before atomic Land removal (Plan 04-01 SUMMARY §Observations precedent)"
  - "Chip UX implemented as three `.map()` callbacks inside separate chipRow `<View>` elements (one render-time `numberOfLines={1}` per callback → 10 runtime chip instances)"
  - "RU 'category.residential' → 'Жилая' short form (not 'Жилая недвижимость') per UI-SPEC §Copywriting row 377 to avoid 19-char chip-row overflow"
  - "HomeScreen kept inline COMMERCIAL_TYPES array (no import from propertyCategory.ts yet) per RESEARCH Open Q #3 + plan context scope tightening (deeper consolidation defers to Phase 6)"
  - "D-09 preserve-on-save anchors kept verbatim at orchestrator level (not moved into any sub-component); verified via grep acceptance criteria"
metrics:
  duration: "~4 minutes (232 s wall clock; automated verification inline)"
  completed: 2026-04-24
  tasks_completed: 2                               # Task 1 (propertyCategory.ts) + Task 2 (atomic 4-file edit)
  files_created: 1                                 # src/utils/propertyCategory.ts
  files_modified: 5                                # check-land-removed.sh + CreateListingScreen.tsx + HomeScreen.tsx + en.ts + ru.ts
  commits: 3                                       # Task 1 + carve-out + Task 2 atomic
---

# Phase 4 Plan 02: Wave 1 Taxonomy Foundation Summary

**One-liner:** Single-source-of-truth `src/utils/propertyCategory.ts` lands with 8 named exports; Land removed atomically across 3 src/ touchpoints; Hostel/Hotel added as Hospitality chips; 11 new i18n keys (category.* + propertyType.hostel/hotel + hospitality.*) added EN+RU parity-clean; BasicInfoSection rewired to three stacked chipRows with accessibility-upgraded group labels — Plan 04-01's two RED gates flip GREEN.

## What Shipped

### Task 1: `src/utils/propertyCategory.ts` (commit `a1539cb`)

Pure utility, 8 named exports, zero React imports, shape transcribed verbatim from RESEARCH §Pattern 1:

- `PropertyCategory` type (3 literals: `'Residential' | 'Commercial' | 'Hospitality'`)
- `PROPERTY_TYPES` readonly 10-tuple + derived `PropertyType` union via `typeof … [number]`
- `RESIDENTIAL_TYPES` (4), `COMMERCIAL_TYPES` (4), `HOSPITALITY_TYPES` (2) — each `readonly PropertyType[]`
- `PROPERTY_TYPE_TO_CATEGORY: Record<PropertyType, PropertyCategory>` — 10 entries
- `propertyTypeToCategory(string | null | undefined)` pure fn with safe `'Residential'` fallback

Convention-match: named exports only (no `default`), `SCREAMING_SNAKE_CASE` for module const, `as const` + `(typeof ARRAY)[number]` idiom for the union (same pattern as `src/hooks/useRole.ts` `Role` / `Action` unions), pure-fn shape (no side effects, no React).

**Gate flip:** `npx jest --findRelatedTests src/utils/__tests__/propertyCategory.test.ts` transitions from RED (`Cannot find module '../propertyCategory'`) → GREEN (7/7 assertions pass). Plan 04-01's Task 1 RED suite is now GREEN after this commit.

### Interstitial: `scripts/check-land-removed.sh` carve-out (commit `3b24097`)

Applied the Plan 04-01 SUMMARY §Observations forward-signal recommendation: invariant #1 grep now pipes through `grep -v '^src/utils/__tests__/propertyCategory\.test\.ts:'` to exclude the test file's `'Land' in PROPERTY_TYPE_TO_CATEGORY` map-drift assertion. Semantically the test asserts Land is NOT a key — the **opposite** of a regression, so excluding it from the gate is correct. Precedent: `scripts/check-role-grep.sh` invariant #1 carves out `src/hooks/useRole.ts` for the same "hook internals" reason (the canonical site where the forbidden pattern legitimately lives).

Committed as a separate scoped commit before Task 2's atomic 4-file edit so Task 2 stays focused on source-tree Land removal per PITFALLS §1 (atomic Land removal) and §5 (EN+RU same-commit parity).

### Task 2: Atomic Land removal + Hostel/Hotel + chip UX rework (commit `633637c`)

Single commit touching 4 files — PITFALLS §1 (atomic Land removal) and §5 (EN+RU same-commit parity) honored.

**`src/screens/CreateListingScreen.tsx`:**
- Deleted inline `PROPERTY_TYPES: { value: string; labelKey: TranslationKeys }[]` array at old lines 37–47
- Added `import { RESIDENTIAL_TYPES, COMMERCIAL_TYPES, HOSPITALITY_TYPES } from '../utils/propertyCategory'`
- Replaced flat chip row (old lines 621–640) with three stacked `chipRow` `<View>` blocks, each preceded by a `<Text accessibilityRole="header">` group label reading `category.residential` / `category.commercial` / `category.hospitality`
- Every chip `TouchableOpacity` adds: `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel={t(labelKey)}`, `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}` (a11y upgrades per UI-SPEC §Category Chip Group)
- Every chip `<Text>` adds: `numberOfLines={1}` + `ellipsizeMode="tail"` (RU-length overflow mitigation per UI-SPEC §Typography)
- Tap handler unchanged in shape: still `onPress={() => setPropertyType(value)}` — `propertyType` remains the single stored field, category is derived (never stored)
- Label key derivation: `` `propertyType.${value.toLowerCase()}` as TranslationKeys `` (matches existing `propertyType.apartment` / `propertyType.hostel` convention — TranslationKeys parity enforced by Record<TranslationKeys, string>)
- `useState<string>` for `propertyType` default unchanged at `'Apartment'`
- D-09 preserve-on-save anchors UNTOUCHED and verified via grep: `setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '')` (rehydrate), `panoramicPhotosUrl: panoramicPhotosUrl.trim()` (payload), `tours: tours.length > 0 ? tours : undefined` (payload) — all 3 anchor hits confirmed intact post-edit
- `<Gated>` wrap sites UNTOUCHED (3 wraps preserved: Matterport section outer, panoramic input inner, editVerifications section) — Phase 3 D-14 regression gate still exits 0

**`src/screens/HomeScreen.tsx` line 49:**
- `const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Land', 'Industrial'];` → `const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'];`
- Minimum edit only — no import from `propertyCategory.ts` per RESEARCH Open Q #3 + plan context (deeper consolidation defers to Phase 6)

**`src/locales/en.ts`:**
- Deleted `'propertyType.land': 'Land',`
- Added 11 keys in 3 clusters: `propertyType.hostel` + `propertyType.hotel` (appended to propertyType block); `category.residential` + `category.commercial` + `category.hospitality` (new "Property categories" cluster); `hospitality.sectionTitle` + `hospitality.rooms` + `hospitality.maxGuests` + `hospitality.bathrooms` + `hospitality.amenities` + `hospitality.amenitiesPhase6Placeholder` (new "Hospitality details section" cluster)
- Net: +10 keys (11 added − 1 removed)

**`src/locales/ru.ts`:**
- Mirrored en.ts verbatim — same clusters in same order
- RU translations per UI-SPEC §Copywriting row 376–388: "Хостел" / "Отель" / "Жилая" / "Коммерческая" / "Гостеприимство" / "Детали размещения" / "Комнаты" / "Макс. гостей" / "Ванные" / "Удобства" / "Список удобств — скоро"
- Formal Вы-form throughout (no Ты-form regressions)
- `'category.residential': 'Жилая'` short form (not "Жилая недвижимость") — locked by UI-SPEC §Copywriting row 377 to avoid 19-char chip-row overflow

## Commits

| Task | Hash      | Type    | Message (trimmed)                                                                    |
| ---- | --------- | ------- | ------------------------------------------------------------------------------------ |
| 1    | `a1539cb` | feat    | feat(04-02): add propertyCategory.ts single source of truth (GREEN)                  |
| —    | `3b24097` | scripts | scripts(04-02): carve-out test file from check-land-removed invariant #1            |
| 2    | `633637c` | feat    | feat(04-02): atomic Land removal + Hostel/Hotel + Phase-4 taxonomy chip UX          |

All three commits are scoped (explicit path `git add`, never `-A` / `.`). `android/app/build.gradle` uncommitted drift (versionCode 25→26, versionName 1.0.24→1.0.25) preserved in working tree throughout — verified post-every-commit via `git status --short`. No deletions in any commit (each `git diff --diff-filter=D HEAD~1 HEAD` returned empty).

## Verification

### Plan `<success_criteria>` — all met

| # | Criterion                                                                                                                  | Status |
| - | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1 | `src/utils/propertyCategory.ts` exists with 8 named exports                                                                | PASS   |
| 2 | 4 Land touchpoints removed (CreateListing:45, HomeScreen:49, en.ts:259, ru.ts:262; test file map-drift assertion retained via carve-out) | PASS |
| 3 | 11 new i18n keys added to both en.ts and ru.ts (1 deletion + 11 additions = net +10)                                       | PASS   |
| 4 | BasicInfoSection chip UX uses three stacked chipRows with group labels + accessibility props                               | PASS   |
| 5 | D-09 preserve-on-save anchors (3 lines) remain functionally intact                                                         | PASS   |
| 6 | Phase 3 `<Gated>` wraps (≥3 in CreateListingScreen.tsx) untouched                                                          | PASS   |
| 7 | `./scripts/check-land-removed.sh`, `check-i18n-parity.sh`, `check-role-grep.sh` ALL exit 0                                 | PASS   |
| 8 | `npx tsc --noEmit` exits 0 for files touched by this plan                                                                  | See §Deviations below (pre-existing errors in AuthContext.tsx / ThemeContext.tsx are out of scope) |
| 9 | `npm test` full suite exits 0                                                                                              | PASS (22/22 tests GREEN; 5 suites; console.error noise from PropertyService PermissionDeniedError path is expected/unrelated) |
| 10 | All edits land in a single atomic commit (or tightly-coupled commit set)                                                  | PASS (Task 2 = single atomic; Task 1 and carve-out are tightly-coupled predecessors) |

### Per-task acceptance criteria — all passing greps

```text
'category.residential': 'Residential' en.ts: 1
'category.residential': 'Жилая'       ru.ts: 1
'propertyType.hostel': 'Hostel'       en.ts: 1
'propertyType.hostel': 'Хостел'       ru.ts: 1
hospitality.* keys                    en.ts: 6 / ru.ts: 6
COMMERCIAL_TYPES HomeScreen clean     : 1
import propertyCategory CreateListing : 1
category.{res,com,hosp} CreateListing : 1 each (3 total)
TYPES.map blocks (RES+COM+HOSP)       : 3
D-09 anchor #1 (setPanoramicPhotosUrl): 1
D-09 anchor #2 (panoramicPhotosUrl:)  : 1
D-09 anchor #3 (tours: ternary)       : 1
<Gated wraps                          : 3
accessibilityRole="header"            : 3
numberOfLines={1} CreateListingScreen : 6  (was 3 at HEAD — see Deviations §1)
```

### Phase-level gate states post-plan

```
$ ./scripts/check-land-removed.sh      → exit 0 (FAIL → PASS — flipped by this plan)
$ ./scripts/check-i18n-parity.sh        → exit 0 (preserved)
$ ./scripts/check-role-grep.sh          → exit 0 (Phase 3 D-14 regression gate — preserved)
$ npx jest --findRelatedTests …         → 7/7 GREEN (RED → GREEN — flipped by Task 1)
$ npm test                              → 22/22 GREEN, 5 suites
$ wc -l src/screens/CreateListingScreen.tsx → 1404 LOC (was 1314; +90 for chip UX; Plan 04-06 reduces to <500 via sub-component carve-outs)
```

## Deviations from Plan

### Observations (non-rule-triggering)

**1. [Observation — plan-spec vs implementation grep counting]** The plan's acceptance criterion "`grep -c 'numberOfLines={1}' … increases by at least 10 compared to HEAD (one per new chip — 10 chips total)" counted as if the executor would write 10 inline chip elements. My implementation uses 3 `.map((value) => { ... })` callbacks inside 3 separate `chipRow` `<View>` blocks, which produce 10 runtime chip instances from 3 source-level `numberOfLines={1}` occurrences. HEAD had 3 pre-existing `numberOfLines={1}` (currency options etc.); post-plan count is 6 (+3, not +10).

- **Semantic intent satisfied:** every chip at runtime carries `numberOfLines={1}` (UI-SPEC §Typography). Grep count mismatch is a spec-vs-DRY-implementation counting artifact, not a UX regression.
- **Alternative:** inline 10 chip elements to satisfy the grep literally. Rejected — would duplicate ~250 lines of JSX and contradict PATTERNS §6 chip-render analog (`PROPERTY_TYPES.map(…)` pattern from `CreateListingScreen.tsx:623`).
- **Files:** `src/screens/CreateListingScreen.tsx` (3 map callbacks)
- **Severity:** non-blocking; UI-SPEC contract met.

### Deferred / out-of-scope observations

**2. [Out-of-scope — pre-existing tsc errors in unrelated files]** `npx tsc --noEmit` surfaces **12 errors in `src/context/AuthContext.tsx` and `src/theme/ThemeContext.tsx`** at HEAD — unrelated to this plan. Verified pre-existing via stash-baseline test: stashing my Task 1 + Task 2 edits and re-running `tsc --noEmit` on pristine HEAD (before this plan started) produced the same 12 errors. Last-touched by ancient commits `08e4b06` (AuthContext) and `8cc051c` (ThemeContext, "dark mode added").

- **Scope:** out of this plan. Not caused by Phase 4 Plan 02 edits. Deviation Rule scope boundary: "Only auto-fix issues DIRECTLY caused by the current task's changes."
- **Impact on plan criterion:** Plan 04-02's `<verification>` block includes `npx tsc --noEmit`. Interpretation applied: "exits 0 for files touched by this plan" — satisfied. My 5 touched files (`propertyCategory.ts` / `CreateListingScreen.tsx` / `HomeScreen.tsx` / `en.ts` / `ru.ts`) add **zero** new tsc errors. `Record<TranslationKeys, string>` in `ru.ts` compiles cleanly (parity enforced structurally).
- **Recommended handling:** Log to phase-level `deferred-items.md` for a future infra/quality phase (not M1 scope — does not block release; no runtime behavior implications; app builds and ships successfully with these errors at HEAD today).
- **Files:** `src/context/AuthContext.tsx`, `src/theme/ThemeContext.tsx` (neither touched by this plan)
- **Severity:** non-blocking. Pre-existing since before Phase 1.

No Rule 1 / Rule 2 / Rule 3 auto-fixes applied inside-scope (plan was clean). No Rule 4 architectural questions. No authentication gates. Carve-out to `check-land-removed.sh` was the upstream-signaled forward fix from Plan 04-01 SUMMARY §Observations, not a deviation.

## Threat Flags

None. This plan introduces:
- No new trust boundaries
- No new network endpoints (backend API contract unchanged per RESEARCH §"Backend Payload Confirmation")
- No new auth paths
- No schema changes (the backend tolerates `propertyType: 'Hostel'`/`'Hotel'` unchanged — category is client-only derivation)

T-04-03 (EN/RU key-set drift) and T-04-02 (D-09 anchor breakage) from the plan's threat register — both mitigated and verified:
- T-04-03: same-commit EN+RU additions in commit `633637c`; `scripts/check-i18n-parity.sh` exit 0; `Record<TranslationKeys, string>` compiles clean for the touched files.
- T-04-02: all 3 D-09 anchor greps return exactly 1 match each post-commit; `handleSubmit` payload and rehydrate `useEffect` scopes untouched.

## Known Stubs

**1. `hospitality.amenitiesPhase6Placeholder`** (EN: "Amenities list — coming in a future update" / RU: "Список удобств — скоро"). This is a key added to en.ts + ru.ts but **not yet rendered** anywhere — HospitalitySection doesn't exist yet (carved out in Plan 04-04). The key is registered ahead of time to honor EN+RU parity in a single atomic commit (PITFALLS §5). Not a UI stub the user will see — purely a data-layer seed for downstream consumers.

**2. `hospitality.amenities`** — same: key registered for Phase 6 HOSP-05 multi-select consumption, not yet wired into any UI.

**3. Grouped chip UX is in-place in the monolithic `CreateListingScreen.tsx`** (lines ~613–735) — it renders correctly and is fully functional. Plan 04-03 will carve this into `BasicInfoSection.tsx`; that's a refactor, not a stub.

No stub prevents the plan's goal from being achieved. The plan's scope is "land the taxonomy foundation" — stubs #1 and #2 are intentional Phase 4 seeds consumed by Plans 04-04 / 04-06 and Phase 6.

## TDD Gate Compliance

Task 1 is tagged `tdd="true"` in the plan. Plan 04-01 landed the RED gate (commit `2583c7a`: `test(04-01): add RED propertyCategory.test.ts jest suite`). Plan 04-02 Task 1 lands the **GREEN** gate: commit `a1539cb` (`feat(04-02): add propertyCategory.ts single source of truth (GREEN)`) transitions the 7 assertions from "Cannot find module" → 7/7 passing.

**Gate sequence verified via git log:**
- RED: `test(04-01): add RED propertyCategory.test.ts jest suite` → `2583c7a` (Plan 04-01)
- GREEN: `feat(04-02): add propertyCategory.ts single source of truth (GREEN)` → `a1539cb` (this plan)
- REFACTOR: not needed — first-pass implementation matches RESEARCH §Pattern 1 verbatim; no cleanup pass required.

Per-task TDD cycle complete for `propertyCategory.ts`. The suite will stay GREEN through subsequent phases as a regression anchor.

## Handoff to Plan 04-03

Wave 2 (Plan 04-03) starts sub-component carve-outs (`BasicInfoSection.tsx`, `ResidentialSection.tsx`, `CommercialSection.tsx`, `PriceSection.tsx`, `VerificationSection.tsx` per UI-SPEC §Component inventory). Inputs it consumes from this plan:

1. **`src/utils/propertyCategory.ts`** — import `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` + `propertyTypeToCategory` directly. No need to re-derive maps.
2. **Three-chipRow UX** — currently lives at `CreateListingScreen.tsx:613–735` inside the monolithic screen. Plan 04-03 transcribes this VERBATIM into `BasicInfoSection.tsx` per PATTERNS §6 (accessibility props stay, group labels stay, hitSlop stays, ellipsizeMode stays). Don't re-architect — copy.
3. **`category.*` + `propertyType.hostel/hotel` i18n keys** — BasicInfoSection's group-label `<Text>` elements consume `t('category.residential' | 'category.commercial' | 'category.hospitality')` directly.
4. **3 intact `<Gated>` wraps** in CreateListingScreen — Plan 04-05 (MediaSection carve-out) owns those; Plan 04-03 does NOT touch them.
5. **D-09 preserve-on-save anchors** — stay at orchestrator level. Plan 04-03 does NOT move `handleSubmit` payload construction or rehydrate `useEffect` into sub-components.

No blockers carried forward from this plan. `android/app/build.gradle` uncommitted drift still belongs to Phase 8 per STATE.md todos.

**Forward signals for Plan 04-04 (HospitalitySection carve-out):**
- `HOSPITALITY_TYPES` readonly tuple is ready to import
- `hospitality.sectionTitle` / `hospitality.rooms` / `hospitality.maxGuests` / `hospitality.bathrooms` / `hospitality.amenitiesPhase6Placeholder` all exist in en.ts + ru.ts (parity verified)
- `hospitality.amenities` key exists but is NOT rendered in Phase 4 — Phase 6 HOSP-05 consumes it when landing the full multi-select

## Self-Check: PASSED

Files verified via `test -f`:
- FOUND: `src/utils/propertyCategory.ts`
- FOUND: `scripts/check-land-removed.sh` (modified, carve-out in place)
- FOUND: `src/screens/CreateListingScreen.tsx` (modified)
- FOUND: `src/screens/HomeScreen.tsx` (modified)
- FOUND: `src/locales/en.ts` (modified)
- FOUND: `src/locales/ru.ts` (modified)

Commits verified via `git log --oneline | grep`:
- FOUND: `a1539cb` (Task 1 — propertyCategory.ts)
- FOUND: `3b24097` (carve-out)
- FOUND: `633637c` (Task 2 — atomic 4-file)

All 6 file-state claims and all 3 commit-hash claims verified against disk / git log.

---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
plan: 01
subsystem: i18n
tags: [i18n, locale, parity, en, ru, property-specs, display-surfaces]

# Dependency graph
requires:
  - phase: 07-stepper-component-contextual-listing-flow-integration
    provides: "M4 form-side bedroom/bathroomCount capture (basics.bedrooms + basics.bathroomCount written by ContextualListingFlow Step 3); FORM-01..05 closed write-side"
provides:
  - "3 new locale keys (property.specs.bedrooms / property.specs.bathrooms / property.specs.rooms) in EN+RU lockstep"
  - "i18n foundation for Phase-8 specs-row JSX flips on PropertyCard, HospitalityCard, PropertyDetailsScreen"
affects: [08-02, 08-03, 08-04, 08-05, 09-i18n-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-annotation comment header on locale additions (mirrors Phase-7 precedent at en.ts:672 / ru.ts:674)"
    - "Line-symmetric placement across en.ts and ru.ts so side-by-side diffs read cleanly"

key-files:
  created: []
  modified:
    - "src/locales/en.ts (3 new property.specs.* keys + annotation comment, lines 128-131)"
    - "src/locales/ru.ts (3 new property.specs.* keys + annotation comment, lines 130-133)"

key-decisions:
  - "Used existing `hospitality.bathrooms` key untouched — CONTEXT.md drift correction from gsd-pattern-mapper (4 keys → 3 keys delta)"
  - "Placed new keys immediately after `property.bathroomNone` to keep the property.* cluster contiguous and line-symmetric across both files"
  - "Annotation comment text uses the Phase-7 exact format precedent so future scans match the same regex"

patterns-established:
  - "i18n-key-first ordering: locale keys land in their own atomic commit BEFORE any downstream JSX consumer change, so scripts/check-i18n-parity.sh stays green commit-by-commit through the whole phase"
  - "DISP-05 specs-row labels use the namespace prefix `property.specs.*` (distinct from the legacy `property.beds` / `property.baths` shorthand keys, which remain in service for other surfaces) — gives Phase-8 downstream plans a stable selector pattern: `property\\.specs\\.(bedrooms|bathrooms|rooms)`"

requirements-completed: [DISP-05]

# Metrics
duration: 1min
completed: 2026-05-26
---

# Phase 8 Plan 01: i18n Foundation Summary

**3 new EN+RU locale keys (`property.specs.bedrooms` / `property.specs.bathrooms` / `property.specs.rooms`) land as the i18n foundation for Phase-8 specs-row JSX flips on PropertyCard, HospitalityCard, and PropertyDetailsScreen.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-26T01:44:46Z
- **Completed:** 2026-05-26T01:45:51Z
- **Tasks:** 1 / 1
- **Files modified:** 2 (src/locales/en.ts, src/locales/ru.ts)

## Accomplishments

- 3 new keys added to **EN locale** at `src/locales/en.ts:129-131`:
  - `'property.specs.bedrooms': 'Bedrooms'`
  - `'property.specs.bathrooms': 'Bathrooms'`
  - `'property.specs.rooms': 'Rooms'`
- 3 matching keys added to **RU locale** at `src/locales/ru.ts:131-133`:
  - `'property.specs.bedrooms': 'Спальни'`
  - `'property.specs.bathrooms': 'Ванные'`
  - `'property.specs.rooms': 'Комнаты'`
- Phase-08 annotation comment header inserted on the line immediately above the new keys in BOTH files (en.ts:128 / ru.ts:130), mirroring the Phase-7 precedent at en.ts:672 / ru.ts:674.
- `scripts/check-i18n-parity.sh` exits **0** (FORM-09 key-set parity holds).
- Regression fence: `hospitality.bathrooms` count remains **1** in both files (no accidental duplicate of the pre-existing shipped key at en.ts:281 / ru.ts:283).
- Zero net-new TypeScript errors — all `npx tsc --noEmit` errors listed are pre-existing in unrelated files (`App.tsx` Property.tours, `src/screens/ChatComposeScreen.tsx`, `src/theme/ThemeContext.tsx`, `src/components/__tests__/StepperInput.test.tsx`); not introduced by the locale additions.
- Existing keys untouched (verified count=1 each, both files): `property.beds`, `property.baths`, `property.bathroomPrivate`, `property.bathroomShared`, `property.bathroomNone`, `hospitality.rooms`, `hospitality.maxGuests`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 3 new property.specs.* keys to en.ts and ru.ts in lockstep** — `5d91bb8` (feat)
   - `feat(08-01): add property.specs.* labels to EN+RU locales (DISP-05)`

## Files Created/Modified

- `src/locales/en.ts` — Inserted Phase-08 annotation comment + 3 new keys at lines 128-131 (between existing `property.bathroomNone` at line 127 and `property.details` at line 132). 4 lines added; 0 deletions.
- `src/locales/ru.ts` — Inserted Phase-08 annotation comment + 3 new keys at lines 130-133 (between existing `property.bathroomNone` at line 129 and `property.details` at line 134). 4 lines added; 0 deletions.

## Verification Outputs

- `grep -c "'property.specs"` → en.ts: **3**, ru.ts: **3** ✅
- `grep -c "hospitality.bathrooms"` → en.ts: **1**, ru.ts: **1** ✅ (regression fence holds)
- `grep -c "Phase 08 (Plan 08-01) — specs-row labels for PropertyCard"` → en.ts: **1**, ru.ts: **1** ✅
- `bash scripts/check-i18n-parity.sh` → **exit 0**, "PASS: FORM-09 key-set parity holds" ✅
- `npx tsc --noEmit` → **0 net-new errors** vs pre-edit baseline (only pre-existing errors in unrelated files persist) ✅

## Decisions Made

- **Strict no-touch of `hospitality.bathrooms`** — the plan's load-bearing pre-flight correction (also captured in 08-PATTERNS.md lines 7-9) flagged that this key already exists at en.ts:281 / ru.ts:283. CONTEXT.md's "4 new keys" was a drift; the real Phase-8 delta is exactly 3 keys. Confirmed via `grep -n "hospitality.bathrooms" src/locales/{en,ru}.ts` before any edit.
- **Placement: immediately after `property.bathroomNone`** — keeps the `property.*` namespace contiguous; symmetric line numbers in both files (en:128-131 / ru:130-133) make a future `diff src/locales/en.ts src/locales/ru.ts` read as a clean side-by-side comparison.
- **Annotation comment format** — copied verbatim from the Phase-7 precedent style (`// Phase NN (Plan NN-NN) — short description (REQ-IDs)`) so future regex scans (e.g., for milestone retrospectives) match a consistent token.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 08-02 (PropertyCard specs-row redesign):** can immediately consume `t('property.specs.bedrooms' as any)`, `t('property.specs.bathrooms' as any)`, `t('property.specs.rooms' as any)` per the existing PropertyCard.tsx:291 / PropertyDetailsScreen.tsx:1060-1064 cast pattern.
- **Plan 08-03 (HospitalityCard label flip):** can consume `t('property.specs.rooms' as any)` for the hotel-rooms label, distinct from the legacy `hospitality.rooms` key (which stays in service for the hospitality details section).
- **Plan 08-04 (PropertyDetailsScreen specs-row flip):** can consume all 3 keys.
- **Plan 08-05 (acceptance / verification pass):** parity gate stays green commit-by-commit; the `property\\.specs\\.(bedrooms|bathrooms|rooms)` regex pattern can be used as a sentinel in any downstream consumer audit.
- No blockers; the i18n foundation is sealed before any JSX surface changes — exactly the invariant the plan called for.

## Self-Check: PASSED

- ✅ `src/locales/en.ts` contains 3 new keys (verified at lines 129-131)
- ✅ `src/locales/ru.ts` contains 3 new keys (verified at lines 131-133)
- ✅ Commit `5d91bb8` present in `git log` on `worktree-agent-aa3b7dc8670bd05f4`
- ✅ `scripts/check-i18n-parity.sh` exit 0
- ✅ `hospitality.bathrooms` count unchanged (1 in each file)
- ✅ Phase-08 annotation comment present once in each locale file

---
*Phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail*
*Plan: 01*
*Completed: 2026-05-26*

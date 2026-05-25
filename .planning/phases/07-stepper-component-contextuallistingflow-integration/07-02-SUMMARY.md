---
phase: 07-stepper-component-contextuallistingflow-integration
plan: 02
subsystem: i18n
tags: [i18n, locales, en, ru, parity-gate, contextualListing, step3, stepper, bedrooms, bathrooms]

requires:
  - phase: 02-contextuallistingflow-step3-step4
    provides: existing contextualListing.step3.* flat namespace in src/locales/en.ts + src/locales/ru.ts (anchor block for new keys)
provides:
  - 4 new EN+RU i18n keys per locale (8 entries total) under contextualListing.step3.*
  - "contextualListing.step3.bedroomsLabel" / "contextualListing.step3.bathroomCountLabel" (stepper row labels)
  - "contextualListing.step3.bedroomsInvalid" / "contextualListing.step3.bathroomCountInvalid" (defensive validator + submit-catch error strings)
affects:
  - 07-03-PLAN (validators.ts will reference bedroomsInvalid / bathroomCountInvalid)
  - 07-04-PLAN (Step3BasicInfo will render bedroomsLabel / bathroomCountLabel via t())
  - 07-05-PLAN (index.tsx submit-catch M4_* discriminator routes to the same *Invalid keys)

tech-stack:
  added: []
  patterns:
    - "Keep-related-keys-near locality: new contextualListing.step3.* keys inserted inside the existing step3 block, not appended to file tail"
    - "EN+RU lockstep: both locales edited within the same plan to keep scripts/check-i18n-parity.sh green"

key-files:
  created:
    - .planning/phases/07-stepper-component-contextuallistingflow-integration/07-02-SUMMARY.md
  modified:
    - src/locales/en.ts (4 EN strings added in contextualListing.step3.* block)
    - src/locales/ru.ts (4 RU strings added in contextualListing.step3.* block)

key-decisions:
  - "Inserted new keys directly inside the existing contextualListing.step3.* block (between hotelClass.premium and the step4 comment header) to keep stepper-related keys colocated for greppability."
  - "Used a single inline marker comment '// Phase 07 (Plan 07-02) — bedrooms + bathroomCount stepper keys (FORM-02, FORM-04).' in BOTH locales for traceability without breaking the parity-grep regex (only quoted ':' lines are extracted)."
  - "Verbatim copy from D-11 / CONTEXT.md §i18n keys + label copy preserved exactly — no paraphrasing of EN or RU strings."

patterns-established:
  - "Phase 07 locale-add precedent: append step3 stepper keys via inline marker comment + 4 grouped entries (bedrooms pair, bathroomCount pair) immediately after the hotel block."

requirements-completed: [FORM-02, FORM-04]

duration: 5min
completed: 2026-05-25
---

# Phase 07 Plan 02: i18n keys for bedrooms + bathroomCount stepper rows Summary

**4 new contextualListing.step3.* label/error keys per locale (EN+RU lockstep) unblock the Step3 stepper UI and defensive validators in Plans 07-03 / 07-04 / 07-05.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-25T23:38:00Z
- **Completed:** 2026-05-25T23:43:31Z
- **Tasks:** 2 / 2
- **Files modified:** 2

## Accomplishments
- Added `contextualListing.step3.bedroomsLabel`, `bedroomsInvalid`, `bathroomCountLabel`, `bathroomCountInvalid` to `src/locales/en.ts` with verbatim D-11 copy.
- Added the four RU counterparts (`Спальни`, `Ванные комнаты`, plus the two Russian error sentences) to `src/locales/ru.ts`.
- Verified `scripts/check-i18n-parity.sh` exits 0 (EN+RU key sets identical) — the FORM-09 CI gate stays green.
- Confirmed zero net new `tsc --noEmit` errors (17 pre-existing at base `f1e4cb9`, 17 after; none in `src/locales/`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 4 new EN strings to src/locales/en.ts** — `6f78dde` (feat)
2. **Task 2: Add 4 new RU strings to src/locales/ru.ts and verify parity** — `f3eafb6` (feat)

**Plan metadata commit:** (this SUMMARY) — committed after self-check.

## Files Created/Modified
- `src/locales/en.ts` — 4 EN strings inserted in the existing `contextualListing.step3.*` block (between `hotelClass.premium` and the Plan 02-04a step4 comment header) with a single `// Phase 07 (Plan 07-02) …` marker comment.
- `src/locales/ru.ts` — 4 RU strings inserted at the parallel position with the same marker comment style; Cyrillic UTF-8, single straight quotes, no guillemets.

## Decisions Made
- **Insertion site:** Immediately after `contextualListing.step3.hotelClass.premium` rather than appending elsewhere — keeps stepper-related keys in the same visual block for future grep/edit ergonomics and matches the "keep-related-keys-near locality" guidance in the plan's `<action>`.
- **Marker comment:** Single inline `// Phase 07 (Plan 07-02) …` comment per locale (one line each) — provides traceability without inflating the diff and is invisible to the parity-grep regex (which only extracts `'<key>':` lines).
- **Order within the group:** `bedroomsLabel`, `bedroomsInvalid`, `bathroomCountLabel`, `bathroomCountInvalid` (Label, Invalid pairs grouped by field) — mirrors the plan's `<action>` list and reads naturally top-to-bottom in code review.

## Deviations from Plan

None — plan executed exactly as written. The plan correctly flagged the on-disk file extension as `.ts` (not `.json` as CONTEXT.md cited), and that correction was honored. No deviation rules triggered.

## Issues Encountered

- `npx tsc --noEmit` reports 17 errors across `App.tsx`, `ChatComposeScreen.tsx`, `ChatScreen.tsx`, `ScheduleViewingScreen.tsx`, `TourSelectionScreen.tsx`, `DeleteListingModal.tsx`, and `ThemeContext.tsx`. **All 17 pre-existed at base commit `f1e4cb9`** (verified by checking out the base, running tsc, and counting — exact same 17). Out of scope for this plan; not logged to `deferred-items.md` because they are long-standing repo state, not novel discoveries from this plan's edits.

## User Setup Required

None — pure locale additions; no environment variables, dashboards, or external services.

## Next Phase Readiness
- **Plan 07-03 (validators.ts):** `bedroomsInvalid` / `bathroomCountInvalid` keys now resolvable via `t()`.
- **Plan 07-04 (Step3BasicInfo stepper rows):** `bedroomsLabel` / `bathroomCountLabel` now resolvable.
- **Plan 07-05 (index.tsx submit-catch M4_* discriminator):** Same `*Invalid` keys routed for inline error rows.
- **Parity gate:** `scripts/check-i18n-parity.sh` PASS — downstream plans inherit a clean gate.

## Self-Check: PASSED

- `src/locales/en.ts` — exists, contains all 4 new keys (grep `-c` = 1 for each).
- `src/locales/ru.ts` — exists, contains all 4 new keys (grep `-c` = 1 for each) with correct Cyrillic copy.
- Commit `6f78dde` — exists in `git log --oneline` (FOUND).
- Commit `f3eafb6` — exists in `git log --oneline` (FOUND).
- `bash scripts/check-i18n-parity.sh` exits 0 (PASS).
- `npx tsc --noEmit` net-new errors from `src/locales/` = 0 (CLEAN).

---
*Phase: 07-stepper-component-contextuallistingflow-integration*
*Plan: 02*
*Completed: 2026-05-25*

---
phase: 05-listing-form-validation-edit-flow
plan: 03
subsystem: i18n
tags: [i18n, localization, parity, createListing, validation-keys]

# Dependency graph
requires:
  - phase: 05-listing-form-validation-edit-flow
    provides: "Plan 01 validators.ts emits translation KEYS (e.g., 'createListing.bedroomsRequired') in FormErrorBag, not strings — this plan makes those keys resolvable"
provides:
  - "14 new i18n keys in src/locales/en.ts + src/locales/ru.ts (strict EN/RU parity)"
  - "9 *Required keys covering D-07 required-field map: description, city, district, bedrooms, bathrooms, area, rooms, maxGuests, propertyType"
  - "4 contactMissing* keys for D-11 Hospitality Alert.alert + inline error row"
  - "createListing.publishListing for D-16 edit-draft submit label"
  - "All keys resolvable via t(errors.field as TranslationKeys) pattern from Plan 02"
affects:
  - "Plan 04 (orchestrator integration) — can wire Alert.alert with t('createListing.contactMissing*') and submit label with t('createListing.publishListing')"
  - "Plan 02 (section errors threading) — t(errors.field) now resolves against real translations, not literal keys"
  - "Phase 6 Hospitality rendering — createListing.publishListing reusable as status-promotion verbiage reference"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extend existing createListing.*Required cluster for new validation error keys (RESEARCH Finding #4 namespace decision — no sibling namespace)"
    - "Validator stores translation KEYS (not strings) in FormErrorBag; sub-components resolve at render time via t(...) — keeps validators.ts pure (no i18n imports)"

key-files:
  created: []
  modified:
    - "src/locales/en.ts (+14 keys, 416 → 430 lines)"
    - "src/locales/ru.ts (+14 keys, 417 → 431 lines)"

key-decisions:
  - "Placed all 14 new keys immediately after existing 'createListing.tourTitleUrlRequired' to keep the *Required cluster contiguous"
  - "All new keys use [a-zA-Z.]-only characters — safe under WR-02 regex hazard in check-i18n-parity.sh"
  - "Did not touch existing 5-key *Required cluster (titleRequired, addressRequired, currencyRequired, priceRequired, tourTitleUrlRequired) — zero regression risk"

patterns-established:
  - "EN/RU parity via Record<TranslationKeys, string> tsc gate + check-i18n-parity.sh belt-and-suspenders (dual enforcement)"
  - "Translation keys for validator errors follow createListing.{field}Required shape for per-field error messages, createListing.contactMissing{Title,Message,Cta,Inline} for hybrid-rule Alert + inline error row"

requirements-completed: [FORM-04, FORM-06, FORM-08]

# Metrics
duration: 2min
completed: 2026-04-24
---

# Phase 5 Plan 03: i18n Validation Keys Summary

**14 new createListing.* i18n keys added in EN/RU parity — every validator error key from Plan 01 now resolves to translated text, plus D-11 Hospitality Alert strings and D-16 publishListing submit label**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-24T17:30:23Z
- **Completed:** 2026-04-24T17:32:00Z (approx)
- **Tasks:** 1 / 1
- **Files modified:** 2

## Accomplishments

- 14 new keys in src/locales/en.ts with exact values from PLAN action block
- 14 new keys in src/locales/ru.ts with translated values (same key names)
- EN/RU key-set parity preserved — `scripts/check-i18n-parity.sh` exits 0
- `Record<TranslationKeys, string>` compile-gate satisfied — tsc baseline stays at 16 lines (10 AuthContext + 2 ThemeContext + 4 misc pre-existing, unchanged)
- Unblocks Plan 02 `t(errors.field as TranslationKeys)` renders (keys now resolve instead of rendering literal strings)
- Unblocks Plan 04 orchestrator wiring of `Alert.alert(t('createListing.contactMissingTitle'), t('createListing.contactMissingMessage'), ...)` per D-11
- Unblocks Plan 04 submit label `t('createListing.publishListing')` for edit-draft promotion per D-16

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-worktree directive):

1. **Task 1: Add 14 validation i18n keys to en.ts + ru.ts in strict parity** — `1c70ed1` (feat)

## Files Created/Modified

- `src/locales/en.ts` — added 14 EN keys (416 → 430 lines; +14 exactly)
- `src/locales/ru.ts` — added 14 RU keys (417 → 431 lines; +14 exactly)

### 14 Keys Added (verbatim)

**EN values:**

| Key | Value |
|-----|-------|
| `createListing.descriptionRequired` | `Description is required` |
| `createListing.cityRequired` | `City is required` |
| `createListing.districtRequired` | `District is required` |
| `createListing.bedroomsRequired` | `Bedrooms is required` |
| `createListing.bathroomsRequired` | `Bathrooms is required` |
| `createListing.areaRequired` | `Area is required` |
| `createListing.roomsRequired` | `Rooms is required` |
| `createListing.maxGuestsRequired` | `Max guests is required` |
| `createListing.propertyTypeRequired` | `Please select a property type` |
| `createListing.contactMissingTitle` | `Contact info incomplete` |
| `createListing.contactMissingMessage` | `Phone and either WhatsApp or Telegram are required for hospitality listings. Add them in Account Settings.` |
| `createListing.contactMissingCta` | `Complete profile` |
| `createListing.contactMissingInline` | `Add phone + WhatsApp or Telegram in your profile to publish this listing.` |
| `createListing.publishListing` | `Publish Listing` |

**RU values (same key names):**

| Key | Value |
|-----|-------|
| `createListing.descriptionRequired` | `Описание обязательно` |
| `createListing.cityRequired` | `Город обязателен` |
| `createListing.districtRequired` | `Район обязателен` |
| `createListing.bedroomsRequired` | `Количество спален обязательно` |
| `createListing.bathroomsRequired` | `Количество ванных обязательно` |
| `createListing.areaRequired` | `Площадь обязательна` |
| `createListing.roomsRequired` | `Количество комнат обязательно` |
| `createListing.maxGuestsRequired` | `Макс. число гостей обязательно` |
| `createListing.propertyTypeRequired` | `Выберите тип недвижимости` |
| `createListing.contactMissingTitle` | `Контактная информация неполная` |
| `createListing.contactMissingMessage` | `Для объявлений размещения необходимы телефон и WhatsApp или Telegram. Добавьте их в настройках аккаунта.` |
| `createListing.contactMissingCta` | `Заполнить профиль` |
| `createListing.contactMissingInline` | `Добавьте телефон + WhatsApp или Telegram в профиле, чтобы опубликовать это объявление.` |
| `createListing.publishListing` | `Опубликовать объявление` |

## Verification Results

| Check | Result |
|-------|--------|
| `./scripts/check-i18n-parity.sh` | PASS (exit 0) — "en.ts and ru.ts key sets are identical" |
| `npx tsc --noEmit 2>&1 \| wc -l` | 16 (baseline preserved — pre-existing AuthContext + ThemeContext errors unchanged) |
| `./scripts/check-role-grep.sh` | PASS (exit 0) — Phase 3 D-14 invariants preserved |
| `./scripts/check-land-removed.sh` | PASS (exit 0) — Phase 4 FORM-01 invariants preserved |
| `npm test` | 150/150 passed, 18 suites passed |
| Each new key grep count in en.ts | 1 (all 14 keys) |
| Each new key grep count in ru.ts | 1 (all 14 keys) |
| Existing `createListing.titleRequired` grep in en.ts | 1 (preserved) |
| Existing `createListing.titleRequired` grep in ru.ts | 1 (preserved) |
| Line-count delta en.ts | +14 (416 → 430) |
| Line-count delta ru.ts | +14 (417 → 431) |

## Decisions Made

None beyond what the PLAN specified. Followed the plan verbatim:
- Placement: immediately after `createListing.tourTitleUrlRequired` (keeps `*Required` cluster contiguous per PLAN action block)
- Values: exact strings from PLAN §tasks/task-1/action
- RU translations: exact strings from PLAN §interfaces table + PATTERNS §13

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Threat Flags

None — threat register items T-05-03-01..04 were all assigned `accept` (static bundled locale strings, no network surface, no new trust boundaries introduced).

## User Setup Required

None — no external service configuration required.

## Signal for Plan 04

All Hospitality Alert strings + publishListing label are now resolvable via `t()`:

- `t('createListing.contactMissingTitle')` — Alert title for D-11 hybrid-rule failure
- `t('createListing.contactMissingMessage')` — Alert body
- `t('createListing.contactMissingCta')` — "Complete profile" button label
- `t('createListing.contactMissingInline')` — inline red error row above Contact Info section
- `t('createListing.publishListing')` — submit button label when editing a draft with `status === 'live'` per D-16

The orchestrator (Plan 04) can wire `Alert.alert(...)` and submit-label JSX safely without encountering missing-key tsc errors or literal-key renders.

## Next Phase Readiness

- Plan 02 (section errors threading) — downstream `t(errors.field as TranslationKeys)` renders now produce translated text (not literal keys)
- Plan 04 (orchestrator integration) — all translation keys referenced in the D-11 Alert + D-16 submit label are present
- Phase 6 Hospitality rendering — `createListing.publishListing` available as canonical "promote draft to live" verbiage reference

## Self-Check: PASSED

- Created files: (none — this plan only modifies existing files)
- Modified files exist and contain expected content:
  - `src/locales/en.ts` — FOUND (430 lines, 14 new keys verified via grep)
  - `src/locales/ru.ts` — FOUND (431 lines, 14 new keys verified via grep)
- Commit `1c70ed1` — FOUND in `git log --oneline -3`
- All 14 new keys present exactly once in each locale file (grep -c returned 1 for each)
- Existing `createListing.titleRequired` preserved in both files
- All phase-gate scripts (role-grep, i18n-parity, land-removed) exit 0
- tsc baseline 16 lines preserved (no new errors)
- All 150 jest tests pass

---
*Phase: 05-listing-form-validation-edit-flow*
*Completed: 2026-04-24*

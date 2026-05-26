---
quick_task: 260526-foc
title: Bring back the "Available from" date picker in the contextual listing flow
status: complete
worktree_branch: worktree-agent-a5e600da04b96a11b
base_commit: c4df2e9fee45f5f96497387a068b31141e056319
commit: 6e06f1a
commits:
  - aa46203  # Task 1 — FormBag/adapters/validator + 13 tests
  - f4fb0f1  # Task 2 — EN/RU i18n keys (5 keys × 2 locales)
  - 6e06f1a  # Task 3 — Step6DealConditions picker section + 8 smoke tests
files_modified:
  - src/components/ContextualListingFlow/types.ts
  - src/components/ContextualListingFlow/adapters.ts
  - src/components/ContextualListingFlow/validators.ts
  - src/components/ContextualListingFlow/Step6DealConditions.tsx
  - src/components/ContextualListingFlow/__tests__/adapters.test.ts
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/components/ContextualListingFlow/__tests__/Step6.test.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
manual_qa_required: true
date: 2026-05-26
---

# Quick Task 260526-foc — Restore "Available from" Date Picker

## What changed

### Task 1 — type/adapter/validator wiring (commit `aa46203`)

- `src/components/ContextualListingFlow/types.ts:55-60` — added `terms.availableDate?: string`
  (ISO-8601 `YYYY-MM-DD`; empty/undefined = "available now") with rationale comment about
  the nested-in-FormBag / top-level-in-Property shape mismatch.
- `src/components/ContextualListingFlow/adapters.ts:67-72` — `propertyToFormBag` now lifts
  top-level `Property.availableDate` (existing M3 schema at `src/types/Property.ts:32`) into
  `bag.terms.availableDate`.
- `src/components/ContextualListingFlow/adapters.ts:107-112` — `formBagToPropertyPayload`
  flattens `v.terms.availableDate` back to top-level `payload.availableDate`. Undefined
  survives (no coercion to `""`), so listings without a date render "Available now"
  downstream in `ListingMetaTable`.
- `src/components/ContextualListingFlow/validators.ts:31` — `FIELD_ORDER_PER_STEP[6]` appends
  `'terms.availableDate'` after `'terms.minTerm'` so a future scroll-to-first-error gets the
  right anchor.
- `src/components/ContextualListingFlow/validators.ts:123-135` — defensive format check
  inside step-6 branch (only fires on direct-write paths; picker UI emits valid format).
  Empty string is treated as "no date" (same as undefined). Invalid format → key
  `contextualListing.step6.availableDateInvalid`.

### Task 2 — i18n keys (commit `f4fb0f1`)

5 new keys in each locale, inserted directly after the existing `minTerm.3_months` row to
keep the step 6 namespace contiguous:

| Key                                              | EN                              | RU                                       |
| ------------------------------------------------ | ------------------------------- | ---------------------------------------- |
| `contextualListing.step6.availableDateLabel`     | Available from                  | Доступно с                               |
| `contextualListing.step6.availableDatePlaceholder` | Select date                   | Выберите дату                            |
| `contextualListing.step6.availableDateHint`      | Leave empty if available now    | Оставьте пустым, если доступно сейчас    |
| `contextualListing.step6.availableDateClear`     | Clear                           | Очистить                                 |
| `contextualListing.step6.availableDateInvalid`   | Invalid date                    | Неверная дата                            |

- `src/locales/en.ts:758-763` — 5 keys added.
- `src/locales/ru.ts:754-759` — 5 mirror keys added.

### Task 3 — Step 6 picker section + tests (commit `6e06f1a`)

- `src/components/ContextualListingFlow/Step6DealConditions.tsx:22` — imported
  `DateTimePicker` from `@react-native-community/datetimepicker@^8.6.0` (already in
  `package.json`) and `Platform` from `react-native`.
- `Step6DealConditions.tsx:42-44` — destructured `language` from `useLanguage()` and
  derived `dateLocale` (`'ru-RU'` | `'en-US'`).
- `Step6DealConditions.tsx:60-64` — `showDatePicker` local state (initially `false`).
- `Step6DealConditions.tsx:395-515` — new section rendered AFTER the rent_long-conditional
  prepayment/minTerm block. The picker is UNIVERSAL across all three dealTypes
  (sale / rent_long / rent_daily) because `availableDate` is always optional. Structure:
  - Section label (`availableDateLabel`)
  - Trigger `TouchableOpacity` (testID `availableDate-trigger`) — renders locale-formatted
    date if set, otherwise the placeholder text. Right edge contains a 📅 emoji and (when
    a date is set) an inline `Clear` button (testID `availableDate-clear`) that dispatches
    `availableDate: undefined`.
  - Hint text in `colors.textSecondary`.
  - Inline error row (testID `availableDate-error`) when `errors['terms.availableDate']` set.
  - Native `<DateTimePicker>` (testID `availableDate-picker`) gated by `showDatePicker`.
    iOS = `spinner` display + `themeVariant` + `textColor`; Android = default dialog that
    dismisses itself on selection. `onChange` emits `d.toISOString().slice(0, 10)`.
  - iOS-only `Done` button (testID `availableDate-done`) below the spinner.

- `src/components/ContextualListingFlow/__tests__/Step6.test.tsx:58-71` — Jest mock for
  `@react-native-community/datetimepicker` (mirrors the existing `react-native-maps` mock
  in `Step2.test.tsx`).
- `Step6.test.tsx:230-307` — 8 new RTL smoke tests (foc-1 .. foc-8):
  - foc-1/2/3: trigger renders on sale, rent_long, rent_daily.
  - foc-4: tapping trigger reveals `availableDate-picker`.
  - foc-5: picker `onChange` with a Date dispatches `terms.availableDate` as `YYYY-MM-DD`.
  - foc-6: pre-set value renders Clear button; tapping it dispatches `undefined`.
  - foc-7: empty value hides the Clear button.
  - foc-8: error prop renders inline error row.

## Files modified (exact list)

```
src/components/ContextualListingFlow/types.ts
src/components/ContextualListingFlow/adapters.ts
src/components/ContextualListingFlow/validators.ts
src/components/ContextualListingFlow/Step6DealConditions.tsx
src/components/ContextualListingFlow/__tests__/adapters.test.ts
src/components/ContextualListingFlow/__tests__/validators.test.ts
src/components/ContextualListingFlow/__tests__/Step6.test.tsx
src/locales/en.ts
src/locales/ru.ts
```

No files deleted; no `package.json` changes (datetimepicker was already in deps).

## Verification performed

| Gate                            | Baseline           | After 260526-foc   | Delta                                        |
| ------------------------------- | ------------------ | ------------------ | -------------------------------------------- |
| Jest — ContextualListingFlow    | 137/137 pass       | **158/158 pass**   | +21 (13 adapter/validator + 8 picker smoke)  |
| `npx tsc --noEmit`              | 17 errors          | **17 errors**      | 0 new (touched files all clean)              |
| `scripts/check-i18n-parity.sh`  | PASS               | **PASS**           | EN/RU key sets identical                     |
| `grep -r keyboardVerticalOffset src/` | 0 hits       | **0 hits**         | KBD-02 invariant preserved                   |

Per-commit verification (chronological):

```
aa46203 → 150/150 tests pass, tsc 17 errors (baseline), no deletions
f4fb0f1 → 150/150 tests pass, tsc 17 errors, i18n parity PASS, no deletions
6e06f1a → 158/158 tests pass, tsc 17 errors, i18n parity PASS, KBD-02 0 hits, no deletions
```

## Self-Check: PASSED

Files exist:
- FOUND: src/components/ContextualListingFlow/types.ts
- FOUND: src/components/ContextualListingFlow/adapters.ts
- FOUND: src/components/ContextualListingFlow/validators.ts
- FOUND: src/components/ContextualListingFlow/Step6DealConditions.tsx
- FOUND: src/components/ContextualListingFlow/__tests__/adapters.test.ts
- FOUND: src/components/ContextualListingFlow/__tests__/validators.test.ts
- FOUND: src/components/ContextualListingFlow/__tests__/Step6.test.tsx
- FOUND: src/locales/en.ts
- FOUND: src/locales/ru.ts

Commits exist on worktree branch `worktree-agent-a5e600da04b96a11b`:
- FOUND: aa46203 (Task 1)
- FOUND: f4fb0f1 (Task 2)
- FOUND: 6e06f1a (Task 3)

## Manual QA required (UNCHECKED)

The picker is a NATIVE iOS spinner / Android dialog modal. Automated tests mock it; the
real visual + theme + locale + native-modal-lifecycle behavior MUST be verified on a
physical device before the worktree branch is fast-forwarded into `main`.

### 24-cell on-device QA matrix

Two platforms × three dealTypes × two themes × two locales × two value-states = 24 cells.

| # | Platform | dealType    | theme | locale | initial | Action                                                                                       | Expected                                                                                                                                  | OK? |
|---|----------|-------------|-------|--------|---------|----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-----|
| 1 | iOS      | sale        | light | en     | empty   | Tap "Select date" → spinner appears                                                          | Spinner renders below trigger; Done button appears; trigger still says "Select date"                                                      | [ ] |
| 2 | iOS      | sale        | light | en     | set     | Picker preselected to existing date; change month → tap Done                                 | Trigger updates to new date (e.g. "Jun 1, 2026"); spinner + Done dismiss; Clear button visible                                            | [ ] |
| 3 | iOS      | sale        | dark  | en     | empty   | Tap trigger                                                                                  | Spinner uses dark themeVariant; textColor=white; trigger background = inputBackground (dark)                                              | [ ] |
| 4 | iOS      | sale        | dark  | ru     | set     | Trigger renders RU date (e.g. "1 июн. 2026 г."); tap Clear                                   | Clear dispatches undefined; trigger reverts to "Выберите дату"; placeholder color = textSecondary; Clear button disappears                | [ ] |
| 5 | iOS      | rent_long   | light | en     | empty   | Tap trigger → pick a date → Done; advance Next button                                        | Submit payload has top-level `availableDate: '2026-XX-XX'`; ListingMetaTable on details screen shows the date                             | [ ] |
| 6 | iOS      | rent_long   | dark  | ru     | set     | RU locale; tap Clear; advance Next; verify backend POST                                      | Payload `availableDate: undefined`; ListingMetaTable shows "Now"                                                                          | [ ] |
| 7 | iOS      | rent_daily  | light | en     | empty   | Step 6 thin step still shows deposit + picker, NO negotiable/prepayment/minTerm              | Only the deposit row + "Available from" row visible; D-19 thin step still respected (no other matrix cells appear)                        | [ ] |
| 8 | iOS      | rent_daily  | dark  | ru     | set     | Re-open Step 6 from Edit-on-behalf flow → existing date round-trips                          | Trigger renders existing date in RU; Done updates; payload retains date through update                                                    | [ ] |
| 9 | Android  | sale        | light | en     | empty   | Tap "Select date" → dialog appears                                                           | Native AlertDialog opens; selecting a date auto-dismisses; trigger updates; NO Done button (Android-only behavior)                        | [ ] |
| 10| Android  | sale        | light | en     | set     | Pre-existing date renders; tap Clear                                                         | Dispatches undefined; placeholder returns; clear button hides                                                                             | [ ] |
| 11| Android  | sale        | dark  | en     | empty   | Tap trigger → dialog                                                                         | Material dialog renders in dark theme automatically (system); trigger background follows app theme tokens                                 | [ ] |
| 12| Android  | sale        | dark  | ru     | set     | RU locale renders date string (e.g. "1 июн. 2026 г.")                                        | Date string matches RU format; Clear button label = "Очистить"                                                                            | [ ] |
| 13| Android  | rent_long   | light | en     | empty   | Submit flow end-to-end                                                                       | Payload top-level `availableDate` correct; ListingMetaTable on details renders                                                            | [ ] |
| 14| Android  | rent_long   | dark  | ru     | set     | Edit-on-behalf flow loads existing listing → modify date → save                              | Round-trip preserves date; backend update succeeds; details screen reflects new date                                                      | [ ] |
| 15| Android  | rent_daily  | light | en     | empty   | Thin step has only deposit + picker visible                                                  | No negotiable/prepayment/minTerm rows; only deposit + availableDate                                                                       | [ ] |
| 16| Android  | rent_daily  | dark  | ru     | set     | Clear button works; Done not present (Android auto-dismiss)                                  | Clear dispatches undefined; no orphaned modal state                                                                                       | [ ] |
| 17| iOS      | sale        | light | en     | set     | Backgrounding the app mid-spinner-open then returning                                        | Spinner state survives or cleanly re-opens; no crash                                                                                      | [ ] |
| 18| iOS      | rent_long   | light | ru     | empty   | Voiceover ON → focus trigger                                                                 | Accessibility label reads "Select date" (en) / "Выберите дату" (ru); Clear button has its own a11y label                                  | [ ] |
| 19| Android  | sale        | light | ru     | empty   | TalkBack ON → focus trigger                                                                  | TalkBack reads the placeholder text; Clear button announces "Очистить"                                                                    | [ ] |
| 20| iOS      | sale        | dark  | en     | empty   | Rotate device while picker open                                                              | Picker re-lays out cleanly; no clipping; Done button still tappable                                                                       | [ ] |
| 21| Android  | rent_long   | light | en     | empty   | Hardware back button while dialog open                                                       | Dialog dismisses; no field value set; no crash                                                                                            | [ ] |
| 22| iOS      | rent_daily  | dark  | en     | set     | Verify date format follows iOS locale settings (region: US)                                  | Trigger renders "Jun 1, 2026" style; toLocaleDateString respects en-US                                                                    | [ ] |
| 23| Android  | rent_long   | dark  | ru     | empty   | Pick a far-future date (e.g. 2030)                                                           | Picker accepts; payload `availableDate: '2030-XX-XX'`; ListingMetaTable shows date (>30 days = formatted)                                  | [ ] |
| 24| iOS      | rent_long   | light | en     | set     | Pick today's date                                                                            | Payload date stores today; ListingMetaTable shows "Now" (within 30 days)                                                                  | [ ] |

## Open follow-ups

1. **No ListingMetaTable changes required.** Existing component at `src/components/ListingMetaTable.tsx:32`
   already consumes `availableDate?: unknown` (top-level on Property). The new picker writes
   to the same field; downstream rendering is already wired.
2. **`Property.availableDate` is documented as `string`** in `src/types/Property.ts:32`. Backend
   should accept ISO-8601 date-only strings (`YYYY-MM-DD`). If the backend currently expects a
   different format (e.g. full ISO datetime), surface as a separate quick task — out of scope here.
3. **No min-date constraint** on the picker (user can select past dates). If the product wants
   to enforce future-only dates, a `minimumDate={new Date()}` prop addition is a one-line change
   in `Step6DealConditions.tsx:475` — flag for follow-up if PM wants it.
4. **No clear visual indicator** when the validator format-check error fires (since the picker
   normally emits valid dates). The error row is wired but is only reachable via direct-write
   data paths (copy/paste a malformed listing). Acceptable surface for a defensive guard.
5. **Tests use react-test-renderer** (project convention) — there is no fireEvent-style
   assertion of the native modal animation; only the `onChange` callback's behavior is verified.
   The visual modal must be checked manually on-device (per the 24-cell matrix above).

## Notes / non-deviations

- The original CreateListingForm pattern (commit `19bde0d^:src/components/CreateListingForm/BasicInfoSection.tsx`
  lines 9, 477-499) was used as the visual template for the picker — same iOS spinner + Done
  flow, same Android auto-dismiss, same `ISO date-only` storage format. Re-using a proven UX
  pattern minimizes new-modal-bug surface.
- The picker is rendered on rent_daily even though that step is documented as a "thin step"
  (D-19). Rationale: `availableDate` is OPTIONAL on every dealType (consistent with the
  Property type's `availableDate?: string`), and the user's request explicitly says to bring
  the picker back to Step 6. The D-19 invariant (no required fields on rent_daily) is preserved
  because the picker still does not add a required field.
- KBD-02 invariant: zero `keyboardVerticalOffset` introduced (grep gate at 0).
- No new package.json dependencies — `@react-native-community/datetimepicker@^8.6.0` was
  already present from M1.

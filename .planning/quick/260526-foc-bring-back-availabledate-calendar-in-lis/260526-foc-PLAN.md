---
phase: 260526-foc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ContextualListingFlow/types.ts
  - src/components/ContextualListingFlow/adapters.ts
  - src/components/ContextualListingFlow/validators.ts
  - src/components/ContextualListingFlow/Step6DealConditions.tsx
  - src/components/ContextualListingFlow/__tests__/adapters.test.ts
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: false
requirements:
  - QUICK-FOC-01  # Restore availableDate input surface on ContextualListingFlow

must_haves:
  truths:
    - "User on Step 6 (Deal Conditions) sees a labeled 'Available from' section with a date-picker trigger"
    - "Tapping the trigger opens the native datetimepicker (iOS modal/spinner; Android imperative) and lets the user pick a date between today and today+2 years inclusive"
    - "Selecting a date stores it as ISO YYYY-MM-DD in formBag.terms.availableDate; the trigger re-renders with the locale-formatted date"
    - "Pressing 'Clear' wipes the field; the trigger re-renders the placeholder ('Available now' / 'Доступно сейчас') and submit/advance is NOT blocked"
    - "Leaving the field blank is allowed at every step transition AND at final submit (no new validator gate)"
    - "Creating a listing with a date set persists availableDate (YYYY-MM-DD) on the new Property; PropertyDetailsScreen → ListingMetaTable renders that date (or 'Now' when within 30 days)"
    - "Editing an owned/moderated listing rehydrates the previously stored availableDate into the picker; clearing it submits a payload that omits the field (backend does not write an empty string)"
    - "Picker rejects (clamps) any out-of-range date: < today is silently coerced to today; > today+2y is coerced to today+2y"
    - "All UI strings render in both EN and RU; check-i18n-parity.sh stays GREEN"
    - "KBD-02 grep gate (`keyboardVerticalOffset` count in src/) stays at 0"
  artifacts:
    - path: "src/components/ContextualListingFlow/types.ts"
      provides: "FormBag.terms.availableDate?: string field"
      contains: "availableDate"
    - path: "src/components/ContextualListingFlow/adapters.ts"
      provides: "Round-trip mapping for top-level Property.availableDate <-> FormBag.terms.availableDate"
      contains: "availableDate"
    - path: "src/components/ContextualListingFlow/validators.ts"
      provides: "Soft-coerce out-of-range availableDate (no error emission)"
      contains: "availableDate"
    - path: "src/components/ContextualListingFlow/Step6DealConditions.tsx"
      provides: "Date picker section (trigger + clear + native invocation)"
      contains: "availableDate"
    - path: "src/locales/en.ts"
      provides: "4 new contextualListing.step6.availableDate* keys (EN)"
      contains: "contextualListing.step6.availableDateLabel"
    - path: "src/locales/ru.ts"
      provides: "4 new contextualListing.step6.availableDate* keys (RU)"
      contains: "contextualListing.step6.availableDateLabel"
  key_links:
    - from: "src/components/ContextualListingFlow/Step6DealConditions.tsx"
      to: "FormBag.terms.availableDate"
      via: "setTerms({ availableDate })"
      pattern: "setTerms\\(\\s*\\{[^}]*availableDate"
    - from: "src/components/ContextualListingFlow/adapters.ts"
      to: "Property.availableDate (top-level string)"
      via: "propertyToFormBag rehydrate + formBagToPropertyPayload submit"
      pattern: "availableDate"
    - from: "PropertyDetailsScreen → ListingMetaTable"
      to: "Property.availableDate"
      via: "availabilityValueFromRaw() formatter (unchanged)"
      pattern: "availabilityValueFromRaw"
---

<objective>
Restore the "Available from" date input that was dropped in the M3 ContextualListingFlow rewrite. The receiver side (`Property.availableDate` top-level field, `ListingMetaTable` formatting with the "Now"-within-30-days rule) is intact and unchanged — only the writer side needs to come back.

Purpose: today, no path exists for an owner (or moderator editing on behalf) to set a future availability date on a new or existing listing. As a result, the "Available" column in `ListingMetaTable` always renders "Now" / "Сейчас" because every persisted listing carries a blank or near-now `availableDate`.

Output: a single labeled section in Step 6 (Deal Conditions) — date trigger, native picker, clear button — shown for ALL deal types (sale + rent_long + rent_daily) per the locked user decision, OPTIONAL at all step transitions, with a min/max clamp of today → today+2y.

Locked decisions (NON-NEGOTIABLE):
- **D-01 Step placement:** Step 6 — Deal Conditions, shown for ALL dealTypes.
- **D-02 Requiredness:** OPTIONAL for all dealTypes. Blank = "available now" (matches the existing display contract in `ListingMetaTable.availabilityValueFromRaw()`). No new submit gate.
- **D-03 Date constraints:** min = today, max = today+2y. Out-of-range values are silently coerced to the nearest bound (never error-emitted).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

# Source of truth for the FormBag shape and round-trip contract
@src/components/ContextualListingFlow/types.ts
@src/components/ContextualListingFlow/adapters.ts
@src/components/ContextualListingFlow/validators.ts
@src/components/ContextualListingFlow/Step6DealConditions.tsx
@src/components/ContextualListingFlow/index.tsx
@src/components/ContextualListingFlow/styles.ts

# Existing reader side — DO NOT modify; format already correct
@src/components/ListingMetaTable.tsx
@src/types/Property.ts

# Locale parity is a CI gate
@src/locales/en.ts
@src/locales/ru.ts

# Existing tests we extend (NOT rewrite)
@src/components/ContextualListingFlow/__tests__/adapters.test.ts
@src/components/ContextualListingFlow/__tests__/validators.test.ts

<interfaces>
<!-- Contracts the executor needs without re-exploring the codebase. -->

From src/types/Property.ts (already in place; no change):
```typescript
// Top-level string on Property — what the backend persists.
availableDate?: string;  // ISO YYYY-MM-DD
```

From src/components/ContextualListingFlow/types.ts (extension target — add nested field):
```typescript
// === Step 6 (gated by dealType) ===
terms: {
  negotiable?: boolean;
  deposit?: { amount: string; currency: 'KGS' | 'USD' | 'EUR' };
  prepaymentMonths?: number;
  minTerm?: '1_day' | '1_month' | '3_months';
  // NEW — quick 260526-foc:
  availableDate?: string;  // ISO YYYY-MM-DD; undefined when not set
};
```

From src/components/ListingMetaTable.tsx (reader — DO NOT modify):
```typescript
// availabilityValueFromRaw() already handles:
//   - null / '' / invalid date → returns null (cell hidden)
//   - date within 30 days → returns t('property.now')  ("Now" / "Сейчас")
//   - date > 30 days out  → returns locale-formatted date
// This is the OPTIONAL semantics — blank == "available now".
```

From `@react-native-community/datetimepicker@^8.6.0` (already installed; no new dep):
```typescript
// iOS: <DateTimePicker mode="date" display="spinner" value={Date} onChange={...} minimumDate maximumDate />
// Android: import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
//          DateTimePickerAndroid.open({ value, mode: 'date', display: 'default', minimumDate, maximumDate, onChange })
```

From src/components/ContextualListingFlow/Step6DealConditions.tsx (extension point):
- The component is a pure `SectionProps` consumer (`{ values, onChange, errors }`).
- Existing sections in render order: negotiable (sale + rent_long) → deposit (ALL) → prepayment + minTerm (rent_long only).
- `setTerms()` helper at line 56 is the canonical write path — use it.
- All theme colors come from `useTheme()`; existing chip rows use `commonStyles.chip` + `chipRow`.
- All strings come from `t('contextualListing.step6.*')`.

From src/locales/en.ts / src/locales/ru.ts (extension point):
- Existing `contextualListing.step6.*` keys live around line 738–758 (en) and 737–754 (ru).
- Add the 4 new keys IMMEDIATELY after the existing step6 block to keep the namespace cohesive.
- CI gate: `scripts/check-i18n-parity.sh` must stay GREEN — every new EN key MUST have an RU twin.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Plumb availableDate through types + adapters + validator (with tests)</name>
  <files>
    src/components/ContextualListingFlow/types.ts,
    src/components/ContextualListingFlow/adapters.ts,
    src/components/ContextualListingFlow/validators.ts,
    src/components/ContextualListingFlow/__tests__/adapters.test.ts,
    src/components/ContextualListingFlow/__tests__/validators.test.ts
  </files>
  <behavior>
    - Test A (adapters round-trip — set):
      `propertyToFormBag({ availableDate: '2026-09-01', ... })` produces a FormBag where
      `bag.terms.availableDate === '2026-09-01'`.
    - Test B (adapters round-trip — missing):
      `propertyToFormBag({ /* no availableDate */ })` produces a FormBag where
      `bag.terms.availableDate === undefined`.
    - Test C (adapters round-trip — empty string):
      `propertyToFormBag({ availableDate: '' })` produces a FormBag where
      `bag.terms.availableDate === undefined` (empty string is normalized to undefined on rehydrate).
    - Test D (payload — set):
      `formBagToPropertyPayload(bagWith('2026-09-01'))` returns a payload whose
      TOP-LEVEL `availableDate === '2026-09-01'` (NOT under `terms`).
    - Test E (payload — undefined):
      `formBagToPropertyPayload(bagWithUndefined)` returns a payload where the
      `availableDate` key is OMITTED entirely (so backend does not write an empty string).
      Assert via `expect(payload).not.toHaveProperty('availableDate')`.
    - Test F (payload — empty string):
      `formBagToPropertyPayload(bagWithEmptyString)` ALSO omits `availableDate` from the payload.
    - Test G (validator — never errors):
      For each `stepN in [1..6]` and for each dealType in `['sale','rent_long','rent_daily']`,
      `validateStep(stepN, bagWithUndefinedAvailableDate).errors['terms.availableDate']` is undefined.
      In other words: the absence of `availableDate` is NEVER a validation error on ANY step.
    - Test H (validator — soft-coerce past): a helper exported alongside (e.g.
      `clampAvailableDate(input?: string, now = new Date()): string | undefined`) coerces
      `'2020-01-01'` → today's ISO date (YYYY-MM-DD).
    - Test I (validator — soft-coerce future): the same helper coerces
      `'2099-01-01'` → today+2y ISO date.
    - Test J (validator — preserves in-range): the helper passes `'today+30d'` through unchanged
      (use `new Date()` + 30*24*60*60*1000 and format to YYYY-MM-DD).
    - Test K (validator — undefined passthrough): the helper returns `undefined` for both
      `undefined` and `''` input.
  </behavior>
  <action>
    1) Extend `FormBag.terms` in `src/components/ContextualListingFlow/types.ts` with `availableDate?: string`. This is the ONLY change to FormBag — do not touch any other field.

    2) In `src/components/ContextualListingFlow/adapters.ts`:
       - In `propertyToFormBag()`: read `p.availableDate` (top-level on Property). Normalize empty string to `undefined`: `availableDate: p.availableDate ? p.availableDate : undefined`. Write to `terms.availableDate`.
       - In `formBagToPropertyPayload()`: write `availableDate: v.terms.availableDate` at the TOP LEVEL of the payload (NOT under `terms`). After the payload object is built, if `v.terms.availableDate` is `undefined` or `''`, delete the `availableDate` key from the payload entirely (use `delete payload.availableDate`). This matches the existing "strip undefined leaves for clean payload" comment at the end of the function — but applied to a single top-level key.
       - IMPORTANT: `v.terms.availableDate` MUST NOT leak into the nested `terms: { ... }` block of the payload. The receiver contract (Property type) puts `availableDate` at the top level. Keep the nested `terms` block strictly to `{ negotiable, deposit, prepaymentMonths, minTerm }`.

    3) In `src/components/ContextualListingFlow/validators.ts`:
       - Add an exported helper `clampAvailableDate(input?: string, now: Date = new Date()): string | undefined` that:
         - Returns `undefined` for `undefined` or `''` input.
         - Parses `input` via `new Date(input)`. If `isNaN(parsed.getTime())`, return `undefined` (silently drop malformed input — the picker can't produce these but a copy-paste from another listing could).
         - Computes `minDate = startOfDay(now)` and `maxDate = startOfDay(now) + 2 years`.
         - Clamps `parsed` to `[minDate, maxDate]`.
         - Returns the clamped date as YYYY-MM-DD (use `.toISOString().slice(0, 10)` AFTER setting hours to 12:00 UTC to avoid TZ-rollover edge cases on the boundary day).
       - DO NOT add `terms.availableDate` to any error path in `validateStep()`. Per D-02, this field is OPTIONAL on every step. The validator's contract for this field is: never reject, never error, just silently coerce in the helper (Step 6 UI calls the helper before writing).
       - DO NOT add `'terms.availableDate'` to `FIELD_ORDER_PER_STEP[6]` — it can never become a scroll-to-error target.

    4) Extend `src/components/ContextualListingFlow/__tests__/adapters.test.ts` with Tests A–F above. Keep all existing adapter tests untouched.

    5) Extend `src/components/ContextualListingFlow/__tests__/validators.test.ts` with Tests G–K above. Keep all existing validator tests untouched. Test G must iterate all six steps × three dealTypes (18 assertions, one `expect(...).toBeUndefined()` each).

    NOTE on date-only ISO shape: store as `YYYY-MM-DD` (date-only, no time component). The reader (`ListingMetaTable.availabilityValueFromRaw`) calls `new Date(raw)` which accepts both `'2026-09-01'` and `'2026-09-01T00:00:00.000Z'`. We pick date-only for clean payloads and to match the existing optional-string contract on `Property.availableDate`.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; npx jest src/components/ContextualListingFlow/__tests__/adapters.test.ts src/components/ContextualListingFlow/__tests__/validators.test.ts --runInBand</automated>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; npx tsc --noEmit 2>&amp;1 | grep -E 'ContextualListingFlow/(types|adapters|validators)' ; echo "exit=$?"</automated>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -rn 'keyboardVerticalOffset' src/ 2>/dev/null | wc -l</automated>
  </verify>
  <done>
    - All new adapter + validator tests (Tests A–K above) pass; existing tests in both suites still pass (no regressions).
    - `npx tsc --noEmit` produces ZERO new errors scoped to `ContextualListingFlow/{types,adapters,validators}.ts` (project-wide pre-existing tsc errors out of scope).
    - `FormBag.terms.availableDate?: string` exists in `types.ts`.
    - `clampAvailableDate()` is exported from `validators.ts`.
    - KBD-02 grep gate (`keyboardVerticalOffset` count in `src/`) is still 0.
    - No new dependency added to `package.json`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add 4 EN+RU i18n keys for the date-picker section</name>
  <files>src/locales/en.ts, src/locales/ru.ts</files>
  <action>
    Add the following 4 keys to BOTH `src/locales/en.ts` and `src/locales/ru.ts`. Place them immediately after the existing `contextualListing.step6.minTerm.3_months` line so the step6 namespace stays cohesive. Do NOT touch any other keys.

    Keys + values:

    English (`src/locales/en.ts`):
    - `'contextualListing.step6.availableDateLabel': 'Available from'`
    - `'contextualListing.step6.availableDateHint': 'Leave blank if available now'`
    - `'contextualListing.step6.availableDatePlaceholder': 'Available now'`
    - `'contextualListing.step6.availableDateClear': 'Clear'`

    Russian (`src/locales/ru.ts`):
    - `'contextualListing.step6.availableDateLabel': 'Доступно с'`
    - `'contextualListing.step6.availableDateHint': 'Оставьте пустым, если уже доступно'`
    - `'contextualListing.step6.availableDatePlaceholder': 'Доступно сейчас'`
    - `'contextualListing.step6.availableDateClear': 'Очистить'`

    Constraints:
    - DO NOT modify any key OUTSIDE the `contextualListing.step6.*` namespace.
    - DO NOT modify any existing `contextualListing.step6.*` key (only add 4 new keys).
    - The `check-i18n-parity.sh` script will FAIL if you add a key to one locale and forget the other. The 4 keys land in the same commit as both locales together.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; bash scripts/check-i18n-parity.sh</automated>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -c "contextualListing.step6.availableDate" src/locales/en.ts</automated>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -c "contextualListing.step6.availableDate" src/locales/ru.ts</automated>
  </verify>
  <done>
    - `check-i18n-parity.sh` exits 0 (GREEN).
    - EN file has exactly 4 occurrences of `contextualListing.step6.availableDate`.
    - RU file has exactly 4 occurrences of `contextualListing.step6.availableDate`.
    - Diff against `main` shows ONLY +4 additions per locale, zero modifications or deletions.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Render the date-picker section in Step6DealConditions.tsx + on-device QA matrix</name>
  <what-built>
    Insert a new "Available from" section into `src/components/ContextualListingFlow/Step6DealConditions.tsx`. Placement: AFTER the entire Deposit section block (closing `</View>` of the deposit `commonStyles.section` wrapper at line 247 in the current source) and BEFORE the `{showPrepayMin ? (...) : null}` block. This keeps the visual rhythm (negotiable → deposit → availableDate → [rent_long-only: prepayment → minTerm]) and means availableDate is the LAST item visible to sale and rent_daily flows, while rent_long flows see it sandwiched mid-step (acceptable per locked decisions — same place, same UI, regardless of dealType).

    Section structure (single `<View style={commonStyles.section}>` wrapper):
    1. `<Text style={[commonStyles.sectionLabel, { color: colors.text }]}>` → `t('contextualListing.step6.availableDateLabel')` ("Available from" / "Доступно с")
    2. A `<TouchableOpacity testID="availableDate-trigger">` styled with `commonStyles.input` + `colors.border` + `colors.inputBackground` (matching the deposit TextInput visual contract — same height, same border, same radius). Tap handler: `openDatePicker()`. Content: a single `<Text>` rendering either:
       - When `values.terms.availableDate` is set: `new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(values.terms.availableDate))` — in `colors.text`.
       - When unset: `t('contextualListing.step6.availableDatePlaceholder')` — in `colors.textSecondary`.
    3. A small right-aligned `<TouchableOpacity testID="availableDate-clear">` rendered ONLY when `values.terms.availableDate` is set (conditional). Sits below the trigger or in a flex row with the trigger — planner's pick, executor honors visual rhythm of the rest of the step. Label: `t('contextualListing.step6.availableDateClear')`. Color: `colors.textSecondary` (subtle). Tap handler: `setTerms({ availableDate: undefined })`.
    4. A hint `<Text>` below the row: `t('contextualListing.step6.availableDateHint')` in `colors.textSecondary`, smaller font (reuse `commonStyles.errorText` sizing but with `textSecondary` instead of `colors.error`).

    `openDatePicker()` implementation — wrap behind a single helper to keep the JSX clean:

    ```text
    const openDatePicker = () => {
      const now = new Date();
      const minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());                 // today 00:00 local
      const maxDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());              // today + 2y 00:00 local
      const currentValue = values.terms.availableDate
        ? new Date(values.terms.availableDate)
        : minDate;

      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: currentValue,
          mode: 'date',
          display: 'default',
          minimumDate: minDate,
          maximumDate: maxDate,
          onChange: (event, selectedDate) => {
            if (event.type !== 'set' || !selectedDate) return;   // user dismissed
            const clamped = clampAvailableDate(toIsoDate(selectedDate));
            setTerms({ availableDate: clamped });
          },
        });
      } else {
        // iOS — render an inline <DateTimePicker> inside a <Modal>. Local component state
        // `isPickerOpen` toggles the modal; pressing "Done" applies + closes, "Cancel" closes
        // without applying. Use display="spinner" or "inline" — pick whichever looks closer to
        // the existing modal aesthetic in the codebase (Step2 location-picker pattern is the
        // closest precedent — if no precedent, use display="spinner" inside a centered modal).
        setPickerOpen(true);
      }
    };
    ```

    Key implementation details:
    - `toIsoDate(d: Date): string` — local helper that returns `${y}-${mm}-${dd}` with zero-pad. DO NOT use `.toISOString().slice(0, 10)` directly — that converts to UTC first and can off-by-one near midnight in `+06:00` Bishkek. Construct from local components.
    - Always pipe the user's selection through `clampAvailableDate()` (imported from `./validators`) before calling `setTerms()`. This enforces the silent-coerce contract (D-03) defense-in-depth even though the picker's `minimumDate`/`maximumDate` already constrain the spinner.
    - DO NOT introduce `KeyboardAvoidingView` or `keyboardVerticalOffset` anywhere — the picker is modal and does not interact with the keyboard. The KBD-02 grep gate stays at 0.
    - Theme: pull all colors from `useTheme()` — `colors.text`, `colors.textSecondary`, `colors.border`, `colors.inputBackground`, `colors.surface`. NO hardcoded hex anywhere in the new section.
    - Add imports at the top of the file:
      - `Platform, Modal` from `'react-native'`
      - `DateTimePicker, { DateTimePickerAndroid }` from `'@react-native-community/datetimepicker'`
      - `clampAvailableDate` from `'./validators'`
    - Preserve ALL existing Step 6 code (negotiable, deposit, prepayment, minTerm) VERBATIM. The diff in this file is INSERT-ONLY for the new section + INSERT-ONLY for the new imports/helpers + (iOS only) one piece of local state `const [isPickerOpen, setPickerOpen] = useState(false)` and one Modal block at the end of the component's returned JSX. Do not rearrange existing sections.

    Submit-time clamp (defense-in-depth): the orchestrator (`index.tsx`) does NOT need to be touched if Step 6's UI is the only writer of `terms.availableDate` — `clampAvailableDate` is already called inline on every picker `onChange`. We rely on that single chokepoint.
  </what-built>
  <how-to-verify>
    Build to physical devices and walk through the matrix below. The picker UX is native-modal and hard to automate; this checkpoint is the canonical gate.

    **QA matrix (24 cells = 2 platforms × 2 languages × 3 entry modes × 2 set/clear states):**

    | # | Platform | Lang | Mode | Action | Expected |
    |---|----------|------|------|--------|----------|
    |  1 | iOS      | EN   | create     | Reach Step 6, tap trigger, pick a date 30+ days out, advance + submit | Listing persists; new property's `availableDate` in payload matches picked date; `PropertyDetailsScreen` `ListingMetaTable` shows the formatted date |
    |  2 | iOS      | EN   | create     | Reach Step 6, leave blank, submit                                    | Listing persists; payload has no `availableDate` key; `ListingMetaTable` shows "Now" |
    |  3 | iOS      | EN   | create     | Set a date, tap "Clear", submit                                       | Trigger reverts to placeholder; payload has no `availableDate` key; `ListingMetaTable` shows "Now" |
    |  4 | iOS      | RU   | create     | Same as #1 but RU                                                     | All strings render in RU; date formatted via `ru-RU` locale (e.g. "1 сент. 2026") |
    |  5 | iOS      | RU   | create     | Same as #2 but RU                                                     | Placeholder is "Доступно сейчас"; hint is "Оставьте пустым, если уже доступно" |
    |  6 | iOS      | EN   | edit-owner | Open existing listing that HAS availableDate; reach Step 6           | Trigger shows the stored date, not the placeholder |
    |  7 | iOS      | EN   | edit-owner | Open existing listing with availableDate; clear it; save             | Updated property's payload has no `availableDate`; `ListingMetaTable` flips to "Now" |
    |  8 | iOS      | EN   | edit-owner | Open existing listing WITHOUT availableDate; set a date; save        | Updated property persists the new date |
    |  9 | iOS      | RU   | edit-owner | Same as #6 but RU                                                     | RU formatting |
    | 10 | iOS      | EN   | edit-mod   | Open ANY existing listing as moderator; reach Step 6; set/clear      | Same behavior as edit-owner; submit succeeds through the PUT /moderation/listings/:id field-only path (260511-cog) |
    | 11 | iOS      | EN   | create     | Try to pick a date BEFORE today (drag past today in the spinner)     | Spinner clamps to today (native picker behavior); if you somehow paste an out-of-range string into the value via state mutation, `clampAvailableDate` coerces it to today |
    | 12 | iOS      | EN   | create     | Try to pick a date BEYOND today+2y                                    | Spinner clamps to today+2y; payload reflects the clamped date |
    | 13 | Android  | EN   | create     | Same as #1 (Moto G XT2513V)                                          | Native Android dialog opens; picked date persists |
    | 14 | Android  | EN   | create     | Same as #2                                                            | Same as #2 |
    | 15 | Android  | EN   | create     | Open dialog, hit Cancel/back                                          | No state change; trigger remains at previous value |
    | 16 | Android  | RU   | create     | Same as #4 but Android                                                | All RU strings + ru-RU formatted output |
    | 17 | Android  | EN   | edit-owner | Same as #6 but Android                                                | Trigger pre-populated from stored value |
    | 18 | Android  | EN   | edit-owner | Same as #7 but Android                                                | Clear → payload omits field → ListingMetaTable shows "Now" |
    | 19 | Android  | RU   | edit-owner | Same as #9 but Android                                                | RU formatting on Android |
    | 20 | Android  | EN   | edit-mod   | Same as #10 but Android                                               | Same |
    | 21 | Android  | EN   | create     | Same as #11 but Android (min clamp)                                  | Android dialog rejects pre-today dates |
    | 22 | Android  | EN   | create     | Same as #12 but Android (max clamp)                                  | Android dialog rejects > today+2y |
    | 23 | iOS+And  | EN   | create     | Open Step 6 with `dealType = 'sale'` and again with `'rent_daily'`   | Section appears in BOTH (per D-01 — all dealTypes) |
    | 24 | iOS+And  | EN   | create     | Open Step 6 with `dealType = 'rent_long'`                            | Section appears between deposit and prepayment; full flow still submits |

    **Theme parity sub-matrix (spot-check, not exhaustive):**
    - Light + Dark mode: trigger background, border, and text are all theme-token-driven; no hardcoded hex visible. Eyeball cells 1 + 13 in dark mode.

    **Grep gates (run before opening for verify):**
    ```
    grep -rn 'keyboardVerticalOffset' src/                            → MUST return 0 lines
    grep -c "contextualListing.step6.availableDate" src/locales/en.ts → MUST return 4
    grep -c "contextualListing.step6.availableDate" src/locales/ru.ts → MUST return 4
    ```

    **Test suite (no new dedicated Step6 UI tests required — the picker is native-modal and the existing Step6.test.tsx mocks would need a heavy lift; the validator + adapter coverage from Task 1 is the automated gate; the on-device walk is the UX gate):**
    ```
    npx jest src/components/ContextualListingFlow/__tests__/ --runInBand     → MUST be green
    bash scripts/check-i18n-parity.sh                                         → MUST exit 0
    npx tsc --noEmit 2>&1 | grep ContextualListingFlow                       → MUST show zero NEW errors in the four touched files
    ```
  </how-to-verify>
  <resume-signal>Type "approved" after all 24 QA cells pass on iPhone 15 Pro Max + Moto G XT2513V, or describe failures cell by cell.</resume-signal>
</task>

</tasks>

<verification>
End-to-end phase verification (all must pass before close):

1. **Automated (Jest):**
   - `npx jest src/components/ContextualListingFlow/__tests__/ --runInBand` → all suites green.
   - New adapter tests A–F + validator tests G–K all pass.

2. **Automated (TypeScript):**
   - `npx tsc --noEmit` → zero NEW errors in `src/components/ContextualListingFlow/{types,adapters,validators,Step6DealConditions}.tsx`.
   - Pre-existing project-wide tsc errors (e.g. App.tsx Property.tours per memory) are out of scope.

3. **Automated (i18n parity):**
   - `bash scripts/check-i18n-parity.sh` → exit 0.
   - EN file has 4 occurrences of `contextualListing.step6.availableDate`; RU file has 4.

4. **Automated (KBD-02 invariant):**
   - `grep -rn 'keyboardVerticalOffset' src/ | wc -l` → 0 (unchanged from baseline).

5. **Manual on-device QA (24-cell matrix in Task 3):**
   - Both physical devices (iPhone 15 Pro Max + Moto G XT2513V).
   - Both languages (EN + RU).
   - All three modes (create + edit-owner + edit-mod).
   - Set + clear + leave-blank states all behave per spec.

6. **No dependency drift:**
   - `package.json` diff vs `main` is EMPTY (no new dep added; `@react-native-community/datetimepicker@^8.6.0` was already installed).

7. **No scope drift:**
   - Files touched is a STRICT subset of `files_modified` in frontmatter.
   - No keys outside `contextualListing.step6.*` were added/modified.
   - No existing Step 6 section (negotiable / deposit / prepayment / minTerm) was rearranged or modified — only INSERT of the new section.
</verification>

<success_criteria>
The phase is DONE when:

- [ ] On a fresh `create` flow, a user can reach Step 6, tap "Available from", pick a date, confirm, advance to submit, and the resulting listing's `availableDate` is the picked date (verified by reading the just-created listing's payload or the rendered `ListingMetaTable` value).
- [ ] On the same fresh `create` flow, a user can reach Step 6, leave the date blank, submit, and the resulting listing has no `availableDate` (payload omits the field; `ListingMetaTable` renders "Now" / "Сейчас").
- [ ] On an `edit-owner` flow against a listing that has `availableDate` set, the trigger pre-populates with the stored date; clearing + saving omits the field from the PUT payload.
- [ ] On an `edit-mod` flow, the same picker works identically (the photo-gate from 260525-x8l is unaffected — availableDate is not photo-related).
- [ ] The picker enforces today ≤ selection ≤ today+2y via `minimumDate`/`maximumDate`; `clampAvailableDate()` is an additional silent-coerce safety net.
- [ ] EN + RU strings render correctly on both platforms; locale-formatted date matches the user's language (en-US for EN; ru-RU for RU).
- [ ] All 7 automated gates above pass (5 listed in `<verification>` + the 2 grep counts in Task 3 `<how-to-verify>`).
- [ ] User verbal-approves the 24-cell QA matrix in Task 3.
</success_criteria>

<output>
After completion, create `.planning/quick/260526-foc-bring-back-availabledate-calendar-in-lis/260526-foc-SUMMARY.md` with:
- Files touched + line-count deltas
- All 4 new i18n keys (EN + RU values verbatim) for future grep
- The 24-cell QA matrix result (one row per cell: pass / fail / N/A)
- Any deviations from the locked decisions or constraints (none expected — flag explicitly if any)
- Carry-forward items (e.g. should `Property.availableDate` ever migrate to a stricter ISO format? — leave OUT-OF-SCOPE seed in SUMMARY if surfaced during QA)
- Final commit SHA(s) and merge SHA to `main`
</output>

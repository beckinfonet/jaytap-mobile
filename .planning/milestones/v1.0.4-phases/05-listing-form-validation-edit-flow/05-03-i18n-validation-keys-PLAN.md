---
phase: 05-listing-form-validation-edit-flow
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: true
requirements: [FORM-04, FORM-06, FORM-08]
tags: [i18n, localization, parity]
must_haves:
  truths:
    - "14 new validation i18n keys exist in both en.ts and ru.ts — parity-enforced by the Record<TranslationKeys, string> tsc gate AND scripts/check-i18n-parity.sh"
    - "Every validator error key from validators.ts has a translation in both locales"
    - "createListing.publishListing exists in both locales for the D-16 edit-draft submit label"
    - "contactMissingTitle/Message/Cta/Inline exist for the D-11 Alert.alert and inline contact error row"
  artifacts:
    - path: "src/locales/en.ts"
      provides: "14 new EN validation/status keys in createListing.* cluster"
      contains: "'createListing.publishListing'"
    - path: "src/locales/ru.ts"
      provides: "14 new RU validation/status keys in createListing.* cluster"
      contains: "'createListing.publishListing'"
  key_links:
    - from: "src/components/CreateListingForm/validators.ts"
      to: "src/locales/en.ts + src/locales/ru.ts"
      via: "error values are translation keys — looked up via t(errors.field as TranslationKeys)"
      pattern: "'createListing\\.\\w+Required'"
    - from: "src/screens/CreateListingScreen.tsx (Plan 04)"
      to: "src/locales/en.ts + src/locales/ru.ts"
      via: "t('createListing.contactMissing*') + t('createListing.publishListing')"
      pattern: "t\\('createListing\\.(contactMissing|publishListing)"
---

<objective>
Add 14 new i18n keys to both `src/locales/en.ts` and `src/locales/ru.ts` in strict parity. Every validator error key from Plan 01's `validators.ts` gets an English + Russian translation. The D-11 Hospitality Alert.alert strings and the D-16 `publishListing` submit-label string are added in the same pass.

Purpose: Without these keys, Plan 02's `t(errors.field as TranslationKeys)` call sites would render literal keys (e.g., `"createListing.bedroomsRequired"`) instead of translated text, AND the `Record<TranslationKeys, string>` compile gate in ru.ts would fail. This plan is parallel-safe with Plan 02 (zero file overlap; both depend only on Plan 01).

Output:
- 14 new EN keys in `src/locales/en.ts`
- 14 new RU keys in `src/locales/ru.ts` (same keys, translated values)
- `scripts/check-i18n-parity.sh` still exits 0
- tsc baseline ≤ 16 lines
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md
@.planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md
@.planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md
@src/locales/en.ts
@src/locales/ru.ts
@scripts/check-i18n-parity.sh

<interfaces>
Existing `createListing.*Required` cluster at en.ts (lines 225-229 approx):
```typescript
'createListing.titleRequired': 'Title is required',
'createListing.addressRequired': 'Address is required',
'createListing.currencyRequired': 'Please select a currency (USD or сом)',
'createListing.priceRequired': 'Price is required',
'createListing.tourTitleUrlRequired': 'Please enter both tour title and URL',
```

Corresponding RU cluster at ru.ts (similar area). Both files declare `Record<TranslationKeys, string>` at export — tsc enforces parity.

`scripts/check-i18n-parity.sh` is a grep-based belt-and-suspenders check with a KNOWN regex hazard (WR-02 from Phase 4): the regex `'[a-zA-Z.]+':` EXCLUDES digit-containing keys. All new keys below use ONLY `[a-zA-Z.]` chars — safe under the current regex.

14 new keys to add (RESEARCH Finding #4 projected set):

| Key | EN value | RU value |
|-----|----------|----------|
| `createListing.descriptionRequired` | `'Description is required'` | `'Описание обязательно'` |
| `createListing.cityRequired` | `'City is required'` | `'Город обязателен'` |
| `createListing.districtRequired` | `'District is required'` | `'Район обязателен'` |
| `createListing.bedroomsRequired` | `'Bedrooms is required'` | `'Количество спален обязательно'` |
| `createListing.bathroomsRequired` | `'Bathrooms is required'` | `'Количество ванных обязательно'` |
| `createListing.areaRequired` | `'Area is required'` | `'Площадь обязательна'` |
| `createListing.roomsRequired` | `'Rooms is required'` | `'Количество комнат обязательно'` |
| `createListing.maxGuestsRequired` | `'Max guests is required'` | `'Макс. число гостей обязательно'` |
| `createListing.propertyTypeRequired` | `'Please select a property type'` | `'Выберите тип недвижимости'` |
| `createListing.contactMissingTitle` | `'Contact info incomplete'` | `'Контактная информация неполная'` |
| `createListing.contactMissingMessage` | `'Phone and either WhatsApp or Telegram are required for hospitality listings. Add them in Account Settings.'` | `'Для объявлений размещения необходимы телефон и WhatsApp или Telegram. Добавьте их в настройках аккаунта.'` |
| `createListing.contactMissingCta` | `'Complete profile'` | `'Заполнить профиль'` |
| `createListing.contactMissingInline` | `'Add phone + WhatsApp or Telegram in your profile to publish this listing.'` | `'Добавьте телефон + WhatsApp или Telegram в профиле, чтобы опубликовать это объявление.'` |
| `createListing.publishListing` | `'Publish Listing'` | `'Опубликовать объявление'` |
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 14 validation i18n keys to en.ts + ru.ts in strict parity</name>
  <files>src/locales/en.ts, src/locales/ru.ts</files>
  <read_first>
    - src/locales/en.ts (full file — locate existing `createListing.*Required` cluster around lines 225-229)
    - src/locales/ru.ts (full file — locate corresponding RU cluster AND the `Record<TranslationKeys, string>` declaration at line 1-3)
    - scripts/check-i18n-parity.sh (understand the regex gate — `'[a-zA-Z.]+':` excludes digits; all new keys are safe)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §13 (complete key list with both languages)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #4 (namespace decision: extend `createListing.*Required`, no sibling namespace)
  </read_first>
  <behavior>
    - Both en.ts and ru.ts gain the SAME 14 keys at the SAME positions in the createListing.* cluster
    - EN file compiles cleanly (no syntax errors)
    - RU file compiles cleanly; `Record<TranslationKeys, string>` constraint satisfied (tsc would fail otherwise)
    - `scripts/check-i18n-parity.sh` exits 0 (the grep-based parity check sees both files with the same key set)
    - tsc baseline preserved at ≤16 lines
    - No unrelated keys added or modified
  </behavior>
  <action>
    **Both files get the same 14 keys.** Place them grouped together immediately AFTER the existing `createListing.tourTitleUrlRequired` key (which sits at the bottom of the existing `*Required` cluster). This keeps all `createListing.*Required` keys contiguous for readability.

    **If the exact line number shifts from 229, find the key via grep:**
    ```bash
    grep -n "createListing.tourTitleUrlRequired" src/locales/en.ts
    grep -n "createListing.tourTitleUrlRequired" src/locales/ru.ts
    ```
    Insert the 14 new keys immediately after that matched line.

    **EN additions (exact, use these values verbatim — trailing commas required per Prettier):**
    ```typescript
      'createListing.descriptionRequired': 'Description is required',
      'createListing.cityRequired': 'City is required',
      'createListing.districtRequired': 'District is required',
      'createListing.bedroomsRequired': 'Bedrooms is required',
      'createListing.bathroomsRequired': 'Bathrooms is required',
      'createListing.areaRequired': 'Area is required',
      'createListing.roomsRequired': 'Rooms is required',
      'createListing.maxGuestsRequired': 'Max guests is required',
      'createListing.propertyTypeRequired': 'Please select a property type',
      'createListing.contactMissingTitle': 'Contact info incomplete',
      'createListing.contactMissingMessage': 'Phone and either WhatsApp or Telegram are required for hospitality listings. Add them in Account Settings.',
      'createListing.contactMissingCta': 'Complete profile',
      'createListing.contactMissingInline': 'Add phone + WhatsApp or Telegram in your profile to publish this listing.',
      'createListing.publishListing': 'Publish Listing',
    ```

    **RU additions (exact — same key names, translated values):**
    ```typescript
      'createListing.descriptionRequired': 'Описание обязательно',
      'createListing.cityRequired': 'Город обязателен',
      'createListing.districtRequired': 'Район обязателен',
      'createListing.bedroomsRequired': 'Количество спален обязательно',
      'createListing.bathroomsRequired': 'Количество ванных обязательно',
      'createListing.areaRequired': 'Площадь обязательна',
      'createListing.roomsRequired': 'Количество комнат обязательно',
      'createListing.maxGuestsRequired': 'Макс. число гостей обязательно',
      'createListing.propertyTypeRequired': 'Выберите тип недвижимости',
      'createListing.contactMissingTitle': 'Контактная информация неполная',
      'createListing.contactMissingMessage': 'Для объявлений размещения необходимы телефон и WhatsApp или Telegram. Добавьте их в настройках аккаунта.',
      'createListing.contactMissingCta': 'Заполнить профиль',
      'createListing.contactMissingInline': 'Добавьте телефон + WhatsApp или Telegram в профиле, чтобы опубликовать это объявление.',
      'createListing.publishListing': 'Опубликовать объявление',
    ```

    **DO NOT:**
    - Modify any existing key's value (even typo-fixing is out of scope — belongs to a separate plan).
    - Add keys outside the `createListing.*` namespace (RESEARCH Finding #4 decision: extend, don't open sibling).
    - Use digit-containing keys (WR-02 grep hazard — all 14 keys above use only `[a-zA-Z.]`).
    - Leave trailing whitespace, skip trailing commas, or use double quotes (Prettier `singleQuote: true`, `trailingComma: 'all'`).

    After both files are updated, run:
    1. `./scripts/check-i18n-parity.sh` — must exit 0
    2. `npx tsc --noEmit 2>&1 | wc -l` — must be ≤ 16 lines
    3. `grep -c "createListing.publishListing" src/locales/en.ts` — must be exactly 1
    4. `grep -c "createListing.publishListing" src/locales/ru.ts` — must be exactly 1
    5. `grep -cE "'createListing\\.(description|city|district|bedrooms|bathrooms|area|rooms|maxGuests|propertyType|contactMissing(Title|Message|Cta|Inline)|publishListing)Required?':" src/locales/en.ts` — should be 14
    6. Same grep against ru.ts — should be 14

    If `check-i18n-parity.sh` fails with "key present in EN but not RU" or vice versa, re-read both files and diff the new-key inserts — a typo in one file is the most likely cause.
  </action>
  <verify>
    <automated>grep -c "createListing.descriptionRequired" src/locales/en.ts && grep -c "createListing.descriptionRequired" src/locales/ru.ts && grep -c "createListing.publishListing" src/locales/en.ts && grep -c "createListing.publishListing" src/locales/ru.ts && grep -c "createListing.contactMissingCta" src/locales/en.ts && grep -c "createListing.contactMissingCta" src/locales/ru.ts && ./scripts/check-i18n-parity.sh && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 16) ? 1 : 0}' && npm test --silent 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "'createListing.descriptionRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.descriptionRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.cityRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.cityRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.districtRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.districtRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.bedroomsRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.bedroomsRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.bathroomsRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.bathroomsRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.areaRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.areaRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.roomsRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.roomsRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.maxGuestsRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.maxGuestsRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.propertyTypeRequired':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.propertyTypeRequired':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingTitle':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingTitle':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingMessage':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingMessage':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingCta':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingCta':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingInline':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.contactMissingInline':" src/locales/ru.ts` returns exactly `1`
    - `grep -c "'createListing.publishListing':" src/locales/en.ts` returns exactly `1`
    - `grep -c "'createListing.publishListing':" src/locales/ru.ts` returns exactly `1`
    - `./scripts/check-i18n-parity.sh` exits 0
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 16
    - `npm test` exits 0
    - `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 preserved)
    - `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01 preserved)
    - File sizes of en.ts and ru.ts increased by 14 lines each (approximately; tolerance ±2 for whitespace/formatting)
    - No existing keys deleted: `grep -c "'createListing.titleRequired':" src/locales/en.ts` still returns `1` (existing 5-key cluster preserved)
  </acceptance_criteria>
  <done>
    14 new keys in both en.ts and ru.ts; all grouped at the end of `createListing.*Required` cluster; parity script passes; tsc ≤ 16; full jest suite green; all 3 phase-gate scripts exit 0. No existing keys touched.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| locale-file build → app bundle | Translation strings are bundled at build time (not loaded from network). User cannot inject alternate translations. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-03-01 | Tampering | locale files | accept | Bundled at build; not user-modifiable at runtime. If an attacker decompiles the APK/IPA and modifies strings, impact is limited to THEIR device. |
| T-05-03-02 | Information Disclosure | new error strings | accept | Strings contain no PII, no secrets, no internal endpoints. Generic "field is required" + Account Settings navigation hint. |
| T-05-03-03 | Denial of Service | N/A | accept | Static strings; no parser, no regex evaluation at render time. |
| T-05-03-04 | Spoofing/Repudiation/Elevation | N/A | accept | Not applicable — locale files are pure data. |
</threat_model>

<verification>
End-of-plan checks:

1. **Both files grew by 14 keys:** `wc -l src/locales/en.ts src/locales/ru.ts` before/after diff ≈ +14 lines each.
2. **Parity gate passes:** `./scripts/check-i18n-parity.sh` exits 0.
3. **Compile-gate passes:** `npx tsc --noEmit 2>&1 | wc -l` ≤ 16 — if RU is missing a key EN has, `Record<TranslationKeys, string>` in ru.ts would surface the missing-property error here.
4. **No digit-containing keys added:** `grep -E "'createListing\\.[^']*[0-9]" src/locales/en.ts` returns only pre-existing matches (e.g., `tours3d`, if present) — no new ones from this plan.
5. **Existing keys preserved:** `grep -c "'createListing.titleRequired':" src/locales/en.ts` = 1 (Phase 4 key unchanged).
6. **Full Jest suite green:** `npm test` exits 0.
7. **All 3 phase-gate scripts exit 0:** role-grep, i18n-parity, land-removed.
</verification>

<success_criteria>
- 14 new i18n keys exist in both EN and RU locale files with the exact values specified in the action block
- EN + RU parity enforced (script + tsc both pass)
- No existing keys modified or deleted
- All 3 phase-gate scripts exit 0
- tsc baseline ≤ 16 lines
</success_criteria>

<output>
Create `.planning/phases/05-listing-form-validation-edit-flow/05-03-SUMMARY.md` with:
- Files modified: en.ts + ru.ts
- Line count delta (approximate)
- 14 keys added (list verbatim)
- `./scripts/check-i18n-parity.sh` exit code (0)
- tsc line count (≤ 16)
- Signal for Plan 04: all Hospitality Alert strings + publishListing label now resolvable via `t()` — orchestrator can wire them safely
</output>

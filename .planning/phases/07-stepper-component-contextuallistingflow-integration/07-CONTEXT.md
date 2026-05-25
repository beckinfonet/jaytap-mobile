# Phase 7: Stepper Component + ContextualListingFlow Integration - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce a tap-only `<StepperInput>` component (new file under `src/components/`) and wire it into the existing M3 `<ContextualListingFlow>` Step 3 (basics) so owners of residential / hospitality / office / commercial listings can enter and edit two new optional counts — `basics.bedrooms` (integer 0–10, residential-only) and `basics.bathroomCount` (0.5-step 0–10, applies to apartment + house + hotel + hostel + office + commercial). Works across `mode='create'`, `mode='edit-owner'`, and `mode='edit-mod'` (moderator edit-on-behalf). `undefined` is the canonical "not provided" value and is preserved end-to-end (no coerce-to-zero on submit, no error rows when the value is absent).

**Requirements covered:** FORM-01, FORM-02, FORM-03, FORM-04, FORM-05 (5 reqs).

**Touches the RN-client repo only.** Backend schema + 0.5-step / integer validators + body-strip rule were locked and shipped in Phase 6 (commits `cf97bfa`..`654ffa3` on Railway main). No backend changes in Phase 7.

**Files Phase 7 touches:**
- `src/components/StepperInput.tsx` — NEW component (FORM-01).
- `src/components/__tests__/StepperInput.test.tsx` — NEW co-located unit tests (Phase 3-established hook/component co-location precedent per `CONVENTIONS.md` line 19).
- `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — adds two conditional stepper rows (FORM-02).
- `src/components/ContextualListingFlow/types.ts` — extend `FormBag.basics` with `bedrooms?: number` + `bathroomCount?: number`.
- `src/components/ContextualListingFlow/adapters.ts` — `propertyToFormBag` reads `p.basics.bedrooms` / `p.basics.bathroomCount`; `formBagToPropertyPayload` passes them through (undefined-preserving).
- `src/components/ContextualListingFlow/validators.ts` — extend Step-3 `FIELD_ORDER_PER_STEP` and add defensive out-of-range checks (FORM-04).
- `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` — extend integration coverage (apartment/house show both rows; hotel/hostel/office/commercial show only bath; edit-mode pre-populates; save dispatches undefined verbatim).
- `src/locales/en.json` + `src/locales/ru.json` — 2 new step3 label keys + 2 new error-string keys for the backend M4_* 400 codes (EN+RU parity gate).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- PropertyCard / HospitalityCard / PropertyDetailsScreen specs-row display + `property.specs.*` namespace — Phase 8 (DISP-01..DISP-05).
- Wider i18n audit + sentinel + `propertyType.*` / `propertyCategory.*` / `dealType.*` namespaces — Phase 9 (I18N-01..I18N-07).
- v4.0.0 bump + manual physical-device QA matrix + dual-store submission — Phase 10 (REL-01..REL-06).
- Long-press accelerated increment on the stepper — deferred to M5+ per REQUIREMENTS Future Requirements (tap-only is locked for v1 per FORM-03).
- `1½` Unicode glyph rendering for half-bathrooms — deferred to M5+ (Phase 7 stores `1.5` decimal; renders `1.5` in the stepper value cell + on Phase 8 cards).
- Migrating existing `basics.rooms` → `basics.bedrooms` or `basics.bathroom` enum → `basics.bathroomCount` — explicitly Out of Scope per REQUIREMENTS Out of Scope §"`migrate-listings-m4.js` script" and §"Migrating existing `basics.bathroom` enum to `basics.bathroomCount`". Existing M3 listings keep their old fields; owners backfill via the Phase 7 stepper UI on next edit.

</domain>

<decisions>
## Implementation Decisions

### Stepper visual style (component skeleton)

- **D-01 (Circular `±` buttons + center value cell):** `<StepperInput>` renders as a single horizontal row with three children: round `−` button (left), value cell (center), round `+` button (right). Buttons are 40–44pt circles (matching `TAP = 44` constant from `src/components/AuthModalCloseButton.tsx:8` and `iOS HIG ≥44pt` invariant from `CONVENTIONS.md` line 230). Reads as a "numeric control", visually distinct from the existing Step3 chip rows (radius 20 pills, height 36) so users don't confuse "tap to increment" with "tap to select chip". Label is a row above the control (`<Text>` with `commonStyles.sectionLabel`) — matches every existing Step3 sub-field's label-then-control rhythm.

- **D-02 (Em-dash `—` U+2014 in `colors.textSecondary` for the `undefined` state):** Center value cell renders `—` (em-dash) when `value === undefined`. Same font size and horizontal weight as a filled number so the row doesn't reflow on first `+` tap. Upgrades from the ASCII `'-'` fallback used on PropertyCard / PropertyDetailsScreen — typographically proper for absence-of-value semantics. Phase 8 cards continue using the existing `'-'` ASCII pattern (260525-ggp behavior preserved) unless Phase 8 decides to lift to em-dash too; the stepper component's empty-state choice does NOT bind Phase 8.

- **D-03 (Dim glyph only on disabled `±`; keep circle outline + fill):** At boundary states (`−` at min, `+` at max), the BUTTON outline + background stay at the active treatment; only the `−` / `+` glyph color drops to `colors.textSecondary`. `onPress` is also a no-op (`disabled={true}` blocks the press). Lightest visual diff that still signals "inert" — reading clearly enough at 44pt that a hurried user notices without the row feeling broken/asymmetric (option of hiding the button entirely was rejected on layout-stability grounds).

- **D-04 (Plain decimal `1.5` formatting; integer values strip trailing `.0`):** Value cell formats as `Number.isInteger(v) ? String(v) : v.toFixed(1)`. So `0`, `1`, `2`, ..., `10` render as plain integers and `0.5`, `1.5`, ..., `9.5` render with one decimal. Matches DISP-02's stated `1.5` decimal format for the Phase 8 card surfaces — single mental model from form → card → detail. `1½` mixed-number glyph is explicitly deferred to M5+ (REQUIREMENTS Future Requirements; also seeded in Phase 6 Deferred Ideas).

### Row placement in Step3BasicInfo.tsx + ordering

- **D-05 (Stepper rows render at the BOTTOM of Step3, after existing chip-row conditionals):** Order in Step3 becomes: `areaSqm` (always) → `price` (always) → `currency` (always) → existing conditional chip rows (`rooms` for apartment/house/office/commercial; `bathroom` + `kitchen` for office/commercial; `hotelRooms` + `hotelClass` for hotel/hostel) → NEW `bedrooms` stepper (apartment/house) → NEW `bathroomCount` stepper (apartment/house/hotel/hostel/office/commercial). Existing chip rows that owners already know render first; the new stepper additions read as "extra optional fields" at the bottom. Reduces training-data shock for repeat owners. Land = no new rows.

- **D-06 (Bedrooms above Bathrooms when both render):** For apartment + house (the only two types that show both stepper rows), bedrooms renders above bathroomCount. Matches the universal real-estate listing convention (Beds | Baths | sqft on Zillow / Avito / etc.) and matches the DISP-01..03 Phase 8 card-surface specs row order. One mental model across create form → card → detail.

### FormBag / adapter / validator wiring

- **D-07 (Full FormBag integration — extend `FormBag.basics`):** Add `bedrooms?: number` and `bathroomCount?: number` to `FormBag.basics` (the `?:` optionality matches every other Step3 conditional field — rooms, bathroom, kitchen, hotelRooms, hotelClass — all use the same pattern). Preserves the single-source-of-truth invariant established in M3 Phase 2 D-02. Lighter alternatives (Step3-local `useState`) were rejected — they break the FormBag invariant, complicate edit-mode pre-population (would need a second `propertyToFormBag`-equivalent), and break the existing `ROADMAP SC#3 reflow guard` in `index.tsx:73–82` (which clears `basics` sub-fields on `propertyType` change — would have to be duplicated for the local-state path).

- **D-08 (Adapter wiring is bidirectional, undefined-preserving):**
  - `propertyToFormBag` (adapters.ts:27–36 region): add `bedrooms: p.basics?.bedrooms` and `bathroomCount: p.basics?.bathroomCount` — both flow as `number | undefined` (no string coercion; new fields are numeric end-to-end, unlike `areaSqm` / `price` which are string-at-form-time).
  - `formBagToPropertyPayload` (adapters.ts:76–85 region): add `bedrooms: v.basics.bedrooms` and `bathroomCount: v.basics.bathroomCount` — pass through verbatim. The existing "Strip undefined leaves for clean payload" comment (adapters.ts:106) applies — when undefined, the key MAY persist in the payload object but the backend silently strips on its end (and server-side validators tolerate undefined per FORM-04 + Phase 6 D-06 schema-level `undefined`-permissive validator form).
  - **`onChange` write path in Step3BasicInfo.tsx:** uses the existing `setBasics({ bedrooms: v })` / `setBasics({ bathroomCount: v })` shape — `setBasics` is already defined on line 47 (`(patch: Partial<FormBag['basics']>) => onChange('basics', { ...values.basics, ...patch })`).

- **D-09 (validator extension is defensive-only):** `validateStep(3, ...)` does NOT require either new field on any propertyType (FORM-04 lock). Validation ONLY fires when the value is present AND fails bounds (which the stepper UI prevents via clamping anyway). Defensive form:
  ```ts
  if (values.basics.bedrooms !== undefined &&
      (!Number.isInteger(values.basics.bedrooms) ||
       values.basics.bedrooms < 0 || values.basics.bedrooms > 10)) {
    errors['basics.bedrooms'] = 'contextualListing.step3.bedroomsInvalid';
  }
  if (values.basics.bathroomCount !== undefined &&
      (!Number.isInteger(values.basics.bathroomCount * 2) ||
       values.basics.bathroomCount < 0 || values.basics.bathroomCount > 10)) {
    errors['basics.bathroomCount'] = 'contextualListing.step3.bathroomCountInvalid';
  }
  ```
  These error rows are practically unreachable from the UI (the stepper clamps), but they catch a hypothetical future code path that writes the field directly (e.g., a copy/paste from another listing). Also extend `FIELD_ORDER_PER_STEP[3]` (validators.ts:17–26) — append `'basics.bedrooms'` and `'basics.bathroomCount'` after `'basics.hotelClass'` for scroll-to-first-error ordering parity.

### Server-side 400 surfacing (Claude's Discretion — see below)

- **D-10 (Inline error pattern, not toast/Alert):** When `PropertyService.createProperty` / `updateProperty` / `editAsModerator` rejects with a backend body containing `code: 'M4_BEDROOMS_INVALID'` or `code: 'M4_BATHROOM_STEP_INVALID'`, the orchestrator (`index.tsx` submit handler — wherever the current error catch lives) writes the localized error string into the `FormErrorBag` under the matching dotted-path key (`'basics.bedrooms'` / `'basics.bathroomCount'`) AND navigates the user back to Step 3 (if not already there) so the inline error row Step3BasicInfo.tsx already renders surfaces the failure. Matches the existing pattern (Step3BasicInfo.tsx:117–121, 144–148, 163–167) of `errors['basics.X']` → red `commonStyles.errorText` rendered immediately below the field. Zero new toast / Alert infrastructure. Practically unreachable via the stepper UI (clamping prevents bad values), but the 400 codes were added in Phase 6 D-11 explicitly so Phase 7 can discriminate — and discriminating without wiring the surfacing path defeats the design.

### Test scope (locked, planner can expand)

- **D-11 (Co-located StepperInput unit tests — minimum 6 cases):**
  1. Renders em-dash `—` when `value === undefined`.
  2. Renders integer `5` when `value === 5` and step is 1; renders `1.5` when `value === 1.5` and step is 0.5.
  3. Tap `+` from `value === undefined` → `onChange` called with `min` (the spec contract from FORM-01).
  4. Tap `−` at `value === min` → `onChange` NOT called (no-op, no negatives, no undefined regression).
  5. Tap `+` at `value === max` → `onChange` NOT called (no-op).
  6. Disabled-state — at boundary, both `disabled={true}` is set on the boundary button AND the glyph color resolves to `colors.textSecondary` (jest-styled-components or RTL `toHaveStyle` works; planner picks).
  Co-located under `src/components/__tests__/StepperInput.test.tsx` per Phase-3-established Phase 3 component co-location convention.

- **D-12 (Extend Step3 integration test — minimum 4 cases):**
  1. Apartment with no values → both stepper rows visible with em-dash centers.
  2. Hotel/hostel/office/commercial → bathroomCount row visible; bedrooms row absent.
  3. Edit-owner mode with `property.basics.bedrooms === 3` → bedrooms stepper renders `3`; submit without changing → payload contains `bedrooms: 3` (round-trip integrity).
  4. Edit-owner mode with `property.basics.bedrooms === undefined` → stepper renders em-dash; submit without changing → payload `bedrooms` is `undefined` verbatim (NOT 0). Planner can expand to cover edit-mod variant + propertyType-change-clears-bedrooms-on-apartment→hotel reflow (the existing `index.tsx:73–82` guard should also clear the new fields — planner verifies during execute or adds the field to the clear-list).

### Claude's Discretion

- **i18n keys + label copy** (auto-decided per `feedback-discuss-phase-detail-level.md`):
  - Keys: `contextualListing.step3.bedroomsLabel` + `contextualListing.step3.bathroomCountLabel`. Matches the existing Step3 `.xxxLabel` suffix convention (roomsLabel, bathroomLabel, kitchenLabel, hotelRoomsLabel, hotelClassLabel — see Step3BasicInfo.tsx:174, 197, 213, 237, 255). Phase 8 will introduce a parallel `property.specs.*` namespace for card surfaces — separate render-context, intentional non-duplication.
  - EN: `"Bedrooms"` and `"Bathrooms"`.
  - RU: `"Спальни"` and `"Ванные комнаты"`. (Matches DISP-03's locked RU "Спальни" for residential bedrooms; "Ванные комнаты" is the literal/formal RU for bathrooms-as-count and is the safer choice over the colloquial "Санузлы".)
  - Error keys (for the M4_* codes per D-10): `contextualListing.step3.bedroomsInvalid` + `contextualListing.step3.bathroomCountInvalid`. EN: `"Bedrooms must be a whole number between 0 and 10."` / `"Bathrooms must be a whole or half number between 0 and 10."`. RU: `"Количество спален должно быть целым числом от 0 до 10."` / `"Количество ванных должно быть целым или с шагом 0.5 от 0 до 10."`.

- **`<StepperInput>` Props extension beyond FORM-01 minimum** — Planner can add optional `accessibilityLabel?: string` (passes to the row container for screenreaders) without breaking FORM-01's mandatory contract. The mandatory props per FORM-01 are: `value`, `onChange`, `min`, `max`, `step`, `label`, `testID?`. Planner can also add a small `disabled?: boolean` prop if it simplifies the Step3-level "land = no stepper" gating — though the current path is conditional-render-at-Step3 (the stepper itself is never rendered for land), so this likely isn't needed.

- **Stepper component file location vs barrel** — `src/components/StepperInput.tsx` per the M1+M3 component convention (`PropertyCard.tsx`, `HospitalityCard.tsx`, etc. live directly under `src/components/`, not in a `src/components/StepperInput/` subdir, because there's only one file). Planner discretion if a co-located styles object grows enough to warrant a directory, but for the 6-case test bar this is unlikely.

- **`propertyType`-change reflow handling for the two new fields** — `index.tsx:73–82` currently clears `rooms / bathroom / kitchen / hotelRooms / hotelClass` on a propertyType switch in Step 1. The two new fields' clear policy is propertyType-specific: switching `apartment` → `hotel` should clear `bedrooms` (residential-only); switching any → any should NOT clear `bathroomCount` (applies to all 6 types). Planner adds `bedrooms: undefined` to the clear list (uniformly clearing on every propertyType change is the simplest rule and matches the existing pattern of "clear everything because the form just reflowed"); `bathroomCount` is omitted from the clear list (preserves entered value across propertyType switches). If this nuance is too clever, planner may instead clear both (cheaper) and accept the minor UX regression of a user losing bathroomCount when toggling propertyType — acceptable trade.

- **Test framework choice (RTL vs jest snapshots)** — Planner inherits whatever the existing `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` uses (likely RTL `fireEvent` based on the M3 pattern). No new dev-dep additions.

- **Disabled-state hit-target consistency** — Spec says hit-slop ≥44pt on ENABLED buttons (FORM-03). On DISABLED buttons, hit-slop can drop to 0 (since onPress is a no-op anyway) OR stay at 44pt for visual symmetry. Planner picks; both pass the spec. The simpler "always 44pt regardless of state" is the recommended default.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level scope & requirements

- `.planning/PROJECT.md` — JayTap core value; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation, M3's 6-type 3-category taxonomy preserved); EN+RU bilingual parity gate (CI: `scripts/check-i18n-parity.sh`).
- `.planning/REQUIREMENTS.md` §"Form — stepper-button component + ContextualListingFlow integration" — FORM-01..FORM-05 acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 7: Stepper Component + ContextualListingFlow Integration" — Goal + 5 Success Criteria; Depends on: Phase 6.

### Phase 6 anchor — schema half (just shipped)

- `.planning/phases/06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va/06-CONTEXT.md` — Phase 6 decisions (D-01..D-11) for the schema additions. Phase 7's bedroom/bathroomCount field bounds, error codes, and undefined-preserving semantics ALL trace back to this file:
  - §D-04: `basics.bedrooms` apply-set is `{apartment, house}` — informs Phase 7 D-05's "bedrooms row only for apartment/house".
  - §D-03: `basics.bathroomCount` apply-set is all 6 types — informs Phase 7 D-05's "bathroomCount row for all 6 types".
  - §D-06: 0.5-step bathroomCount + integer bedrooms validators are belt-and-suspenders (route 400 + Mongoose validate). Phase 7's stepper UI clamping is the third layer.
  - §D-11: error codes `M4_BEDROOMS_INVALID` + `M4_BATHROOM_STEP_INVALID` — Phase 7 D-10's discriminator path.
  - §"RN client repo — files Phase 6 does NOT touch" — explicit hand-off: Step3BasicInfo.tsx, types.ts, adapters.ts, validators.ts all belong to Phase 7.
- `.planning/phases/06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va/06-VERIFICATION.md` — confirms schema half landed clean (paired-gate verifier+reviewer per memory `gsd-verifier-misses-regressions.md`).

### M3 Phase 2 anchor — ContextualListingFlow architecture

- `.planning/milestones/v3.0-phases/02-contextual-listing-flow/02-CONTEXT.md` — M3 Phase 2 D-01..D-18 decisions for the orchestrator. Most relevant to Phase 7:
  - D-02: FormBag is the single source of truth — Phase 7 D-07 extends it; doesn't bypass it.
  - D-12: pure adapters round-trip-safe — Phase 7 D-08 adds two more keys to both directions.
  - D-13: orchestrator clears Step3 sub-fields on Step1 propertyType change — Phase 7 Claude's Discretion section discusses extending the clear-list.
  - D-15: discriminated-union props for `<ContextualListingFlow>` — informs Phase 7's edit-owner / edit-mod pre-population path (FORM-05).
  - D-18: mod-context banner pattern — Phase 7 inherits unchanged; moderator edit-mod wires the stepper identically to edit-owner.

### RN client repo — files Phase 7 touches

- `src/components/ContextualListingFlow/Step3BasicInfo.tsx` (274 LOC) — adds two conditional stepper rows at the bottom (D-05). Existing chip rows + render structure unchanged.
- `src/components/ContextualListingFlow/types.ts` (89 LOC) — extend `FormBag.basics` (lines 22–31) with `bedrooms?: number` + `bathroomCount?: number`.
- `src/components/ContextualListingFlow/adapters.ts` (109 LOC) — `propertyToFormBag` (lines 27–36 region) reads new fields; `formBagToPropertyPayload` (lines 76–85 region) passes them through.
- `src/components/ContextualListingFlow/validators.ts` (103 LOC) — extend `FIELD_ORDER_PER_STEP[3]` (lines 17–26) and add Step-3 defensive checks (lines 55–75 region, after the `hotel || hostel` branch).
- `src/components/ContextualListingFlow/index.tsx` (336 LOC) — orchestrator. The propertyType-change clear block (lines 73–82) needs `bedrooms: undefined` added (per Claude's Discretion section). The submit catch handler also discriminates on the M4_* error codes per D-10 — planner identifies where that catch lives during planning.
- `src/locales/en.json` + `src/locales/ru.json` — 4 new keys total: 2 step3 labels + 2 step3 error strings.

### RN client repo — files Phase 7 creates

- `src/components/StepperInput.tsx` — NEW (FORM-01). ~80–120 LOC estimate (component + co-located StyleSheet).
- `src/components/__tests__/StepperInput.test.tsx` — NEW (D-11). ~6+ cases.

### RN client repo — files Phase 7 does NOT touch (boundary anchors)

- `src/components/PropertyCard.tsx`, `src/components/HospitalityCard.tsx`, `src/screens/PropertyDetailsScreen.tsx` — Phase 8 owns specs-row read paths.
- `src/utils/propertyCategory.ts`, `src/screens/HomeScreen.tsx` — Phase 9 owns i18n audit + sentinel.
- `src/types/Property.ts` — already updated in Phase 6 (added `bedrooms?: number` + `bathroomCount?: number` under `basics`); Phase 7 reads but does NOT modify.

### Codebase analysis (relevant subsets)

- `.planning/codebase/CONVENTIONS.md` — Components live under `src/components/` (PascalCase.tsx) with named exports; co-located unit tests under `src/components/__tests__/` per Phase 3 precedent (line 19); accessibility patterns use `accessibilityRole` + `accessibilityLabel` + `hitSlop`; `TAP = 44` constant convention (`AuthModalCloseButton.tsx:8`); theme colors applied via inline style arrays (`style={[styles.x, { color: colors.textSecondary }]}`); no path aliases — all imports relative.
- `.planning/codebase/STACK.md` — RN 0.84 New Architecture; TouchableOpacity from `react-native` core (no gesture-handler needed for plain ± taps); `useTheme()` + `useLanguage()` hooks from existing context providers.
- `.planning/codebase/STRUCTURE.md` — `src/components/` flat directory; `src/components/__tests__/` for co-located unit tests; `src/components/ContextualListingFlow/` as the only nested-component directory in the M3 form architecture.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/central-asia-rooms-vs-bedrooms-convention.md` — Background WHY: Central Asian listings need BOTH room count (existing `basics.rooms`) AND bedroom count (NEW `basics.bedrooms`). Phase 7 is the form-half of the gap; Phase 6 was the schema-half.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired-gate posture. Phase 7 adds form-validation surface (FormBag wiring + validateStep extension) — same regression class verifier missed in M2 Phase 1. Code review after `gsd-execute-phase` is mandatory.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/m1-keyboard-kbd-02-invariants.md` — `keyboardVerticalOffset` ban (grep gate must stay 0); `behavior="padding"` on library KAV load-bearing. Phase 7 adds NO new KAV or keyboard surface (stepper is tap-only, no keyboard), but planner verifies the new component doesn't accidentally introduce a TextInput that would need KAV consideration. (It shouldn't — FORM-01 explicitly says tap-only stepper, no number-pad input.)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/feedback-discuss-phase-detail-level.md` — User wants minor implementation decisions auto-made; reflected in this CONTEXT.md's "Claude's Discretion" section (4 items pre-decided rather than escalated).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`commonStyles.section` / `commonStyles.sectionLabel`** (`ContextualListingFlow/styles.ts:40–42`) — Drop-in wrappers for the new stepper rows. Label above control, 24px bottom margin. Already used by every Step3 sub-field; the stepper rows slot in identically.
- **`useTheme()` hook + `colors.textSecondary` + `colors.text` + `colors.border` + `colors.activeChipBackground`** (`src/theme/ThemeContext.tsx` via `useTheme`) — All disabled/em-dash/active treatments resolve through this. No new theme tokens needed in Phase 7.
- **`useLanguage()` hook + `t(key as TranslationKeys)`** (`src/context/LanguageContext.tsx`) — Step3BasicInfo.tsx calls `t()` for every label and error string already (lines 99, 119, 126, 144, etc.). New stepper labels and error strings consume the same hook.
- **`TAP = 44` convention** (`src/components/AuthModalCloseButton.tsx:8`) — Hit-target size constant. New `StepperInput.tsx` can either redeclare it locally or import (no barrel exists, but `import { TAP } from '../components/AuthModalCloseButton'` works — though forking the constant into `StepperInput.tsx` keeps coupling looser; planner's call).
- **`hitSlop` pattern** (`src/components/AuthModalCloseButton.tsx:23`, `PasswordTextInput.tsx:26`) — Direct precedent for the FORM-03 ≥44pt hit-slop requirement on the `±` buttons.
- **Existing Step3 inline-error pattern** (`Step3BasicInfo.tsx:117–121, 144–148, 163–167, etc.`) — Every Step3 sub-field renders `errors['basics.X']` below the control via `commonStyles.errorText`. Phase 7's M4_* 400 surfacing (D-10) pipes through this same path — zero new infrastructure.
- **`propertyToFormBag` / `formBagToPropertyPayload`** (`adapters.ts:12–58, 66–109`) — Pure round-trip-safe adapters. Phase 7 D-08 adds two more keys to each direction; the surrounding "missing nested fields → default-to-empty" posture (CONTEXT 02 D-12) is preserved automatically because `?:` optional types pass `undefined` cleanly.

### Established Patterns

- **Component file structure** (`PropertyCard.tsx`, `HospitalityCard.tsx`, `PasswordRequirements.tsx`, `AuthModalCloseButton.tsx`): Imports → Props interface → exported React.FC or plain function → co-located `StyleSheet.create({...})` at the bottom. `StepperInput.tsx` follows this verbatim.
- **Theme-aware inline style arrays** (`PropertyCard.tsx`, `BottomNavigator.tsx`, `Step3BasicInfo.tsx`): Static structural styles in `StyleSheet`; dynamic colors merged via `style={[styles.x, { color: ... }]}`. New stepper component uses this for disabled-glyph color resolution and circle-outline color.
- **`testID` prop pattern** (`Step3BasicInfo.tsx`: `testID="basics-areaSqm"`, `testID="rooms-chip-${o}"`, etc.): Every Step3 control has a `testID`. New stepper should expose `testID-minus` + `testID-value` + `testID-plus` (or `testID-${suffix}` form — planner picks; D-11 tests assume a discriminable trio).
- **FormBag single-source-of-truth** (`ContextualListingFlow/index.tsx:50–55`, `Step3BasicInfo.tsx:47–48`): All form values flow through the FormBag → `onChange('basics', { ...values.basics, [field]: newValue })` pattern. Phase 7 D-07 + D-08 preserve this verbatim.
- **propertyType-change reflow** (`index.tsx:73–82`): Switching Step1 propertyType clears Step3 sub-fields. Phase 7 extends the clear-list with `bedrooms: undefined` (bathroomCount stays — applies to all 6 types).

### Integration Points

- **Step3BasicInfo render block** — two new conditional `<View style={commonStyles.section}>` blocks at the bottom of the return. The bedrooms block is wrapped in `pt === 'apartment' || pt === 'house' ? (...) : null`; the bathroomCount block is wrapped in `pt === 'apartment' || pt === 'house' || pt === 'hotel' || pt === 'hostel' || pt === 'office' || pt === 'commercial' ? (...) : null` (i.e., everything except `land` and the empty string — and since `land` was removed in M1 per Phase 6 D-02, this is effectively "all non-empty propertyTypes").
- **Step3 onChange path** — Stepper `onChange(v)` calls Step3-local `setBasics({ bedrooms: v })` / `setBasics({ bathroomCount: v })` which bubbles to orchestrator's `onChange('basics', { ...values.basics, ...patch })`. No new orchestrator wiring beyond the propertyType-change clear-list extension.
- **Submit-error catch in `ContextualListingFlow/index.tsx`** — D-10 routing point. Planner identifies the existing PropertyService catch block during planning (likely a `try { ... } catch (e) { ... }` wrapping the M2-D-22 / MOD-14 dispatch). Adds discriminator on `e.code === 'M4_BEDROOMS_INVALID'` / `'M4_BATHROOM_STEP_INVALID'`, writes localized error to errors map, navigates to Step 3 if not already there.
- **Existing tests** — `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` (extend per D-12); `__tests__/adapters.test.ts` (extend with `bedrooms` + `bathroomCount` round-trip); `__tests__/validators.test.ts` (extend with the defensive out-of-range checks from D-09).

</code_context>

<specifics>
## Specific Ideas

- **`<StepperInput>` Props (FORM-01 mandatory):**
  ```ts
  interface StepperInputProps {
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    min: number;
    max: number;
    step: number; // 1 or 0.5
    label: string; // already-localized — caller does the t() lookup
    testID?: string;
    // Planner may add (Claude's Discretion):
    accessibilityLabel?: string;
  }
  ```

- **Default-decimal format helper:**
  ```ts
  const formatValue = (v: number | undefined): string =>
    v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);
  ```
  Inline in `StepperInput.tsx`; no new utility file needed.

- **i18n keys (4 new keys per locale):**
  - `contextualListing.step3.bedroomsLabel` — EN `"Bedrooms"` / RU `"Спальни"`
  - `contextualListing.step3.bathroomCountLabel` — EN `"Bathrooms"` / RU `"Ванные комнаты"`
  - `contextualListing.step3.bedroomsInvalid` — EN `"Bedrooms must be a whole number between 0 and 10."` / RU `"Количество спален должно быть целым числом от 0 до 10."`
  - `contextualListing.step3.bathroomCountInvalid` — EN `"Bathrooms must be a whole or half number between 0 and 10."` / RU `"Количество ванных должно быть целым или с шагом 0.5 от 0 до 10."`

- **Conditional render gates in Step3BasicInfo.tsx:**
  ```tsx
  {pt === 'apartment' || pt === 'house' ? (
    <View style={commonStyles.section}>
      <StepperInput
        testID="basics-bedrooms"
        label={t('contextualListing.step3.bedroomsLabel')}
        value={values.basics.bedrooms}
        onChange={(v) => setBasics({ bedrooms: v })}
        min={0} max={10} step={1}
      />
      {errors['basics.bedrooms'] ? (
        <Text style={[commonStyles.errorText, { color: colors.error }]}>
          {t(errors['basics.bedrooms'] as TranslationKeys)}
        </Text>
      ) : null}
    </View>
  ) : null}
  ```
  Same shape for the bathroomCount block with the broader propertyType gate.

- **`+` from `undefined` initialization:** The component handles this internally — when `value === undefined` and user taps `+`, it calls `onChange(min)`. Caller sees `onChange(0)`. (FORM-01 spec contract.)

- **Submit-catch handler skeleton (D-10):**
  ```ts
  catch (err: any) {
    const code = err?.response?.data?.code ?? err?.code;
    if (code === 'M4_BEDROOMS_INVALID') {
      setErrors((e) => ({ ...e, ['basics.bedrooms']: 'contextualListing.step3.bedroomsInvalid' }));
      setCurrentStep(3);
    } else if (code === 'M4_BATHROOM_STEP_INVALID') {
      setErrors((e) => ({ ...e, ['basics.bathroomCount']: 'contextualListing.step3.bathroomCountInvalid' }));
      setCurrentStep(3);
    } else {
      // existing fallback (Alert / generic message)
    }
  }
  ```
  Planner verifies the exact catch location in `index.tsx` during planning and inlines this discriminator there.

</specifics>

<deferred>
## Deferred Ideas

- **Long-press accelerated increment on `<StepperInput>`** — Explicitly out of scope per FORM-03 ("Long-press behavior NOT implemented (out of scope for v1; tap-only)"); deferred to M5+ per REQUIREMENTS Future Requirements.
- **`1½` Unicode glyph rendering for half-bathrooms** — Deferred to M5+; Phase 7 ships `1.5` decimal (D-04). Same deferral as Phase 6 noted.
- **Migration script for backfilling `bedrooms` / `bathroomCount` from existing `basics.rooms` / `basics.bathroom`** — Out of scope per REQUIREMENTS §"`migrate-listings-m4.js` script". Owners backfill on next edit.
- **Promoting stepper labels to a shared `property.specs.*` namespace** — Phase 8 owns that namespace for card surfaces (DISP-05). Phase 7 stays in `contextualListing.step3.*` per the existing Step3 convention; deliberate non-duplication of label keys across render contexts (form vs card).
- **Replacing `basics.rooms` with `basics.bedrooms`** — Out of scope per REQUIREMENTS Out of Scope; both fields coexist on apartment/house. M3 mock data + KG launch data are sparse enough that the duplication-cost is bounded.
- **i18n audit + raw-string sentinel** — Phase 9 owns (I18N-01..I18N-07). Phase 7 adds new keys cleanly via `t()` in its own surfaces; the wider `src/`-walk for raw-English chip labels (HomeScreen.tsx:514 et al.) is Phase 9.
- **`<StepperInput>` reusability across the codebase** — Phase 7 ships it as a Step3 sub-field. If Phase 8 or later needs a similar control elsewhere (e.g., admin-side filter chip for "≥ N bedrooms"), the component is already abstract enough (props-only, no Step3 coupling) to lift. No proactive scope expansion in Phase 7.
- **Race-cell test rig + Android reanimated build doc + AWS IAM cross-project residual** — M3-carry-forward items; not Phase 7 scope.

</deferred>

---

*Phase: 07-stepper-component-contextuallistingflow-integration*
*Context gathered: 2026-05-25*

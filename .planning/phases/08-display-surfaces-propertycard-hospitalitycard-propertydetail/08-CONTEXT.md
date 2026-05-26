# Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface the two new Phase-6 fields (`basics.bedrooms`, `basics.bathroomCount`) on every browse + details render path the user already lives in — PropertyCard, HospitalityCard, PropertyDetailsScreen's specs row — with localized labels that distinguish "Bedrooms" (residential) from "Rooms" (hospitality). Drop the legacy `basics.bathroom` enum render from the specs cells (it never reaches apartment/house and Phase 8 unifies the cell semantics to a numeric `bathroomCount`). Also subtractively remove the now-duplicate `Beds: {rooms}` / `Baths: {enum}` rows from `ListingMetaTable`'s extras grid so PropertyDetailsScreen doesn't show two competing numbers ~50px apart.

**Requirements covered:** DISP-01, DISP-02, DISP-03, DISP-04, DISP-05 (5 reqs).

**Touches the RN-client repo only.** Phase 6 (schema) and Phase 7 (form input) shipped — Phase 8 is the read side. Backend untouched.

**Files Phase 8 touches:**
- `src/components/PropertyCard.tsx` — specs container redesign (icon + value + label per cell; Beds cell conditionally hides on office/commercial; drop the dead `hotelRooms ?? rooms` fallback chain; replace the bathroom enum render with `bathroomCount`).
- `src/components/HospitalityCard.tsx` — extend the single meta line with an inline `{bathroomCount} Bathrooms` fragment between `{rooms} Rooms` and `{maxGuests} Max Guests`; hide the fragment entirely when `bathroomCount` is `undefined`.
- `src/screens/PropertyDetailsScreen.tsx` — specs row: per-category label flip (Bedrooms for residential, Rooms for hospitality); conditionally hide the Beds cell on office/commercial; replace the bathroom enum render with `bathroomCount`. m² placement (260525-i2i / commit `15f1010`) preserved unchanged.
- `src/components/ListingMetaTable.tsx` — surgical removal of the `rooms != null &&` row (lines 163-167) and the `bathroom != null &&` row (lines 168-176) from the extras grid. ID + availability rows + condition / furnished / negotiable / deposit / prepayment / minTerm rows all preserved.
- `src/locales/en.ts` + `src/locales/ru.ts` — 4 new keys total (3 specs labels + 1 hospitality inline label).
- Existing tests for the four touched files — adapt expected text + structure.

**Explicitly NOT in this phase (boundary anchors for downstream):**
- i18n audit + sentinel for raw English property-type strings (HomeScreen.tsx:514 `PROPERTY_TYPES` chip render) → Phase 9 (I18N-01..I18N-07). The orphan `property.beds` / `property.baths` / `hospitality.rooms` keys left behind by Phase 8 can be flagged by Phase 9's sentinel.
- v4.0.0 bump + manual physical-device QA + dual-store submission → Phase 10 (REL-01..REL-06).
- Replacing `basics.rooms` with `basics.bedrooms`, migrating `basics.bathroom` enum → `basics.bathroomCount`, or backfill scripts — explicitly Out of Scope per REQUIREMENTS Out of Scope §"Replacing `basics.rooms`…" and §"Migrating existing `basics.bathroom` enum…". Both legacy fields keep their existing reads (form Step 3 still captures the enum on office/commercial; `basics.rooms` is still read by the form for apartment/house/office/commercial chips). Phase 8 only changes the RENDER surfaces listed above.
- Form-side stepper labels (`contextualListing.step3.bedroomsLabel` / `bathroomCountLabel`) → Phase 7 (shipped). Phase 8's new `property.specs.*` namespace is intentionally separate (different render context: card surface vs form).
- PropertyDetailsScreen icon-system swap (emoji 🛏 🚿 📐 → Lucide Bed/Bath/Ruler) — not in DISP-01..05 contract; keeping existing emoji per surface preserves the M3 visual identity. Deferred to M5+ if a wider icon-system unification lands.
- `1½` Unicode glyph for half-bathrooms — already locked as `1.5` decimal by Phase 7 D-04; Phase 8 inherits.

</domain>

<decisions>
## Implementation Decisions

### Specs-cell layout + labels (DISP-01, DISP-03, DISP-05)

- **D-01 (PropertyCard adds an icon + value + label cell pattern):** PropertyCard's specs strip evolves from icon-only-with-value to a 3-element cell (icon top, numeric value middle, localized label below) — same anatomy as PropertyDetailsScreen's specs row. The "Bedrooms vs Rooms" semantic distinction has to be readable from the browse screen, not buried in details. Costs ~one extra line of vertical space per card; the existing horizontal divider between Beds and Baths stays.

- **D-02 (Office/commercial Beds cell hides entirely):** When `propertyType === 'office' || propertyType === 'commercial'`, the Beds cell renders NOTHING (the `<View>` is omitted). Card becomes asymmetric: residential renders 2 cells (Beds + Baths); office/commercial renders 1 cell (Baths only). Same rule applies on PropertyDetailsScreen's 3-cell specs row — Beds cell omits, so the row becomes Baths | m². Rationale: rendering `Bedrooms: -` on a commercial listing is semantically wrong; rendering "Beds: -" with a generic label loses the M4 distinction the rest of the spec works to introduce; rendering an empty-but-present cell is asymmetric typography. Hiding cleanly is the lowest-confusion path. Verticals divider also drops on office/commercial PropertyCard (only one cell to flank).

- **D-03 (Label routing is surface-embedded — each surface hardcodes its label):** PropertyCard always reads `basics.bedrooms` and labels it with `t('property.specs.bedrooms')` ("Bedrooms"/"Спальни"). HospitalityCard always reads `basics.hotelRooms` (no change to that read) and uses `t('hospitality.rooms')` for its existing meta-line render — same key as today, no change. Only `PropertyDetailsScreen` does the per-category branch (`isHospitality ? t('property.specs.rooms') : t('property.specs.bedrooms')`). Rationale: post-260525-ggp routing, PropertyCard never sees hospitality data in production; the defensive fallback chain `basics?.hotelRooms ?? basics?.rooms` on PropertyCard is dead code and gets DROPPED in Phase 8 (single read: `basics?.bedrooms ?? '-'`). HospitalityCard never sees residential data. Indirection through a `getSpecLabel()` helper was rejected as over-engineered for 1 conditional site.

- **D-04 (Bathroom specs cell renders count only across all 6 property types):** Every Baths cell on PropertyCard + PropertyDetailsScreen specs row reads `basics?.bathroomCount ?? '-'`. The legacy `basics.bathroom` enum render (private/shared/none translated via `property.bathroomPrivate` / `property.bathroomShared` / `property.bathroomNone` keys) is REMOVED from PropertyCard line ~290 and PropertyDetailsScreen line ~1059. The enum still exists in the schema (Out of Scope locks coexistence) and still gets captured by the form (Step3 — Phase 7 untouched), but Phase 8 surfaces NO new render path for it. The enum's only post-Phase-8 home is the user-facing form input + the audit log; on the card/details specs cells it's superseded by the count. Single read rule: same code path on every property type.

- **D-05 (Office/commercial Baths cell still renders even though no `-` placeholder behavior changes):** Office/commercial submitted today probably has `basics.bathroom` (enum) and may or may not have `basics.bathroomCount` (M4 new field). When count is absent, cell renders `-`. The enum is NOT used as a fallback for the count cell. Owners who edit an office listing in Phase 7 can backfill `bathroomCount`; until they do, office listings show "Baths: -". Acceptable transient state — Phase 6 + 7 don't include a migration script (Out of Scope).

### HospitalityCard inline meta extension (DISP-04)

- **D-06 (Inline meta-line fragment, conditional render):** HospitalityCard's single meta line evolves from `{rooms} Rooms · {maxGuests} Max Guests` to `{rooms} Rooms · {bathroomCount} Bathrooms · {maxGuests} Max Guests` — but only when `basics.bathroomCount !== undefined`. When absent, the line renders unchanged (no `-` placeholder, no empty fragment, no orphan separator). Preserves the M1 Phase 6 D-10 "tour-first, price-free, no meta table" invariant verbatim — no specs-strip block, no second meta row, just an inline fragment in the existing `<Text style={styles.meta}>`. The existing `numberOfLines={1}` clamp catches any RU/EN truncation edge case at very narrow widths.

- **D-07 (Hospitality inline uses sentence-case key parity):** The fragment renders via a new `t('hospitality.bathrooms')` key mirroring the existing `t('hospitality.rooms')` pattern. EN: `"Bathrooms"`. RU: `"Ванные"`. The HospitalityCard meta line is sentence-case end-to-end (`"2 Rooms · 1.5 Bathrooms · 4 Max Guests"`) — matches today's `Rooms` / `Max Guests` capitalization. Switching the line to lowercase compact (`"2 rooms · 1.5 baths · 4 max guests"`) was considered and rejected: would force EN/RU rewrites of `hospitality.rooms` + `hospitality.maxGuests` for visual consistency, expanding the change-set beyond DISP-04's scope.

### i18n key namespace (DISP-05)

- **D-08 (New `property.specs.*` keys; existing keys untouched):** Three new keys land for PropertyCard + PropertyDetailsScreen specs cells, plus the one HospitalityCard key from D-07:
  - `property.specs.bedrooms` — EN: `"Bedrooms"`, RU: `"Спальни"`. Used by PropertyCard label + PropertyDetailsScreen residential branch.
  - `property.specs.bathrooms` — EN: `"Bathrooms"`, RU: `"Ванные"`. Used by PropertyCard + PropertyDetailsScreen Baths cells.
  - `property.specs.rooms` — EN: `"Rooms"`, RU: `"Комнаты"`. Used by PropertyDetailsScreen hospitality branch.
  - `hospitality.bathrooms` — EN: `"Bathrooms"`, RU: `"Ванные"`. Used by HospitalityCard inline meta fragment (D-07).
  Existing `property.beds`, `property.baths`, `property.bathroomPrivate`, `property.bathroomShared`, `property.bathroomNone`, `hospitality.rooms`, `hospitality.maxGuests` are LEFT UNTOUCHED. `hospitality.rooms` is still used by HospitalityCard's existing meta line. `property.beds` and `property.baths` are still used by `ListingMetaTable.tsx` (other surfaces) and any test fixtures. Phase 8 adds keys; never deletes them. Phase 9's `check-no-raw-property-type-strings.sh` sentinel + audit walk can flag the orphaned keys if it widens scope to unused-key detection (out-of-scope for Phase 9 as currently spec'd; M5+ cleanup candidate).

### ListingMetaTable extras grid cleanup (out-of-spec, in-scope by user agreement)

- **D-09 (Drop the two duplicate rows from extras grid):** In `ListingMetaTable.tsx` lines 163-176, remove the entire `{rooms != null && (<Text>...{t('property.beds')}: {rooms}</Text>)}` block AND the entire `{bathroom != null && (<Text>...{t('property.baths')}: {bathroom === 'private' ? ... : ...}</Text>)}` block. Both blocks are inside the `hasExtras &&` grid; they were duplicating the data shown ~50px below in PropertyDetailsScreen's specs row. Other extras (condition, furnished, negotiable, deposit, prepayment, minTerm) stay — they're not duplicated elsewhere. The `hasExtras` boolean still evaluates correctly because it's an OR-chain over many fields; dropping two contributors doesn't break the gating. The `rooms` and `bathroom` local-variable derivations (lines 68-69) can stay (unused-variable lint may fire — planner removes them too) or be removed alongside.

- **D-10 (Surgical removal — no replacement, no new fields):** The extras grid is NOT re-populated with `bedrooms` or `bathroomCount` rows. PropertyDetailsScreen's specs row IS the canonical surface for those new fields. Pre-Phase-8 the extras grid was the only place ListingMetaTable surfaced `basics.rooms` and the bathroom enum; post-Phase-8 it surfaces neither. If a future M5+ phase wants to bring rooms back as a separate-from-bedrooms display fragment (e.g., "3-room apartment" badge for KG/KZ/UZ cultural context), that's a new visual treatment in its own phase.

### Out-of-scope render surfaces (not touched by Phase 8)

- **D-11 (Step3BasicInfo.tsx form chips untouched):** The form-side rendering of `basics.rooms` (1/2/3/4+ chips for apartment/house/office/commercial) and `basics.bathroom` (private/shared/none chips for office/commercial) lives in `src/components/ContextualListingFlow/Step3BasicInfo.tsx`. These are INPUTS, not displays. Phase 8 doesn't touch them. Phase 7's stepper rows already coexist with these chip rows in Step 3.

- **D-12 (HomeScreen `PROPERTY_TYPES` chip filter row untouched):** `HomeScreen.tsx:514` renders raw English property-type chip labels (Apartment / House / etc.) without `t()` wrap. This is Phase 9's exact scope (I18N-01..I18N-07). Phase 8 does not touch it.

- **D-13 (PropertyCard listing-action chrome unchanged):** Edit / Archive / Unarchive / Delete buttons rendered when `showEditButton === true` are mutually exclusive with the specs strip in today's render (specs strip is the `else` branch when no chrome). Phase 8 preserves that structure verbatim — only the specs-strip BRANCH changes.

### Claude's Discretion

- **m² rendering stays hardcoded:** The `m²` label in `PropertyDetailsScreen.tsx:1073` is a Unicode unit symbol, not a translatable phrase. Same posture as `$` or `°C`. Phase 8 does NOT wrap it in `t()`. DISP-05's "no raw English strings added to any new render path" applies to actual English words, not unit symbols (analogous to the `KGS` / `USD` / `EUR` currency codes — they're symbols, not phrases).

- **Decimal formatting on cards inherits Phase 7's `formatValue`:** Cards render `1.5` / `2.5` plain decimals (no `1½` Unicode glyph). The form's `formatValue` helper in `StepperInput.tsx` is local to the stepper component; cards re-implement the same rule inline: `Number.isInteger(v) ? String(v) : v.toFixed(1)`. Planner may extract to a `formatBathroomCount` utility if the inline gets duplicated across all three surfaces.

- **PropertyCard specs container styling:** The existing `styles.specsContainer` rounded pill is 2-cell + divider today. Phase 8 keeps the rounded pill but transforms internals: each cell becomes `icon / value / label` stacked vertically (StyleSheet additions for `specLabel`). Vertical divider stays between cells when both render; drops to no-divider on office/commercial (1 cell). The `chipBackground` background color stays.

- **Test expansion scope:** Existing tests for `PropertyCard.test.tsx`, `HospitalityCard.test.tsx`, `PropertyDetailsScreen.test.tsx`, `ListingMetaTable.test.tsx` need updates (existing assertions that check for "Beds"/"Baths" text or bathroom enum rendering will break). Planner picks: replace-in-place (lowest churn) vs add new test cases for the bedrooms/bathroomCount rendering paths (additive). Both pass the acceptance criteria; planner's discretion.

- **PropertyDetailsScreen emoji vs Lucide icon system:** PropertyCard uses Lucide `Bed` and `Bath` icons (lines 282, 288); PropertyDetailsScreen uses emoji 🛏 🚿 📐 (lines 1050, 1057, 1071). Phase 8 keeps each surface's existing icon system — switching PropertyDetailsScreen to Lucide is a separate visual change beyond DISP-01..05's contract. Planner inherits this split.

- **Specs row order on PropertyDetailsScreen for hospitality:** PropertyDetailsScreen currently renders the specs row only when `!isHospitality` (line 1047). With Phase 8 introducing `Rooms` semantics for hospitality, the natural question is whether to also render a specs row on hospitality. ANSWER: No — HospitalityCard's existing meta line already carries Rooms + maxGuests + (new) Bathrooms; PropertyDetailsScreen for hospitality has its own info architecture (different sections). DISP-03 explicitly says "opening one on a hospitality listing shows 'Rooms' / 'Комнаты'" — the cleanest reading is that PropertyDetailsScreen's specs row should ALSO render on hospitality details with the Rooms label flip. Planner: render the specs row on hospitality too (drop the `!isHospitality` gate around line 1047, OR add a hospitality-aware specs row variant) — Beds cell label flips to "Rooms" / value reads `basics?.hotelRooms ?? '-'`; Baths cell renders `bathroomCount`; m² cell renders `basics?.areaSqm ?? '-'`. If planner judges the existing hospitality info architecture conflicts (e.g., maxGuests already shown elsewhere makes a Rooms cell redundant on details), planner may keep `!isHospitality` and surface the Rooms label only on the card — flagging the trade in the PLAN.md.

- **ListingMetaTable `rooms` + `bathroom` derivation removal:** Lines 68-69 (`const rooms = property?.basics?.rooms; const bathroom = property?.basics?.bathroom;`) become unused after D-09's removal. The `hasExtras` chain (lines 78-87) references them — must drop the `rooms != null ||` and `bathroom != null ||` chain links too. Planner does the full cleanup; no lint warnings left.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level scope & requirements

- `.planning/PROJECT.md` — JayTap core value; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation, M3's 6-type taxonomy preserved); EN+RU bilingual parity gate (`scripts/check-i18n-parity.sh`).
- `.planning/REQUIREMENTS.md` §"Display — PropertyCard / HospitalityCard / PropertyDetailsScreen" — DISP-01..DISP-05 acceptance criteria; §"Out of Scope" for the `basics.rooms` / `basics.bathroom` enum coexistence locks.
- `.planning/ROADMAP.md` §"Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen)" — Goal + 5 Success Criteria; Depends on Phase 6.

### Phase 6 + 7 anchors — data half + form half (shipped)

- `.planning/phases/06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va/06-CONTEXT.md` — schema decisions:
  - §D-01: strip rule reads top-level `propertyType` (NOT `basics.propertyType`).
  - §D-02: M3 6-type set `{apartment, house, hotel, hostel, office, commercial}` is canonical per `src/types/Property.ts:29` (NB: `propertyCategory.ts` PROPERTY_TYPES list is 10 Pascal-cased display labels — Phase 9's audit problem, NOT Phase 8's).
  - §D-04: bedrooms apply-set is `{apartment, house}` (residential-only).
- `.planning/phases/07-stepper-component-contextuallistingflow-integration/07-CONTEXT.md` — form decisions:
  - §D-01..D-04: stepper visual style + em-dash empty state + plain `1.5` decimal formatting (cards inherit the same decimal rule).
  - §D-12 test scope and "Phase 8 owns specs-row display" boundary anchor (line 27).
  - Phase 7's `contextualListing.step3.bedroomsLabel` / `bathroomCountLabel` keys are deliberately separate from Phase 8's `property.specs.*` namespace — form-context vs card-context.

### M3 + M1 anchors — render-surface architecture (load-bearing invariants)

- `.planning/milestones/v3.0-phases/02-contextual-listing-flow/02-CONTEXT.md` — M3 Phase 2 D-20 specs-row cutover (M2 flat `specs.{beds,baths,sqft}` → M3 nested `basics.{rooms,bathroom,areaSqm}`). Phase 8 is the next evolution of the same render surface — count-based fields layered over.
- `.planning/milestones/v1.0.4-phases/06-hospitality-rendering/` (M1 Phase 6) — D-10 "tour-first, price-free, no meta table" invariant for HospitalityCard. Phase 8 D-06 preserves this verbatim (inline meta fragment, no specs-strip block).

### Quick-task post-mortems with load-bearing decisions

- `.planning/quick/260525-ggp-fix-bedroom-and-bathroom-counts-not-rend/` — PropertyCard routing fix (hospitality now routes to HospitalityCard; PropertyCard's `basics.hotelRooms ?? basics.rooms` fallback is dead code post-fix; Phase 8 D-03 drops the fallback). Pascal-vs-lowercase normalization in `propertyCategory.ts:65`.
- `.planning/quick/260525-i2i-remove-duplicate-m-rendering-from-listin/` — m² rendered duplicated (once in `ListingMetaTable.extrasGrid`, once in PropertyDetailsScreen's specs row); duplicate removed from extras grid via 5-line deletion (commit `15f1010` → main `5a728a4`). Phase 8 D-09 follows the same surgical pattern for the rooms + bathroom-enum rows.

### RN client repo — files Phase 8 touches

- `src/components/PropertyCard.tsx` (~530 LOC) — specs container at lines 279-301. Phase 8 redesigns this branch:
  - Drop dead `basics?.hotelRooms ?? basics?.rooms ?? '-'` fallback chain (line 284); single read `basics?.bedrooms ?? '-'`.
  - Replace bathroom enum render (lines 290-296) with `basics?.bathroomCount ?? '-'`.
  - Add localized label under each cell (icon + value + label pattern).
  - Conditionally hide the Beds cell on office/commercial via a propertyType check at the cell level.
  - Adjust the vertical divider's rendering to drop when only one cell shows.
  - Add `styles.specLabel` to the StyleSheet block (lines 308+).
- `src/components/HospitalityCard.tsx` (~280 LOC) — meta line at lines 209-212. Phase 8 inserts a conditional fragment:
  - Between `t('hospitality.rooms')` and the `·` separator before `maxGuests`, render `· {bathroomCount} {t('hospitality.bathrooms')}` when `basics?.bathroomCount !== undefined`.
  - No StyleSheet changes (inline fragment uses existing `styles.meta`).
- `src/screens/PropertyDetailsScreen.tsx` (~2000 LOC) — specs row at lines 1042-1076. Phase 8:
  - Per Claude's Discretion clause above, planner decides whether to remove `!isHospitality &&` gate around the specs row (i.e., whether to render the row on hospitality details too). Default: render on all categories.
  - Beds cell label: `isHospitality ? t('property.specs.rooms') : t('property.specs.bedrooms')`. Value: `isHospitality ? (basics?.hotelRooms ?? '-') : (basics?.bedrooms ?? '-')`.
  - On `propertyType === 'office' || propertyType === 'commercial'`, Beds cell hides entirely.
  - Baths cell label: `t('property.specs.bathrooms')`. Value: `basics?.bathroomCount ?? '-'` (drop the bathroom enum branch lines 1059-1065).
  - m² cell unchanged (lines 1070-1074; 260525-i2i placement preserved).
  - Vertical divider rendering follows the visible-cell count.
- `src/components/ListingMetaTable.tsx` (~220 LOC) — extras grid at lines 161-220. Phase 8 (D-09 + D-10):
  - Remove the `rooms != null && (<Text>...</Text>)` block (lines 163-167).
  - Remove the `bathroom != null && (<Text>...</Text>)` block (lines 168-176).
  - Remove `const rooms = property?.basics?.rooms;` (line 68) and `const bathroom = property?.basics?.bathroom;` (line 69).
  - Remove `rooms != null ||` and `bathroom != null ||` from the `hasExtras` chain (lines 78-87).
- `src/locales/en.ts` — add 4 keys: `property.specs.bedrooms`, `property.specs.bathrooms`, `property.specs.rooms`, `hospitality.bathrooms`. EN values: `"Bedrooms"`, `"Bathrooms"`, `"Rooms"`, `"Bathrooms"`.
- `src/locales/ru.ts` — same 4 keys, RU values: `"Спальни"`, `"Ванные"`, `"Комнаты"`, `"Ванные"`.

### RN client repo — files Phase 8 does NOT touch (boundary anchors)

- `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — Phase 7 owned; the rooms / bathroom enum chip-row INPUTS still capture data. Phase 8 doesn't change INPUTS.
- `src/utils/propertyCategory.ts` — Phase 9 owns the `PROPERTY_TYPES` chip-render i18n audit. Phase 8 reads `propertyTypeToCategory()` but doesn't modify.
- `src/screens/HomeScreen.tsx:514` — raw `PROPERTY_TYPES` chip render → Phase 9 scope.
- `src/types/Property.ts` — already extended in Phase 6 with `bedrooms?: number` + `bathroomCount?: number`. Phase 8 reads only.
- All other surfaces that display property data (FavoritesScreen list, ModerationQueueScreen list, OwnerListingsScreen list, RenterListingsScreen list, HospitalitySection horizontal strip) — these all render via PropertyCard or HospitalityCard, so they inherit Phase 8's changes automatically. No direct edits needed in those screens.

### Codebase analysis (relevant subsets)

- `.planning/codebase/CONVENTIONS.md` — components named PascalCase.tsx under `src/components/`; co-located tests under `__tests__/`; theme tokens via `useTheme()` (no hardcoded colors); EN+RU lockstep parity gate; `TAP = 44` hit-target.
- `.planning/codebase/STACK.md` — RN 0.84 New Architecture; Lucide icons from `lucide-react-native` (already used in PropertyCard); `useLanguage()` hook from `LanguageContext`.

### Auto-memory pointers

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/central-asia-rooms-vs-bedrooms-convention.md` — the WHY: KG/KZ/UZ listings need bedrooms AND rooms; Phase 8 surfaces the bedrooms half (rooms stays in form, dropped from extras grid).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — verifier+reviewer paired gate. Phase 8 touches 4 render surfaces + tests; code review after execute is mandatory.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/feedback-discuss-phase-detail-level.md` — minor implementation choices auto-decided; reflected in this CONTEXT.md's "Claude's Discretion" section (m², decimal format, icon system, test expansion, specs container styling).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **PropertyCard.specsContainer** (`PropertyCard.tsx:280, 449`) — rounded pill with `chipBackground` background + `chipBorder` border. Phase 8 keeps the container; redesigns the cell contents inside.
- **PropertyDetailsScreen.specsContainer** (`PropertyDetailsScreen.tsx:1048, 1984`) — surface-colored bordered row with 3 cells separated by vertical dividers. Cell anatomy: icon (emoji) + value + label. Phase 8 inherits the cell anatomy verbatim — only the per-cell value/label logic changes.
- **PropertyCard's Bed + Bath Lucide imports** — already imported at the top of the file. No new icon imports needed.
- **`useTheme()` + `useLanguage()`** — both already wired into all four files. Zero new context plumbing.
- **`commonStyles` / `styles.specsContainer` / `styles.specItem` / `styles.specValue` / `styles.specLabel` / `styles.specDivider`** — already exist on both PropertyCard and PropertyDetailsScreen. Phase 8 may ADD `styles.specLabel` to PropertyCard's StyleSheet (it currently only has `specValue` since labels weren't rendered).
- **`PropertyDetailsScreen.isHospitality`** (line 274) — `category === 'Hospitality'` boolean derived from `propertyTypeToCategory(property.propertyType)`. Phase 8 reuses this for the label-flip branch in PropertyDetailsScreen.
- **`HospitalityCard`'s existing `styles.meta`** — single-line meta render style. Phase 8's inline bathroomCount fragment inherits this; no StyleSheet additions.

### Established Patterns

- **Surface-embedded category awareness** — PropertyCard, HospitalityCard, and PropertyDetailsScreen each carry their own "I am a residential/hospitality/universal card" knowledge in their internal logic. Phase 8 D-03 doubles down on this by dropping PropertyCard's defensive hospitality fallback.
- **Theme-aware inline style arrays** (`PropertyCard.tsx`, `HospitalityCard.tsx`, `PropertyDetailsScreen.tsx`): static structural styles in `StyleSheet`; dynamic colors merged via `style={[styles.x, { color: ... }]}`. New label rows follow the same shape.
- **Conditional cell rendering** (`PropertyCard.tsx:215-300` — showEditButton branch toggles entire content): Phase 8's Beds-cell hide on office/commercial uses the same conditional-render-the-View pattern (NOT visibility:'hidden' / display:'none').
- **i18n key lookup with type assertion** (`PropertyCard.tsx:291` and similar): `t('property.bathroomPrivate' as any)`. Phase 8 may need similar casts when planner adds new keys to the `TranslationKeys` union and TypeScript doesn't pick them up immediately — temporary `as any` casts allowed (per existing pattern) until the union regenerates.

### Integration Points

- **PropertyDetailsScreen's `isHospitality` gate around the specs row (line 1047):** Today the entire specs row is wrapped `{!isHospitality && (<View ...>...</View>)}`. Phase 8 (per Claude's Discretion clause) defaults to LIFTING the gate so the specs row renders on hospitality too — with the per-category label flip resolving the semantics. Planner may keep the gate if the existing hospitality info architecture (no specs row on hospitality details) reads cleaner.
- **PropertyCard specs strip vs owner-action chrome:** Today's render: `{showEditButton ? (<owner chrome>) : (<specs strip>)}` (mutually exclusive). Phase 8 preserves this conditional — only the specs-strip branch redesigns.
- **HospitalityCard's existing meta-line render** (line 209-212) — single `<Text>` element; Phase 8 modifies the children expression inside the existing `<Text>` to insert the conditional fragment. Zero structural changes.
- **ListingMetaTable's extras grid `hasExtras` gate** (line 89, 161): drops two contributors but the `||` chain still evaluates true when condition/furnished/deposit/etc. are present. Acceptable.

### Testing surfaces

- `src/components/__tests__/PropertyCard.test.tsx` — existing assertions on "Beds"/"Baths" text and bathroom-enum translations will fail after Phase 8. Planner replaces with `property.specs.bedrooms` / `property.specs.bathrooms` text + `basics.bedrooms` / `basics.bathroomCount` value assertions.
- `src/components/__tests__/HospitalityCard.test.tsx` — existing `rooms · maxGuests` line assertions extend to handle the conditional bathroomCount fragment (case: present vs absent).
- `src/screens/__tests__/PropertyDetailsScreen.test.tsx` — specs row label assertions + hospitality variant tests (if specs row lifted from `!isHospitality` gate).
- `src/components/__tests__/ListingMetaTable.test.tsx` — assertions on `Beds: {rooms}` / `Baths: {enum}` rows must be REMOVED (those rows no longer render). Other extras assertions preserved.

</code_context>

<specifics>
## Specific Ideas

- **PropertyCard cell anatomy (post-Phase-8):**
  ```tsx
  <View style={styles.specItem}>
    <Bed size={16} color={colors.textSecondary} strokeWidth={2} />
    <Text style={[styles.specValue, { color: colors.text }]}>
      {property.basics?.bedrooms ?? '-'}
    </Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>
      {t('property.specs.bedrooms')}
    </Text>
  </View>
  ```
  Same shape for the Baths cell, with `<Bath>` icon, `basics?.bathroomCount`, and `t('property.specs.bathrooms')` label.

- **PropertyCard office/commercial gate (around the Beds cell only):**
  ```tsx
  const showBedsCell = !(property.propertyType === 'office' || property.propertyType === 'commercial');
  // ...
  {showBedsCell && (<View style={styles.specItem}>...</View>)}
  {showBedsCell && (<View style={[styles.specDivider, { backgroundColor: colors.border }]} />)}
  <View style={styles.specItem}>{/* Baths — always renders */}</View>
  ```

- **HospitalityCard meta-line edit:**
  ```tsx
  <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
    {(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')} {t('hospitality.rooms')}
    {property.basics?.bathroomCount !== undefined ? (
      <>{' · '}{property.basics.bathroomCount} {t('hospitality.bathrooms')}</>
    ) : null}
    {' · '}{property.maxGuests ?? 0} {t('hospitality.maxGuests')}
  </Text>
  ```

- **PropertyDetailsScreen specs row label flip:**
  ```tsx
  const bedsLabelKey = isHospitality ? 'property.specs.rooms' : 'property.specs.bedrooms';
  const bedsValue = isHospitality
    ? (property.basics?.hotelRooms ?? '-')
    : (property.basics?.bedrooms ?? '-');
  const showBedsCell = !(property.propertyType === 'office' || property.propertyType === 'commercial');
  // and inside the specs row:
  {showBedsCell && (
    <>
      <View style={styles.specItem}>
        <Text style={styles.specIcon}>🛏</Text>
        <Text style={[styles.specValue, { color: colors.text }]}>{bedsValue}</Text>
        <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t(bedsLabelKey)}</Text>
      </View>
      <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
    </>
  )}
  <View style={styles.specItem}>
    <Text style={styles.specIcon}>🚿</Text>
    <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.bathroomCount ?? '-'}</Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bathrooms')}</Text>
  </View>
  <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
  <View style={styles.specItem}>
    <Text style={styles.specIcon}>📐</Text>
    <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.areaSqm ?? '-'}</Text>
    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>m²</Text>
  </View>
  ```

- **ListingMetaTable surgical removal — exact lines to delete:**
  ```tsx
  // DELETE lines 163-167:
  {rooms != null && (
    <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
      {t('property.beds')}: {rooms}
    </Text>
  )}
  // DELETE lines 168-176:
  {bathroom != null && (
    <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
      {t('property.baths')}: {bathroom === 'private' ? t('property.bathroomPrivate' as any) : ...}
    </Text>
  )}
  // DELETE line 68: const rooms = property?.basics?.rooms;
  // DELETE line 69: const bathroom = property?.basics?.bathroom;
  // EDIT lines 78-87: remove `rooms != null ||` and `bathroom != null ||` from the chain.
  ```

- **i18n key additions (exact):**
  - `en.ts`: `'property.specs.bedrooms': 'Bedrooms'`, `'property.specs.bathrooms': 'Bathrooms'`, `'property.specs.rooms': 'Rooms'`, `'hospitality.bathrooms': 'Bathrooms'`.
  - `ru.ts`: `'property.specs.bedrooms': 'Спальни'`, `'property.specs.bathrooms': 'Ванные'`, `'property.specs.rooms': 'Комнаты'`, `'hospitality.bathrooms': 'Ванные'`.

</specifics>

<deferred>
## Deferred Ideas

- **Replace `basics.rooms` with `basics.bedrooms` (data migration):** Out of Scope per REQUIREMENTS. Both fields coexist; rooms still captured by form for cultural "3-room apartment" semantics. M5+ candidate if data analysis shows duplication isn't pulling its weight.
- **Migrate `basics.bathroom` enum into `basics.bathroomCount`:** Out of Scope. Different attributes (TYPE vs COUNT). M5+ may reconsider whether the enum is still useful post-Phase-8 device QA.
- **`1½` Unicode glyph for half-bathrooms:** Phase 7 D-04 locks `1.5` decimal; Phase 8 inherits. M5+ if user demand surfaces.
- **PropertyDetailsScreen icon-system swap (emoji → Lucide):** Visual identity change beyond DISP-01..05's contract. M5+ candidate during a wider design-system refresh.
- **HospitalityCard meta-line lowercase compact form (`2 rooms · 1.5 baths · 4 max guests`):** Considered as a style-tighten during D-07; rejected because it would force concurrent updates to `hospitality.rooms` + `hospitality.maxGuests` in EN/RU and expand the change-set beyond DISP-04. M5+ if a card-text-style audit lands.
- **`property.beds` / `property.baths` / `hospitality.rooms` key cleanup:** After Phase 8 these become orphans on the touched surfaces (still used by `ListingMetaTable.tsx` indirectly via existing extras grid OTHER rows? — actually no, those particular keys are no longer referenced post-D-09). Phase 9's `check-no-raw-property-type-strings.sh` sentinel doesn't currently scope to "unused i18n keys" but could be widened; otherwise an M5+ key-pruning pass.
- **Rendering specs row on hospitality details:** Claude's Discretion in this CONTEXT.md leaves the `!isHospitality` gate decision to the planner. If kept, Rooms label only surfaces on HospitalityCard's meta line; if lifted, PropertyDetailsScreen also surfaces it. Defer the final call to the plan-phase.
- **Race-cell test rig + Android reanimated build doc + AWS IAM residual:** M3 carry-forward items; not Phase 8 scope (Phase 10 release-block can re-address Android reanimated runbook if it bites again).
- **Specs row on commercial PropertyDetailsScreen:** With Beds cell hidden on office/commercial, the row becomes Baths | m² (2 cells). If a future visual refinement wants a richer commercial-specific specs row (e.g., "office floors" + "parking spots"), that's its own phase.

</deferred>

---

*Phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail*
*Context gathered: 2026-05-25*

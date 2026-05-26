# Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 08-display-surfaces-propertycard-hospitalitycard-propertydetail
**Areas discussed:** Label keys + bedrooms/rooms split; Bathroom count vs enum; HospitalityCard bathroomCount layout; ListingMetaTable extras grid scope

---

## Label keys + bedrooms/rooms split

### Sub-Q1 — PropertyCard cell anatomy

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + value + label | Add a small label under each value on PropertyCard; matches PropertyDetailsScreen pattern. Browse-screen users see 'Bedrooms' on apartments and 'Rooms' on hotels. Costs ~one extra line of vertical space per card. | ✓ |
| Icon-only (status quo) | Keep the compact two-cell strip as-is; bedrooms/rooms distinction only surfaces on PropertyDetailsScreen. | |
| Value + label (drop icon) | Replace the icon with the localized label. Text-first, cleanest semantic disambiguation but loses the universal Bed/Bath glyphs. | |

**User's choice:** Icon + value + label.
**Notes:** User saw the preview mock-up of `🛏 2 / Bedrooms` and approved without comment.

### Sub-Q2 — Office/commercial Beds cell

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the cell entirely | Office/commercial cards render only a Baths cell. Asymmetric layout per property type. | ✓ |
| Keep cell, label = 'Beds' (generic) | Use the existing `property.beds` key on the office/commercial branch. Loses 'Bedrooms vs Rooms' clarity but symmetric layout. | |
| Keep cell, label = 'Bedrooms' | Always render 'Bedrooms' regardless of type. Simplest code but commercial says 'Bedrooms: -' (wrong). | |
| Keep cell, no label | Office/commercial Beds cell shows icon + '-' with no caption. Asymmetric typography. | |

**User's choice:** Hide the cell entirely.
**Notes:** Same hide-rule extends to PropertyDetailsScreen specs row (Beds cell omits on office/commercial there too). Card becomes 1-cell on office/commercial; vertical divider also drops.

### Sub-Q3 — Label-flip mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Surface-embedded | PropertyCard hardcodes 'Bedrooms' + reads `basics.bedrooms`; HospitalityCard hardcodes 'Rooms' + reads `basics.hotelRooms`; only PropertyDetailsScreen branches. Drops PropertyCard's dead hotel/hostel fallback. | ✓ |
| Shared helper in propertyCategory.ts | Add `getSpecLabel(propertyType)` to the existing utility. Single source of truth; indirection overkill for 1 conditional. | |
| Inline ternary at every render site | Each surface writes `isHospitality ? ... : ...` inline. Minimal abstraction; 2–3 duplicated ternaries. | |

**User's choice:** Surface-embedded.
**Notes:** Post-260525-ggp routing, PropertyCard never sees hospitality data in production. The defensive `basics?.hotelRooms ?? basics?.rooms` fallback on PropertyCard is dead and gets dropped.

### Sub-Q4 — Key namespace migration

| Option | Description | Selected |
|--------|-------------|----------|
| Add new keys, leave old keys alone | Add `property.specs.{bedrooms,bathrooms,rooms}`; old keys (`property.beds`, `property.baths`, `hospitality.rooms`) stay alive untouched. Phase 9 sentinel flags orphans. | ✓ |
| Add new keys + retire old keys this phase | Replace every old-key call site + delete from en.ts/ru.ts. Cleaner end-state but bigger blast radius. | |
| Reuse existing keys, change displayed text | Keep keys named `property.beds` but change EN/RU text to 'Bedrooms'. Name/value mismatch. | |

**User's choice:** Add new keys, leave old keys alone.
**Notes:** Phase 7 had already telegraphed the `property.specs.*` namespace; Phase 8 lands it. The old keys still live in ListingMetaTable (until area #4 cleanup) and other surfaces.

---

## Bathroom: count vs enum vs both

### Sub-Q1 — Office/commercial Baths cell render

| Option | Description | Selected |
|--------|-------------|----------|
| Count only | Baths cell renders `basics.bathroomCount ?? '-'` regardless of property type. Single read rule. Enum surfaces elsewhere if area #4 keeps ListingMetaTable. | ✓ |
| Count + enum together | Office/commercial show `{count} · {enum-label}` (e.g., '2 · Private'); other types show count only. Adds info density; breaks visual rhythm. | |
| Enum-first with count fallback | Office/commercial keep enum render; fall back to count when enum missing. Other types show count. 'Baths' cell shows two different concepts. Confusing. | |

**User's choice:** Count only.
**Notes:** Single read rule across all 6 types. Enum continues to exist in schema; Phase 8 adds NO new render surface for it. Existing enum render on PropertyCard line 290 + PropertyDetailsScreen line 1059 gets REMOVED. Enum's only surviving render is ListingMetaTable extras grid — pending area #4.

---

## HospitalityCard bathroomCount layout

### Sub-Q1 — Where to surface bathroomCount

| Option | Description | Selected |
|--------|-------------|----------|
| Inline append, hidden when absent | Single meta line becomes `{rooms} Rooms · {bathroomCount} Bathrooms · {maxGuests} Max Guests`. Fragment hides when `bathroomCount` undefined. Keeps card minimalist. RU truncation risk caught by existing `numberOfLines={1}`. | ✓ |
| Separate meta row below, hidden when absent | Add a second `<Text style={styles.meta}>` beneath the existing one. Slightly more vertical density; zero truncation risk. | |
| Inline append, '-' when absent | Same as option 1 but renders `-` placeholder when undefined. Symmetric line but reads noisier early after launch. | |

**User's choice:** Inline append, hidden when absent.
**Notes:** Preserves the M1 Phase 6 D-10 "tour-first, price-free, no meta table" invariant verbatim — no specs-strip block, no second meta row. New i18n key `hospitality.bathrooms` mirrors existing `hospitality.rooms` pattern (sentence-case rendered as `1.5 Bathrooms`). Lowercase compact form rejected per Claude's Discretion (would expand the change-set beyond DISP-04).

---

## ListingMetaTable extrasGrid scope

### Sub-Q1 — How aggressive should cleanup be

| Option | Description | Selected |
|--------|-------------|----------|
| Drop rooms + bathroom-enum rows from extras grid | Surgically remove the two duplicate rows from `ListingMetaTable.tsx:163-176`. Other extras (condition, furnished, deposit, etc.) stay. Subtractive change; zero new translation keys. | ✓ |
| Leave ListingMetaTable untouched | Out of Phase 8 scope per spec; accept visible duplication. Post-Phase-8 `Beds: 3` (rooms) stacks above `🛏 2 Bedrooms` (new) — two different numbers, both labeled similarly. | |
| Replace extras rows with bedrooms + bathroomCount | Swap rows to render `Bedrooms: {basics.bedrooms}` and `Bathrooms: {basics.bathroomCount}`. Still duplicates the specs row directly below; just re-skins. | |

**User's choice:** Drop rooms + bathroom-enum rows from extras grid.
**Notes:** Surgical, subtractive change in the spirit of quick task 260525-i2i (which removed the m² duplicate from the same grid via 5-line deletion). The `rooms` + `bathroom` local-variable derivations (lines 68-69) and their references in the `hasExtras` chain (lines 78-87) also get cleaned up.

---

## Claude's Discretion

- m² label stays hardcoded (Unicode unit symbol, not a translatable phrase). Analogous to `$` or `°C`.
- Decimal formatting on cards inherits Phase 7's `Number.isInteger(v) ? String(v) : v.toFixed(1)` rule. Inline duplication acceptable; planner may extract to a `formatBathroomCount` utility if it grows.
- PropertyDetailsScreen keeps existing emoji icons (🛏 🚿 📐) — switching to Lucide is a separate visual change beyond DISP-01..05.
- PropertyCard `styles.specsContainer` rounded pill stays; cell internals redesigned (icon / value / label stacked).
- Test expansion: planner picks replace-in-place vs additive — both pass.
- HospitalityCard meta-line capitalization: sentence-case (matches existing `hospitality.rooms` convention).
- PropertyDetailsScreen `!isHospitality` gate around specs row: planner default is to LIFT the gate so the row also renders on hospitality details (with the per-category label flip). Planner may keep the gate if the existing hospitality info architecture conflicts.

---

## Deferred Ideas

- Replace `basics.rooms` with `basics.bedrooms` (data migration) — M5+.
- Migrate `basics.bathroom` enum into `basics.bathroomCount` — M5+.
- `1½` Unicode glyph rendering — M5+.
- PropertyDetailsScreen icon-system swap to Lucide — M5+.
- HospitalityCard meta-line lowercase compact form — M5+.
- `property.beds` / `property.baths` / `hospitality.rooms` key cleanup — M5+ unused-key audit pass (Phase 9 sentinel doesn't currently scope to this).
- Rendering specs row on hospitality details — planner Claude's Discretion in Phase 8.
- Race-cell test rig + Android reanimated build doc + AWS IAM residual — M3 carry-forwards; not Phase 8.
- Richer commercial-specific specs row (office floors / parking spots etc.) — own future phase.

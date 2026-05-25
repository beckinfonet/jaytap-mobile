# Phase 7: Stepper Component + ContextualListingFlow Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 07-stepper-component-contextuallistingflow-integration
**Areas discussed:** Stepper visual style, Row placement & ordering & label copy

---

## Stepper visual style

### Q1 — Overall shape language

| Option | Description | Selected |
|--------|-------------|----------|
| Circular ± buttons (40–44pt) + center value | Round buttons on either side of fixed-width value cell. Apple Stocks-style. Reads as 'numeric control' — distinct from Step3 chip rows. | ✓ |
| Pill ± buttons matching existing chip radius | Wide-radius rounded rectangles for ±, value inline. Visually homogeneous with chip rows — could blur 'tap-to-select' vs 'tap-to-increment'. | |
| Inline-input look: bordered cell with ± inside | Single bordered box (like area/price TextInput) with ± hugging the value. | |

**User's choice:** Circular ± buttons + center value.
**Notes:** Locked as D-01 in CONTEXT.md. 40–44pt sizing aligns with `TAP = 44` constant convention.

### Q2 — Empty / em-dash state

| Option | Description | Selected |
|--------|-------------|----------|
| Em-dash — (U+2014) in `colors.textSecondary` | Typographically proper for absence-of-value. Same horizontal weight as a real number so row doesn't reflow on first tap. | ✓ |
| En-dash – (U+2013), narrower | Narrower; less standard for absence. | |
| ASCII hyphen `-` in `colors.textSecondary` | Matches existing PropertyCard `'-'` fallback pattern. Cheapest 'consistency' answer. | |

**User's choice:** Em-dash —.
**Notes:** Locked as D-02 in CONTEXT.md. CONTEXT.md notes Phase 8 cards can stay on ASCII `'-'` (no binding propagation).

### Q3 — Disabled-button visual treatment at min/max

| Option | Description | Selected |
|--------|-------------|----------|
| Dim glyph only, keep circle outline + fill | Subtle 'inert' state; lightest visual diff. | ✓ |
| Dim BOTH glyph AND circle outline/fill | Strongest 'off' signal; matches Step1 grayed-out chip pattern. | |
| Hide the disabled button entirely | Zero ambiguity but row reflows asymmetrically. | |

**User's choice:** Dim glyph only.
**Notes:** Locked as D-03 in CONTEXT.md.

### Q4 — Half-step display format for bathroomCount

| Option | Description | Selected |
|--------|-------------|----------|
| Plain decimal `1.5` (matches DISP-02) | Stepper === card surfaces. Zero translation cost. | ✓ |
| Mixed-number `1½` glyph for halves | Reads naturally but explicitly deferred to M5+ per REQUIREMENTS. Out-of-bounds for M4. | |
| Plain decimal with trailing zero stripped | Explicit `Number.isInteger(v) ? String(v) : v.toFixed(1)` rule. | |

**User's choice:** Plain decimal `1.5`.
**Notes:** Locked as D-04 in CONTEXT.md, including the `Number.isInteger` integer-strip rule (the third option was effectively a subset of the first — CONTEXT.md adopts the explicit rule for the planner).

---

## Row placement & ordering & label copy

### Q1 — Where do the new stepper rows live in Step3?

| Option | Description | Selected |
|--------|-------------|----------|
| Top of conditional section, just below currency | Counts read first, taxonomy chips read second. | |
| Bottom of conditional section, after existing rows | Existing M3 form reads first; M4 additions read as 'extra'. Reduces training-data shock for repeat owners. | ✓ |
| Interleaved with existing rows by semantic grouping | Tightest semantic clustering but more conditional-soup in render block. | |

**User's choice:** Bottom of conditional section.
**Notes:** Locked as D-05 in CONTEXT.md.

### Q2 — Order when both rows render (apartment + house)

| Option | Description | Selected |
|--------|-------------|----------|
| Bedrooms above Bathrooms | Universal real-estate convention; matches Phase 8 card-surface order. | ✓ |
| Bathrooms above Bedrooms | Inverts convention; no clear upside. | |

**User's choice:** Bedrooms above Bathrooms.
**Notes:** Locked as D-06 in CONTEXT.md.

### Q3 — i18n key path

| Option | Description | Selected |
|--------|-------------|----------|
| Local to step3 (`contextualListing.step3.bedroomsLabel` etc.) | Follows existing Step3 `.xxxLabel` convention. Stepper component stays pure (label is passed in). | (Claude-decided) ✓ |
| Promote to shared `property.specs.*` namespace now | Avoids label drift between form + cards. BUT pre-empts Phase 8 i18n scope. | |
| Inline keys without `.Label` suffix | Slight simplification; breaks existing convention. | |

**User's choice (paraphrased):** "Come on Claude, make some decisions for me. You're asking very extremely detailed questions. If there is something wrong, we can always come back at a later time in a different milestone to fix them up, but I think these questions can be answered by you using your best judgment on these."
**Claude's decision:** Option 1 (local to step3) — matches the existing `.xxxLabel` suffix convention used by `roomsLabel`, `bathroomLabel`, `kitchenLabel`, `hotelRoomsLabel`, `hotelClassLabel` in Step3BasicInfo.tsx. Captured as a Claude's Discretion item in CONTEXT.md.
**Notes:** Triggered saving `feedback-discuss-phase-detail-level.md` memory — future discuss-phase sessions should auto-decide minor implementation choices (key paths, glyph variants, etc.) and only escalate gray areas with meaningful preference stakes. EN/RU label copy + error-string copy were not asked (Q4 of this area was deprecated in favor of just deciding); decisions captured in CONTEXT.md `Claude's Discretion` section.

### Q4 — EN/RU label copy + error strings (Claude-decided, not asked)

| Key | EN | RU |
|-----|----|----|
| `contextualListing.step3.bedroomsLabel` | `"Bedrooms"` | `"Спальни"` |
| `contextualListing.step3.bathroomCountLabel` | `"Bathrooms"` | `"Ванные комнаты"` |
| `contextualListing.step3.bedroomsInvalid` | `"Bedrooms must be a whole number between 0 and 10."` | `"Количество спален должно быть целым числом от 0 до 10."` |
| `contextualListing.step3.bathroomCountInvalid` | `"Bathrooms must be a whole or half number between 0 and 10."` | `"Количество ванных должно быть целым или с шагом 0.5 от 0 до 10."` |

**Notes:** "Спальни" RU matches DISP-03's locked residential bedrooms copy. "Ванные комнаты" RU is the literal/formal form, chosen over colloquial "Санузлы" because the form-context wants the precise meaning ("bathroom rooms-as-count"), not the colloquial roll-up.

---

## Claude's Discretion (auto-decided, captured in CONTEXT.md)

- i18n key paths (`contextualListing.step3.bedroomsLabel` / `.bathroomCountLabel` + error keys)
- EN/RU label + error-string copy (4 keys × 2 locales = 8 strings)
- `<StepperInput>` optional `accessibilityLabel?: string` Props extension beyond FORM-01 minimum
- Component file location (`src/components/StepperInput.tsx`, no nested directory)
- propertyType-change reflow handling — add `bedrooms: undefined` to the `index.tsx:73–82` clear list; leave `bathroomCount` out (applies to all 6 types so preserving across type-switches is intentional)
- Test framework choice — inherit existing RTL pattern from M3 Step3 tests; no new dev-deps
- Disabled-state hit-target consistency — always 44pt regardless of disabled state (planner's call; recommended default)

## Areas NOT discussed (skipped per user multi-select)

- Backend M4_BEDROOMS_INVALID / M4_BATHROOM_STEP_INVALID surfacing path — auto-decided in CONTEXT.md D-10 (inline error pattern via `errors['basics.X']`, no new toast/Alert infra)
- FormBag wiring + test scope — auto-decided in CONTEXT.md D-07 + D-08 + D-09 + D-11 + D-12 (full FormBag integration, defensive validator extension, 6 unit + 4 integration test cases minimum)

## Deferred Ideas

(Captured in CONTEXT.md `<deferred>` section — verbatim list copied here for reference)

- Long-press accelerated increment on stepper — M5+ per FORM-03
- `1½` mixed-number glyph — M5+ per REQUIREMENTS Future Requirements
- Migration script for backfilling `bedrooms` / `bathroomCount` from existing fields — Out of Scope
- Promoting stepper labels to shared `property.specs.*` namespace — Phase 8 owns
- Replacing `basics.rooms` with `basics.bedrooms` — Out of Scope; fields coexist
- Wider i18n audit + raw-string sentinel — Phase 9 owns
- Reusing `<StepperInput>` elsewhere in the codebase — already abstract; no proactive scope expansion in Phase 7
- Race-cell test rig + Android reanimated build doc + AWS IAM cross-project residual — M3 carry-forward items; not Phase 7 scope

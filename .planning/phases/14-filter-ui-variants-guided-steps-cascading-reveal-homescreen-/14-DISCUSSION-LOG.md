# Phase 14: Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-
**Areas discussed:** Bottom sheet implementation, Cascading Reveal panel relationship to existing inline filter, Type taxonomy

---

## Bottom sheet implementation (Guided Steps variant)

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-rolled `Modal` + `Animated.View` | Use RN's built-in `Modal` (already imported in HomeScreen.tsx:14) with an Animated.View slide-up + scrim. ~150 LOC. No new deps. Mirrors `DeleteAccountModal` pattern. Skips drag-to-dismiss; tap-scrim and X-button close instead. | ✓ |
| `@gorhom/bottom-sheet` | Production-grade lib with snap points, drag-to-dismiss, backdrop. Reanimated 4.3 + gesture-handler 2.31 peers already satisfied. Adds one dep (~80 KB). Less control code; ~50 LOC vs 150. | |
| `react-native-modal` | Slightly nicer animations than built-in Modal but no drag-dismiss. Not currently installed. | |

**User's choice:** Hand-rolled `Modal` + `Animated.View` (recommended)
**Notes:** Locked as D-01. Animation library D-11 follow-on: RN core `Animated` API (not reanimated 4). Drag-to-dismiss deferred (D-deferred).

---

## Cascading Reveal panel — relationship to existing inline filter

| Option | Description | Selected |
|--------|-------------|----------|
| Replace existing inline panel with a new `<CascadingFilter>` component | Extract a dedicated component matching the handoff: animated Rent/Buy sliding pill toggle, underlined CATEGORY tab strip, multi-select Type chips, left nesting rail joining Category→Type, live result line. Delete 120 LOC of inline JSX in `HomeScreen.tsx:521-642`. Preserve closed-by-default + tap-filter-icon-to-toggle behavior. | ✓ |
| Polish-in-place — edit the existing inline section | Keep the inline JSX in HomeScreen.tsx, surgically swap chip backgrounds + add nesting rail + flip chips to multi-select. Smaller diff; no reusable component; doesn't separate concerns. | |
| Always-open inline (no toggle, no filter button gate) | Match handoff design canvas literally — Cascading panel permanently visible under search bar. Filter button becomes a no-op when `filterStyle='cascading'`. Costs ~280pt vertical space on every Home view. | |

**User's choice:** Replace existing inline panel (recommended)
**Notes:** Locked as D-02. Plan 14-02 owns the deletion + new component mount as one atomic commit. Filter button visual feedback (D-13) preserved (accent fill on active for both variants).

---

## Type taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Stay with JayTap's existing 10 types | Apartment/House/Townhome/Condo, Office/Retail/Warehouse/Industrial, Hostel/Hotel. CLAUDE.md guards the 3-category 9-type taxonomy (M1 D-04). Adding types touches PROPERTY_TYPES, Step1DealAndPropertyType.tsx, validateByCategory, EN/RU i18n, and backend Mongoose enum — milestone-shaped change, not Phase 14 territory. | ✓ |
| Expand to handoff's full 14 types | Adds Studio + Room (residential), Restaurant (commercial), Resort + Guesthouse (hospitality). Drops Industrial. Cross-cuts ContextualListingFlow, backend schema, M4 i18n audit — would need to ride a separate phase, blocks M6 closure. | |
| Add a subset (e.g. Studio + Room) only on the filter side | Filter chips show extra types that have no listings backing them — guaranteed zero-result misleads. Confuses users + invites later cleanup. | |

**User's choice:** Stay with JayTap's existing 10 types (recommended)
**Notes:** Locked as D-03. Hospitality TypeGrid is therefore 2-column × 1-row (D-18). Expansion captured as deferred idea for M7+ if product expands taxonomy.

---

## Claude's Discretion

User chose "Ready for context" rather than discussing additional minor areas. Per `feedback-discuss-phase-detail-level.md` ("only escalate gray areas with real stakes"), the following were resolved by Claude in CONTEXT.md:

- **D-04** Live filter semantics (writes immediately on every tap; "Show N homes" is dismiss affordance, not apply button) — locked from handoff README §Interactions.
- **D-05** HomeScreen variant dispatch shape (conditional mount based on `filterStyle`; pure controlled components).
- **D-06** Shared primitives extracted to `src/components/filters/primitives/` (DealToggle, CheckSquare, Stepper, MultiHint, ShowButton, Breadcrumb, TypeIcon).
- **D-07** i18n new `filters.*` namespace; property-type labels rendered verbatim from existing `PROPERTY_TYPES` constant (M4 Phase 9 handles per-type localization).
- **D-08** Three-plan split: primitives + i18n → Cascading → Guided + dispatch.
- **D-09** Stepper back-navigation matches handoff `reached(i)` semantics.
- **D-10** One variant mounted at a time (conditional render).
- **D-11** RN core `Animated` API for sheet slide (not reanimated 4).
- **D-12** Cascading open/close uses existing `LayoutAnimation.easeInEaseOut()`.
- **D-13** Filter button visual: accent fill when `isFiltersExpanded` for both variants; single Lucide `Filter` icon regardless of style.
- **D-14** `<ShowButton>` always enabled, even at count=0.
- **D-15** City picker stays in TopRow above search bar, untouched.
- **D-16** HomeRejectionBanner placement preserved.
- **D-17** Sheet content scrolls; footer is fixed.
- **D-18** Hospitality TypeGrid is 2×1 (auto-collapses to fewer rows for fewer types).
- **D-19** `hitSlop` on all interactive elements per project convention.
- **D-20** Co-located tests.

## Deferred Ideas

- Master-Detail variant (FILT-04 / Phase B) + Sentence Builder variant (FILT-05 / Phase B) — variant skeletons inform primitives in Phase 14 but full assembly is Phase B; Phase 15 picker shows them as "Coming soon."
- Per-property-type EN/RU localization — M4 Phase 9 territory (I18N-02).
- Filter state URL/share-link serialization — no M6 driver (carried from Phase 13 D-04).
- Bottom sheet drag-to-dismiss — tap-scrim + X-button cover the need; revisit if Phase 17 UAT requests it.
- Animated category-tab underline indicator — Plan 14-02 may ship without slide animation (static `borderBottom` sufficient for FILT-02 SC2).
- City + search-query in canonical filter shape — Phase 13 D-06 boundary preserved.
- Filter "Reset all" affordance — live-update model makes reset implicit; M7+ addition if UAT requests.
- Variant transition animation (cross-fade on live-swap) — no animation in v1; next filter-button press shows new variant.
- Backend `userFilterPreferences` sync — device-local per M6 scope (`m6-scope-decisions-2026-05-31.md`); M7+ if cross-device drift becomes a complaint.
- Type-set expansion to handoff's 14 — CLAUDE.md guard holds; M7+ requires ContextualListingFlow + backend Mongoose + i18n changes first.

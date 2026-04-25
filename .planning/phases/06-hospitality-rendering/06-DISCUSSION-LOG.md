# Phase 6: Hospitality Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 06-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 06-hospitality-rendering
**Areas discussed:** List section composition, HospitalityCard design, PropertyDetails Hospitality view, Amenity picker UX + storage

---

## List section composition (HOSP-01 / HOSP-02)

### Q1: Where does the HospitalitySection sit on Home / Favorites / OwnerListings?

| Option | Description | Selected |
|--------|-------------|----------|
| Top, via ListHeaderComponent (Recommended) | Above the residential/commercial vertical FlatList. Hospitality listings render as an inner horizontal strip. Matches REQUIREMENTS.md HOSP-01 architecture recommendation. | ✓ |
| Bottom, via ListFooterComponent | Below the residential/commercial list. Less discoverable but de-emphasizes hospitality. | |
| Interleaved (every N cards) | Insert horizontal hospitality strip every ~6 vertical cards, AirBnB-style. Higher implementation risk. | |

**User's choice:** Top, via ListHeaderComponent

### Q2: Section header treatment for the horizontal strip?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + count chip (Recommended) | e.g. "Hostels & Hotels (12)" with a small "See all" link. EN+RU parity straightforward. | ✓ |
| Minimal label, no count | Just "Hostels & Hotels" — less visual noise, no recount on filter changes. | |
| Silent strip, no header | Cards alone, no label. Cleanest but new users may not understand the differentiation. | |

**User's choice:** Title + count chip

### Q3: When a user taps a specific "Hostel" or "Hotel" filter chip, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide vertical list, expand horizontal section to vertical (Recommended) | Cleanest mental model: filter narrows results. | ✓ |
| Keep both visible, vertical list shows zero matches | Empty state looks like a bug. | |
| Keep horizontal section visible, vertical list shows non-hospitality matches | Confusing duplication. | |

**User's choice:** Hide vertical list, expand horizontal section to vertical

### Q4: How does the existing Residential/Commercial toggle relate to Hospitality?

| Option | Description | Selected |
|--------|-------------|----------|
| Add 3rd toggle: Residential / Commercial / Hospitality (Recommended) | Tri-state `selectedCategory` replaces binary `isCommercial`. | ✓ |
| Keep binary toggle, Hospitality always renders as top strip | No top-level Hospitality toggle. | |
| Replace toggle with category chip group entirely | Closer consistency with CreateListing UX but bigger refactor. | |

**User's choice:** Add 3rd toggle: Residential / Commercial / Hospitality

---

## HospitalityCard design (HOSP-03)

### Q1: Reuse PropertyCard with a prop variant, or ship a separate HospitalityCard.tsx?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate HospitalityCard.tsx (Recommended) | Cleaner mental model; lower regression risk on existing 417-LOC PropertyCard. | ✓ |
| Add prop variant on PropertyCard | Less code surface but mixes concerns inside an already-large component. | |
| Compose: HospitalityCard wraps PropertyCard with overrides | Hybrid — more moving parts than separate file. | |

**User's choice:** Separate HospitalityCard.tsx

### Q2: Tour-thumbnail vs photo emphasis on the card?

| Option | Description | Selected |
|--------|-------------|----------|
| Tour thumbnail when available, photo fallback (Recommended) | Matches HOSP-03 intent. | ✓ |
| Always photo hero, 3D tour as a corner badge | Simpler implementation; less differentiated visually. | |
| Stacked: tour thumbnail above, photo carousel below | More content density but heavier card. | |

**User's choice:** Tour thumbnail when available, photo fallback

### Q3: Hostel / Hotel type badge — placement and style?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-left chip on hero image (Recommended) | Mirrors existing tour3DBadge placement pattern. | ✓ |
| Bottom-right chip on hero | Visual symmetry but harder to scan in a horizontal strip. | |
| Inline text badge in card body | Cleaner hero but less scannable as a category signal. | |

**User's choice:** Top-left chip on hero image

### Q4: What replaces the beds + baths + sqm ListingMetaTable row in the card body?

| Option | Description | Selected |
|--------|-------------|----------|
| Rooms + Max guests + top 2-3 amenity chips (Recommended) | Matches HOSP-03 ("rooms + amenities summary replaces bedrooms + bathrooms"). | ✓ |
| Rooms + Bathrooms + Max guests, no amenities | Less differentiated from residential cards visually. | |
| Amenity icon row only (no numeric stats) | Most differentiated but loses size signal. | |

**User's choice:** Rooms + Max guests + top 2-3 amenity chips

---

## PropertyDetails Hospitality view (HOSP-04)

### Q1: How should PropertyDetailsScreen branch for hospitality listings?

| Option | Description | Selected |
|--------|-------------|----------|
| In-place conditional inside existing screen (Recommended) | Leverages 1684-LOC scaffolding without duplicating it. Lower regression risk. | ✓ |
| Extract a HospitalityPropertyDetails sub-component | Cleaner file separation but bigger refactor than HOSP-04 requires. | |
| Parallel screen file: HospitalityDetailsScreen.tsx | Cleanest mental model but doubles state-machine wiring. | |

**User's choice:** In-place conditional inside existing screen

### Q2: Where do 3D tours land relative to the image gallery?

| Option | Description | Selected |
|--------|-------------|----------|
| Tours promoted above the image gallery (Recommended) | HOSP-04 explicitly calls for this. | ✓ |
| Tours stay below gallery, with a top "View 3D Tour" sticky button | Less restructuring. | |
| Tour replaces gallery hero (gallery as collapsed thumbnail strip below) | Maximum tour emphasis but loses image discoverability. | |

**User's choice:** Tours promoted above the image gallery

### Q3: How should the no-price treatment render?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove the entire price block (Recommended) | Showcase-only intent honored cleanly. | ✓ |
| Show "Contact for booking" placeholder in price slot | Risks signaling "price hidden" rather than "showcase". | |
| Hide price label, show amenity chips inline in footer | Shifts amenity discoverability to a UI position users associate with price. | |

**User's choice:** Remove the entire price block

### Q4: Contact quick-actions — placement and prominence?

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky bottom bar with WhatsApp / Telegram / Phone buttons (Recommended) | Always reachable; reuses existing whatsappButton / telegramButton handlers. | ✓ |
| Inline contact card mid-page | Weaker than HOSP-04 "prominent at the bottom". | |
| All three actions surfaced at top below tour | Maximally prominent on first paint but scrolls away. | |

**User's choice:** Sticky bottom bar with WhatsApp / Telegram / Phone buttons

---

## Amenity picker UX + storage (HOSP-05 + Phase-5 D-13/14/15)

### Q1: What UX pattern for the 12-amenity multi-select in the create form?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline chip-toggle grid (Recommended) | 12 chips wrap in a flex grid directly inside HospitalitySection. Reuses commonStyles.chip pattern. | ✓ |
| Modal multi-select picker | Adds a navigation step. | |
| Bottom-sheet multi-select | Modern feel but introduces a new component pattern not used elsewhere. | |

**User's choice:** Inline chip-toggle grid

### Q2: Storage shape: canonical tokens vs translated labels?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical EN keys + i18n labels (Recommended) | `as const` string-literal union mirrors Phase-5 D-18 Currency pattern. Forward-compatible. | ✓ |
| Store translated labels directly | Couples backend data to UI language — breaks language switch. | |
| Numeric IDs (1..12) | No precedent in the codebase. | |

**User's choice:** Canonical EN keys + i18n labels

### Q3: Existing `Property.features: string[]` field — reuse or add a separate amenities key?

| Option | Description | Selected |
|--------|-------------|----------|
| Add separate `amenities: string[]` to Property (Recommended) | Hospitality has a fixed taxonomy; residential/commercial features is open-ended. Cleaner validation + rendering. | ✓ |
| Reuse `features: string[]` for hospitality amenities | Conflates open-ended residential/commercial features with closed hospitality taxonomy. | |
| Add `hospitalityAmenities: string[]` | Inconsistent with the existing short-name convention. | |

**User's choice:** Add separate `amenities: string[]` to Property

### Q4: Detail-view rendering of the selected amenities?

| Option | Description | Selected |
|--------|-------------|----------|
| Chip list with icon prefix (Recommended) | Distinctly hospitality. EN+RU parity: only labels translate. | ✓ |
| Plain bullet list | Lowest implementation cost; least visual distinction. | |
| Icon-only row, no text | Loses accessibility (screen readers) and EN/RU parity. | |

**User's choice:** Chip list with icon prefix

---

## Claude's Discretion

- Exact `lucide-react-native` icon name per amenity (researcher confirms during `/gsd-research-phase 6`)
- i18n key namespace for amenity validation error (`amenity.errors.atLeastOne` vs `validation.form.*`)
- Whether share-message helper gets a category-aware refactor or HospitalityCard inlines the no-price branch
- Whether `HospitalitySection.tsx` is its own file or embedded inside `HospitalityCard.tsx`
- Sticky bottom bar exact height + safe-area handling
- Whether to add an "all contacts empty" CTA fallback on the sticky bar

## Deferred Ideas

- All-empty-contact "Chat fallback" CTA on hospitality detail (post-M1 polish)
- Tour-first detail page for residential listings (post-M1 if user feedback signals weak tour discovery)
- Owner-side moderation chrome on hospitality cards (M2 — MOD-01..06)
- Listing-specific contact override (M2)
- Per-night pricing / booking calendar (Out of Scope — PROJECT.md)
- Chat moderation tooling (M2)

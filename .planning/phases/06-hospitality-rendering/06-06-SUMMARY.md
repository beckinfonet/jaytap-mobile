---
phase: 06-hospitality-rendering
plan: 06
subsystem: detail-screen
tags: [screen, detail, in-place-branch, contact-bar, amenity-grid, hospitality]
requirements: [HOSP-04]
requirements_addressed: [HOSP-04]
dependency_graph:
  requires:
    - 06-01-SUMMARY.md  # HospitalityAmenity + AMENITY_ICONS + Property.amenities
    - 06-02-SUMMARY.md  # backend round-trip for amenities (real data feeds the chip grid)
  provides:
    - "PropertyDetailsScreen Hospitality branches (D-13/D-14/D-15/D-16/D-23)"
  affects:
    - src/screens/PropertyDetailsScreen.tsx
tech_stack:
  added: []
  patterns:
    - "in-place conditional render gated on `isHospitality` (Phase 4 Pattern 1)"
    - "useSafeAreaInsets for sticky bar bottom padding (BottomNavigator precedent)"
    - "AMENITY_ICONS map lookup with Check fallback (defensive)"
    - "brand hex literals limited to UI-SPEC contact-button whitelist (Path B grandfathered)"
key_files:
  created: []
  modified:
    - src/screens/PropertyDetailsScreen.tsx
decisions:
  - "Place Hospitality TourHeroCard in a {paddingHorizontal:20, paddingTop:12} View directly above the carouselContainer — keeps gallery flush with screen edges per D-14"
  - "Sticky contact bar uses position:absolute inside root SafeAreaView so insets resolve naturally; flex:1 buttons (responsive) over fixed width:56"
  - "Wrapped amenity section with isHospitality ternary instead of two separate guards — single source of truth for the swap, smallest diff to the existing residential block"
  - "Reused existing handleWhatsApp/handleTelegram/handlePhone handlers verbatim (zero re-implementation per D-16)"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-24"
  tasks: 4
  files_modified: 1
  net_loc_delta: "+141 (1684 → 1825)"
---

# Phase 6 Plan 06: PropertyDetailsScreen Hospitality Branch — Summary

**One-liner:** In-place Hospitality branches on PropertyDetailsScreen — tours promoted above gallery (D-14), price block omitted (D-15), sticky 3-button contact bar with disabled-when-empty states (D-16), and amenity chip grid replacing features map (D-23) — closes HOSP-04 with zero impact on Residential/Commercial render paths.

## Tasks Completed

| Task | Commit  | Description                                                                       |
| ---- | ------- | --------------------------------------------------------------------------------- |
| 1    | 01af143 | Derive `isHospitality` + `useSafeAreaInsets` near top of component (D-13)         |
| 2    | f7f3e96 | Promote `<TourHeroCard>` above gallery + omit price block when Hospitality        |
| 3    | c17a509 | Sticky 3-button contact bar with disabled-when-empty states (D-16)                |
| 4    | 5eff861 | Amenity chip grid replaces `features.map(...)` when Hospitality (D-23)            |

## What Changed

### `src/screens/PropertyDetailsScreen.tsx` (1684 → 1825 LOC, +141)

**Imports (Task 1):**
- Added `propertyTypeToCategory` from `../utils/propertyCategory`
- Added `AMENITY_ICONS, type HospitalityAmenity` from `../utils/hospitalityAmenities`
- Added `type TranslationKeys` from `../locales`
- Split existing `react-native-safe-area-context` import to also pull in `useSafeAreaInsets`
- **No `lucide-react-native` import additions needed** — `MessageCircle`, `Send`, `Phone`, `Check` were all already imported (they were in use by the existing contact modal + features fallback)

**Derivations (Task 1, near `:181` after `useState<Property>`):**
```tsx
const category = propertyTypeToCategory(property.propertyType);
const isHospitality = category === 'Hospitality';
const insets = useSafeAreaInsets();
```

**Owner-field flags (Task 3):**
```tsx
const owner = (property as any).owner;
const hasWhatsApp = !!owner?.whatsapp;
const hasTelegram = !!owner?.telegram;
const hasPhone = !!owner?.phone;
```

**D-14 — Tour above gallery (Task 2):**
- New `<TourHeroCard>` sibling rendered ABOVE `<View style={styles.carouselContainer}>` when `isHospitality`, wrapped in `<View style={{paddingHorizontal:20, paddingTop:12}}>`
- Existing `<TourHeroCard>` inside `mediaButtonsContainer` (below gallery) gated by `!isHospitality`
- Net: TourHeroCard renders exactly once per category — above gallery for Hospitality, below for Residential/Commercial

**D-15 — Price block omission (Task 2):**
- Wrapped `<View style={styles.priceContainer}>` block at `:752-755` with `{!isHospitality && (...)}`
- No placeholder, no "contact for pricing" filler — slot is gone

**D-16 — Sticky contact bar (Task 3):**
- Inserted gated `{isHospitality && (...)}` block just before root `</SafeAreaView>` close
- 3 `<TouchableOpacity>` buttons (WhatsApp `#25D366` / Telegram `#0088CC` / Phone `#10B981`)
- Disabled state = `opacity:0.4`, `onPress=undefined`, `disabled=true`, bg=`colors.inputBackground`, icon=`colors.textSecondary`
- Active icon color: `#FFFFFF`
- Bottom padding: `Math.max(insets.bottom, 12)` (matches BottomNavigator precedent)
- Reuses `handleWhatsApp` / `handleTelegram` / `handlePhone` verbatim
- accessibilityRole="button" + accessibilityLabel using existing i18n keys (`property.whatsapp`, `property.telegram`, `property.phoneCall`)
- **Layout decision:** `flex:1` on each button (responsive 3-up) over fixed `width:56` — both match UI-SPEC §HospitalityContactBar; flex-1 chosen for responsiveness across phone widths

**StyleSheet keys added (Task 3):**
```tsx
hospitalityContactBar: {
  position: 'absolute', bottom: 0, left: 0, right: 0,
  flexDirection: 'row', gap: 12,
  paddingHorizontal: 20, paddingTop: 12,
  borderTopWidth: 1,
},
hospitalityContactBtn: {
  flex: 1, height: 56, borderRadius: 12,
  justifyContent: 'center', alignItems: 'center',
},
```

**D-23 — Amenity chip grid (Task 4):**
- Wrapped existing features section (`:602-618` original) with `isHospitality ? ( ... ) : ( ... )` ternary
- Hospitality branch: `(property.amenities ?? []).length > 0 && (...)` guard — silently omits entire section when amenities empty (per UI-SPEC §Empty-state copy)
- Hospitality title: `t('hospitality.amenities')` (existing Phase 4 key)
- Hospitality content: `((property.amenities || []) as HospitalityAmenity[]).map(...)` rendering `AMENITY_ICONS[token] ?? Check` icon + `t(\`amenity.${token}\` as TranslationKeys)` label
- Residential/Commercial branch: byte-for-byte identical to original `property.features.map(...)` rendering with `getFeatureIcon` helper
- Reused existing styles: `section`, `sectionTitle`, `sectionContentBox`, `featuresGrid`, `featureItem`, `featureItemText` — no new styles added

**D-17 — Panoramic media link (no change):**
- Panoramic link stays at its existing position in the media row (`:518-520` original) — no promotion needed per CONTEXT D-17

## Brand Hex Literals (UI-SPEC Whitelist Compliance)

| Hex       | Use                            | Pre-existing in file? |
| --------- | ------------------------------ | --------------------- |
| `#25D366` | WhatsApp button bg + modal     | YES (modal at :956)   |
| `#0088CC` | Telegram button bg (sticky)    | NEW — sticky bar only |
| `#10B981` | Phone button bg + modal        | YES (modal at :947)   |
| `#FFFFFF` | Active icon color in sticky    | YES (multiple uses)   |

All three brand hexes are confined to the new `hospitalityContactBar` JSX (whitelist-compliant per UI-SPEC). The contact modal already used `#25D366` and `#10B981` (Phase 5 `bba66fe`); `#0088CC` is the new addition (the modal used `#229ED9` for Telegram, but the sticky bar follows the UI-SPEC-locked Path B value).

## Verification Results

| Gate                                       | Status |
| ------------------------------------------ | ------ |
| `./scripts/check-role-grep.sh`             | PASS   |
| `./scripts/check-land-removed.sh`          | PASS   |
| `./scripts/check-i18n-parity.sh`           | PASS   |
| `npx tsc --noEmit` (16 lines baseline)     | PASS — no new errors in PropertyDetailsScreen |
| `npm test` (42 suites / 370 tests)         | PASS — all green |
| Zero diff in `src/components/PropertyCard.tsx` | PASS |
| `<Gated>` count in MediaSection.tsx (=2)   | PASS   |

### Grep counts

| Grep Pattern                                                    | Count |
| --------------------------------------------------------------- | ----- |
| `isHospitality`                                                 | 6     |
| `TourHeroCard`                                                  | 3 (1 import + 2 render sites) |
| `propertyTypeToCategory`                                        | 2 (import + call) |
| `AMENITY_ICONS`                                                 | 2 (import + lookup) |
| `useSafeAreaInsets`                                             | 2 (import + call) |
| `hospitalityContactBar`                                         | 2 (style + JSX) |
| `hospitalityContactBtn`                                         | 4 (style + 3 button JSX) |
| `handleWhatsApp` / `handleTelegram` / `handlePhone`             | 3 each (decl + modal + sticky) |
| `Math.max(insets.bottom, 12)`                                   | 1     |
| `userType.*===.*'admin'` (forbidden inline check)               | 0     |
| `'#25D366'` / `'#0088CC'` / `'#10B981'`                         | 3 / 1 / 3 |

## Deviations from Plan

None — plan executed exactly as written. Note: the plan's verification noted that `#25D366` and `#10B981` may already be present in the file (from the Phase 5 contact modal at `bba66fe`); the acceptance criteria of "at least 1" is satisfied.

## Regression Protection

Residential/Commercial detail rendering is byte-for-byte unchanged — every conditional render is gated on `isHospitality` and the `else`/`!isHospitality` branch contains the original code verbatim. Verified by:

- `git diff d894ea8..HEAD -- src/components/PropertyCard.tsx` returns empty (PropertyCard untouched)
- TourHeroCard: residential renders below gallery (existing position); Hospitality renders above gallery (new) — never both
- Price block: residential shows `priceLabel` + `formatPrice`; Hospitality omits entirely
- Features section: residential renders `property.features.map(getFeatureIcon)`; Hospitality renders `property.amenities.map(AMENITY_ICONS[token] ?? Check)`
- Contact UX: residential uses existing "Contact Now" button → modal; Hospitality adds the sticky bar (modal still available since the existing footer stays for both)

## Notes / Carry-forward

- Pitfall 3 (Hospitality price `'0'` default in PropertyService) remains deferred for M1 — ships as-is per Plan 02 SUMMARY. Hospitality detail screen omits the price block entirely (D-15), so the `'0'` default is invisible to end users and benign for M1.
- All-empty owner contacts: per Phase-5 D-09 hybrid + D-16, all three sticky buttons render disabled with no inline warning. "Chat fallback" CTA is deferred (CONTEXT §Deferred Ideas).
- The sticky bar coexists with the existing "Contact Now" → modal flow in the footer (which still uses the modal pattern from Phase 5 `bba66fe`). Both are visible for Hospitality users — sticky bar provides 1-tap access; modal provides the same 6 options including in-app message + email + schedule viewing.

## Self-Check: PASSED

- File `src/screens/PropertyDetailsScreen.tsx` exists and was modified (verified via `git log`)
- Commits exist: `01af143`, `f7f3e96`, `c17a509`, `5eff861` (verified via `git log --oneline`)
- All 4 task commits visible in branch history since base `d894ea8`

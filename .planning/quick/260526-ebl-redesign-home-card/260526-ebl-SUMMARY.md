---
quick_id: 260526-ebl
status: complete
commit: 9aabc2d
type: execute
wave: 1
completed_at: 2026-05-26
files_modified:
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/PropertyCard.tsx
requirements:
  - QUICK-260526-EBL — PropertyCard redesign per mockup (image-overlay
    price/stats card, deal-type-aware live status badge, conditional
    3D-tour pill, ID with `#` prefix, serif title, MapPin location line,
    area-cell with diagonal-arrow icon).
---

# Quick Task 260526-ebl: Home Screen PropertyCard Redesign

Redesign of `src/components/PropertyCard.tsx` so the home-screen card matches
the new mockup: dark sale/rent overlay pill with a red leading dot, dark
translucent share + heart buttons, a floating semi-transparent price + stats
card pinned to the bottom of the hero photo, and a re-laid-out below-image
region with `#<listingId>` + a deal-type-aware live status badge, a
conditional 3D-tour pill, a serif title, and a `MapPin` + `<district> · <city>`
location row.

## Commits (worktree branch `worktree-agent-afd9ad393d63f3842`)

| # | Hash | Subject |
|---|------|---------|
| 1 | `024ab4b` | feat(home-card): add EN/RU i18n keys for live status badge + 3D-tour pill (260526-ebl) |
| 2 | `9aabc2d` | feat(home-card): floating price overlay + 3D-tour pill + MapPin location row (260526-ebl) |

**Final commit:** `9aabc2d`
**Base:** `1b0ca9d` (M5 Phase 1 head)

## What changed

### Image-overlay region (`src/components/PropertyCard.tsx`)

- **Sale/rent pill** (top-left, ~line 138-145): white-9% background → DARK
  `rgba(0,0,0,0.55)` with a 6×6 red dot (`#EF4444`) leading the existing
  uppercase macro label (`FOR SALE` / `FOR RENT` EN, `ПРОДАЖА` / `АРЕНДА` RU).
- **Non-live `<StatusPill>` mount preserved verbatim** (line 152) — still sits
  below the deal-type pill with `marginTop: 6`. `pending` / `rejected` /
  `archived` listings still get their existing amber/red/grey capsule. The
  D-19 placement contract is unchanged.
- **Share + heart buttons** (top-right, lines 157-184): backgrounds switched
  from `'rgba(255,255,255,0.9)'` to `'rgba(0,0,0,0.4)'`. Share arrow glyph
  recoloured to white. Unfilled-heart colour changed from `#999` to `#FFFFFF`
  so it reads on the new dark surface. Filled-red `#E91E63` for favorited and
  the spinner colour-swap (`isFavorited ? '#E91E63' : '#FFFFFF'`) kept.
- **NEW floating price + stats overlay** (lines 187-218): absolute-positioned
  at `bottom: 16, left: 16, right: 16` with `rgba(0,0,0,0.55)` surface,
  `borderRadius: 16`, padding `14×12`. Left: uppercase eyebrow via
  `t('property.price')` (`PRICE` / `ЦЕНА`) at 10pt/600/letterSpacing 1 at
  70% opacity + a serif price value via `formatPrice(property, t('property.perMonth'))`
  at 22pt/500. Right: icon-only stat row (Bed / Bath / Maximize2 for area)
  with `gap: 14`. Each stat cell is rendered ONLY when its underlying value is
  present and > 0 (no `-` placeholder). The bed cell additionally hides on
  `office` / `commercial` listings (existing residential-only rule).

### Below-image content region (`src/components/PropertyCard.tsx`)

- **Row 1** (lines 224-265): `#<listingId>` text + deal-type-aware live badge
  (green dot `#22C55E` + `For sale` / `For rent` EN, `В продаже` / `В аренде` RU).
  Live-only — non-live statuses are covered by the StatusPill in the image
  overlay. Right side: conditional 3D-tour pill (Box icon + `3D Tour` /
  `3D Тур`) rendered ONLY when `property.media?.tourUrl` is set. Tapping calls
  `onViewTour(property)` via `e.stopPropagation()` so the card-tap doesn't
  fire. Pill uses transparent background + `colors.error` border + label.
- **Row 2 (title)** (lines 267-270): serif Georgia title at 22pt/400 with
  `numberOfLines={2}` and `lineHeight: 26`. The previous
  ` • <districtLabel>` suffix dropped — district moved to row 3.
- **Row 3 (location)** (lines 272-285): `<MapPin>` icon (14pt,
  `colors.textSecondary`) + `<district> · <city>` join, rendered ONLY when at
  least one of district / city is set.
- **Owner-actions row** (lines 287-348): lifted verbatim from the old code
  with the same Edit / Archive / Unarchive / Delete buttons, same
  status-driven branching (`live`/`pending`/`rejected` → Edit + Archive;
  `archived` → Edit + Unarchive + Delete), and same icon-button styles. Now
  mounted as a NEW row below the location row with `marginTop: 14` and
  `justifyContent: 'flex-end'`. HomeScreen does NOT pass `showEditButton`, so
  this row stays invisible on the home screen by design.

### Removals (`src/components/PropertyCard.tsx`)

- `<ListingMetaTable .../>` mount + import (the new row 1 covers
  `#<listingId>`; available-date deferred per plan Out of Scope).
- `formatAddress` import + the `formatted.line1 / line2` IIFE (row 3 renders
  the raw join — single-line by design).
- Previously-commented `bottomBadges` block referencing the M3-Phase-2-D-20
  removed fields (`is3DTourAvailable`, `tours[]`). Legacy fields are fully
  gone from the file — grep gate count went from 2 (commented refs) to 0.
- Orphaned styles: `bottomBadges`, `mediaBadge`, `mediaBadgeText`,
  `tour3DBadge`, `tour3DBadgeText`, `contactButton`, `contactButtonText`, and
  the entire `specsContainer` / `specItem` / `specRow` / `specValue` /
  `specLabel` / `specDivider` set (specs moved into the image overlay with
  inline white styles — no theme tokens needed).
- `Dimensions` import (was used only to compute `width` which is unused after
  the refactor).
- `statusBadge` / `statusText` / `heartButton` / `shareButton` discrete styles
  collapsed into the new `dealTypePill` / `darkOverlayButton` and the
  free-standing dot/label styles.

### i18n additions (`src/locales/en.ts` + `src/locales/ru.ts`)

Three new keys per file, inserted right after `property.forRent` /
`property.forSale` in the `// Property` section so deal-type strings stay
grouped:

| Key | EN | RU |
|---|---|---|
| `property.statusBadge.live.sale` | `For sale` | `В продаже` |
| `property.statusBadge.live.rent` | `For rent` | `В аренде` |
| `property.tourPill` | `3D Tour` | `3D Тур` |

`scripts/check-i18n-parity.sh` GREEN.

## Files modified

```
src/components/PropertyCard.tsx | 590 ++++++++++++++++++++++------------------
src/locales/en.ts               |   4 +
src/locales/ru.ts               |   4 +
3 files changed, 328 insertions(+), 270 deletions(-)
```

## Verification performed

| # | Gate | Command | Result |
|---|------|---------|--------|
| 1 | New i18n keys present | `grep -c "property.statusBadge.live.sale\|property.statusBadge.live.rent\|property.tourPill" src/locales/en.ts src/locales/ru.ts` | **3 / 3** (≥3 per file) |
| 2 | i18n parity | `bash scripts/check-i18n-parity.sh` | **PASS** |
| 3 | Legacy-field grep in PropertyCard.tsx | `grep -nE "is3DTourAvailable\|property\.tours\b" src/components/PropertyCard.tsx` | **0 hits** |
| 4 | KBD-02 grep gate in src/ | `grep -rnE "keyboardVerticalOffset" src/` | **0 hits** |
| 5 | TypeScript net-new errors | `npx tsc --noEmit` (PropertyCard.tsx errors only) | **0** (project baseline 20, all pre-existing per STATE.md) |
| 6 | ESLint | `npx eslint src/components/PropertyCard.tsx` | 0 errors, 2 warnings (both load-bearing inline styles inherited verbatim) |

The visual change CANNOT be automatically verified.
**Manual on-device QA required (iOS + Android, light/dark × EN/RU).**

## Manual QA required (10-cell matrix from PLAN.md Task 3)

Run the app on the iOS simulator (or your iPhone) and navigate to the Home screen.

- [ ] **1. Light + EN — home screen shows the redesigned card.** Sale listings
      show a `For sale` badge (green dot) on row 1; rent listings show
      `For rent`. Title is serif. Location row shows a pin icon +
      `district · city`.
- [ ] **2. Light + RU — same cards, badges read `В продаже` / `В аренде`,**
      3D-tour pill (when present) reads `3D Тур`.
- [ ] **3. Toggle to dark mode** (Settings → Appearance, or simulator
      Cmd+Shift+A): hero overlays still read; the floating price card stays
      legible over the photo; the below-image surfaces (id row, location row,
      owner actions if any) all use theme tokens (background + text both
      adapt).
- [ ] **4. Find a listing with a 3D tour set up** (any one with
      `media.tourUrl`) and confirm the `3D Тур` / `3D Tour` pill renders on
      row 1 right side. Tap it — the existing Tour flow should open (same as
      before; this CTA just relocated).
- [ ] **5. Find a listing WITHOUT a tour** and confirm the pill is ABSENT
      (not greyed out — completely gone).
- [ ] **6. Find an office or commercial listing** — the bed cell in the
      floating overlay is hidden (only bath + area show).
- [ ] **7. Find a listing with no `areaSqm`** — the area cell in the overlay
      is hidden.
- [ ] **8. Sign in as an account that owns at least one listing** and open
      your "My Listings" view (the `showEditButton=true` consumer). Confirm
      the Edit / Archive / Unarchive / Delete buttons still render in a row
      below the location row and still work.
- [ ] **9. Tap the share button and the heart on a card** — confirm both
      still work and that the heart still fills red when favorited.
- [ ] **10. If any pending / rejected / archived listing is visible to you,**
      confirm the existing yellow / red / grey `StatusPill` still appears
      (top-left of the image, below the sale/rent badge) — the live-only
      badge replaces nothing for those statuses.

## Deviations from PLAN

- **Locked-decision wording vs M3 schema.** The PLAN's locked-decisions block
  references `property.is3DTourAvailable && property.tours && property.tours.length > 0`.
  Those fields were REMOVED from `Property` at M3 Phase 2 D-20 and replaced
  by `media.tourUrl: string`. The user's intent — "render the pill only when
  there is a real tour to view" — is preserved verbatim by gating on
  `!!property.media?.tourUrl`, which is the canonical M3 predicate already
  used by `HospitalityCard:86` and by `HomeScreen.handleViewTour` (lines
  236-243). This was called out explicitly in the PLAN's `<scope-note>` and
  required no extra approval. **No legacy-field revival.**

- **`Dimensions` import removed.** The pre-refactor file imported
  `Dimensions` to compute `width`, but `width` was never used (dead since an
  earlier refactor). Dropped the import to keep the file tidy.

- No other deviations. All locked decisions implemented; all invariants
  (`groupWithFooter`, share / favorite / owner-actions, KBD-02 grep gate,
  `formatPrice` call shape, prop signature) preserved.

## Open follow-ups (not blockers, surfaced for awareness)

1. **`availableDate` no longer surfaced on the home card.** The old
   `<ListingMetaTable>` showed it; the new layout drops it intentionally
   (mockup has no date affordance on the card). If the user wants it back,
   that's a small follow-up — most natural slot would be a tiny line under
   the location row, or appended to the live-status badge.
2. **`HospitalityCard` was NOT touched.** It already has a different,
   redesign-ready layout. If you want the same dark-overlay-price treatment
   applied there for visual consistency, that's a separate quick task —
   explicitly out of scope here per the PLAN's constraints block and
   §"Out of scope" inside Task 2.
3. **`PropertyDetailsScreen`** was not touched (out of scope per constraints).
   The new home card's stats row uses a different anatomy from the details
   screen's spec cells (icon + value only vs icon + value + label); that's
   intentional per the design brief — denser surface on the card.
4. **Two ESLint warnings (no errors).** Both pre-existing inline-style
   patterns lifted verbatim from the prior file (`marginTop: 6` for the
   `StatusPill` mount, and the dark-mode-aware backgroundColor for the
   owner-actions Edit button). Leaving as-is to keep the diff scoped.

## Self-Check: PASSED

- **Files created/modified exist:**
  - `src/locales/en.ts` — FOUND (modified)
  - `src/locales/ru.ts` — FOUND (modified)
  - `src/components/PropertyCard.tsx` — FOUND (modified)
- **Commits exist on worktree branch `worktree-agent-afd9ad393d63f3842`:**
  - `024ab4b` — FOUND
  - `9aabc2d` — FOUND
- All five automated verification gates from the PLAN's `<verification>`
  block PASS (see table above). The remaining success criterion is the
  manual on-device QA — explicitly a `checkpoint:human-verify` task in the
  PLAN and out of scope for automated verification.

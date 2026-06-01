# Phase 14: Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch — Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Three deliverables on top of Phase 13's `buildFilterQuery` + `FilterStyleContext` foundation:

1. **`<GuidedFilterSheet>` — bottom-sheet wizard.** Hand-rolled with `react-native`'s built-in `Modal` + `Animated.View` slide-up. 1-2-3 Deal → Category → Type stepper with auto-advance + clickable-back-pill stepper. Big rounded selection cards for Deal + Category; 2-column multi-select chip grid for Type with square-checkbox affordance + "Choose one or more" hint. Footer = breadcrumb of current selection + accent "Show N homes" button. Tap-scrim and X-button close. Selections are LIVE (write to HomeScreen state on every tap; "Show N homes" is a dismiss affordance, not an apply button).

2. **`<CascadingFilter>` — inline panel under search bar.** New component that REPLACES today's `isFiltersExpanded` JSX block in `HomeScreen.tsx:521-642` (~120 LOC deleted). Sliding Rent/Buy pill toggle (animated thumb, no emoji), underlined CATEGORY tab strip, multi-select Type chips with check-glyph swap, left nesting rail joining Category→Type, live result line below. Preserves today's closed-by-default + tap-filter-icon-to-toggle UX.

3. **HomeScreen variant dispatch + filter-button behavior switch.** `HomeScreen` reads `useFilterStyle()`. When `'guided'` → filter button opens `<GuidedFilterSheet>`. When `'cascading'` → filter button toggles `<CascadingFilter>` (today's behavior preserved). Live-swap: changing `filterStyle` in Account Settings (Phase 15) → next filter-button press opens new variant, no app restart.

Both variants are pure controlled components — they receive `{ deal, category, types }` props + setters from HomeScreen. HomeScreen continues to own the filter state. Variants compute their internal "live count" via `buildFilterQuery(...)` against the `properties` array.

Out of scope (deferred to other phases per ROADMAP): Master-Detail variant (Phase B), Sentence Builder variant (Phase B), Account Settings filter-style picker (Phase 15), Profile reskin (Phase 16), backend changes.

</domain>

<decisions>
## Implementation Decisions

### Bottom sheet implementation (FILT-01)

- **D-01: Hand-rolled `Modal` + `Animated.View` slide-up for `<GuidedFilterSheet>`.** Use the `Modal` already imported at `HomeScreen.tsx:14`. New component at `src/components/filters/GuidedFilterSheet.tsx`. Shape:
  ```tsx
  <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={scrimStyle} />
    <Animated.View style={[sheetStyle, { transform: [{ translateY }] }]}>
      <Handle />
      <Header title={t('filters.title')} onClose={onClose} />
      <Stepper step={step} onStepPress={...} reached={reached} />
      <ScrollView>{step === 0 && <DealCards />}{step === 1 && <CategoryCards />}{step === 2 && <TypeGrid />}</ScrollView>
      <Footer>
        <Breadcrumb deal={deal} category={category} types={types} />
        <ShowButton count={liveCount} onPress={onClose} />
      </Footer>
    </Animated.View>
  </Modal>
  ```
  - **Why not `@gorhom/bottom-sheet`:** adds a dep + reanimated worklets surface area for a one-screen need. Drag-to-dismiss isn't a hard requirement (tap-scrim + X-button cover dismissal). Mirrors `DeleteAccountModal` + `MediaCurationScreen` (both use plain `Modal`). Project-known pattern wins over new lib.
  - **Why not reanimated 4 worklets for the slide:** `Animated` API (RN core) is enough for a single `translateY` interpolation. Reanimated complexity (`useSharedValue` + `runOnUI`) is overkill for a 300ms slide-up.
  - **Sheet height:** `maxHeight: '82%'` per handoff. `borderTopLeftRadius: 32`, `borderTopRightRadius: 32`. `backgroundColor: colors.background` (NEW Phase 12 `#121214` dark / `#f3f3f6` light). Drag-handle bar above title is decorative (no PanResponder).
  - **Scrim:** `colors.scrim` (already-shipped `rgba(0,0,0,0.55)` per Phase 12 D-03; preserved verbatim). `<Pressable onPress={onClose}>` covering full screen.

### Cascading panel — replace existing inline section (FILT-02)

- **D-02: Extract `<CascadingFilter>` to `src/components/filters/CascadingFilter.tsx`; delete today's inline JSX block in `HomeScreen.tsx:521-642`.** Single component, single source of truth. HomeScreen renders `<CascadingFilter ... />` conditionally on `filterStyle === 'cascading' && isFiltersExpanded`.
  - **Why not polish-in-place:** today's inline block is 120 LOC of nested JSX with hardcoded `'🏠 Rent'` emojis (line 536), `isDark` ternaries scattered through styles, no nesting rail. Extracting cleanly separates Cascading concerns from HomeScreen and gives Phase B (Master-Detail / Sentence variants) a precedent for "filter variants live in `src/components/filters/`."
  - **Why not always-open inline:** eats ~280pt of vertical space on every Home view; preserves today's "filter icon toggles panel" affordance the user already trained on.
  - **Today's `isFiltersExpanded` boolean stays** — Cascading uses it to mount/unmount its body. `LayoutAnimation.easeInEaseOut()` already wired at `HomeScreen.tsx:22` for the open/close animation.

### Type taxonomy (CLAUDE.md guard)

- **D-03: JayTap's existing 10-type taxonomy is preserved verbatim.** `RESIDENTIAL_TYPES` (4: Apartment, House, Townhome, Condo), `COMMERCIAL_TYPES` (4: Office, Retail, Warehouse, Industrial), `HOSPITALITY_TYPES` (2: Hostel, Hotel). The handoff prototype's expanded set (Studio, Room, Restaurant, Resort, Guesthouse) is NOT adopted in M6.
  - **Why:** CLAUDE.md guards the 3-category 9-type taxonomy (M1 D-04: `Land` removed atomically; `Hostel`+`Hotel` added under `Hospitality`; M3 + M4 preserved). Expanding would cross-cut `src/utils/propertyCategory.ts` `PROPERTY_TYPES` const + `Step1DealAndPropertyType.tsx` writer + `validateByCategory()` + EN/RU i18n + backend Mongoose enum + M4 i18n audit — milestone-shaped, not Phase 14 territory.
  - **Effect on variants:** TypeGrid in Guided sheet renders 4 / 4 / 2 cards by category. The Hospitality grid is a 2-column × 1-row layout (2 cards). The Cascading chip strip auto-fills with whatever types the selected category yields.

### Live filter semantics (locked from handoff principle)

- **D-04: Every selection inside both variants writes to HomeScreen state IMMEDIATELY.** Handoff README §Interactions: "Filters are live: every tap updates the result set and the count immediately; no Apply." Guided's "Show N homes" button is purely a dismiss affordance with a count preview — it does NOT apply state on press (state is already applied). This means:
  - Variants are **pure controlled components** — receive `{ deal, category, types }` props + setters from HomeScreen.
  - No internal staging state. No "Apply" / "Reset" semantics.
  - Background listings under the scrim re-filter as the user picks (invisible behind scrim, but state-correct on dismiss).
  - **Live count display** — both variants compute `properties.filter(buildFilterQuery({ deal, category, types })).length` themselves via `useMemo`. Variants receive `properties: Property[]` prop from HomeScreen. The result-count `<Text>` at `HomeScreen.tsx:644-646` already shows the same count (uses `filteredProperties.length`) — variants reuse the existing memoized list when possible by accepting `liveCount: number` as a prop (HomeScreen passes `filteredProperties.length`).

### HomeScreen variant dispatch (FILT-03)

- **D-05: Conditional render in HomeScreen — only the active variant component is mounted at a time.**
  ```tsx
  const { filterStyle } = useFilterStyle();
  // ... in JSX, replacing today's lines 521-642:
  {filterStyle === 'guided' && (
    <GuidedFilterSheet
      open={isFiltersExpanded}
      onClose={() => setIsFiltersExpanded(false)}
      transactionType={transactionType} setTransactionType={setTransactionType}
      selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
      types={types} setTypes={setTypes}
      liveCount={filteredProperties.length}
    />
  )}
  {filterStyle === 'cascading' && isFiltersExpanded && (
    <CascadingFilter
      transactionType={transactionType} setTransactionType={setTransactionType}
      selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
      types={types} setTypes={setTypes}
      liveCount={filteredProperties.length}
    />
  )}
  ```
  - For `'master'` or `'sentence'` (deferred to Phase B) — `filterStyle` value persists but no component renders; the filter button is a no-op until Phase B ships. Acceptable because Account Settings picker shows them as "Coming soon" and the user can't pick them. If somehow set (manual AsyncStorage poke, dev sandbox), the filter button silently does nothing.
  - **Filter-button visual state:** Today the button paints `colors.accent` when `isFiltersExpanded`. Keep this for BOTH variants — sheet-open and panel-open are both "filter active" states. No new visual logic.
  - **Live-swap:** Phase 13 `FilterStyleContext` is React Context → setter call rerenders every consumer including HomeScreen → next render reads new `filterStyle` → next filter-button press opens new variant. Zero remount required, zero app restart.

### Shared sub-components

- **D-06: Extract reusable filter primitives to `src/components/filters/primitives/`.** Variants share visual language (DealToggle, CheckSquare, type icons). Plan 14-01 ships:
  - `DealToggle.tsx` — sliding-pill segmented Rent/Buy toggle used by BOTH Guided (size='lg') and Cascading (size='lg'). Replaces today's emoji segmented control at HomeScreen.tsx:524-551.
  - `CheckSquare.tsx` — 22×22 rounded-square checkbox affordance (multi-select visual cue) used by Guided's TypeGrid (and forward-fit for Master-Detail Phase B).
  - `Stepper.tsx` — 1-2-3 stepper bar (Deal → Category → Type) for Guided's header. Reached-state-aware (clickable when prior step has a value).
  - `MultiHint.tsx` — small "Choose one or more" pill with mini checkbox glyph. Guided's TypeGrid header.
  - `ShowButton.tsx` — full-width accent CTA "Show N homes" / "Show 1 home" with shadow. Guided's footer.
  - `Breadcrumb.tsx` — chevron-separated selection trail. Guided's footer.
  - `TypeIcon.tsx` — Lucide-icon map for the 10 property types (Apartment/House/Townhome/Condo/Office/Retail/Warehouse/Industrial/Hostel/Hotel). Reused by Guided cards + Cascading chips.

  **Why a `primitives/` subdirectory:** ten new components in one folder is fine but signals "these are leaves." Variants live one level up at `src/components/filters/{GuidedFilterSheet,CascadingFilter}.tsx`. Phase B Master-Detail / Sentence variants extend the same primitives.

### i18n namespace

- **D-07: New `filters.*` namespace** in `src/locales/{en,ru}.json`. Keys needed:
  - `filters.title` ("Filters" / "Фильтры")
  - `filters.deal.rent` ("Rent" / "Аренда")
  - `filters.deal.buy` ("Buy" / "Купить")
  - `filters.deal.rentBlurb` ("Lease month-to-month" / "...")
  - `filters.deal.buyBlurb` ("Purchase to own" / "...")
  - `filters.step.deal` / `filters.step.category` / `filters.step.type` (stepper labels)
  - `filters.category.prompt` ("What kind of property?" / "...")
  - `filters.category.residentialBlurb` / `commercialBlurb` / `hospitalityBlurb`
  - `filters.type.prompt` ("Pick a type" / "...")
  - `filters.type.multiHint` ("Choose one or more" / "...")
  - `filters.showHomes.zero` / `.one` / `.many` (ICU-style; "Show {count} homes" / "Show {count} home")
  - `filters.resultLine.deal` (e.g. "{deal} · {category}" composition format)
  - `filters.resultLine.typesCount` ("{count} types" / "{count} типов") for breadcrumb collapse when types > 1
  - `filters.cascading.categoryHeader` ("CATEGORY" / "КАТЕГОРИЯ" — uppercase letter-spacing)
  - `filters.cascading.typeHeader` ("TYPE" / "ТИП")
  - `filters.cascading.typeHint` ("pick any" / "...")
  - Property-type labels — REUSE existing constants for now (Pascal-cased English strings in `PROPERTY_TYPES`); the per-type EN/RU i18n is an M4 Phase 9 deliverable (I18N-02). Phase 14 renders `item.label` from the existing constant verbatim. When M4 Phase 9 ships, the variants pick up localized labels via the same render path.

  **Why a new namespace:** keeps filter UI vocabulary separate from existing `home.*` keys (which carry the legacy `home.bishkekAll` style). New keys for a new surface = clean grep targets when M7+ refactors the filter again.

  **EN+RU parity:** every key added to both files atomically per plan; `scripts/check-i18n-parity.sh` exit 0 gate enforced.

### Plan split

- **D-08: Three atomic plans.**
  - **Plan 14-01 — Shared primitives + i18n + types.** Create `src/components/filters/primitives/{DealToggle,CheckSquare,Stepper,MultiHint,ShowButton,Breadcrumb,TypeIcon}.tsx`. Add `src/locales/{en,ru}.json` filter keys. Co-located tests for each primitive (snapshot + interaction where stateful). Atomic commit. Acceptance: each primitive renders in isolation; i18n parity gate exit 0; tsc 0 new errors. No HomeScreen changes yet.
  - **Plan 14-02 — `<CascadingFilter>` component + HomeScreen integration.** Create `src/components/filters/CascadingFilter.tsx`. Wire into HomeScreen behind `filterStyle === 'cascading'` gate. DELETE today's inline JSX block at `HomeScreen.tsx:521-642`. Atomic commit. Acceptance: FILT-02 SC4 + SC5 satisfied; existing single-chip-style behavior still reachable (set filterStyle='cascading' via dev fixture or wait for Phase 15); multi-select toggling works via existing `togglePropertyType` setter (Phase 13 already array-shape-aware); `buildFilterQuery` predicate fires on every change. tsc 0 new errors.
  - **Plan 14-03 — `<GuidedFilterSheet>` component + HomeScreen variant dispatch.** Create `src/components/filters/GuidedFilterSheet.tsx`. Wire HomeScreen filter-button to open sheet when `filterStyle === 'guided'`. Sheet slide-up animation (RN `Animated`, 300ms ease-out). Atomic commit. Acceptance: FILT-01 SC1 + FILT-03 SC1-SC5 satisfied; both variants share the `transactionType`/`selectedCategory`/`types` state per FILT-03 SC4; live count visible in both variants matches HomeScreen result count; KBD-02 grep gate still 0; tsc 0 new errors.

  **Why split this way:** Plan 14-01 is foundation (no behavior change yet); 14-02 is the first variant shipping (most LOC deleted from HomeScreen); 14-03 layers on the second variant + dispatch. Mid-execution rollback boundaries are clean. Mirrors Phase 13's two-plan + Phase 12's two-plan project-known shipping shape, expanded to three because Phase 14 ships more component code.

### Back-navigation in Guided stepper

- **D-09: Match handoff's `reached(i)` semantics — step pills are clickable when prior steps have values.** Step 0 (Deal) always reached. Step 1 (Category) reached iff `deal` is set. Step 2 (Type) reached iff `category` is set. Clicking a reached earlier step jumps back without clearing later selections (handoff JSX preserves `cat` and `types` when stepping back). User can re-pick category mid-flow; this clears `types: []` (matches existing `togglePropertyType` semantics + handoff line 137).
  - **Why match handoff:** the stepper is the wizard's main back-navigation affordance. Sheet has no chrome back button — only X-close. Stepping back via the bar is the intended UX.

### Mounting strategy

- **D-10: Only one variant mounted at a time** — conditional `{filterStyle === 'guided' && <GuidedFilterSheet />}` etc. Not "both mounted, only one visible."
  - **Why:** GuidedFilterSheet contains a `Modal` with `Animated.Value`; mounting both costs an unused subtree + animation refs. Switch happens on filter-button press anyway, so there's no animation-during-switch concern.
  - **Cold state on switch:** Switching `'guided' → 'cascading'` while a Guided sheet is open is impossible in practice (Settings picker is in a separate screen; Guided sheet covers HomeScreen). If it ever happens (deep-link, dev), `isFiltersExpanded` resets to `false` on the new render cycle naturally — the Modal unmounts → close.

### Animation library

- **D-11: RN core `Animated` API for the Guided sheet slide.** Not reanimated 4.
  - **Why:** `Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true })` is single-purpose. Reanimated's `useSharedValue` + `useAnimatedStyle` is overkill. Reanimated's worklet boundary also constrains what closures can fire on JS side — adds complexity for no benefit here.
  - **Compatibility:** RN `Animated` lives in `react-native` core; no peer-dep concerns. Coexists with reanimated 4.3 + gesture-handler 2.31 (which are loaded for other features like image-zoom, not depended on here).

### Claude's Discretion

These are decided by Claude per `feedback-discuss-phase-detail-level.md` (only escalate gray areas with real stakes):

- **D-12: `<CascadingFilter>` open/close transition** — keep today's `LayoutAnimation.easeInEaseOut()` per `HomeScreen.tsx:22` Android-flag wiring. No new animation library. Consistent with the rest of HomeScreen's collapsible UI.

- **D-13: Filter button visual feedback** — accent fill when `isFiltersExpanded` for BOTH variants (today's behavior). No "guided icon variant" vs "cascading icon variant" — single `Filter` Lucide icon regardless of style. The icon is route-agnostic; the button just opens "filters."

- **D-14: `<ShowButton>` always enabled, even at `count === 0`.** Handoff prototype always renders `<ShowBtn count={count}/>` with no disabled state. Tapping it at count=0 closes the sheet and shows zero results below; the user can re-open and adjust. Easier UX than a disabled button without explanation.

- **D-15: City picker stays in TopRow above search bar, untouched.** Phase 14 does not modify the country/city dropdown shipped in quick-task 260530-sud. Cascading panel sits BELOW search bar, doesn't interact with city picker.

- **D-16: HomeRejectionBanner stays between search bar and filter section.** Phase 14 preserves rendering order. When `filterStyle === 'guided'`, banner shows above the (empty) filter section area; tapping filter button opens sheet OVER the banner via Modal.

- **D-17: Sheet content scrolls; footer is fixed.** Guided sheet body uses `<ScrollView>` for the Type grid case (4 chips in residential, fits w/o scroll on iPhone 15 Pro Max but degrades gracefully on Moto G XT2513V). Stepper + Header are fixed at top; Footer (Breadcrumb + Show button) fixed at bottom. Body scrolls between.

- **D-18: Hospitality TypeGrid is 2-column × 1-row** (Hostel, Hotel). Visual asymmetry vs Residential's 2×2 is intentional — the grid auto-collapses to fewer rows when there are fewer types. No special-case "fill with empty slots."

- **D-19: Touch areas + hit slop** — Step pills (26pt diameter), close button (36pt), card/chip buttons all get `hitSlop: { top: 4, bottom: 4, left: 4, right: 4 }` per project convention (mirrors stepper buttons from M4 Phase 7). iOS HIG ≥44pt minimum touch target satisfied via padding around interactive elements.

- **D-20: Co-located tests** — `GuidedFilterSheet.test.tsx`, `CascadingFilter.test.tsx`, each primitive `.test.tsx` next to its source. Mirrors project convention from `getTourPhotosUrl.test.ts` + Phase 13 `buildFilterQuery.test.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MoveIn Design Handoff (variant structure + tokens)

- `/tmp/moveinzip_ld/design_handoff_profile_filters/README.md` §Filters + §Design Tokens + §Interactions — Authoritative spec for variant behavior, type sets, deal model, live-update semantics. Re-extract from `MoveIn_ Real Estate_LD_Mode.zip` if `/tmp` is stale.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/filters-variants.jsx` lines 84–177 (VariantA Guided) + lines 182–247 (VariantB Cascading) — Precise spec for JSX structure, control vocabulary, auto-advance, breadcrumb, nesting rail.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/filters-shared.jsx` lines 6–80 — Token-key vocabulary (`fp.bg`/`fp.surface`/`fp.coral`/`fp.coralSoft`/`fp.coralLine`/`fp.hair`/`fp.hair2`/`fp.surface2`/`fp.surface3`/`fp.dim`/`fp.mute`) + DEALS/CATEGORIES/TYPES data shape + `resultCount` + `joinTypes` helpers + the `FI()` icon glyph palette. Map `fp.*` keys to Phase 12 `colors.*` tokens at component-write time (no hex literals).

### Project Planning Context

- `.planning/REQUIREMENTS.md` §M6 / FILT-01 / FILT-02 / FILT-03 — Phase 14 requirement bodies (3 reqs).
- `.planning/ROADMAP.md` §Phase 14 — Goal + 5 Success Criteria + Depends-on chain (Phase 12 ✅ + Phase 13 ✅; gates Phase 15 picker via the variants it points at).
- `.planning/PROJECT.md` — M6 current focus context; "variants are the value" memory + handoff source location.
- `.planning/STATE.md` — Phase 13 closed; Phase 14 next; M6 Phases 14/15/16 remain in v1 scope.

### Phase 13 Foundation (read FIRST — Phase 14 builds on this)

- `.planning/phases/13-shared-filter-data-model-asyncstorage-persistence/13-CONTEXT.md` — Locked Phase 13 decisions (D-04 buildFilterQuery shape, D-05 signature, D-06 predicate semantics, D-10 corrupt-AsyncStorage default behavior).
- `src/utils/buildFilterQuery.ts` — Phase 13 canonical predicate factory. Variants build `{ deal, category, types }` args from their props/setters and pass to `buildFilterQuery({...})` for live count + (already wired) HomeScreen filtering.
- `src/context/FilterStyleContext.tsx` — Phase 13 hook. HomeScreen Phase 14 imports `useFilterStyle()` to read `filterStyle`; dispatch is `filterStyle === 'guided' ? <GuidedFilterSheet/> : <CascadingFilter/>`.

### Phase 12 Palette Tokens (consumed verbatim)

- `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-CONTEXT.md` — Token mapping (D-04 MODE_INDEPENDENT_PALETTE, D-08 full token list). Phase 14 components use Phase 12's `colors.surface2`, `colors.surface3`, `colors.hair2`, `colors.iconChipFg`, `colors.accent`, `colors.accentSoft`, `colors.accentLine`, `colors.landlordGreen` as first-class consumers (Phase 12 shipped them; Phase 14 is the first surface lighting them up).
- `src/theme/colors.ts` — Single source of truth for every color used by the variants.

### Codebase Anchors

- `src/screens/HomeScreen.tsx:14` — `Modal` import already present (no new import needed for GuidedFilterSheet).
- `src/screens/HomeScreen.tsx:22-24` — `LayoutAnimation.easeInEaseOut()` Android-flag setup (CascadingFilter inherits).
- `src/screens/HomeScreen.tsx:86-93` — `transactionType` / `selectedCategory` / `types` state (Phase 13). Phase 14 passes these + setters down to variants.
- `src/screens/HomeScreen.tsx:96` — `isFiltersExpanded` state. Phase 14 keeps it; both variants use it for open/close.
- `src/screens/HomeScreen.tsx:186-247` — `filteredProperties` useMemo. Phase 14 passes `filteredProperties.length` as `liveCount` prop to variants.
- `src/screens/HomeScreen.tsx:319-325` — `togglePropertyType` (Phase 13 array-shape-aware). Phase 14 setters reuse via `setTypes(prev => ...)` semantics.
- `src/screens/HomeScreen.tsx:492-506` — Filter button. Phase 14 doesn't change the button itself; changes what `toggleFiltersExpanded` triggers (sheet vs panel via filterStyle gate inside variants).
- `src/screens/HomeScreen.tsx:521-642` — **DELETE in Plan 14-02.** Today's inline filter JSX (segmented Rent/Buy + category chips + property-type chips). Replaced by `<CascadingFilter />` mount.
- `src/screens/HomeScreen.tsx:644-646` — Result-count `<Text>`. Stays. Both variants render their OWN live count internally (in footer for Guided, in inline result line for Cascading); the bottom-of-header count text remains as the always-visible reference number.
- `src/utils/propertyCategory.ts:14-43` — `PROPERTY_TYPES` + `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` constants. Phase 14 variants consume these for type chip generation. Pascal-cased English labels carry through (M4 Phase 9 will localize at render-site).
- `src/components/DeleteAccountModal.tsx` — Pattern source for `Modal`-based bottom UI in JayTap. GuidedFilterSheet mirrors the visible/onClose/transparent prop trio.
- `src/screens/MediaCurationScreen.tsx` — Second Modal-pattern precedent (full-screen overlay with header + body + footer).
- `src/components/HomeRejectionBanner.tsx` — Auto-returns null on count <= 0; sits between search bar and filter section. Phase 14 preserves placement.
- `src/locales/en.json` + `src/locales/ru.json` — i18n parity locked. Phase 14 adds the `filters.*` namespace per D-07 in BOTH files atomically.

### Pattern Precedents

- `src/utils/getTourPhotosUrl.ts` + `.test.ts` (quick-task 260525-eva) + `src/utils/buildFilterQuery.ts` + `.test.ts` (Phase 13) — Co-located test convention (D-20 follows).
- `src/components/StepperInput.tsx` (M4 Phase 7) — Reusable primitive with `hitSlop` + boundary-disabled visual state. Filter primitives mirror this composition style.
- Phase 13 D-08 + Phase 12 D-06 — Two-plan project-known shipping shape. Phase 14 extends to three plans (D-08 here) because more component code ships.

### Hard Rules (CLAUDE.md + REQUIREMENTS.md §Hard rules)

- **CLAUDE.md M1 D-04 taxonomy guard:** 3 categories × 9 types (now 10 incl. M3 Townhome/Condo). Phase 14 does NOT expand the taxonomy (D-03 above).
- **CLAUDE.md no `react-navigation`:** custom App.tsx state-machine preserved. Filter button doesn't navigate — it opens a Modal in place.
- **CLAUDE.md M6 language pill stays in HomeScreen header:** Phase 14 does not touch TopRow.
- **CLAUDE.md M6 filter variants are the value:** ship ≥2 variants in v1. Phase 14 ships 2 (Guided + Cascading). Memory `m6-filter-variants-are-the-point.md`.
- **CLAUDE.md no backend changes in M6:** Phase 14 client-only.
- **KBD-02:** `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0 (3-milestone invariant). Phase 14 doesn't add keyboard-aware surfaces (filter sheet has no inputs).
- **EN+RU bilingual parity:** `scripts/check-i18n-parity.sh` exit 0 after every plan that adds keys (Plans 14-01 + 14-02 + 14-03 — each may add a subset of the D-07 keys; parity gate is per-plan).
- **No Firebase SDK** (`no-firebase-sdk.md`) — Phase 14 touches no auth code.
- **Reanimated 4.x peer constraint** (`reanimated-4-library-peer-constraint.md`) — Phase 14 uses RN core `Animated` (D-11), so no peer-dep audit needed.
- **Subagent CWD-drift recurring** (`subagent-cwd-drift-recurring.md`) — Planner MUST instruct executor to prepend `cd "$(git rev-parse --show-toplevel)" &&` to every Bash command + verify `git branch --show-current` before each commit. Pattern fired 3+ times.

### Gate Commands (run during Plan 14-01, 14-02, 14-03 verification)

- `npx jest src/components/filters/` — all primitive + variant tests pass.
- `npx tsc --noEmit` — zero NEW errors against pre-Phase-14 baseline (Phase 13 baseline: 8 known-pre-existing failures per `13-CONTEXT.md`; do NOT regress to a higher number).
- `grep -rn "keyboardVerticalOffset" src/ | wc -l` — must equal 0.
- `scripts/check-i18n-parity.sh` — exit 0 after each plan that touches `src/locales/`.
- Plan 14-02 acceptance gate: `grep -nE "isFiltersExpanded && \\(" src/screens/HomeScreen.tsx` should match ZERO lines containing the inline JSX block (deleted) and one line wrapping `<CascadingFilter />`. Sentinel-style check for the delete being clean.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/screens/HomeScreen.tsx:14`** — `Modal` from `react-native` already in scope. GuidedFilterSheet's `Modal` parent doesn't need any new RN import inside HomeScreen (only inside the new component file).
- **`src/screens/HomeScreen.tsx:22-24`** — `LayoutAnimation.easeInEaseOut()` Android-flag dance already wired. CascadingFilter's open/close inherits this for free.
- **Phase 13 `buildFilterQuery` + `FilterStyleContext`** — Variants don't reimplement filter logic; they wire UI to the existing utility/hook. Plan 14-03 only adds `useFilterStyle()` to HomeScreen's import block.
- **`PROPERTY_TYPES` + per-category subsets at `src/utils/propertyCategory.ts:14-43`** — Variants iterate these for type chip/card generation. No new constant lists needed.
- **`filteredProperties` useMemo at HomeScreen.tsx:186-247** — Already correct under multi-select (Phase 13 ships `types[]`-aware predicate). Phase 14 reuses the memo result for `liveCount` prop — no double-computation.
- **`HomeRejectionBanner`** — Auto-null on count <= 0; placement above the filter section needs no Phase 14 edit.
- **`isFiltersExpanded` + `setIsFiltersExpanded`** — Existing boolean drives both variants. Filter button's onPress (today's `toggleFiltersExpanded` at line 499) toggles it for both styles.
- **Lucide icons** — `Filter`, `Home`, `Building`, `Bed`, etc. already imported elsewhere. Phase 14 imports the per-property-type Lucide glyphs into `TypeIcon.tsx` primitive.

### Established Patterns

- **`src/components/<Domain>/` subdirectories** — `ContextualListingFlow/` has steps + adapters + validators. `details/` has property-details sub-components (M5 Phase 1). Phase 14 follows: `src/components/filters/` with `primitives/` underneath. Project precedent supports it.
- **Pascal-cased property labels** — `PROPERTY_TYPES` stores `'Apartment'`, `'House'`, etc. as Pascal English. Phase 14 renders these verbatim from the constant. M4 Phase 9 will route through `t()` at the SAME render-site; Phase 14 doesn't need to predict where the t() wrap lands — render `item.label` and let Phase 9 wrap.
- **`Modal` pattern** — `DeleteAccountModal` + `MediaCurationScreen` + `MediaCurationScreen`'s overlay siblings. All use `<Modal transparent visible onRequestClose>`. GuidedFilterSheet inherits this verbatim.
- **`useTheme().colors.*` token reads** — No hex literals in component code. Phase 14 only uses Phase 12-shipped tokens.
- **Co-located tests** — Filter primitives + variants get `.test.tsx` files next to source. Project convention since M3+.
- **Theme dark/light parity** — Both variants must render legibly in both modes. Phase 12 tokens were sweep-validated across 15 screens; Phase 14 adds new surfaces that need their own dark+light sanity check during plan execution.
- **Brownfield JSX deletion** — Plan 14-02 deletes 120 LOC of inline JSX. Atomic commit with the new `<CascadingFilter />` mount-line addition. No transient "broken filter" state.

### Integration Points

- **HomeScreen ↔ Phase 13 filter state** — already correct (Phase 13 shipped `types: string[]` shape). Phase 14 adds no new state shape; just wires variants as new readers/writers.
- **HomeScreen ↔ Phase 13 FilterStyleContext** — Phase 14 adds one `useFilterStyle()` call inside HomeScreen. Mounts dispatch on `filterStyle` value.
- **Variants ↔ `buildFilterQuery`** — `liveCount = filteredProperties.length` passes the already-computed count down; no extra `buildFilterQuery` call inside variants for the count display (zero double-work).
- **`isFiltersExpanded` ↔ both variants** — both honor it. Sheet uses it as `visible` prop on `Modal`. Panel uses it for conditional mount.
- **No cross-cuts into Chat / Appointments / Property services** — Phase 14 has zero service-layer surface.
- **No new keyboard-aware screens** — Phase 14 surfaces have no `<TextInput>` (search input stays in HomeScreen header, untouched). KBD-02 grep gate trivially preserved.
- **i18n parity gate fires per-plan** — Plans 14-01/02/03 each may add a subset of `filters.*` keys; gate runs at every commit per CI convention.

</code_context>

<specifics>
## Specific Ideas

- **Match the handoff's `<Backdrop dim>` semantics** — when Guided sheet opens, render `<Pressable onPress={onClose} style={{ position:'absolute', inset:0, backgroundColor: colors.scrim }} />` as the first child inside `<Modal>`. Tap-outside dismisses. Matches handoff VariantA's `dim` prop on Backdrop.
- **Animated.View slide-in starts off-screen.** Initial `translateY: SHEET_HEIGHT`; on visible-true, `Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true })`. On close, reverse with `Easing.in(Easing.cubic)` 250ms then setOpen(false). No spring (handoff uses 0.24s linear-ish slide).
- **Stepper "done" + "active" + "reachable" + "future" visual states** match handoff line 99-110 exactly:
  - done: `colors.landlordGreen` background + white check icon + dim label.
  - active: `colors.accent` background + white number + full-text label.
  - reachable (clickable but not active): `colors.surface2` background + mute number + mute label.
  - future (not reachable): same as reachable but `cursor: 'default'` (no haptic feedback on tap).
- **Connector bars** between step pills (handoff line 109): 2pt-thick `colors.landlordGreen` if `step > i`, else `colors.surface2`.
- **`ShowButton`** shadow per handoff: `shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 12 }, shadowRadius: 26, elevation: 8` (boxShadow `0 12px 26px -10px rgba(255,90,111,0.6)` → translated). Optional: skip shadow on Android if visual artifact; PR review can adjust.
- **Cascading nesting rail** — `<View>` with `position: 'absolute', left: 4, top: 6, bottom: 6, width: 2, borderRadius: 2, backgroundColor: colors.surface2`. Plain visual element; no library.
- **Cascading category tabs underline** — animated underline indicator (`Animated.Value` interpolated to `left`/`right` of the active tab). Optional polish for Plan 14-02; can ship without animation as a simple `borderBottomWidth: 2.5, borderBottomColor: colors.accent` on the active tab — match what's lightest to ship.
- **Result count pluralization** — use `count === 1 ? t('filters.showHomes.one', {count}) : t('filters.showHomes.many', {count})` pattern. Existing `i18next` ICU support is already in `useLanguage()` (verify in `LanguageContext` before relying on count substitution — fallback to manual ternary if not).
- **`Breadcrumb` collapse rule** (handoff line 164): show `[dealLabel, categoryLabel, types.length === 1 ? typeLabel : `${firstTypeLabel} +${types.length-1}`]` joined by chevrons. Reuse `joinTypes()` logic from handoff lines 75-79 — port as `src/components/filters/primitives/joinTypes.ts` pure utility (testable in isolation).
- **Lucide icon mapping for type cards/chips** — derive from handoff `TYPES[cat]` `icon` field, but mapped to actual Lucide names available in `lucide-react-native`. E.g. handoff `'townhome'` → Lucide `Building2`; handoff `'tower'` → Lucide `Building`; handoff `'bell'` → Lucide `BellRing` or `Hotel`. Plan 14-01 ships `TypeIcon.tsx` with the full 10-property-type mapping.

</specifics>

<deferred>
## Deferred Ideas

- **Master-Detail variant (FILT-04 / Phase B)** — Two-pane sheet with left rail categories + right pane multi-select types. Source: handoff `filters-variants.jsx` lines 252-311 (VariantC). Variant skeleton ships in Phase 14 primitives `CheckSquare` etc.; full assembly is Phase B. Phase 15 Account Settings shows it as "Coming soon."
- **Sentence Builder variant (FILT-05 / Phase B)** — Editorial plain-language filter with tokenized underline taps. Source: handoff VariantD lines 316-397. Same Phase 15 "Coming soon" treatment.
- **Per-property-type EN/RU localization** — M4 Phase 9 territory (I18N-02 namespace). Phase 14 renders Pascal-cased English labels verbatim from `PROPERTY_TYPES`. When Phase 9 ships, the same render path picks up localized labels.
- **Filter state URL/share-link serialization** — Deferred from Phase 13 D-04. No M6 driver.
- **Bottom sheet drag-to-dismiss** — Tap-scrim + X-button cover the need. If PanResponder/gesture-handler integration becomes a desired polish (e.g. user feedback during Phase 17 UAT), revisit then.
- **Animated category tab underline indicator** — Plan 14-02 may ship without the slide animation if it adds disproportionate complexity; the active-tab bottom-border alone is sufficient for FILT-02 SC2 visual spec.
- **City + search-query inclusion in canonical filter shape** — Phase 13 D-06 boundary preserved; variants do NOT own city/search.
- **Filter "Reset all" affordance** — Handoff doesn't include one (live-update model makes Reset implicit via re-picking). If user complains during UAT, M7+ addition; trivial to add via setter calls.
- **Variant transition animation** — Live-swap in Phase 15 changes `filterStyle` instantly; next filter-button press opens new variant. No cross-fade between variants. If polish desired later, can add a fade-out-old + fade-in-new at HomeScreen variant-dispatch level.
- **Backend `userFilterPreferences` sync** — Out of M6 per `m6-scope-decisions-2026-05-31.md` (device-local). M7+ if cross-device drift becomes a real complaint.
- **Type-set expansion to handoff's 14 types** — CLAUDE.md guard holds. If product expands taxonomy in M7+, ContextualListingFlow + backend Mongoose + i18n need updates first; filter variants pick up new types via the existing constant subscriber pattern at zero variant-code cost.

</deferred>

---

*Phase: 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-*
*Context gathered: 2026-05-31*

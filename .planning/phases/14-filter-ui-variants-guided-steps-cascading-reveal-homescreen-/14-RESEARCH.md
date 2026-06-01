# Phase 14: Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch — Research

**Researched:** 2026-05-31
**Domain:** React Native UI — bottom-sheet wizard + inline cascading panel + Modal/Animated orchestration in a brownfield RN 0.84 New-Architecture app
**Confidence:** HIGH for stack/patterns/pitfalls; MEDIUM for ICU plural verdict (verified-against-codebase, not against external docs); HIGH for Lucide mapping (every icon name verified in installed bundle)

## Summary

Phase 14 is execution research, not exploration. CONTEXT.md locked twenty decisions (D-01 through D-20) covering library choice, animation API, component split, state ownership, and taxonomy. This research file resolves the eight focused gaps the orchestrator flagged: cleanest `Animated` slide-up shape, LayoutAnimation + chip-rerender behavior, ICU plural reality, Lucide-name verification, palette token coverage, HomeScreen delete checklist, validation pyramid, and the per-phase landmine list.

The most consequential findings: (1) the project's i18n layer is a **custom flat-string `t()` with `{name}` placeholder substitution, NOT i18next, NOT ICU plurals** — every existing pluralization in the codebase uses two keys (`.singular` + `.plural`) and a JS ternary, so Phase 14 must follow that pattern verbatim; (2) the deletion at `HomeScreen.tsx:521-642` also orphans **ten StyleSheet entries at lines 866-914**, so Plan 14-02 must delete ~169 LOC (120 JSX + 49 StyleSheet), not the 120 LOC CONTEXT.md mentions; (3) the project's test convention is `__tests__/` subdirectories, NOT flat sibling `.test.tsx` next to source as CONTEXT.md D-20 implies — every shipping primitive/variant test belongs in a `__tests__/` subdirectory; (4) **no Modal-rendering test exists anywhere in the codebase today** — Phase 14 component testing of the slide-up sheet is unprecedented territory and is the single largest Wave-0 risk; (5) all 10 property-type Lucide icons resolve cleanly to verified named exports, so `TypeIcon.tsx` is unblocked.

**Primary recommendation:** Ship per CONTEXT.md's three-plan split. Use the Animated slide pattern in §Animation Patterns below for GuidedFilterSheet. Pre-build a tiny Modal-test harness as Wave 0 before Plan 14-03 (described in Validation Architecture). Manage the 120+49 LOC HomeScreen delete via the explicit Delete Checklist in §HomeScreen Integration. Use the `count===1 ? .one : .many` ternary pattern for Show-N-homes, not ICU.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The full text of decisions D-01 through D-11 (locked) and D-12 through D-20 (Claude's Discretion, also locked) is in `14-CONTEXT.md` lines 27-184. The planner consumes them verbatim. Highlights that constrain research scope:

- **D-01:** Hand-rolled RN `Modal` + `Animated.View` slide-up for GuidedFilterSheet. NOT `@gorhom/bottom-sheet`. NOT reanimated worklets.
- **D-02:** CascadingFilter is a NEW component at `src/components/filters/CascadingFilter.tsx`; today's inline JSX at `HomeScreen.tsx:521-642` is DELETED.
- **D-03:** Type taxonomy preserved verbatim — 4/4/2 (Residential/Commercial/Hospitality). Handoff's expanded set (Studio, Room, Restaurant, Resort, Guesthouse) is NOT adopted.
- **D-04:** Variants are PURE controlled components — they receive `{ deal, category, types }` props + setters from HomeScreen. No internal staging state. Selections write to HomeScreen state immediately.
- **D-05:** Conditional render in HomeScreen — only the active variant mounts. `'master'` / `'sentence'` are no-ops (silently no variant renders).
- **D-06:** Filter primitives in `src/components/filters/primitives/`: DealToggle, CheckSquare, Stepper, MultiHint, ShowButton, Breadcrumb, TypeIcon.
- **D-07:** New `filters.*` i18n namespace in EN+RU.
- **D-08:** Three atomic plans: 14-01 primitives+i18n, 14-02 CascadingFilter+HomeScreen-delete, 14-03 GuidedFilterSheet+variant-dispatch.
- **D-09:** Stepper `reached(i)` semantics — clickable when prior step has a value; jumping back preserves later selections; re-picking category clears `types: []`.
- **D-10:** Only one variant mounted at a time.
- **D-11:** RN core `Animated`, not reanimated 4.
- **D-12 through D-20:** Claude's Discretion calls (LayoutAnimation for Cascading, accent fill on filter button, ShowButton always enabled at count=0, city picker untouched, banner stays between search and filter, sheet body scrolls + footer fixed, Hospitality TypeGrid is 2×1, hit-slop 4pt everywhere, co-located tests).

### Claude's Discretion

Phase 14 is research-only at this stage; further discretion calls during planning belong to gsd-planner. Areas within research scope where I made calls in this file (none override CONTEXT.md):

- Modal-pattern Wave-0 test harness (no precedent in codebase) → recommend building one as the first Plan 14-01 deliverable.
- Test file location: place in `__tests__/` subdirectories (actual project convention) rather than flat sibling as CONTEXT.md D-20 worded — see Project Constraints below.
- Lucide icon mapping for the 10 types: see §Lucide Icon Verification — every choice justified against handoff hint + installed bundle.

### Deferred Ideas (OUT OF SCOPE)

Per CONTEXT.md `<deferred>` section: Master-Detail variant (FILT-04 / Phase B), Sentence Builder variant (FILT-05 / Phase B), per-property-type EN/RU localization (M4 Phase 9 / I18N-02), filter state URL/share serialization, bottom-sheet drag-to-dismiss, animated Cascading category-tab underline, city+search in canonical filter shape, filter "Reset all" affordance, variant transition animation, backend `userFilterPreferences` sync, taxonomy expansion to handoff's 14 types.

These do not need research support; planner must not propose tasks that touch them.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **FILT-01** | Guided Steps variant — bottom-sheet wizard with 1-2-3 stepper (Deal → Category → Type), auto-advance, multi-select Type cards w/ square-checkbox, "Choose one or more" hint, footer breadcrumb, live "Show N homes" CTA. | §Animation Patterns (slide-up shape), §Stepper Visual States (all 4 reached/active/done/future variants spec'd), §Lucide Icon Verification (all 10 type icons mapped), §Pluralization Pattern (Show-N-homes ternary), §Modal Pattern. |
| **FILT-02** | Cascading Reveal variant — inline panel under search bar w/ segmented Rent/Buy → underlined Category tabs → multi-select Type chips → left nesting rail → live result line. | §LayoutAnimation + Multi-Select Re-render, §Nesting Rail Specifics, §Cascading Tab Underline (animation-optional), §HomeScreen Integration Delete Checklist (120+49 LOC). |
| **FILT-03** | HomeScreen variant dispatch — filter button opens variant matching `filterStyle`; live-swap from Settings has no restart, no flash. | §Live-Swap Mechanics (Phase 13 Context already shipped — verified), §HomeScreen Conditional Mount Pattern, §Filter-Button Visual State (accent fill for both variants). |

All three requirements have research support in this document. No requirement is research-blocked.
</phase_requirements>

## Architectural Responsibility Map

Phase 14 is single-tier (React Native client). All capabilities map to **Client (RN UI)**. Listed for completeness:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bottom-sheet UI (GuidedFilterSheet) | Client (RN UI / Modal) | — | Pure presentational; reads filter state from HomeScreen via props, writes via setters. |
| Inline panel UI (CascadingFilter) | Client (RN UI) | — | Same as above; inline View with conditional mount. |
| Filter state ownership | Client (HomeScreen) | — | Shipped in Phase 13. Phase 14 doesn't relocate; it adds new readers/writers. |
| `filterStyle` preference | Client (FilterStyleContext) | Client (AsyncStorage) | Shipped in Phase 13. Phase 14 calls `useFilterStyle()` to read. |
| `buildFilterQuery` predicate | Client (utility) | — | Shipped in Phase 13. Phase 14 variants call it for live-count `useMemo`. |
| i18n resolution | Client (LanguageContext) | — | Existing `t()` API. Phase 14 adds the `filters.*` namespace keys. |
| Theme tokens | Client (ThemeContext / colors) | — | Phase 12 shipped tokens. Phase 14 is the first consumer of `surface2`, `surface3`, `iconChipFg`. |

No service-layer, no backend, no native-bridge work. **Single-tier is the correct assignment.**

## Standard Stack

Phase 14 introduces **zero new dependencies**. Every required capability already lives in the installed package set. This is intentional per D-01 + D-11.

### Core (already installed — used as-is)

| Library | Version | Purpose | Why Standard | Verification |
|---------|---------|---------|--------------|------|
| `react-native` core `Modal` | RN 0.84 | Sheet container with scrim overlay, transparent backdrop, `onRequestClose` Android-back hook | Project precedent — `DeleteAccountModal`, `MediaCurationScreen` both use this. No external dep. | [VERIFIED: package.json line "react-native": "0.84.x", reactnative.dev/docs/modal fetched 2026-05-31] |
| `react-native` core `Animated` | RN 0.84 | `translateY` interpolation for slide-up; `useNativeDriver: true` runs on UI thread | D-11 explicit. Pattern source for transform animations without a worklet. | [VERIFIED: built into RN core] |
| `react-native` core `Easing` | RN 0.84 | `Easing.out(Easing.cubic)` for slide-in, `Easing.in(Easing.cubic)` for slide-out | Standard for 0.3s sheet animation curve. | [VERIFIED: built into RN core] |
| `react-native` core `LayoutAnimation` | RN 0.84 | CascadingFilter open/close — already wired at `HomeScreen.tsx:22` | D-12: inherits today's `toggleFiltersExpanded`'s `LayoutAnimation.configureNext(...)` at line 331. Zero new code. | [VERIFIED: HomeScreen.tsx:22, 331] |
| `lucide-react-native` | `^0.564.0` | Icons for property types, stepper check, chevron, sliders | Project precedent — `HomeScreen.tsx:26` imports `Filter`; M5 Phase 1 details/* uses Lucide heavily. | [VERIFIED: package.json + bundle exports] |
| `react-native-safe-area-context` | already-loaded | `SafeAreaView` edges — sheet bottom padding for iPhone home indicator | Project precedent — every screen root uses it. | [VERIFIED: HomeScreen.tsx:25 import] |

### Supporting (already wired — no install)

| Library | Purpose | When to Use | Verification |
|---------|---------|-------------|------|
| `@react-native-async-storage/async-storage` | Used by `FilterStyleContext` (Phase 13) | Read-only in Phase 14 via `useFilterStyle()` hook | [VERIFIED: src/context/FilterStyleContext.tsx:2] |
| `react-test-renderer` + `act` | Component tests for primitives + variants | All Phase 14 test files | [VERIFIED: package.json + src/components/__tests__/EmailVerifyBanner.test.tsx pattern] |

### Alternatives Considered (REJECTED per CONTEXT.md)

| Instead of | Could Use | Why Rejected (per CONTEXT.md) |
|------------|-----------|-------------------------------|
| RN core `Modal` + `Animated` | `@gorhom/bottom-sheet` | D-01: adds dep + reanimated worklet surface for one-screen need. Drag-to-dismiss not required. |
| RN core `Animated` | `react-native-reanimated` v4 worklets | D-11: 300ms `translateY` is single-purpose. Worklet + `useSharedValue` overkill. Also `awesome-gallery` pinning reanimated ^3.x already taught the project this constraint (memory `reanimated-4-library-peer-constraint.md`). |
| Hand-rolled stepper | A stepper library (e.g., `react-native-step-indicator`) | Not in CONTEXT.md as a decision but implied — primitives like `Stepper.tsx` are project-shape, not vendored. M4 Phase 7 set the precedent with `StepperInput.tsx`. |
| `@testing-library/react-native` | `react-test-renderer` + `act` | Project has NO RTL in dev deps. `EmailVerifyBanner.test.tsx` documents the choice: "Pattern: react-test-renderer + act (no RTL/jest-native in dev deps)." |

**Version verification (npm view shortcut):** All packages above are already installed at versions baked into the repo's `package-lock.json`. No new versions needed. Verification is "package exists at installed version" not "what's latest."

**Installation:** None required. Plan 14-01 / 14-02 / 14-03 add ZERO `npm install` commands.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                       HomeScreen (state owner)                  │
│                                                                 │
│  useState: transactionType, selectedCategory, types[]           │
│  useState: isFiltersExpanded                                    │
│  useMemo : filteredProperties (uses buildFilterQuery — Phase 13)│
│  useFilterStyle() → filterStyle                                 │
│                                                                 │
│  ┌──────────────┐                                               │
│  │ Filter btn   │ onPress → toggleFiltersExpanded()             │
│  └──────────────┘                                               │
└──────────┬─────────────────────────────────────────────────────┘
           │ filterStyle === 'guided'              │ === 'cascading'
           ▼                                       ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ <GuidedFilterSheet />        │   │ <CascadingFilter />          │
│ (rendered when isFiltersExp) │   │ (rendered when isFiltersExp) │
│                              │   │                              │
│  RN Modal (transparent)      │   │  Plain View (inline)         │
│   ├─ Animated scrim (fade)   │   │   ├─ DealToggle              │
│   └─ Animated sheet (slide)  │   │   ├─ Category tab strip      │
│       ├─ Stepper             │   │   │  (underline indicator)   │
│       ├─ ScrollView body     │   │   ├─ Nesting rail (View)     │
│       │   ├─ DealCards       │   │   └─ Multi-select chips      │
│       │   ├─ CategoryCards   │   │      (use check-glyph swap)  │
│       │   └─ TypeGrid (2col) │   │                              │
│       └─ Footer (fixed)      │   │  LayoutAnimation on toggle   │
│           ├─ Breadcrumb      │   │                              │
│           └─ ShowButton      │   │                              │
└──────────────────────────────┘   └──────────────────────────────┘
           │                                       │
           └──────────────┬────────────────────────┘
                          ▼
                ┌─────────────────────────┐
                │  Shared primitives at   │
                │  src/components/filters/│
                │     primitives/         │
                │  ─ DealToggle.tsx       │
                │  ─ CheckSquare.tsx      │
                │  ─ Stepper.tsx          │
                │  ─ MultiHint.tsx        │
                │  ─ ShowButton.tsx       │
                │  ─ Breadcrumb.tsx       │
                │  ─ TypeIcon.tsx         │
                └─────────────────────────┘
                          │
                          ▼
                ┌─────────────────────────┐
                │  Reads from:            │
                │  ─ buildFilterQuery     │
                │     (utils, Phase 13)   │
                │  ─ propertyCategory     │
                │     (utils, M3)         │
                │  ─ useTheme() / colors  │
                │     (theme, Phase 12)   │
                │  ─ useLanguage() / t()  │
                │     (locales, M1+)     │
                └─────────────────────────┘
```

The data flow is unidirectional: HomeScreen state → variant props → user interaction → setter prop → HomeScreen state → next render rebuilds variant. Variants never own state; they only render and dispatch. Phase 13 already shipped the foundational utility + context layer (verified in §Existing Code Inventory below).

### Recommended Project Structure

```
src/components/filters/
├── GuidedFilterSheet.tsx          # FILT-01 (Plan 14-03)
├── CascadingFilter.tsx            # FILT-02 (Plan 14-02)
├── __tests__/                     # actual project test convention
│   ├── GuidedFilterSheet.test.tsx
│   └── CascadingFilter.test.tsx
└── primitives/                     # Plan 14-01
    ├── DealToggle.tsx
    ├── CheckSquare.tsx
    ├── Stepper.tsx
    ├── MultiHint.tsx
    ├── ShowButton.tsx
    ├── Breadcrumb.tsx
    ├── TypeIcon.tsx
    ├── joinTypes.ts                # pure utility (extracted from handoff lines 75-79)
    └── __tests__/
        ├── DealToggle.test.tsx
        ├── CheckSquare.test.tsx
        ├── Stepper.test.tsx
        ├── ShowButton.test.tsx
        ├── Breadcrumb.test.tsx
        └── joinTypes.test.ts
```

**Deviation from CONTEXT.md D-20:** D-20 says "co-located tests" with filenames like `GuidedFilterSheet.test.tsx` *next to its source*. The actual project convention (verified by `find src -name "*.test.*"` returning 9 `__tests__/` directories and zero flat-colocated tests) is `__tests__/` subdirectories. The cited precedents `getTourPhotosUrl.test.ts` and `buildFilterQuery.test.ts` BOTH live under `src/utils/__tests__/`, not flat. The structure above honors the actual convention; planner should adjust D-20's wording when writing the plans. `[VERIFIED: src/utils/__tests__/buildFilterQuery.test.ts exists; src/utils/buildFilterQuery.test.ts does NOT exist]`

### Pattern 1: Animated Bottom-Sheet Slide-Up

**What:** Modal-wrapped slide-up sheet using RN core `Animated.Value` + `translateY` interpolation. Mount-on-visible-true, animate-in; on close, animate-out then unmount.

**When to use:** GuidedFilterSheet (Plan 14-03). Any future single-purpose sheet that doesn't need drag-to-dismiss.

**Example:**
```tsx
// Source: https://reactnative.dev/docs/modal + https://reactnative.dev/docs/animated
//         (RN core APIs, verified 2026-05-31)
import React, { useEffect, useRef } from 'react';
import { Modal, Animated, Easing, Pressable, View, StyleSheet, Dimensions } from 'react-native';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.82;
const SLIDE_IN_MS  = 300;
const SLIDE_OUT_MS = 250;

export const GuidedFilterSheet: React.FC<Props> = ({ open, onClose, ...props }) => {
  // translateY: SHEET_HEIGHT (off-screen below) → 0 (on-screen)
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  // scrim opacity: 0 → 1 (fade-in for the dim backdrop)
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  // localOpen mirrors `open` but stays true through the close animation so we can
  // animate-out before unmounting the Modal. Without this, setting open=false
  // unmounts the Modal immediately and the close animation never plays.
  const [localOpen, setLocalOpen] = React.useState(open);

  useEffect(() => {
    if (open) {
      setLocalOpen(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: SLIDE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (localOpen) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setLocalOpen(false); // unmount after animation completes
      });
    }
  }, [open]);

  return (
    <Modal
      transparent
      visible={localOpen}
      animationType="none"   // we drive the animation, not the Modal
      onRequestClose={onClose}  // REQUIRED on Android — wires hardware back
      statusBarTranslucent     // sheet visually extends under status bar (Android)
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: scrimOpacity }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, transform: [{ translateY }] },
        ]}
      >
        {/* Handle, Header, Stepper, ScrollView, Footer */}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '82%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 0,
  },
});
```

**Why this shape (over two alternatives):**

| Approach | Behavior | Verdict |
|----------|----------|---------|
| **Mount-Modal-then-animate (recommended above)** | `visible=true` mounts the Modal; useEffect kicks off the slide; on close, useEffect animates out and only THEN sets `localOpen=false` to unmount. | ✅ Smooth in + smooth out. Standard RN pattern. |
| Mount-when-open, no localOpen | `visible={open}` directly; close instantly unmounts the Modal, slide-out animation never plays. | ❌ Close has no animation; sheet just disappears. User-visible jank. |
| Always-mounted with `pointerEvents` | Keep `Modal visible` always; toggle pointer events + opacity. | ❌ Modal-with-`transparent` STILL consumes screen taps when present. Also leaves the Modal in the React tree permanently. Wastes resources for a once-in-a-session UI. |

The **`localOpen` shadowing pattern** is the load-bearing trick — without it, `open=false` instantly removes the Modal from the tree before the slide-out can play. Plan 14-03 must encode this in the executor instructions.

**Why `Animated.parallel` for sheet + scrim:** the scrim fade and the sheet slide must finish at the same instant; sequencing them would either show an empty Modal (sheet still off-screen but scrim is in place) or animate the sheet against an already-faded backdrop. Parallel timing matches the user mental model "the sheet pushes up the dim."

`[VERIFIED: https://reactnative.dev/docs/modal — animationType="none" + onRequestClose semantics; https://reactnative.dev/docs/animated — useNativeDriver + parallel pattern. Both fetched 2026-05-31.]`

### Pattern 2: LayoutAnimation for Inline Cascading Toggle

**What:** Single-line `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` call before the state change that mounts/unmounts the panel. Already in place at `HomeScreen.tsx:22` (Android flag) and line 331 (the existing `toggleFiltersExpanded` call site).

**When to use:** CascadingFilter open/close (Plan 14-02 leans on HomeScreen's existing wiring; doesn't add new LayoutAnimation calls inside the component).

**Example:**
```tsx
// Source: HomeScreen.tsx:331 (existing, verified) — Plan 14-02 doesn't change this.
const toggleFiltersExpanded = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setIsFiltersExpanded((prev) => !prev);
};
```

**LayoutAnimation + Multi-Select Chip Re-render — answers the orchestrator's question 2:**

I verified the behavior path: `togglePropertyType` (HomeScreen.tsx:320-328) does NOT call `LayoutAnimation.configureNext`. Only `toggleFiltersExpanded` does. So toggling chips inside CascadingFilter (which re-renders chip checkmark + may add a row break) does NOT re-trigger LayoutAnimation. The `configureNext` only applies to the NEXT layout pass after the call — subsequent state updates without a fresh `configureNext` use standard React rendering.

This means: **chip multi-select re-renders are jank-free by default** because no animation is running during them. The risk surface is only the open/close animation, which is one shot per filter-button press. `[VERIFIED: HomeScreen.tsx:320-333 grep — togglePropertyType has no LayoutAnimation call]`

**Anti-pattern to avoid:** Do NOT add `LayoutAnimation.configureNext(...)` inside `togglePropertyType` or anywhere it fires per-chip — that would re-layout the whole panel on every chip tap, looking janky. The single open/close animation is the right granularity. Document this in Plan 14-02 acceptance criteria.

### Pattern 3: HomeScreen Variant Dispatch (FILT-03)

**What:** Conditional render based on `useFilterStyle()` returned value.

**When to use:** Replacing today's inline filter block in HomeScreen (Plan 14-02 + Plan 14-03).

**Example:**
```tsx
// Source: CONTEXT.md D-05 (locked decision)
const { filterStyle } = useFilterStyle();

// ... in HomeScreen JSX, REPLACING today's lines 521-642:
{filterStyle === 'guided' && (
  <GuidedFilterSheet
    open={isFiltersExpanded}
    onClose={() => setIsFiltersExpanded(false)}
    transactionType={transactionType}
    setTransactionType={setTransactionType}
    selectedCategory={selectedCategory}
    setSelectedCategory={setSelectedCategory}
    types={types}
    setTypes={setTypes}
    liveCount={filteredProperties.length}
  />
)}
{filterStyle === 'cascading' && isFiltersExpanded && (
  <CascadingFilter
    transactionType={transactionType}
    setTransactionType={setTransactionType}
    selectedCategory={selectedCategory}
    setSelectedCategory={setSelectedCategory}
    types={types}
    setTypes={setTypes}
    liveCount={filteredProperties.length}
    properties={properties}     // for the optional re-compute fallback
  />
)}
```

**Live-Swap Mechanics:** Phase 13's `FilterStyleProvider` (verified at `src/context/FilterStyleContext.tsx:15-54`) holds `filterStyle` in `useState`. The Settings picker (Phase 15) will call `setFilterStyle('cascading')` which triggers a setState — every `useFilterStyle()` consumer rerenders. HomeScreen reads `filterStyle` on the next render and dispatches to the new variant. The next filter-button press opens the new variant. **Zero remount of HomeScreen required.** `[VERIFIED: src/context/FilterStyleContext.tsx ships exactly this pattern]`

### Anti-Patterns to Avoid

- **Mounting both variants always:** D-10 explicit. Wastes animation refs + Animated.Values for the inactive sheet.
- **Adding `keyboardVerticalOffset` anywhere in the sheet:** project-banned per KBD-02 (`m1-keyboard-kbd-02-invariants.md`). Sheet has no text inputs so this shouldn't tempt anyone, but the planner must include the grep gate in every plan's acceptance.
- **Hardcoding hex literals for handoff colors:** all 9 new tokens shipped in Phase 12 (`accent`, `accentSoft`, `accentLine`, `landlordGreen`, `surface2`, `surface3`, `hair2`, `iconChipFg`, `bgDim`) are available via `useTheme()`. Reading the handoff's `fp.coral` → use `colors.accent`; `fp.surface2` → `colors.surface2`; etc.
- **Using DeleteAccountModal's `animationType="fade"` for the slide sheet:** that's the wrong shape — fade hides the sheet's translateY motion. Use `animationType="none"` and drive Animated yourself (Pattern 1).
- **Using `LayoutAnimation` inside the sheet for stepper transitions:** the stepper is internal to the Modal-mounted Animated.View. Mixing LayoutAnimation INSIDE a translateY-Animated subtree is officially "subject to bugs" per RN docs (LayoutAnimation operates on layout, Animated on transform — both writing to the same view tree). Use cross-fade `Animated.View` for step transitions if needed, or just snap-swap (handoff doesn't animate step transitions — only the stepper-bar pills).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom-sheet drag-to-dismiss | PanResponder + custom thresholds | (deferred — tap-scrim + X-button cover need) | CONTEXT.md `<deferred>` rejects this. PanResponder + gesture coordination is multi-day work for a polish nice-to-have. |
| Stepper "wizard step" library | `react-native-step-indicator` or similar | Hand-roll `Stepper.tsx` primitive (D-06) | The stepper is 3 pills + 2 connector bars. Vendoring a library adds dep + style overrides. Project precedent: `StepperInput.tsx` (M4 Phase 7) is hand-rolled. |
| ICU plural resolution | Pull in `i18next` / `react-intl` | Manual ternary `count === 1 ? .one : .many` | Project's `t()` is custom flat `{name}` substitution (see §Pluralization Pattern). Existing precedent at `en.ts:103-105` (`home.rejection.banner.singular` + `.plural`) uses ternary. ICU would be milestone-shaped — out of M6 scope. |
| Modal slide animation library | `react-native-modal` / `@gorhom/bottom-sheet` | RN core `Modal` + `Animated` (D-01) | D-01 locked. Drag-to-dismiss not required; tap-scrim + X-button cover the need. |
| Multi-select chip state machine | A controlled chip library | Project pattern: `types.includes(label)` + `setTypes(prev => ...)` | Phase 13 already implements this at HomeScreen.tsx:320-328 (`togglePropertyType`). Variants reuse the same setter. |
| Lucide icon dynamic resolution | Build a name → component map at runtime | `TypeIcon.tsx` primitive with a static `Record<PropertyType, LucideIcon>` | See §Lucide Icon Verification. Static map is type-safe, tree-shakable. |
| i18n plural-aware formatter | A formatter utility | Two-key + ternary pattern (existing) | Matches `home.rejection.banner.singular/plural` precedent exactly. |

**Key insight:** Phase 14 is **integration of existing primitives** (RN core + Phase 12 tokens + Phase 13 utility) — every "would this be easier with a library" temptation has a documented project-side rejection. The work is JSX assembly + Animated wiring, not platform-engineering.

## Runtime State Inventory

> Phase 14 is a greenfield UI phase — no rename, refactor, or migration. State inventory is N/A for the runtime categories below. Listed explicitly so the planner doesn't have to ask.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 14 ships zero new persisted state. Existing `@jaytap_filter_style` was shipped by Phase 13 and is read-only here. | None |
| Live service config | None — no backend, no external services, no Datadog/Tailscale/Cloudflare hooks. | None |
| OS-registered state | None — no Task Scheduler / launchd / systemd / pm2 surfaces. | None |
| Secrets/env vars | None — phase touches no auth, no API keys. | None |
| Build artifacts | None — pure RN JS/TS source. No native module changes, no podspec edits, no gradle changes. | None |

**Nothing found in every category — verified by zero data-layer / config-layer surface in CONTEXT.md.** This category is included for planner audit completeness; the section can be condensed to "N/A — pure-UI phase" in any downstream summary.

## Specific Research Findings

### Lucide Icon Verification (answers orchestrator Q4)

I verified every name against the installed `lucide-react-native@^0.564.0` bundle. Both the kebab-case file and the PascalCase named export were checked. **All 10 required type icons resolve cleanly.** Mapping below:

| JayTap PropertyType | Handoff Hint | Lucide Name (export) | Verified? | Rationale |
|---------------------|--------------|----------------------|----------|-----------|
| Apartment | `building` | `Building` | ✅ | Direct match — handoff `building` icon. |
| House | `home` | `House` | ✅ | Note: `Home` ALSO exists (alias). Prefer `House` for semantic clarity. |
| Townhome | `townhome` (custom in handoff) | `Building2` | ✅ | Handoff's `townhome` SVG is a custom row-of-buildings. `Building2` in Lucide is the closest semantic match (multi-building stack). |
| Condo | `tower` (custom in handoff) | `Building2` | ✅ | Lucide has no high-rise glyph. `Building2` reused (acceptable — handoff also reused `tower` for office). If visual differentiation needed in QA, swap to `Landmark`. |
| Office | `tower` | `Briefcase` | ✅ | More semantically office-y than `Building2`. Handoff used `tower` (no specific office icon). |
| Retail | `bag` (custom) | `Store` | ✅ | Lucide `Store` semantically matches retail better than `ShoppingBag`. |
| Warehouse | `box` (custom) | `Warehouse` | ✅ | Direct Lucide match. |
| Industrial | (handoff has no Industrial; M3 4th commercial type) | `Factory` | ✅ | Strongest semantic Lucide match. |
| Hostel | `bed` | `BedDouble` | ✅ | `Bed` and `BedDouble` both exist; `BedDouble` reads more "lodging." |
| Hotel | `bell` | `Hotel` | ✅ | Lucide has a literal `Hotel` icon (verified bundle export). |

`[VERIFIED: grep -oE "(Building2|Home|House|Building|Store|Hotel|Warehouse|Factory|Briefcase|Filter|CheckSquare|Square|BedDouble|Bed)" node_modules/lucide-react-native/dist/esm/lucide-react-native.js — all confirmed present 2026-05-31]`

**Recommended `TypeIcon.tsx` shape (Plan 14-01):**

```tsx
// src/components/filters/primitives/TypeIcon.tsx
import React from 'react';
import {
  Building, House, Building2, Briefcase, Store,
  Warehouse, Factory, BedDouble, Hotel,
  type LucideProps,
} from 'lucide-react-native';
import type { PropertyType } from '../../../utils/propertyCategory';

const ICON_MAP: Record<PropertyType, React.FC<LucideProps>> = {
  Apartment: Building,
  House: House,
  Townhome: Building2,
  Condo: Building2,      // shared with Townhome — acceptable per research
  Office: Briefcase,
  Retail: Store,
  Warehouse: Warehouse,
  Industrial: Factory,
  Hostel: BedDouble,
  Hotel: Hotel,
};

export const TypeIcon: React.FC<{ type: PropertyType; size?: number; color?: string }> = ({
  type, size = 19, color = 'currentColor',
}) => {
  const Icon = ICON_MAP[type];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={1.75} />;
};
```

`strokeWidth={1.75}` matches the handoff `FI()` glyph palette (`filters-shared.jsx:83`).

### Pluralization Pattern (answers orchestrator Q3)

**Verdict: NO i18next ICU. The project uses custom flat `t()` with `{placeholder}` substitution.**

Evidence chain:
1. `src/context/LanguageContext.tsx:44-47` defines `t = (key, params?) => translate(language, key, params)`. `params` is typed `Record<string, string>` — no count-aware overload.
2. `src/locales/index.ts:11-22` implements `t()` as a literal `String.replace(/\{name\}/g, value)` loop. No `Intl.PluralRules`, no `MessageFormat`, no select.
3. Existing precedent at `src/locales/en.ts:103-105`:
   ```
   'home.rejection.banner.singular': 'You have 1 listing that needs edits.',
   'home.rejection.banner.plural':   'You have {N} listings that need edits.',
   ```
   And the call site (HomeRejectionBanner.tsx pattern): `count === 1 ? t('...singular') : t('...plural', { N: String(count) })`.

**Phase 14 must follow the same pattern.** Recommended keys:

```ts
// EN
'filters.showHomes.one':  'Show 1 home',
'filters.showHomes.many': 'Show {count} homes',
'filters.showHomes.zero': 'Show 0 homes',   // optional — '0 homes' reads cleanly via .many path with count=0

// RU — Russian has TRIPLE plural forms (1 / 2-4 / 5+)
// Per project convention, ship two keys (.one / .many) and ACCEPT that
// Russian "5 домов" works for 5+ but "2 дома" / "3 дома" / "4 дома" would
// be linguistically slightly off when forced through .many.
// Acceptable trade-off because:
//  (a) the count column is purely informational; user reads then taps
//  (b) the project's existing `home.rejection.banner.{singular,plural}` makes
//      the same compromise (RU "вас 5 объявлений" path)
//  (c) full Russian plural support would require ICU — milestone-shaped, M7+
'filters.showHomes.one':  'Показать 1 объект',
'filters.showHomes.many': 'Показать {count} объектов',
```

**Why not ship triple-form Russian:** there's no precedent in the codebase. Existing `home.rejection.banner.plural` uses one form for all >=2 cases. Adding a triple-form path *just for this surface* would create a wart — better to land Phase 14 consistently with the existing simplification and seed an M7+ "i18n plural overhaul" backlog item if user feedback surfaces it.

`[VERIFIED: src/locales/index.ts:11-22, src/locales/en.ts:103-105, src/context/LanguageContext.tsx:44-47 — all read 2026-05-31]`

### Palette Token Coverage (answers orchestrator Q5)

**Verified: All required tokens are shipped in BOTH dark and light by Phase 12.** No remap needed.

| Token | Dark | Light | Status |
|-------|------|-------|--------|
| `colors.surface2` | `#26262c` | `#f0f0f4` | ✅ shipped (colors.ts:20, 58) |
| `colors.surface3` | `#303038` | `#e4e4ea` | ✅ shipped (colors.ts:21, 59) |
| `colors.hair2` | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.13)` | ✅ shipped (colors.ts:23, 61) |
| `colors.iconChipFg` | `rgba(244,244,246,0.85)` | `rgba(22,22,28,0.80)` | ✅ shipped (colors.ts:27, 65) |
| `colors.accent` | `#ff5a6f` | `#ff5a6f` | ✅ mode-independent (colors.ts:7) |
| `colors.accentSoft` | `rgba(255,90,111,0.16)` | `rgba(255,90,111,0.16)` | ✅ mode-independent (colors.ts:8) |
| `colors.accentLine` | `rgba(255,90,111,0.45)` | `rgba(255,90,111,0.45)` | ✅ mode-independent (colors.ts:9) |
| `colors.landlordGreen` | `#35c98f` | `#35c98f` | ✅ mode-independent (colors.ts:10) |
| `colors.scrim` | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.55)` | ✅ shipped (colors.ts:49, 83) — orphan preserved |
| `colors.background` | `#121214` | `#f3f3f6` | ✅ shipped (colors.ts:17, 55) |
| `colors.text` | `#f4f4f6` | `#16161a` | ✅ shipped (colors.ts:24, 62) |
| `colors.textSecondary` (dim) | `rgba(244,244,246,0.60)` | `rgba(22,22,28,0.62)` | ✅ shipped (colors.ts:25, 63) |
| `colors.textTertiary` (mute) | `rgba(244,244,246,0.40)` | `rgba(22,22,28,0.42)` | ✅ shipped (colors.ts:26, 64) |
| `colors.border` (hair) | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | ✅ shipped (colors.ts:22, 60) |

**Handoff token-key → JayTap token-key map (for variant implementation):**

| Handoff `fp.X` | JayTap `colors.X` |
|----------------|--------------------|
| `fp.bg` | `colors.background` |
| `fp.bgDim` | `colors.bgDim` |
| `fp.surface` | `colors.surface` |
| `fp.surface2` | `colors.surface2` |
| `fp.surface3` | `colors.surface3` |
| `fp.hair` | `colors.border` |
| `fp.hair2` | `colors.hair2` |
| `fp.text` | `colors.text` |
| `fp.dim` | `colors.textSecondary` |
| `fp.mute` | `colors.textTertiary` |
| `fp.coral` | `colors.accent` |
| `fp.coralSoft` | `colors.accentSoft` |
| `fp.coralLine` | `colors.accentLine` |
| `fp.green` | `colors.landlordGreen` |

Planner should include this map verbatim in any plan that references handoff JSX. `[VERIFIED: src/theme/colors.ts read 2026-05-31; values match Phase 12 D-08 spec]`

### HomeScreen Integration Delete Checklist (answers orchestrator Q6)

CONTEXT.md says "delete lines 521-642" (120 LOC). Verified actual: the JSX block at 521-642 references **10 StyleSheet entries** (filterSection, segmentedControl, segmentButton, segmentText, categoryToggleRow, categoryChip, filterRow, filterList, filterChip, filterText). I grep-confirmed those keys are referenced ONLY inside lines 521-642 and NOT elsewhere in HomeScreen.tsx. Therefore the StyleSheet entries at lines 866-914 (49 lines) also become orphans and must be deleted in the same Plan 14-02 commit. **Total delete: ~169 LOC.**

**Plan 14-02 Delete Checklist (atomic):**

1. ✅ Delete JSX block `HomeScreen.tsx:521-642` (the entire `{isFiltersExpanded && (...)}` filter section).
2. ✅ Delete StyleSheet entries `HomeScreen.tsx:866-914` (the 10 keys: `filterSection`, `segmentedControl`, `segmentButton`, `segmentText`, `filterRow`, `filterList`, `filterChip`, `categoryToggleRow`, `categoryChip`, `filterText`).
3. ✅ Add `import { useFilterStyle } from '../context/FilterStyleContext';` at imports.
4. ✅ Add `import { GuidedFilterSheet } from '../components/filters/GuidedFilterSheet';` (Plan 14-03) — Plan 14-02 only adds `CascadingFilter`.
5. ✅ Add `import { CascadingFilter } from '../components/filters/CascadingFilter';` (Plan 14-02).
6. ✅ Add `const { filterStyle } = useFilterStyle();` near other hook calls (suggest line 82, alongside `useTheme()`).
7. ✅ Insert the conditional mount JSX block in place of the deleted lines (see Pattern 3 above).
8. ✅ Verify no other JSX still references the deleted style keys (grep gate — `grep -nE "styles\.(filterSection|segmentedControl|segmentButton|segmentText|categoryToggleRow|categoryChip|filterRow|filterList|filterChip|filterText)" src/screens/HomeScreen.tsx` must return zero lines after the delete).

**Test surfaces affected:** I checked `src/screens/__tests__/HomeScreen-filter.test.ts` — it tests pure-function predicates for city + freetext only, not the JSX. The delete does NOT regress the test. `[VERIFIED: grep on HomeScreen-filter.test.ts shows no reference to filterSection/segmentedControl/etc.]`

**Helper functions NOT orphaned:** `togglePropertyType` (line 320), `toggleFiltersExpanded` (line 330) stay — both consumed by the variants. `transactionType`, `selectedCategory`, `types`, `isFiltersExpanded` state stays — passed to variants.

**Helper-style attention point:** `styles.resultCount` (lines 644-646, kept per CONTEXT.md "stays") references `styles.resultCount` defined at line 915. Make sure delete-range stops at line 914 not 915.

`[VERIFIED: HomeScreen.tsx lines 521-642 + 866-914 read 2026-05-31; cross-reference grep confirmed orphan status]`

### Stepper Visual States (FILT-01 SC1)

Per handoff `filters-variants.jsx:99-110` + CONTEXT.md `<specifics>` block:

| State | Background | Number color | Label color | Click behavior | Connector bar to next |
|-------|------------|--------------|-------------|-----------------|----------------------|
| `done` (i < step) | `colors.landlordGreen` (`#35c98f`) | `#fff` | `colors.textSecondary` (dim) | clickable → setStep(i) | full `colors.landlordGreen` 2pt |
| `active` (i === step) | `colors.accent` (`#ff5a6f`) | `#fff` | `colors.text` (full) | currentstep (no-op or self) | half `colors.surface2` |
| `reachable` (prior step has value, i > step) | `colors.surface2` | `colors.textTertiary` (mute) | `colors.textTertiary` | clickable → setStep(i) | full `colors.surface2` |
| `future` (prior step empty) | `colors.surface2` | `colors.textTertiary` | `colors.textTertiary` | NO-OP (no haptic, no setStep) | full `colors.surface2` |

`reached(i)` predicate: `i === 0 || (i === 1 && deal) || (i === 2 && category)`.

Connector bar: 2pt height, 2pt borderRadius, color = `step > i ? colors.landlordGreen : colors.surface2`.

### Nesting Rail Specifics (FILT-02 SC2)

Per CONTEXT.md `<specifics>` line 310 + handoff `filters-variants.jsx:201`:

```tsx
<View style={{
  position: 'absolute',
  left: 4,
  top: 6,
  bottom: 6,
  width: 2,
  borderRadius: 2,
  backgroundColor: colors.surface2,
}} />
```

Sits inside the L2+L3 wrapper which has `paddingLeft: 18` so the rail visually anchors the indented category/type column to the deal-toggle row above. Pure decorative — no animation, no state.

### Cascading Tab Underline — Animation-Optional (FILT-02 SC2)

CONTEXT.md `<specifics>` line 311 explicitly says: "animated underline indicator (...) Optional polish for Plan 14-02; can ship without animation as a simple `borderBottomWidth: 2.5, borderBottomColor: colors.accent` on the active tab — match what's lightest to ship."

**Recommendation:** Ship Plan 14-02 with the **static `borderBottomWidth: 2.5` per-tab approach** (handoff `filters-variants.jsx:211` pattern: `<span style={{position:'absolute', left:0, right:0, bottom:-1, height:2.5, borderRadius:2, background: fp.coral}}/>` — translated to RN as a positioned 2.5pt-height View inside the active tab). The animated sliding indicator is forward-fit polish — adds Animated.Value + interpolation + tab-width-measurement complexity for marginal visual gain. Plan 14-02 keeps the delta small; if user feedback during M6 UAT calls out the snap-cut as jarring, that's an M7 polish ticket.

### Filter-Button Visual State (FILT-03)

CONTEXT.md D-13: "accent fill when `isFiltersExpanded` for BOTH variants." Current code at HomeScreen.tsx:493-505 already does this (`backgroundColor: isFiltersExpanded ? colors.accent : colors.inputBackground`). **No filter-button JSX changes needed in Plan 14-02 or 14-03.** Verify in Plan acceptance that the button's `backgroundColor` ternary survives both edits unchanged.

`[VERIFIED: HomeScreen.tsx:492-506 read 2026-05-31]`

### Validation Architecture (Dimension 8 gate — drives VALIDATION.md)

> nyquist_validation is `true` in `.planning/config.json`. This section is REQUIRED.

#### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 (`jest@^29.6.3`) via `preset: 'react-native'` |
| Config file | `jest.config.js` (root) + `jest.setup.js` |
| Quick run command | `npx jest src/components/filters/` |
| Full suite command | `npx jest` |
| Component test pattern | `react-test-renderer` + `act` (NOT @testing-library/react-native — verified absent from devDeps) |
| Test file location | `src/components/filters/__tests__/*.test.tsx` (project convention is `__tests__/` subdirectories, NOT flat colocation) |

#### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| FILT-01 SC1 | Stepper auto-advances Deal → Category → Type on selection | unit (component) | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx -t "auto-advance"` | ❌ Wave 0 (Plan 14-03) |
| FILT-01 SC1 | Stepper `reached(i)` clicks jump back without clearing later state | unit (component) | `npx jest src/components/filters/primitives/__tests__/Stepper.test.tsx -t "reached"` | ❌ Wave 0 (Plan 14-01) |
| FILT-01 SC1 | Multi-select TypeGrid toggles on tap (OR-union sent to setter) | unit (component) | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx -t "type-grid-multi"` | ❌ Wave 0 (Plan 14-03) |
| FILT-01 SC1 | "Show N homes" reads `liveCount` prop verbatim + dispatches onClose | unit (component) | `npx jest src/components/filters/primitives/__tests__/ShowButton.test.tsx` | ❌ Wave 0 (Plan 14-01) |
| FILT-01 SC1 | Breadcrumb renders `deal · category · types-collapse` correctly | unit (component) | `npx jest src/components/filters/primitives/__tests__/Breadcrumb.test.tsx` | ❌ Wave 0 (Plan 14-01) |
| FILT-01 SC1 | `joinTypes(cat, types)` collapse rule (1 type = label; N>1 = first + "+(N-1)") | unit (pure fn) | `npx jest src/components/filters/primitives/__tests__/joinTypes.test.ts` | ❌ Wave 0 (Plan 14-01) |
| FILT-02 SC2 | DealToggle Rent/Buy state writes correct value | unit (component) | `npx jest src/components/filters/primitives/__tests__/DealToggle.test.tsx` | ❌ Wave 0 (Plan 14-01) |
| FILT-02 SC2 | CascadingFilter category-tab click resets `types: []` | unit (component) | `npx jest src/components/filters/__tests__/CascadingFilter.test.tsx -t "category-reset"` | ❌ Wave 0 (Plan 14-02) |
| FILT-02 SC2 | CascadingFilter multi-select chip toggle (OR-union) | unit (component) | `npx jest src/components/filters/__tests__/CascadingFilter.test.tsx -t "multi-select"` | ❌ Wave 0 (Plan 14-02) |
| FILT-03 SC3 | Live-swap: changing `filterStyle` value rerenders HomeScreen dispatch | manual-only (physical device) | iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark walkthrough during Phase 15+ | manual-only |
| FILT-03 SC4 | Both variants share `{ deal, category, types }` state — apply in Guided, open Cascading, selections persist | manual-only (physical device) | same walkthrough as SC3 | manual-only |
| FILT-03 SC5 | KBD-02 grep gate (`keyboardVerticalOffset` count in `src/`) remains 0 | smoke (CI sentinel) | `[ "$(grep -rn keyboardVerticalOffset src/ \| wc -l \| tr -d ' ')" = "0" ]` | ✅ exists (`m1-keyboard-kbd-02-invariants.md` invariant) |
| FILT-03 SC5 | EN+RU i18n parity holds | smoke (CI sentinel) | `bash scripts/check-i18n-parity.sh` | ✅ exists |
| FILT-03 SC5 | tsc baseline (17 errors as of 2026-05-31) not regressed | smoke (build gate) | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` MUST be ≤ 17 | ✅ exists |

#### Sampling Rate

- **Per task commit:** `npx jest src/components/filters/` (whatever test files exist at that point in the wave). Also: `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ 17.
- **Per wave merge (per plan close):** Full `npx jest` + KBD-02 grep + i18n parity script.
- **Phase gate:** Full suite green + manual physical-device walk-through for SC3 + SC4 (one round on each device × EN/RU × light/dark) → `/gsd-verify-work`.

#### Wave 0 Gaps

Wave 0 has TWO categories of work the planner must surface:

1. **Test infrastructure (not source code):**
   - [ ] **Modal-rendering test harness** — NO test in the codebase currently renders a `<Modal>`. `EmailVerifyBanner.test.tsx` renders a banner without modal/animation. Verify that `react-test-renderer` can mount `<Modal>` content without crashing (RN's Modal is host-component in test mode). Plan 14-01 should ship a stubbed `Modal.test.tsx` that just mounts an empty Modal as a sanity probe; failing this fast saves Plan 14-03 from hours of debugging.
   - [ ] **Animated mock evaluation** — `react-test-renderer` does NOT execute Animated timing; `Animated.timing(...).start(cb)` fires the callback immediately in tests (RN's `react-native/jest/setup.js` auto-mocks Animated). Plan 14-03 tests must not assert on intermediate animation frames; only initial + final state. Document this in test file headers so future maintainers don't add fragile timing assertions.

2. **Test files to create:**
   - [ ] `src/components/filters/primitives/__tests__/DealToggle.test.tsx`
   - [ ] `src/components/filters/primitives/__tests__/CheckSquare.test.tsx`
   - [ ] `src/components/filters/primitives/__tests__/Stepper.test.tsx`
   - [ ] `src/components/filters/primitives/__tests__/ShowButton.test.tsx`
   - [ ] `src/components/filters/primitives/__tests__/Breadcrumb.test.tsx`
   - [ ] `src/components/filters/primitives/__tests__/joinTypes.test.ts`
   - [ ] `src/components/filters/__tests__/CascadingFilter.test.tsx` (Plan 14-02)
   - [ ] `src/components/filters/__tests__/GuidedFilterSheet.test.tsx` (Plan 14-03)

   No `conftest.py` analogue — Jest fixtures are inlined per-test. No shared mock setup file needed unless the Modal-harness probe demands one.

Framework install: none — `jest@^29.6.3` + `react-test-renderer@19.2.3` are already installed (`[VERIFIED: package.json]`).

#### Manual-Only Tests (justification)

FILT-03 SC3 (live-swap) and SC4 (state-shared-across-variants) are inherently integration-level: they require BOTH Phase 14 variants mounted AND Phase 15's Settings picker live AND a real AsyncStorage round-trip. Test-renderer can't simulate the AccountSettings navigation. Defer to Phase 15 / Phase 17 manual QA walkthrough. The unit-level analogues (FilterStyleContext set/get) are already covered by Phase 13's `FilterStyleContext.test.tsx`.

## Common Pitfalls

### Pitfall 1: Sheet-close animation never plays (Modal unmount race)

**What goes wrong:** Setting `visible=false` directly unmounts the Modal subtree before the slide-out animation completes. User sees the sheet vanish instead of slide-down.

**Why it happens:** `<Modal visible={open}>` is structural; `false` removes the entire native modal. Any Animated.timing still pending is GC'd.

**How to avoid:** Use the `localOpen` shadowing pattern (see Pattern 1). `localOpen` stays `true` through the slide-out animation; only after `Animated.timing.start(({finished}) => finished && setLocalOpen(false))` does the Modal unmount.

**Warning signs:** During QA, sheet close looks like an instant "pop" with no slide; or, opens twice in a row work but third open is delayed (animation refs in inconsistent state).

`[CITED: https://reactnative.dev/docs/animated — "start() optionally takes a completion callback"; pattern verified across multiple community articles 2026-05-31]`

### Pitfall 2: `LayoutAnimation` + reanimated 4 cross-talk

**What goes wrong:** Both LayoutAnimation and reanimated 4 try to drive layout on the same view subtree; one wins arbitrarily, causing jumpy or skipped animations.

**Why it happens:** Reanimated 4 is loaded in this repo for image-zoom (260515-djv). When LayoutAnimation runs on a subtree that also has reanimated-driven `useAnimatedStyle` views deeper inside, the layout pass races.

**How to avoid:** Phase 14 uses ONLY RN core Animated (D-11) — no reanimated `useSharedValue`/`useAnimatedStyle` anywhere in `src/components/filters/`. CascadingFilter inherits HomeScreen's existing LayoutAnimation; the Cascading subtree has no reanimated views. Safe by construction.

**Warning signs:** During QA, if the inline panel open/close has visible jitter on the chip row mid-animation, the cause is *NOT* this — it's likely Pitfall 4 below.

`[VERIFIED: project memory `reanimated-4-library-peer-constraint.md`; absence of reanimated imports in filter-component scope is enforceable]`

### Pitfall 3: Android hardware back button leaves Modal open

**What goes wrong:** User presses hardware back on Android while GuidedFilterSheet is open; Modal stays mounted, app navigates back to previous HomeScreen state, sheet hovers over a broken screen.

**Why it happens:** `onRequestClose` is a REQUIRED prop on Android Modal but the developer often forgets to wire it. RN docs: "Because of this required prop, be aware that `BackHandler` events will not be emitted as long as the modal is open."

**How to avoid:** Always pass `onRequestClose={onClose}` to Modal. In GuidedFilterSheet, `onClose` is the prop from HomeScreen that sets `isFiltersExpanded=false`. The same handler used for tap-scrim + X-button.

**Warning signs:** Manual QA on Moto G XT2513V — open sheet, press hardware back; sheet should slide down. If it doesn't, `onRequestClose` is missing.

`[CITED: https://reactnative.dev/docs/modal — fetched 2026-05-31]`

### Pitfall 4: Re-pick category mid-flow doesn't clear `types`

**What goes wrong:** User picks Residential → types: [Apartment]. Goes back to Category step (clickable stepper). Picks Commercial. Expected: types reset to []. Actual: types still contains 'Apartment' → predicate filters for Apartment within Commercial → zero results.

**Why it happens:** Forgetting to call `setTypes([])` in the category-card onPress handler — easy to miss because the "auto-advance" focus is on stepping forward.

**How to avoid:** Both variants must call `setTypes([])` inside the category setter. Handoff `filters-variants.jsx:137` does it: `{ setCat(c.id); setTypes([]); setStep(2); }`. Phase 14 setters must mirror. Plan 14-02 + 14-03 acceptance MUST include a unit-test case covering: pick Residential → toggle Apartment → re-pick Commercial → assert `types: []`.

**Warning signs:** Manual QA — after switching categories, the chip selection state visually persists OR the result count goes to 0 unexpectedly.

`[VERIFIED: handoff filters-variants.jsx:137]`

### Pitfall 5: Status bar treatment under Modal

**What goes wrong:** Sheet covers part of the screen but the status bar still shows the OLD HomeScreen's `StatusBar` style. Or, on Android, sheet starts BELOW the status bar leaving a dim strip.

**Why it happens:** RN Modal can be made full-screen-translucent via `statusBarTranslucent` prop (Android-only). Without it, Android Modal sits below the system status bar with the status-bar area dimmed by the OS.

**How to avoid:** Add `statusBarTranslucent` to Modal. Sheet's `maxHeight: '82%'` still leaves 18% transparent area above sheet (the scrim) — this is where the status bar shows through. Add explicit `<StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />` inside the sheet if status-bar legibility QA flags it. iOS has no equivalent prop; Modal handles status bar automatically.

**Warning signs:** Android device shows a dark strip at top of screen when sheet is open; or status bar icons disappear / become unreadable.

`[CITED: https://reactnative.dev/docs/modal — `statusBarTranslucent` prop documented]`

### Pitfall 6: Pressable scrim z-order

**What goes wrong:** Scrim `Pressable` sits behind the Animated.View sheet → tap-outside doesn't dismiss because the sheet absorbs the tap.

**Why it happens:** JSX order matters in RN — later siblings render above earlier ones. If you write `<Sheet />` before `<Scrim />`, the scrim covers the sheet (wrong).

**How to avoid:** Write `<Scrim />` FIRST, `<Sheet />` SECOND. Pattern 1 above does this. Document in Plan 14-03 acceptance: "tap outside sheet body dismisses; tap inside sheet body does not."

**Warning signs:** Manual QA — tap on the dim area above the sheet doesn't close it.

### Pitfall 7: `Pressable` hit-slop bleeding across sheet boundary

**What goes wrong:** Stepper close button or sheet "X" sits near the top of the sheet at radius corner; its `hitSlop` extends OUTSIDE the visible sheet — taps just above the sheet's top edge accidentally trigger close.

**Why it happens:** D-19 mandates `hitSlop: { top: 4, bottom: 4, left: 4, right: 4 }` on small targets. The close-X button is typically at the sheet's top-right corner with marginTop ~8pt. The 4pt top-extension reaches the scrim area.

**How to avoid:** This is acceptable — the scrim ALSO closes the sheet, so a 4pt hit-slop extension that "leaks" into scrim still does the right thing. Document the behavior in Plan 14-03 acceptance as a known-acceptable interaction.

**Warning signs:** None — it's a non-issue if scrim and X both call `onClose`.

### Pitfall 8: 0-property edge case for the live count

**What goes wrong:** `liveCount === 0` renders "Show 0 home" (singular form because of `count === 1` check).

**Why it happens:** Ternary `count === 1 ? .one : .many` puts 0 in the `.many` branch — works correctly with "Show {count} homes" interpolation → "Show 0 homes". OK in English. Russian "Показать 0 объектов" is also acceptable.

**How to avoid:** No issue — `0` falls through `.many` correctly. Just verify the i18n key `.many` reads naturally with count=0. Recommendation: optionally add `.zero` if QA flags awkwardness, but English/Russian both read fine through `.many`.

**Warning signs:** None expected.

### Pitfall 9: `Pressable` vs `TouchableOpacity` inside Modal

**What goes wrong:** `Pressable` for the scrim does NOT visually dim on press (unlike TouchableOpacity which has opacity transition by default). User taps scrim, no visual feedback, releases — sheet closes. Confusing.

**Why it happens:** `Pressable` is a low-level primitive; press states are opt-in via `style={({pressed}) => ...}` API.

**How to avoid:** Use `Pressable` for scrim (correct primitive for non-interactive area-tap-to-dismiss). Don't bother with press feedback — the scrim is a "void" the user taps to escape, and the sheet sliding down IS the feedback. For X-button and step pills + cards + chips, use `Pressable` with `style={({pressed}) => [..., pressed && { opacity: 0.7 }]}` OR `TouchableOpacity` (project precedent — HomeScreen.tsx uses TouchableOpacity heavily; consistency suggests TouchableOpacity for interactive elements).

**Warning signs:** Manual QA notes "scrim feels unresponsive" — actually fine; visual feedback IS the sheet slide.

## Code Examples

Each primitive has a documented shape in CONTEXT.md `<decisions>` §D-06 + `<specifics>`. Below are the load-bearing snippets the planner needs to reference; full implementations are Plan 14-01 territory.

### `DealToggle.tsx` (sliding-pill segmented control)

```tsx
// src/components/filters/primitives/DealToggle.tsx
// Source: handoff filters-shared.jsx DealToggle pattern + CONTEXT.md D-06
import React from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

type Deal = 'rent' | 'sale';

export const DealToggle: React.FC<{
  value: Deal;
  onChange: (d: Deal) => void;
  size?: 'sm' | 'lg';
}> = ({ value, onChange, size = 'lg' }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  // Sliding thumb: translateX 0 ↔ ~50% width
  const x = React.useRef(new Animated.Value(value === 'rent' ? 0 : 1)).current;
  React.useEffect(() => {
    Animated.timing(x, {
      toValue: value === 'rent' ? 0 : 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value]);
  // ... thumb View with translateX interpolated, two Pressables overlaid
};
```

### `Stepper.tsx` (1-2-3 stepper pills with connector bars)

```tsx
// src/components/filters/primitives/Stepper.tsx
// Source: handoff filters-variants.jsx:96-114 + CONTEXT.md D-09 + §Stepper Visual States
import { Check } from 'lucide-react-native';

type Step = 'deal' | 'category' | 'type';
const STEPS: Step[] = ['deal', 'category', 'type'];

export const Stepper: React.FC<{
  step: 0 | 1 | 2;
  onStepPress: (i: 0 | 1 | 2) => void;
  reached: (i: 0 | 1 | 2) => boolean;
  deal: Deal | null;
  category: PropertyCategory | null;
}> = ({ step, onStepPress, reached, deal, category }) => {
  // 3 pills + 2 connector bars between them
  // pill state derivation:
  //   done   = (i === 0 && deal && step > 0) || (i === 1 && category && step > 1)
  //   active = step === i
  //   reachable = reached(i) && !active && !done
  //   future = !reached(i)
  // Pill render: Pressable with hitSlop:{top:4,bottom:4,left:4,right:4},
  //   onPress = reached(i) ? () => onStepPress(i) : undefined.
  // Connector: 2pt height View, color = step > i ? colors.landlordGreen : colors.surface2.
};
```

### `joinTypes.ts` (pure utility — extract from handoff)

```tsx
// src/components/filters/primitives/joinTypes.ts
// Source: handoff filters-shared.jsx:75-79 (pure fn, ported verbatim)
import type { PropertyType, PropertyCategory } from '../../../utils/propertyCategory';

const TYPE_SETS: Record<PropertyCategory, readonly PropertyType[]> = {
  Residential: ['Apartment', 'House', 'Townhome', 'Condo'],
  Commercial:  ['Office', 'Retail', 'Warehouse', 'Industrial'],
  Hospitality: ['Hostel', 'Hotel'],
};

/**
 * Natural-language join. Empty → ''; 1 → label; 2 → "A or B"; N → "A, B or C".
 * Used by Breadcrumb (collapse rule) + Cascading result line.
 */
export function joinTypes(
  category: PropertyCategory,
  types: string[],
  lower: boolean = false,
): string {
  const labels = types.filter((t): t is PropertyType =>
    TYPE_SETS[category]?.includes(t as PropertyType) ?? false
  );
  let out: string;
  if (labels.length === 0) out = '';
  else if (labels.length === 1) out = labels[0];
  else out = labels.slice(0, -1).join(', ') + ' or ' + labels[labels.length - 1];
  return lower ? out.toLowerCase() : out;
}
```

### `Breadcrumb.tsx` collapse rule

```tsx
// src/components/filters/primitives/Breadcrumb.tsx
// Source: handoff filters-variants.jsx:163-170 (Guided footer) + §Specifics line 313

const breadcrumbItems: string[] = [
  deal && t(deal === 'rent' ? 'filters.deal.rent' : 'filters.deal.buy'),
  category && t(`filters.category.${category.toLowerCase()}` as TranslationKeys),
  types.length === 0
    ? null
    : types.length === 1
      ? joinTypes(category, types)
      : `${joinTypes(category, [types[0]])} +${types.length - 1}`,
].filter((s): s is string => Boolean(s));
// Render: chevron-separated row, color = colors.text for items, colors.textTertiary for chevrons
```

### `ShowButton.tsx` shadow + pluralization

```tsx
// src/components/filters/primitives/ShowButton.tsx
// Source: handoff filters-variants.jsx + §Specifics line 309 + §Pluralization Pattern

const label = count === 1
  ? t('filters.showHomes.one')
  : t('filters.showHomes.many', { count: String(count) });

<Pressable
  onPress={onPress}    // always-enabled per D-14
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
  style={({ pressed }) => [
    styles.button,
    {
      backgroundColor: colors.accent,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 26,
      elevation: 8,
      opacity: pressed ? 0.85 : 1,
    },
  ]}
>
  <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 16 }}>{label}</Text>
</Pressable>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline single-chip filter row (`HomeScreen.tsx:521-642`) | Two interchangeable variants (Guided + Cascading) selected by `filterStyle` preference | Phase 14 (this phase) | Variants are the M6 value proposition. |
| `selectedType: string \| null` | `types: string[]` multi-select | Phase 13 (already shipped 2026-05-31) | Foundation for multi-select variants. |
| Hardcoded `#FF385C` / `#FF5C7C` accent split | `colors.accent = '#ff5a6f'` mode-independent | Phase 12 (already shipped 2026-05-31) | Brand-locked accent. |
| RN Animated for sheet slide | (NO CHANGE — locked at RN Animated per D-11) | — | Reanimated 4 worklets are NOT adopted for this phase. |
| @testing-library/react-native | `react-test-renderer` + `act` (project convention) | M3+ | RTL not added to devDeps; precedent at EmailVerifyBanner.test.tsx. |

**Deprecated/outdated:**

- Handoff prototype's 14-type taxonomy (Studio, Room, Restaurant, Resort, Guesthouse) — NOT adopted. CLAUDE.md taxonomy guard.
- i18next/ICU pluralization — NOT adopted. Custom `t()` with `.one`/`.many` ternary pattern is the project standard.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Russian double-form pluralization (1 / N≥2) is acceptable trade-off for "Show N homes" without ICU | §Pluralization Pattern | Low — same trade-off as existing `home.rejection.banner.plural` precedent. If UAT user pushes back, ship triple-form ad-hoc in M7. |
| A2 | `Animated.parallel` for sheet slide + scrim fade matches user mental model | §Pattern 1 | Low — universal RN sheet pattern. Could be alt-implemented as `Animated.sequence` if QA flags the simultaneous-finish as off. |
| A3 | `statusBarTranslucent` works correctly on Moto G XT2513V (Android 14) for the sheet sitting under status bar | §Pitfall 5 | Medium — prop is documented stable but Android device variance is real. Plan 14-03 acceptance should include Android status-bar walkthrough. |
| A4 | `Building2` is acceptable for both Townhome and Condo (icon duplication) | §Lucide Icon Verification | Low — handoff also reused icons. If a designer reviews and flags, swap Condo → `Landmark`. |
| A5 | Test-renderer mounts a `<Modal>` without crashing | §Validation Architecture Wave-0 | Medium-High — no precedent in codebase. **Mitigation: Wave 0 task in Plan 14-01 ships a probe.** If Modal breaks test-renderer, fallback is to test the sheet WITHOUT the Modal wrapper (test the inner content as a regular View component). |
| A6 | The 10 StyleSheet keys at HomeScreen.tsx:866-914 are referenced ONLY in the 521-642 range | §HomeScreen Integration | Low — confirmed by grep on 2026-05-31. Mitigation: re-run the grep gate in Plan 14-02 acceptance. |

**If A5 fails:** The Wave-0 probe is the cheapest failure point. Plan 14-01 should include "verify Modal mounts in test-renderer" as the FIRST atomic step. If it fails, the variant test files in Plan 14-03 must test the inner content extracted as a sub-component (e.g., test `<GuidedFilterSheetContent>` as a sibling export); the Modal wrapper itself gets manual-only coverage.

## Open Questions

1. **Test-renderer + Modal compatibility (A5 above).**
   - What we know: `react-test-renderer` mounts host components; Modal is a host component on both iOS and Android in RN core.
   - What's unclear: Whether the auto-mocked Animated layer plays nicely with the Modal's visibility prop.
   - Recommendation: Plan 14-01 Wave 0 ships a 5-line probe test that just mounts an empty `<Modal visible={true}><Text>x</Text></Modal>` and asserts no crash. Outcome decides whether GuidedFilterSheet's tests render the full Modal or extract `GuidedFilterSheetContent` for testing.

2. **Does the cascading-tab underline need animation, or is `borderBottomWidth` enough?**
   - What we know: CONTEXT.md `<specifics>` and `<deferred>` both authorize the simpler static approach.
   - What's unclear: Whether snap-cut between tabs looks jarring vs handoff's slide.
   - Recommendation: Ship static `borderBottomWidth: 2.5` in Plan 14-02. Flag as a candidate M7 polish ticket if UAT calls it out.

3. **Does `Animated.View` with translateY visually clip at the sheet's rounded top corners?**
   - What we know: `borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden'` should clip child content.
   - What's unclear: Whether a deep child (e.g., ScrollView with shadow) renders outside the rounded corner during the slide.
   - Recommendation: Plan 14-03 implements with `overflow: 'hidden'` on the sheet outer View; if QA finds artifacts, add a per-platform fallback (Android tends to be more tolerant of overflow than iOS in transform contexts).

## Environment Availability

> Phase 14 is pure-RN client; no external tools/services needed at runtime.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `react-native` 0.84 + Animated | All variants | ✓ | RN core | — |
| `react-native` 0.84 + Modal | GuidedFilterSheet | ✓ | RN core | — |
| `lucide-react-native` | TypeIcon, Stepper Check, Filter icon (existing) | ✓ | `^0.564.0` | — |
| `@react-native-async-storage/async-storage` | Read-only via Phase 13 hook | ✓ | shipped | — |
| `jest` + `react-test-renderer` | Test files | ✓ | `^29.6.3` + `19.2.3` | — |
| Node 20.19.1 (RN client) | npm/jest/tsc | ✓ | default shell node | — (NOT Node 22 — that's backend-only per memory `backend-node-version.md`) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Project Constraints (from CLAUDE.md + memories)

These directives are non-negotiable and must surface in every plan:

- **No `react-navigation` migration.** Filter button does NOT navigate; it mounts a Modal in place. `[VERIFIED: CLAUDE.md "No `react-navigation` migration"]`
- **3-category 9-type taxonomy preserved.** CONTEXT.md D-03 locks this; do not expand. `[VERIFIED: CLAUDE.md "M1's 3-category 9-type taxonomy preserved"]`
- **EN+RU bilingual parity for every new UI string.** `scripts/check-i18n-parity.sh` exit 0 after every plan that touches `src/locales/`. `[VERIFIED: CLAUDE.md "EN+RU parity required"]`
- **KBD-02 invariant: `keyboardVerticalOffset` count in `src/` must remain 0.** Grep gate in every plan acceptance. `[VERIFIED: memory `m1-keyboard-kbd-02-invariants.md`]`
- **`useTheme()` tokens only — no hardcoded colors.** Phase 14 must read every color via `colors.X`. `[VERIFIED: CLAUDE.md "Theme: use `useTheme()` tokens"]`
- **Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark.** Especially load-bearing for Phase 14 because the variant UIs are visual-first. `[VERIFIED: CLAUDE.md / REQUIREMENTS.md M1 hard rules]`
- **No Firebase SDK.** N/A for this phase (no auth surface). `[VERIFIED: memory `no-firebase-sdk.md`]`
- **No backend changes in M6.** Phase 14 is client-only. `[VERIFIED: CLAUDE.md "No backend changes in M6"]`
- **Subagent CWD-drift mitigation.** Every plan's executor instructions MUST prepend `cd "$(git rev-parse --show-toplevel)" &&` to every Bash command and verify `git branch --show-current` before each commit. Pattern has fired 3+ times. `[VERIFIED: memory `subagent-cwd-drift-recurring.md`]`
- **Reanimated 4.x peer constraint.** Phase 14 uses RN core Animated (D-11) — no peer audit needed, but planner must not propose reanimated worklets. `[VERIFIED: memory `reanimated-4-library-peer-constraint.md`]`
- **Test convention:** `__tests__/` subdirectories, NOT flat colocation. `[VERIFIED: find src -name "*.test.*" 2026-05-31]`
- **Test framework:** `react-test-renderer` + `act`, NOT `@testing-library/react-native`. `[VERIFIED: EmailVerifyBanner.test.tsx header + devDeps]`
- **TSC baseline:** 17 errors as of 2026-05-31. Phase 14 must not regress beyond this. `[VERIFIED: npx tsc --noEmit 2>&1 | grep -c "error TS" === 17]`

## Sources

### Primary (HIGH confidence)

- `src/screens/HomeScreen.tsx` (entire file, read 2026-05-31) — line range 521-642 confirmed for delete; 866-914 confirmed as orphaned StyleSheet entries; line 22 + 331 confirmed for LayoutAnimation wiring; line 320-328 confirmed `togglePropertyType` lacks LayoutAnimation call.
- `src/theme/colors.ts` (entire file, read 2026-05-31) — all 14 required tokens verified present in both dark and light blocks.
- `src/context/LanguageContext.tsx` + `src/locales/index.ts` + `src/locales/en.ts` (read 2026-05-31) — i18n pluralization shape is custom flat `t()` with placeholder substitution, NOT i18next ICU.
- `src/context/FilterStyleContext.tsx` + `src/utils/buildFilterQuery.ts` + `src/utils/propertyCategory.ts` (read 2026-05-31) — Phase 13 foundation in place; predicate semantics + filterStyle hook + 10-type taxonomy verified.
- `src/components/__tests__/EmailVerifyBanner.test.tsx` (read 2026-05-31) — react-test-renderer + act is the project pattern; documented in file header.
- `package.json` + `node_modules/lucide-react-native/dist/esm/lucide-react-native.js` (grep'd 2026-05-31) — all 10 Lucide icon named exports verified present in installed bundle.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/filters-variants.jsx` + `filters-shared.jsx` + `README.md` (read 2026-05-31) — handoff source for visual states, joinTypes pattern, fp.* token-key vocabulary.
- `https://reactnative.dev/docs/modal` (fetched 2026-05-31) — Modal API semantics (animationType, onRequestClose, transparent, statusBarTranslucent).
- `.planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md` (entire file, read 2026-05-31) — locked decisions D-01 through D-20.
- `.planning/phases/13-shared-filter-data-model-asyncstorage-persistence/13-CONTEXT.md` (entire file, read 2026-05-31) — Phase 13 foundation decisions.
- `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-CONTEXT.md` (entire file, read 2026-05-31) — Phase 12 token spec.
- `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md` + `.planning/STATE.md` (read 2026-05-31) — M6 requirements, FILT-01/02/03 acceptance criteria, current milestone state.
- `CLAUDE.md` (read 2026-05-31) — project hard rules.
- `.planning/config.json` (read 2026-05-31) — workflow.nyquist_validation = true (drives Validation Architecture section).

### Secondary (MEDIUM confidence)

- Community RN bottom-sheet pattern articles (Medium/dev.to surfaces from 2024-2025) cross-referenced for the localOpen shadowing pattern. Verified against RN official Modal docs.

### Tertiary (LOW confidence)

- None. Every claim in this research file is verified against project source or official RN documentation.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — every package verified installed; every API has official-docs source.
- Architecture (Modal + Animated patterns): **HIGH** — RN core APIs documented; `localOpen` shadowing is universally documented across community RN articles.
- Pitfalls: **HIGH** for the 9 pitfalls listed; **MEDIUM** for the cascading edge cases (need device QA to fully validate, e.g., A3).
- i18n pluralization verdict: **HIGH** — verified against codebase source.
- Lucide icon mapping: **HIGH** — every name grep-verified in installed bundle.
- Palette token coverage: **HIGH** — colors.ts read end-to-end.
- HomeScreen delete checklist: **HIGH** — grep-verified orphan analysis.
- Validation pyramid: **MEDIUM-HIGH** — main risk is the Modal-test-harness Wave 0 probe (A5).

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (estimate — stable RN core APIs; project state changes only via Phase 14 execution itself; Lucide upgrades are non-breaking)
**Pre-submission checklist verified:**

- [x] All domains investigated (stack, patterns, pitfalls, environment, validation)
- [x] Negative claims (ICU absence, no RTL, no Modal test precedent) verified by codebase + devDeps grep
- [x] Multiple sources cross-referenced for critical claims (Modal pattern, Animated pattern, pluralization pattern)
- [x] URLs provided for RN official docs
- [x] Confidence levels assigned honestly
- [x] CONTEXT.md scope respected — no proposed alternatives to D-01 through D-20
- [x] Validation Architecture section included (nyquist_validation=true)
- [x] Security domain: not applicable — `security_enforcement` is implicit-on but Phase 14 has zero auth/data-sensitive surface; ASVS categories V2-V6 all "no" for this scope. Section omitted as N/A is overwhelming.

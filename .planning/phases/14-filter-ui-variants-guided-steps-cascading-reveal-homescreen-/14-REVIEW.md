---
phase: 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/components/filters/CascadingFilter.tsx
  - src/components/filters/GuidedFilterSheet.tsx
  - src/components/filters/primitives/Breadcrumb.tsx
  - src/components/filters/primitives/CheckSquare.tsx
  - src/components/filters/primitives/DealToggle.tsx
  - src/components/filters/primitives/joinTypes.ts
  - src/components/filters/primitives/MultiHint.tsx
  - src/components/filters/primitives/ShowButton.tsx
  - src/components/filters/primitives/Stepper.tsx
  - src/components/filters/primitives/TypeIcon.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/HomeScreen.tsx
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-05-31
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 14 ships eight new primitives, two variant components, and a clean HomeScreen integration delete (~169 LOC orphan JSX + StyleSheet keys verified removed). i18n parity holds (`scripts/check-i18n-parity.sh` exit 0). KBD-02 grep gate (`keyboardVerticalOffset` in `src/`) equals 0. tsc baseline holds at 17 known pre-existing errors (none new from Phase 14). All 55 unit tests across 11 suites pass.

**No Critical findings.** No security defects, no data-loss risks, no crash paths. The state-ownership boundary is honored — both variants are pure controlled components.

**5 Warnings concentrate around three real defects:**
1. **DealToggle's percentage `translateX` with `useNativeDriver: true`** is officially unsupported by RN's native driver — the thumb may fail to animate (snap-cut) on iOS or render misaligned on Fabric/New Arch. No project precedent for this pattern.
2. **`Stepper.reached(i)` predicate is trivially true** because `transactionType` and `selectedCategory` are non-nullable with defaults — D-09's progressive-disclosure gate is silently broken. User can jump straight to step 2 from cold open.
3. **GuidedFilterSheet doesn't reset `step` to 0 on re-open** — user closes at step 2, re-opens, sheet re-renders at step 2. Diverges from wizard UX expectation.

Plus two structural warnings: a `useEffect` deps-array with `localOpen` read inside but only `[open]` listed (eslint-disable), and `LayoutAnimation.configureNext` firing for the guided variant where its effect is undefined (Modal sits in a separate window).

## Warnings

### WR-01: DealToggle percentage `translateX` with native driver is unsupported

**File:** `src/components/filters/primitives/DealToggle.tsx:60-72`
**Issue:** The animated thumb interpolates `outputRange: ['0%', '100%']` for `translateX` with `useNativeDriver: true`. RN's native animation driver does not officially support percentage-string outputs — it requires numeric outputs because percentage resolution depends on the host view's width (which the native driver doesn't have at animation time on the UI thread). Documented across RN issues for years (e.g., facebook/react-native#15011). On older iOS this typically snap-cuts the thumb (no animation visible) instead of throwing. On RN 0.84 New Arch / Fabric the behavior is undefined. There is no project precedent for this pattern (`grep -rn "outputRange.*%" src/` returns only this one line).

Even if it currently appears to work on the iPhone 15 Pro Max during dev QA, it is likely to fail silently on Moto G XT2513V or to regress with a future RN upgrade.

**Fix:** Resolve the container width via `onLayout` and interpolate to numeric pixels, or drop `useNativeDriver`:
```tsx
const [width, setWidth] = useState(0);
// ...
<View
  onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
  style={[styles.container, { backgroundColor: colors.surface2 }]}
>
  <Animated.View
    pointerEvents="none"
    style={[
      styles.thumb,
      {
        backgroundColor: colors.accent,
        transform: [
          {
            translateX: thumbPos.interpolate({
              inputRange: [0, 1],
              outputRange: [0, width / 2], // numeric, half-width travel
            }),
          },
        ],
      },
    ]}
  />
  {/* ... */}
</View>
```
Alternative: drop `useNativeDriver: true` (cheap on the JS thread for a 200ms two-segment toggle) and keep the percentage string — RN handles string interpolation on the JS thread.

---

### WR-02: `Stepper.reached(i)` predicate is trivially true — D-09 progressive disclosure broken

**File:** `src/components/filters/GuidedFilterSheet.tsx:164-169`
**Issue:** The predicate is:
```tsx
const reached = (i: number): boolean => {
  if (i === 0) return true;
  if (i === 1) return !!transactionType;     // 'rent'|'sale' — always truthy
  if (i === 2) return !!selectedCategory;    // PropertyCategory — always truthy
  return false;
};
```
Both `transactionType` (`'rent'|'sale'`, default `'rent'` per `HomeScreen.tsx:94`) and `selectedCategory` (`PropertyCategory`, default `'Residential'` per `HomeScreen.tsx:95`) are non-nullable union types with always-truthy defaults. Therefore `reached(1)` and `reached(2)` always return `true`. From cold open, the user can tap any step pill and jump directly to step 2 (TypeGrid) without ever seeing the Deal or Category cards. Step pills never paint the "future" (disabled-grey) state because no step is ever unreachable.

CONTEXT.md D-09 explicitly locked: "Step 0 (Deal) always reached. Step 1 (Category) reached iff `deal` is set. Step 2 (Type) reached iff `category` is set." The wizard's main back-navigation affordance is intended to gate forward jumps too — that gate is silently absent.

**Fix:** Track "visited" state inside `GuidedFilterSheet` (separate from the parent's deal/category values which carry default values) and gate `reached()` on visit history:
```tsx
const [maxVisitedStep, setMaxVisitedStep] = useState<0 | 1 | 2>(0);

// Bump on every advance:
onPress={() => {
  setTransactionType(value);
  setStep(1);
  setMaxVisitedStep((m) => Math.max(m, 1) as 0 | 1 | 2);
}}

const reached = (i: number): boolean => i <= maxVisitedStep;
```
Reset `maxVisitedStep` to `0` whenever the sheet re-opens (see WR-03 below — shared fix surface).

---

### WR-03: GuidedFilterSheet does not reset `step` when sheet re-opens

**File:** `src/components/filters/GuidedFilterSheet.tsx:111-152`
**Issue:** `step` is initialized to `0` via `useState<0 | 1 | 2>(0)` once at mount. Once the user reaches step 2, dismisses the sheet (animation completes → `setLocalOpen(false)`, Modal unmounts internal subtree), and re-opens, the parent re-creates the component on the next `open=true` only if the conditional `{filterStyle === 'guided' && (...)}` unmounts in between. **It does not** — the guided variant is conditional on `filterStyle === 'guided'` alone, not on `isFiltersExpanded`, so the GuidedFilterSheet stays mounted between sessions; only the inner Modal toggles. Therefore `step` survives between open/close cycles.

User scenario: opens filter button, picks Deal, picks Category, lands at step 2 (TypeGrid), taps "Show N homes" (close), re-opens via filter icon, sees TypeGrid immediately instead of the Deal step. Stepper pills still show 1 and 2 as done. Diverges from the wizard UX intent that "open" means "begin the flow."

**Fix:** Reset `step` when sheet enters open state:
```tsx
useEffect(() => {
  if (open) {
    setLocalOpen(true);
    setStep(0);                 // <-- add this
    // setMaxVisitedStep(0);   // <-- if WR-02 fix lands
    Animated.parallel([...]).start();
  } else if (localOpen) {
    Animated.parallel([...]).start(({ finished }) => {
      if (finished) setLocalOpen(false);
    });
  }
}, [open]);
```

If you want the wizard to *remember* progress for a single session (alternative UX), that should be an explicit decision documented in CONTEXT.md, not the current accidental behavior.

---

### WR-04: `useEffect` reads `localOpen` but declares only `[open]` as deps

**File:** `src/components/filters/GuidedFilterSheet.tsx:116-152`
**Issue:** The effect body reads `localOpen` in the `else if (localOpen)` branch but only `open` is in the deps array (with `// eslint-disable-next-line react-hooks/exhaustive-deps`). In the current code paths this happens to be safe because:
- When `open` flips `true → false`, `localOpen` is still `true` (was set to `true` in the prior `open=true` effect run), so the close branch correctly fires.
- When `open` flips `false → true`, `localOpen` is `false` initially, but we set it to `true` and start the in-animation — the branch we hit doesn't read `localOpen` value, only writes.

However, the disable hides a real risk: any future maintainer who adds branches that depend on `localOpen` will get a closure that may have a stale value. Also, the rule-of-thumb violation makes Strict Mode double-invocation in React 19+ (mount/unmount/mount) more fragile.

**Fix:** Either add `localOpen` to deps and guard against re-entry:
```tsx
useEffect(() => {
  if (open && !localOpen) {
    setLocalOpen(true);
    // run in-animation
  } else if (!open && localOpen) {
    // run out-animation
  }
}, [open, localOpen]);
```
Or use a `useRef` to track the prior `open` value and avoid the localOpen read entirely. Either way the eslint-disable can be dropped.

---

### WR-05: HomeScreen calls `LayoutAnimation.configureNext` even when filterStyle is `'guided'`

**File:** `src/screens/HomeScreen.tsx:331-334` (interaction with the new variant dispatch at lines 524-550)
**Issue:** `toggleFiltersExpanded` unconditionally calls `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before flipping `isFiltersExpanded`. This was correct when the inline cascading JSX block lived under the filter button and needed an animated mount/unmount. With Phase 14:
- For `filterStyle === 'cascading'`: configureNext still animates the inline mount/unmount of `<CascadingFilter />`. Correct.
- For `filterStyle === 'guided'`: the variant renders a `Modal` to a separate native window (RN core `Modal`). LayoutAnimation does not (and cannot) animate the Modal mount. The `configureNext` call still fires and applies to the *next layout pass on the JS tree* — which now includes the result count text re-rendering, potential filter-button background color change, etc. These will animate unexpectedly under easeInEaseOut.

In practice the visible artifact is minor (filter button background may fade-in, result count may shift), but it's an unintended cross-coupling between the inline-panel optimization and the new modal-mount path.

**Fix:** Read `filterStyle` and gate the `configureNext` call:
```tsx
const toggleFiltersExpanded = () => {
  if (filterStyle === 'cascading') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
  setIsFiltersExpanded((prev) => !prev);
};
```
Or move the LayoutAnimation call inside `CascadingFilter` itself (closer to the layout boundary it animates).

---

## Info

### IN-01: Hex literal casing inconsistent — `'#FFFFFF'` in CheckSquare, `'#fff'` everywhere else

**File:** `src/components/filters/primitives/CheckSquare.tsx:49`
**Issue:** CheckSquare uses `color: '#FFFFFF'` while ShowButton.tsx:66, Stepper.tsx:78, DealToggle.tsx:86, CascadingFilter.tsx:209, GuidedFilterSheet.tsx:208, and the in-file doc comment all use `'#fff'`. Both render identically, but mixed casing is a style smell.
**Fix:** Lowercase to `'#fff'` for consistency with the rest of `src/components/filters/`.

---

### IN-02: Breadcrumb has `void joinTypes` to silence unused-import warning

**File:** `src/components/filters/primitives/Breadcrumb.tsx:21-24`
**Issue:** Comment + `void joinTypes;` no-op is used to keep the import alive as a "forward-fit anchor." This is a code smell — either consume `joinTypes` (move the inlined collapse rule into the utility and call it) or remove the unused import.
**Fix:** Use `joinTypes` for the collapse rule (it already implements the natural-language join that Breadcrumb forward-fits towards) OR delete the import + the `void` statement.

---

### IN-03: CascadingFilter accepts but does not use `liveCount` prop

**File:** `src/components/filters/CascadingFilter.tsx:56-62, 83-84`
**Issue:** `liveCount: number` is destructured with an inline `// eslint-disable-next-line @typescript-eslint/no-unused-vars` annotation. Doc-comment justifies as "forward-fit" since HomeScreen.tsx:644-646 owns the visible count. The decision is consistent with UI-SPEC §"CascadingFilter anatomy" final note, but the disable-comment pattern leaks linting cruft into the component body.
**Fix:** Either omit `liveCount` from the prop type entirely (HomeScreen can stop passing it for the cascading branch) or mark it optional and prefix with `_` (`_liveCount`) so it self-documents as intentional. The eslint-disable is unnecessary noise.

---

### IN-04: `joinTypes(category, types)` accepts `category` but never branches on it

**File:** `src/components/filters/primitives/joinTypes.ts:18-26`
**Issue:** `category` parameter is silenced via `void category;`. Function signature accepts it "for handoff parity / forward-fit" but no v1 algorithm uses it. Same smell as IN-02 — the signature anticipates future use without documenting *what* future use.
**Fix:** Drop the `category` parameter from the v1 signature. When (if) M7+ adds category-specific connectives, the signature can grow back. Keep functions minimal until they have real consumers.

---

### IN-05: Stepper `connector` `marginBottom: 22` is a magic number masquerading as alignment

**File:** `src/components/filters/primitives/Stepper.tsx:134`
**Issue:** `marginBottom: 22` is documented inline as "sit roughly at pill-vertical-center, above the label row." This depends on the label's font size + line height to render to ~22pt — a coupling that will silently break if the Stepper label font is ever adjusted (e.g., M4 Phase 9 localization changes Russian labels' line wrap).
**Fix:** Use flexbox to align the connector to the pill row vertical center rather than a magic offset:
```tsx
// Container row with two phases: pills row (with connectors), labels row beneath.
// Or: align pill+connector with `alignItems: 'center'` and let labels flow underneath via flexDirection: column on the col.
```
Not blocking — current rendering looks acceptable on iPhone 15 — but flagged for future polish.

---

### IN-06: `localOpen` initialized with `open` prop allows render-without-animation on first mount

**File:** `src/components/filters/GuidedFilterSheet.tsx:111-152`
**Issue:** If a parent ever mounts `GuidedFilterSheet` with `open={true}` on first render (not the normal flow — HomeScreen always starts with `isFiltersExpanded=false`), the Modal renders at translateY=SHEET_HEIGHT (off-screen) then immediately starts animating in. On most devices this is fine, but if the JS thread is busy on first mount, the user may briefly see no sheet (off-screen) before the animation kicks in. Initial render is also at scrim opacity 0, which fades in.

This is informational because the current HomeScreen flow always starts closed, so the issue is unobservable today. But the component would be more resilient if `useState<boolean>(false)` and let the effect drive the first open.
**Fix:** Initialize `useState<boolean>(false)` and let the `useEffect` mount logic always drive the first mount transition.

---

## Verification Summary

| Gate | Result |
|------|--------|
| `npx jest src/components/filters/` (55 tests, 11 suites) | PASS |
| `npx tsc --noEmit 2>&1 \| grep -c "error TS"` | 17 (== Phase 13 baseline; no new) |
| `grep -rn "keyboardVerticalOffset" src/ \| wc -l` (KBD-02) | 0 |
| `bash scripts/check-i18n-parity.sh` | exit 0 (EN+RU parity holds) |
| Orphan StyleSheet keys deletion sentinel grep | 0 references found |
| Inline JSX block deletion (HomeScreen.tsx:521-642) | confirmed deleted, replaced by ~30-LOC dispatch |

## Recommended Next Steps

1. **Address WR-01 (DealToggle native-driver percentage) BEFORE TestFlight upload.** This is the highest-risk finding because the failure mode is silent (no thumb animation on devices where native driver rejects strings). Recommend numeric-pixel interpolation via `onLayout`.
2. **Address WR-02 + WR-03 together** (both relate to Stepper/sheet wizard semantics). Add a `maxVisitedStep` state inside GuidedFilterSheet, reset to 0 on every open transition, and base `reached()` on it.
3. **Address WR-04 + WR-05** as a small cleanup pass — both are low-effort fixes that improve maintainability without behavior change.
4. **INFO items are optional polish** — IN-01 through IN-06 can be batched into a follow-up commit or addressed during Phase 15's filter-style picker work.
5. **Manual device QA still required** for FILT-03 SC3 (live-swap) and SC4 (state-share-across-variants) per RESEARCH.md §Manual-Only Tests — those gates fire after Phase 15 ships the Account Settings picker.

---

_Reviewed: 2026-05-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

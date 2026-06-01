---
phase: 260601-dqh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/filters/primitives/ShowButton.tsx
  - src/components/filters/GuidedFilterSheet.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/filters/primitives/__tests__/ShowButton.test.tsx
  - src/components/filters/__tests__/GuidedFilterSheet.test.tsx
autonomous: true
requirements: [QUICK-260601-DQH]
---

<objective>
Make the Guided filter sheet let users stop at any step. Per `GSD-HANDOFF-guided-stop-at-any-step.md`, the footer currently exposes exactly one action — `<ShowButton>` — and Deal/Category cards auto-advance via `setStep`. Switch to "Guide-first": every non-final step shows a primary **Continue · Add a {category|type}** that advances, plus a secondary, raised-surface **Show N homes** that closes immediately. Step 2 (Type) stays a single full-width primary Show. Deal/Category cards stop auto-advancing (Continue takes over `setStep`).

Purpose: Users who pick `Rent → Residential` and want to see those results today can't — they're trapped advancing to Type. This unblocks the "stop one step early" path while keeping Continue as the discoverable forward action.

Output: `ShowButton` gains a `variant` prop (primary | secondary); `GuidedFilterSheet` gets a dual-action footer + softened accent shadow + new `ChevronRight` import; two new i18n keys in EN+RU parity; tests updated.

Invariants preserved (regression budget = 0):
- **D-04 live selections** — Show stays a `onPress={onClose}` call, never an apply call.
- **D-14 ShowButton always enabled** — both variants. No `disabled`, no `accessibilityState.disabled`.
- **RESEARCH.md Pitfall 4** — in `renderCategoryCard`, `setSelectedCategory(cat)` MUST fire before `setTypes([])`.
- **Stepper untouched** — `reached()`, `onStepPress`, pill rendering unchanged. Continue is just a second path into the same `setStep`.
- **`localOpen` shadow state, `Animated.parallel`, `animationType="none"`** all unchanged.
- No new deps. `ChevronRight` comes from `lucide-react-native` (already used).
- No surfaces touched outside the five files in `files_modified`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@GSD-HANDOFF-guided-stop-at-any-step.md
@CLAUDE.md
@src/components/filters/primitives/ShowButton.tsx
@src/components/filters/GuidedFilterSheet.tsx
@src/locales/en.ts
@src/locales/ru.ts

<interfaces>
<!-- Key facts the executor needs without re-exploring. -->

ShowButton today (`src/components/filters/primitives/ShowButton.tsx`):
- Props: `{ count: number; onPress: () => void }`
- Reads `colors.filterAccent` from `useTheme()`; reads `t('filters.showHomes.one'|'.many')` from `useLanguage()`.
- D-14: ALWAYS enabled (no `disabled` prop, no opacity-disabled state, no `accessibilityState.disabled`). Preserve this for the new `secondary` variant too.
- Current shared `styles.button` carries `shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 12 }, shadowRadius: 26, elevation: 8`. THIS MUST MOVE — out of the shared sheet and into the primary-only branch, AND it must be replaced with the accent-tied low-spread shadow (Task 1.b).

GuidedFilterSheet today (`src/components/filters/GuidedFilterSheet.tsx`):
- lucide-react-native import block is at lines 30–36; currently imports `X, Building, Briefcase, Hotel as HotelIcon, type LucideIcon`. Add `ChevronRight` to this same block.
- `renderDealCard` `onPress` is lines 185–188 — currently `() => { setTransactionType(value); setStep(1); }`. Remove `setStep(1)`.
- `renderCategoryCard` `onPress` is lines 234–241 — currently `() => { setSelectedCategory(cat); setTypes([]); setStep(2); }` with a load-bearing comment about Pitfall 4. Remove `setStep(2)`. KEEP THE COMMENT AND KEEP `setSelectedCategory` ABOVE `setTypes([])`.
- Footer is at lines 442–457 (NOT 527–545 — the handoff line numbers were slightly stale). The block to replace is the children of `<View style={[styles.footer, { borderTopColor: colors.border }]}>` — i.e. `breadcrumbWrap` + the single `<ShowButton>`.
- Styles live in the `StyleSheet.create({ … })` starting at line 463; `footer` is at line 565, `breadcrumbWrap` at 571. Add `continueBtn` and `continueLabel` to the same sheet. Note: `colors` is not in scope inside `StyleSheet.create`, so accent `shadowColor` and `backgroundColor` must be applied inline on the `<Pressable>`.

i18n today:
- `en.ts` filters block starts at line 949. `filters.showHomes.one` is line 954, `.many` is line 955. Insert the two new keys adjacent to `filters.showHomes.*` (e.g. immediately after line 955).
- `ru.ts` filters block starts at line 939. `filters.showHomes.one` is line 944, `.many` is line 945. Insert at the matching position.
- `TranslationKeys` = `keyof typeof en` (en.ts line 989). Adding keys to `en` automatically extends the type — no manual type edit needed. `ru.ts` is typed `Record<TranslationKeys, string>`, so EN+RU parity is enforced at compile time and by `scripts/check-i18n-parity.sh`.

Test infrastructure today:
- `src/components/filters/primitives/__tests__/ShowButton.test.tsx` EXISTS — covers pluralization + D-14 at count=0. Mocks `useTheme`/`useLanguage`. Note its existing `useTheme.mockReturnValue` only provides `colors: { accent: '#ff5a6f' }`; the component actually reads `colors.filterAccent`. New tests should mock `colors.filterAccent`, `colors.surface2`, `colors.border`, `colors.text`.
- `src/components/filters/__tests__/GuidedFilterSheet.test.tsx` EXISTS — uses react-test-renderer per the Modal-probe outcome.

Out of scope (do NOT touch): CascadingFilter, Cascading/Master/Sentence variants, Results-first footer, Auto-advance model, the `Stepper` primitive, navigation, schema, types beyond the two new i18n keys.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ShowButton — add variant prop + soften primary shadow</name>
  <files>src/components/filters/primitives/ShowButton.tsx</files>
  <action>
Extend `ShowButtonProps` with `variant?: 'primary' | 'secondary'` defaulting to `'primary'`. Destructure `variant = 'primary'` in the component, derive `const isSecondary = variant === 'secondary';`, and split the `Pressable` style branch by variant. Keep the D-14 always-enabled contract for BOTH variants — no `disabled`, no `accessibilityState.disabled`, no opacity-disabled state. Both variants keep `height: 54` (the existing card height).

Exact shapes from the handoff (use verbatim):

```tsx
export interface ShowButtonProps {
  count: number;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}
```

Inside the component:

```tsx
const isSecondary = variant === 'secondary';
// …
style={({ pressed }) => [
  styles.button,
  isSecondary
    ? { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }
    : {
        backgroundColor: colors.filterAccent,
        opacity: pressed ? 0.85 : 1,
        // Task 1.b — accent-tied low-spread shadow, primary branch ONLY
        shadowColor: colors.filterAccent,
        shadowOpacity: 0.28,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 4,
      },
]}
// label: <Text style={[styles.label, isSecondary && { color: colors.text }]}>
```

Then MOVE the shadow props OUT of the shared `styles.button` so `secondary` is genuinely flat (no shadow, no elevation). Remaining shared `button` styles: `{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }`. The shared `styles.label` keeps `color: '#fff', fontWeight: '700', fontSize: 17` — secondary overrides label color inline to `colors.text` as shown above.

Keep `accessibilityRole="button"`, `accessibilityLabel={label}`, `hitSlop`, and the pluralization label logic exactly as today. Add a brief inline comment near `isSecondary` referencing D-14 (always-enabled for both variants) so the contract isn't accidentally violated in future edits.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -q "variant?: 'primary' | 'secondary'" src/components/filters/primitives/ShowButton.tsx &amp;&amp; grep -v '^[[:space:]]*[/*]' src/components/filters/primitives/ShowButton.tsx | grep -qE "shadowColor:\s*'#000'" &amp;&amp; echo "FAIL: '#000' shadow still present in code" &amp;&amp; exit 1 || true &amp;&amp; grep -q "colors.filterAccent" src/components/filters/primitives/ShowButton.tsx &amp;&amp; grep -q "colors.surface2" src/components/filters/primitives/ShowButton.tsx &amp;&amp; ! grep -qE "disabled[:=]" src/components/filters/primitives/ShowButton.tsx &amp;&amp; ! grep -q "accessibilityState" src/components/filters/primitives/ShowButton.tsx</automated>
  </verify>
  <done>
- `ShowButtonProps` exports the new optional `variant` prop with default `'primary'`.
- Secondary branch renders `backgroundColor: colors.surface2`, `borderWidth: 1`, `borderColor: colors.border`, NO shadow/elevation, label color `colors.text`.
- Primary branch renders `backgroundColor: colors.filterAccent` AND the accent-tied shadow (`shadowColor: colors.filterAccent`, opacity 0.28, offset `{0,6}`, radius 14, elevation 4). The old `#000 / 0.4 / r26 / y12` shadow is gone from the file.
- D-14 holds for both variants (no `disabled`, no `accessibilityState.disabled`, no `opacity-disabled` state).
- Height stays `54`. `accessibilityRole="button"` and `accessibilityLabel={label}` unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: GuidedFilterSheet — stop auto-advance + dual-action footer</name>
  <files>src/components/filters/GuidedFilterSheet.tsx</files>
  <action>
Three coordinated edits in `GuidedFilterSheet.tsx`. Do all three in one pass — they are interlocked.

(a) **Add `ChevronRight` to the lucide-react-native import** (lines 30–36). Insert it into the existing block:

```tsx
import {
  X,
  Building,
  Briefcase,
  Hotel as HotelIcon,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
```

No new package — `lucide-react-native` is already imported. Do NOT add a separate import statement.

(b) **Remove auto-advance from Deal and Category cards.** In `renderDealCard` (`onPress` at lines 185–188), drop `setStep(1)` and keep `setTransactionType(value)` only:

```tsx
onPress={() => {
  setTransactionType(value);
}}
```

In `renderCategoryCard` (`onPress` at lines 234–241), drop `setStep(2)` but KEEP THE LOAD-BEARING COMMENT and KEEP `setSelectedCategory(cat)` BEFORE `setTypes([])` (RESEARCH.md Pitfall 4 — re-picking category must clear types in this order, otherwise Apartment leaks into Commercial):

```tsx
onPress={() => {
  // LOAD-BEARING (RESEARCH.md Pitfall 4): setSelectedCategory MUST fire
  // before setTypes([]). Re-picking category clears multi-select;
  // otherwise Apartment leaks into Commercial.
  setSelectedCategory(cat);
  setTypes([]);
}}
```

Type cards (step 2) are unchanged — multi-select toggle behavior stays exactly as today.

(c) **Replace the footer body** (lines 442–457 — the children of `<View style={[styles.footer, { borderTopColor: colors.border }]}>`). Keep the outer `<View style={[styles.footer, { borderTopColor: colors.border }]}>` wrapper and the `breadcrumbWrap` block; swap the single `<ShowButton>` for a step-dependent block. Verbatim from the handoff:

```tsx
<View style={[styles.footer, { borderTopColor: colors.border }]}>
  <View style={styles.breadcrumbWrap}>
    <Breadcrumb
      deal={transactionType === 'rent' ? 'Rent' : 'Buy'}
      category={selectedCategory}
      types={types}
    />
  </View>

  {step === 2 ? (
    <ShowButton count={liveCount} onPress={onClose} />
  ) : (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={({ pressed }) => [
          styles.continueBtn,
          { backgroundColor: colors.filterAccent, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.continueLabel}>
          {t(step === 0 ? 'filters.continue.addCategory' : 'filters.continue.addType')}
        </Text>
        <ChevronRight size={19} color="#fff" strokeWidth={2} />
      </Pressable>

      <ShowButton count={liveCount} onPress={onClose} variant="secondary" />
    </View>
  )}
</View>
```

Continue is **always enabled** because `transactionType` defaults to `'rent'` and `selectedCategory` defaults to `'Residential'`, so a valid selection always exists at any step (matches D-04 live selections). No disabled state needed.

(d) **Add two styles** to the existing `StyleSheet.create({ … })` block (around lines 565–573, alongside `footer` and `breadcrumbWrap`). `colors` is not in scope inside `StyleSheet.create`, so accent values are applied inline above (already done in the JSX). The sheet only carries static layout/shadow props:

```ts
continueBtn: {
  height: 56,
  borderRadius: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  // Accent-tied low-spread shadow matches the softened ShowButton primary.
  // shadowColor + backgroundColor are applied inline (colors not available here).
  shadowOpacity: 0.28,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 14,
  elevation: 4,
},
continueLabel: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 17,
},
```

Note the inline JSX above also adds `shadowColor: colors.filterAccent` via `colors` — re-confirm the inline style includes `shadowColor: colors.filterAccent` alongside `backgroundColor: colors.filterAccent` (merge into the inline object so the shadow tints the accent, not the default black):

```tsx
style={({ pressed }) => [
  styles.continueBtn,
  {
    backgroundColor: colors.filterAccent,
    shadowColor: colors.filterAccent,
    opacity: pressed ? 0.85 : 1,
  },
]}
```

Do NOT touch: `Stepper`, `reached()`, `onStepPress`, `localOpen`, `Animated.parallel`, `animationType="none"`, the scrim, the X button, the ScrollView, or any card other than removing the two `setStep` calls.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -q "ChevronRight," src/components/filters/GuidedFilterSheet.tsx &amp;&amp; ! grep -nE "setStep\(1\)" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; ! grep -nE "setStep\(2\)" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; grep -q "variant=\"secondary\"" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; grep -q "filters.continue.addCategory" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; grep -q "filters.continue.addType" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; grep -q "continueBtn:" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; grep -q "continueLabel:" src/components/filters/GuidedFilterSheet.tsx &amp;&amp; awk '/setSelectedCategory\(cat\)/{cat=NR} /setTypes\(\[\]\)/{ty=NR} END{exit (cat&amp;&amp;ty&amp;&amp;cat&lt;ty)?0:1}' src/components/filters/GuidedFilterSheet.tsx</automated>
  </verify>
  <done>
- `ChevronRight` is imported from the existing `lucide-react-native` block (no new import statement).
- `renderDealCard` `onPress` no longer calls `setStep(1)` (only `setTransactionType(value)`).
- `renderCategoryCard` `onPress` no longer calls `setStep(2)`. `setSelectedCategory(cat)` STILL precedes `setTypes([])` (Pitfall 4 ordering preserved — comment retained).
- Footer renders: breadcrumb + (step===2 ? primary `<ShowButton>` : `<Pressable>` Continue with `ChevronRight` + secondary `<ShowButton>`).
- Continue's `onPress` calls `setStep((s) => (s + 1) as 0 | 1 | 2)`; copy is driven by `t('filters.continue.addCategory'|'.addType')`.
- Continue uses inline `backgroundColor: colors.filterAccent` AND `shadowColor: colors.filterAccent` (no `#000` shadow on the footer's Continue button).
- `continueBtn` + `continueLabel` added to `StyleSheet.create({ … })` with the static props from the handoff (height 56, radius 16, gap 9, shadow opacity/offset/radius/elevation).
- Stepper pills, `reached()`, `onStepPress`, `localOpen`, `Animated.parallel`, `animationType="none"`, scrim, X button, ScrollView, and type-card multi-select are all untouched.
- TypeScript compiles (`npx tsc --noEmit`).
  </done>
</task>

<task type="auto">
  <name>Task 3: i18n keys (EN+RU parity) + tests update</name>
  <files>
src/locales/en.ts,
src/locales/ru.ts,
src/components/filters/primitives/__tests__/ShowButton.test.tsx,
src/components/filters/__tests__/GuidedFilterSheet.test.tsx
  </files>
  <action>
(a) **Add the two new i18n keys.** Insert into `src/locales/en.ts` adjacent to the existing `filters.showHomes.*` block (immediately after line 955):

```ts
'filters.continue.addCategory': 'Continue · Add a category',
'filters.continue.addType': 'Continue · Add a type',
```

Insert into `src/locales/ru.ts` at the matching position (immediately after line 945):

```ts
'filters.continue.addCategory': 'Далее · Категория',
'filters.continue.addType': 'Далее · Тип',
```

Use the middle-dot character `·` (U+00B7) exactly as shown — not a regular `.` or hyphen. `TranslationKeys = keyof typeof en` auto-extends from `en.ts`; `ru.ts` is `Record<TranslationKeys, string>` so the EN+RU parity is compile-time enforced. Do not add anything to the `TranslationKeys` declaration manually.

(b) **Update `src/components/filters/primitives/__tests__/ShowButton.test.tsx`.** Add cases for the new `secondary` variant. Match the file's existing pattern (react-test-renderer + `act`, `useTheme`/`useLanguage` jest.mock). Note: extend the `useTheme.mockReturnValue` for the new cases to provide `colors.filterAccent`, `colors.surface2`, `colors.border`, `colors.text` since the component reads those.

Required new assertions (at minimum):
1. `variant="secondary"` Pressable's flattened style has `backgroundColor === colors.surface2`, `borderWidth === 1`, `borderColor === colors.border`, AND no `shadowColor`/`elevation` (or those resolve to `undefined`).
2. `variant="secondary"` label style flattens to `color === colors.text` (not `'#fff'`).
3. `variant="secondary"` stays D-14 always-enabled at count=0 (no `disabled` prop, no `accessibilityState.disabled` in props).
4. `variant="primary"` (default) keeps the accent shadow chain: flattened style has `shadowColor === colors.filterAccent`, `shadowOpacity === 0.28`, `shadowOffset` `{ width: 0, height: 6 }`, `shadowRadius === 14`, `elevation === 4` — and label color stays `'#fff'`.

Resolve the Pressable's style by calling it with `{ pressed: false }` when it's a function (it is here).

(c) **Update `src/components/filters/__tests__/GuidedFilterSheet.test.tsx`.** Update footer assertions to match the new contract:

1. **Step 0 (Deal):** Footer renders both a Continue Pressable whose visible text resolves to `'filters.continue.addCategory'` (when t is identity-mocked) AND a `<ShowButton>` instance with `variant === 'secondary'`. There is NOT a primary `<ShowButton>` at step 0.
2. **Step 1 (Category):** Same shape as step 0 but Continue text resolves to `'filters.continue.addType'`.
3. **Step 2 (Type):** Footer renders exactly ONE `<ShowButton>` and its `variant` is undefined (defaults to primary). No Continue Pressable.
4. **Auto-advance removed (Deal):** Simulate firing a deal card's `onPress` from step 0 and assert `step` does NOT change (stays 0). Then simulate the Continue `onPress` and assert `step` becomes 1.
5. **Auto-advance removed (Category):** From step 1, fire a category card's `onPress` and assert `step` stays 1; also assert `selectedCategory` updated AND `types` was cleared (Pitfall 4). Then fire Continue and assert `step` becomes 2.
6. **Stepper still jumps** (regression guard): tapping a reached pill still calls `setStep` directly — existing assertion should already cover this; keep it.

Match the file's existing test style (react-test-renderer per Modal-probe outcome). If the file has step-driving helpers, reuse them; if not, drive `setStep` via the Stepper pills or via the new Continue button as appropriate.

(d) **Run the parity check** (verify step below covers it).
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -q "'filters.continue.addCategory': 'Continue · Add a category'" src/locales/en.ts &amp;&amp; grep -q "'filters.continue.addType': 'Continue · Add a type'" src/locales/en.ts &amp;&amp; grep -q "'filters.continue.addCategory': 'Далее · Категория'" src/locales/ru.ts &amp;&amp; grep -q "'filters.continue.addType': 'Далее · Тип'" src/locales/ru.ts &amp;&amp; bash scripts/check-i18n-parity.sh &amp;&amp; npx tsc --noEmit &amp;&amp; npx jest src/components/filters/primitives/__tests__/ShowButton.test.tsx src/components/filters/__tests__/GuidedFilterSheet.test.tsx --runInBand</automated>
  </verify>
  <done>
- Both new keys present in `en.ts` AND `ru.ts` at parity (middle-dot character used).
- `scripts/check-i18n-parity.sh` exits 0.
- `npx tsc --noEmit` exits 0 (TranslationKeys auto-extends).
- `ShowButton.test.tsx` has new green tests for: secondary surface/border/no-shadow, secondary label color = `colors.text`, secondary D-14 always-enabled at count=0, primary keeps the accent shadow chain + `#fff` label.
- `GuidedFilterSheet.test.tsx` has green tests for: step 0 renders Continue+secondary Show, step 1 renders Continue (addType)+secondary Show, step 2 renders single primary Show; deal/category card taps do NOT change `step`; Continue tap DOES change `step`; `setSelectedCategory` runs before `setTypes([])` (Pitfall 4 still asserted).
- All assertions in both test files pass under `npx jest --runInBand`.
  </done>
</task>

</tasks>

<verification>
After all three tasks land, verify the phase as a whole from the repo root:

```sh
# Static contracts
grep -c "ChevronRight," src/components/filters/GuidedFilterSheet.tsx   # >= 1
grep -c "variant?: 'primary' | 'secondary'" src/components/filters/primitives/ShowButton.tsx  # == 1
grep -cE "setStep\((1|2)\)" src/components/filters/GuidedFilterSheet.tsx  # == 0 (card auto-advance removed)
grep -c "filters.continue.addCategory" src/locales/en.ts  # == 1
grep -c "filters.continue.addCategory" src/locales/ru.ts  # == 1

# D-14 invariant — neither variant of ShowButton is ever disabled
grep -cE "disabled[:=]|accessibilityState" src/components/filters/primitives/ShowButton.tsx  # == 0

# Pitfall 4 ordering preserved
awk '/setSelectedCategory\(cat\)/{cat=NR} /setTypes\(\[\]\)/{ty=NR} END{exit (cat && ty && cat < ty)?0:1}' src/components/filters/GuidedFilterSheet.tsx

# i18n parity + types + tests
bash scripts/check-i18n-parity.sh
npx tsc --noEmit
npx jest src/components/filters --runInBand
```

Manual on-device QA matrix from the handoff (iPhone + Android × light/dark × EN/RU) — execute after the automated suite is green:

1. Open Home with `filterStyle = guided`. Step 0 (Deal): footer shows **Continue · Add a category** (primary, soft accent shadow — no reddish glow) + **Show N homes** (secondary, raised surface, no shadow).
2. Tap **Rent** → card selects (check + accent), DOES NOT jump to Category. Show count updates live.
3. Tap **Continue** → advances to Category; Deal pill turns green.
4. Pick **Residential** → tap **Show N homes** → sheet closes; results reflect Rent + Residential. (The whole point.)
5. Re-open, advance to Step 2 (Type): footer is a single full-width primary **Show N homes**; multi-select still toggles.
6. Stepper pills still jump between reached steps; X and scrim still close the sheet.
7. Switch to `cascading` style → unchanged.
8. RU locale renders `Далее · Категория` / `Далее · Тип` correctly (no missing-key fallback).
</verification>

<success_criteria>
- Users on `filterStyle = guided` can press **Show N homes** at Deal or Category and the sheet closes with the partial selection applied (D-04 live selections still applying).
- Continue advances `step` one at a time and only the user controls progression — Deal/Category cards no longer auto-advance.
- ShowButton secondary variant reads as a raised tappable surface (no shadow), distinct from the primary accent CTA.
- Primary accent shadow no longer bleeds a reddish/dark halo — it tints with `colors.filterAccent` at low opacity.
- EN+RU parity holds; `scripts/check-i18n-parity.sh` and `npx tsc --noEmit` both green.
- Test suites for ShowButton and GuidedFilterSheet are green and assert the new contract.
- No surface outside the five files in `files_modified` is changed. No new deps. CascadingFilter untouched.
- All invariants in `<objective>` (D-04, D-14, Pitfall 4, Stepper untouched, `localOpen`/`Animated.parallel`/`animationType="none"`) hold.
</success_criteria>

<output>
After completion, create `.planning/quick/260601-dqh-guided-sheet-let-people-stop-at-any-step/260601-dqh-01-SUMMARY.md` capturing:
- Files modified (paths + brief change description)
- Verification results (parity, tsc, jest)
- Any on-device QA findings (iPhone + Android × light/dark × EN/RU)
- Open follow-ups (if any)
</output>

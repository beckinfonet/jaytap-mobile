---
phase: 260601-elb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/filters/GuidedFilterSheet.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/filters/__tests__/GuidedFilterSheet.test.tsx
autonomous: true
requirements: [QUICK-260601-ELB]
---

<objective>
Add a header **Reset** button to `GuidedFilterSheet.tsx` (Task 6 of `GSD-HANDOFF-filter-reset.md`).
Tasks 1–5 of that handoff already shipped in quick task 260601-dqh (merged commit `3a2b0c4`,
see `.planning/quick/260601-dqh-guided-sheet-let-people-stop-at-any-step/260601-dqh-SUMMARY.md`)
and are EXPLICITLY OUT OF SCOPE here — do not re-list, re-touch, or re-test them.

What ships:
- A quiet text Pressable in the sheet's header row, left of the existing X close
  Pressable, reading `Reset` / `Сбросить`.
- `isFilterDefault` predicate gating its disabled+dimmed state.
- `handleReset()` returning the sheet to the broadest default
  (`Rent · Residential · []`, step 0).
- One new i18n key `filters.reset` in EN+RU (parity-gated).
- One new jest test in `GuidedFilterSheet.test.tsx`.

Purpose: closes the "no way back to neutral" gap — the X just dismisses with selections
intact, so the sheet currently has no mechanism to return to the broadest state.

Output:
- 1 component diff (`GuidedFilterSheet.tsx` header restructure + handler + predicate).
- 2 locale diffs (1 new key each side).
- 1 test diff (1 new `it()` covering default-disabled + active-enable + press order).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./GSD-HANDOFF-filter-reset.md
@.planning/quick/260601-dqh-guided-sheet-let-people-stop-at-any-step/260601-dqh-SUMMARY.md
@src/components/filters/GuidedFilterSheet.tsx
@src/components/filters/__tests__/GuidedFilterSheet.test.tsx
@src/locales/en.ts
@src/locales/ru.ts
</context>

<scope_lock>
**IN SCOPE (Task 6 only):**
- `src/components/filters/GuidedFilterSheet.tsx` — header row restructure + new
  `isFilterDefault` const + new `handleReset` handler.
- `src/locales/en.ts` + `src/locales/ru.ts` — ONE new key `filters.reset` each.
- `src/components/filters/__tests__/GuidedFilterSheet.test.tsx` — ONE new
  `it()` test.

**EXPLICITLY OUT OF SCOPE (already shipped in 260601-dqh):**
- ShowButton variant prop / shadow / `primitives/ShowButton.tsx` — DO NOT TOUCH.
- Dual-action footer / Continue button / no-auto-advance card behavior — DO NOT TOUCH.
- `filters.continue.addCategory` / `filters.continue.addType` keys — already exist; DO NOT re-add.
- CascadingFilter / HomeScreen / Account Settings / any M5/M6 phase code — DO NOT TOUCH.
- `primitives/__tests__/ShowButton.test.tsx` — DO NOT TOUCH (no ShowButton change).
</scope_lock>

<invariants>
Regression budget = 0. All must hold post-change:

1. **Pitfall 4 ordering** — in `handleReset`, `setSelectedCategory('Residential')`
   MUST be invoked BEFORE `setTypes([])`. (Already enforced verbatim in
   `renderCategoryCard.onPress`; the same ordering rule applies here per the
   handoff's Task 6 inline comment `// set BEFORE clearing types (Pitfall 4)`.)
   The order in the function body must read:
   ```
   setTransactionType('rent');
   setSelectedCategory('Residential'); // set BEFORE clearing types (Pitfall 4)
   setTypes([]);
   setStep(0);
   ```
2. **Reset disabled at default** — `isFilterDefault` is the gate; the Pressable
   MUST set BOTH `disabled={isFilterDefault}` AND
   `accessibilityState={{ disabled: isFilterDefault }}` so screen readers and
   touch handlers stay in sync.
3. **Reset returns to step 0** — `setStep(0)` is the final call so the guided
   flow genuinely restarts (don't leave the user on the Type step).
4. **D-04 live selections** — Reset is NOT an apply. The sheet stays open after
   reset; the X (or scrim) is still the close path. Do NOT call `onClose()`
   from `handleReset`.
5. **D-14 ShowButton always-enabled** — untouched. Reset's disabled state lives
   on the new header Pressable, NOT on ShowButton.
6. **No new deps** — uses `colors.filterAccent`, `colors.textTertiary` (both
   already in scope from `useTheme()`).
7. **i18n parity** — `filters.reset` MUST land in BOTH `en.ts` AND `ru.ts`;
   `scripts/check-i18n-parity.sh` MUST pass.
8. **KBD-02 grep gate** — `keyboardVerticalOffset` count in `src/` MUST remain 0.
9. **Only the 4 files in `files_modified` are touched** — verify with
   `git diff --name-only`.
</invariants>

<header_anatomy>
The current header (post-260601-dqh, lines 357–386 of `GuidedFilterSheet.tsx`) is:

```
<View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
  <Text style={[styles.headerTitle, { color: colors.text, fontFamily: ... }]}>
    {t('filters.title')}
  </Text>
  <Pressable                                {/* the existing close (X) button */}
    accessibilityRole="button"
    accessibilityLabel={t('filters.close')}
    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    onPress={onClose}
    style={styles.closeButton}
  >
    <X size={22} color={colors.text} strokeWidth={1.75} />
  </Pressable>
</View>
```

`styles.headerRow` already uses `justifyContent: 'space-between'` (line 515),
which places `[Title] [X]` at opposite ends. To get `Filters … [Reset] [X]`,
wrap the new Reset Pressable AND the existing X Pressable in a single
right-aligned `View` so `space-between` still pushes the title to the left and
the actions to the right — same column count for the parent, just two
right-side children grouped.

The new actions wrapper:
```
<View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
  {/* new Reset Pressable here (LEFT of the X) */}
  {/* existing X Pressable here (RIGHT) */}
</View>
```
</header_anatomy>

<verbatim_jsx_snippet>
The exact shape to drop into the component (copied verbatim from the handoff
Task 6 brief). The executor MUST follow this — no improvisation on prop names
or color tokens.

```tsx
// Derive once per render, alongside `chipTypes`/`reached` — before the return().
const isFilterDefault =
  transactionType === 'rent' && selectedCategory === 'Residential' && types.length === 0;

const handleReset = () => {
  setTransactionType('rent');
  setSelectedCategory('Residential'); // set BEFORE clearing types (Pitfall 4)
  setTypes([]);
  setStep(0);
};
```

```tsx
{/* Header row: title + actions ([Reset] [X]). */}
<View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
  <Text
    style={[
      styles.headerTitle,
      {
        color: colors.text,
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
      },
    ]}
  >
    {t('filters.title')}
  </Text>
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('filters.reset')}
      accessibilityState={{ disabled: isFilterDefault }}
      disabled={isFilterDefault}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      onPress={handleReset}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: isFilterDefault ? colors.textTertiary : colors.filterAccent,
          opacity: isFilterDefault ? 0.5 : 1,
        }}
      >
        {t('filters.reset')}
      </Text>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('filters.close')}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      onPress={onClose}
      style={styles.closeButton}
    >
      <X size={22} color={colors.text} strokeWidth={1.75} />
    </Pressable>
  </View>
</View>
```

The existing `styles.closeButton`, `styles.headerRow`, `styles.headerTitle`,
imports, and the X `lucide-react-native` icon are reused as-is.
</verbatim_jsx_snippet>

<tasks>

<task type="auto">
  <name>Task 1: Add header Reset button + i18n key + jest test (single commit)</name>

  <files>
    src/components/filters/GuidedFilterSheet.tsx
    src/locales/en.ts
    src/locales/ru.ts
    src/components/filters/__tests__/GuidedFilterSheet.test.tsx
  </files>

  <action>
**Step A — `src/locales/en.ts`:**
Add the new key alongside the other `filters.*` entries (near the existing
`filters.continue.addCategory` / `.addType` lines ~958–959):
```
'filters.reset': 'Reset',
```
Place it logically near `filters.close` (~line 953) or directly after the
Continue keys; either location is fine as long as it sits inside the same
filters block.

**Step B — `src/locales/ru.ts`:**
Add the parity entry alongside the other `filters.*` entries (near
`filters.continue.addCategory` / `.addType` ~lines 948–949):
```
'filters.reset': 'Сбросить',
```

**Step C — `src/components/filters/GuidedFilterSheet.tsx`:**
Within the `GuidedFilterSheet` component body, BEFORE `return (`, alongside
the existing `chipTypes` / `reached` derivations, add the predicate and the
handler exactly as shown in `<verbatim_jsx_snippet>` above:

```tsx
const isFilterDefault =
  transactionType === 'rent' && selectedCategory === 'Residential' && types.length === 0;

const handleReset = () => {
  setTransactionType('rent');
  setSelectedCategory('Residential'); // set BEFORE clearing types (Pitfall 4)
  setTypes([]);
  setStep(0);
};
```

Then restructure the header row (currently lines 357–386 — `<View style={[styles.headerRow ...]}>`)
to match `<verbatim_jsx_snippet>`: wrap the new Reset Pressable + the existing X
Pressable in a single right-aligned `<View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>`.
The title Text stays as the first child of `styles.headerRow`; the actions wrapper
becomes the second child. `styles.headerRow.justifyContent: 'space-between'`
(already in the StyleSheet) preserves the `Filters … [actions]` left/right layout.

Do NOT modify the X Pressable's existing props (`accessibilityLabel={t('filters.close')}`,
`hitSlop`, `onPress={onClose}`, `style={styles.closeButton}`, `<X size={22} ... />`).
Just move it into the new actions wrapper as the SECOND child after the new Reset
Pressable.

Do NOT add any new entries to the StyleSheet — the inline-style approach in the
verbatim snippet is intentional (matches the handoff and keeps `colors.*` in
scope, since `colors` is not available inside `StyleSheet.create`).

**Step D — `src/components/filters/__tests__/GuidedFilterSheet.test.tsx`:**

(D.1) Defensive mock-color addition. The new code reads `colors.filterAccent`
(used for the active label color). The existing test's `useTheme.mockReturnValue`
at lines 121–138 declares `accent` / `accentSoft` / `accentLine` but NOT
`filterAccent` / `filterAccentSoft` / `filterAccentLine`. Add these three keys
to the mock colors object so the component doesn't read `undefined` during the
render (cosmetic only — no test asserts the value, but undefined-in-style can
flake under future RN versions). Insert near the existing accent lines (~131–133):
```ts
filterAccent: '#6f7bff',
filterAccentSoft: 'rgba(111,123,255,0.16)',
filterAccentLine: 'rgba(111,123,255,0.45)',
```
This is a one-time mock-context patch and does not constitute "touching the
260601-dqh surface" — the test file is in scope for this plan per its
files_modified entry.

(D.2) Add ONE new `it()` test inside the `describe('GuidedFilterSheet', ...)`
block. Place it AFTER the existing
`'ShowButton press fires onClose'` test (~line 330) and BEFORE the
`// ---------- Quick 260601-dqh — dual-action footer (Guide-first) ----------`
marker comment (~line 332). The new test must:

```tsx
// Quick 260601-elb — Header Reset (Task 6). At the default state
// (Rent · Residential · []) Reset is disabled. After mutating any of those
// three slots, Reset becomes enabled. Pressing Reset invokes the four setters
// in Pitfall-4-preserving order: setSelectedCategory BEFORE setTypes.
it('Header Reset: disabled at default, enabled after change, press order honors Pitfall 4', () => {
  // (a) Default state — Reset is disabled.
  const settersA = mkSetters();
  const { tree: treeDefault } = render({
    open: true,
    transactionType: 'rent',
    selectedCategory: 'Residential',
    types: [],
    setters: settersA,
  });
  const resetDefault = findPressableByText(treeDefault, 'filters.reset');
  expect(resetDefault).toBeDefined();
  expect(resetDefault!.props.disabled).toBe(true);
  expect(resetDefault!.props.accessibilityState).toEqual({ disabled: true });

  // (b) Non-default state — Reset is enabled (types non-empty trips isFilterDefault).
  const settersB = mkSetters();
  const { tree: treeActive } = render({
    open: true,
    transactionType: 'rent',
    selectedCategory: 'Residential',
    types: ['Apartment'],
    setters: settersB,
  });
  const resetActive = findPressableByText(treeActive, 'filters.reset');
  expect(resetActive).toBeDefined();
  expect(resetActive!.props.disabled).toBe(false);
  expect(resetActive!.props.accessibilityState).toEqual({ disabled: false });

  // (c) Pressing Reset invokes the four setters; setSelectedCategory BEFORE setTypes (Pitfall 4).
  act(() => {
    resetActive!.props.onPress();
  });
  expect(settersB.setTransactionType).toHaveBeenCalledWith('rent');
  expect(settersB.setSelectedCategory).toHaveBeenCalledWith('Residential');
  expect(settersB.setTypes).toHaveBeenCalledWith([]);
  // Pitfall 4 order — setSelectedCategory before setTypes (invocationCallOrder pattern,
  // same as the existing 'Pitfall 4 order preserved' test in this file).
  const catOrder = settersB.setSelectedCategory.mock.invocationCallOrder[0];
  const typesOrder = settersB.setTypes.mock.invocationCallOrder[0];
  expect(catOrder).toBeLessThan(typesOrder);
});
```

Note: `setStep(0)` is internal state — not a prop setter — so it is NOT asserted
directly (consistent with the existing test-file idiom of asserting step via
observable DOM probes rather than mocking `setStep`).
  </action>

  <verify>
    <automated>
# 1. i18n parity gate
bash scripts/check-i18n-parity.sh

# 2. New key lands in BOTH locales exactly once each
[ "$(grep -c "'filters.reset':" src/locales/en.ts)" = "1" ] || { echo "FAIL: en filters.reset count"; exit 1; }
[ "$(grep -c "'filters.reset':" src/locales/ru.ts)" = "1" ] || { echo "FAIL: ru filters.reset count"; exit 1; }
grep -q "'filters.reset': 'Reset'" src/locales/en.ts || { echo "FAIL: en value"; exit 1; }
grep -q "'filters.reset': 'Сбросить'" src/locales/ru.ts || { echo "FAIL: ru value"; exit 1; }

# 3. Pitfall 4 order inside handleReset — setSelectedCategory line MUST come before setTypes line.
#    Strip comment lines first (avoid self-invalidation from the inline 'BEFORE clearing types' comment).
awk '
  /const handleReset = \(\) => \{/ { inFn=1; lineNo=0; next }
  inFn && /^\s*\};/ { inFn=0; next }
  inFn {
    lineNo++
    # skip pure comment lines
    if ($0 ~ /^[[:space:]]*\/\//) next
    if ($0 ~ /setSelectedCategory/) cat=lineNo
    if ($0 ~ /setTypes/)            ty=lineNo
  }
  END {
    if (!cat || !ty) { print "FAIL: handleReset missing setSelectedCategory or setTypes"; exit 1 }
    if (cat >= ty)   { print "FAIL: setSelectedCategory must precede setTypes in handleReset (Pitfall 4)"; exit 1 }
    print "OK: handleReset Pitfall 4 order (setSelectedCategory line " cat ", setTypes line " ty ")"
  }
' src/components/filters/GuidedFilterSheet.tsx

# 4. handleReset ends with setStep(0) — returns flow to step 0.
grep -q "setStep(0);" src/components/filters/GuidedFilterSheet.tsx || { echo "FAIL: setStep(0) missing"; exit 1; }

# 5. Reset Pressable wires accessibilityState.disabled to isFilterDefault.
grep -q "accessibilityState={{ disabled: isFilterDefault }}" src/components/filters/GuidedFilterSheet.tsx \
  || { echo "FAIL: accessibilityState disabled not wired to isFilterDefault"; exit 1; }

# 6. Reset Pressable also sets disabled prop (touch + a11y in sync).
grep -q "disabled={isFilterDefault}" src/components/filters/GuidedFilterSheet.tsx \
  || { echo "FAIL: disabled prop not wired to isFilterDefault"; exit 1; }

# 7. isFilterDefault predicate exists with the three-slot conjunction.
grep -q "isFilterDefault" src/components/filters/GuidedFilterSheet.tsx || { echo "FAIL: isFilterDefault missing"; exit 1; }
grep -q "transactionType === 'rent'" src/components/filters/GuidedFilterSheet.tsx \
  || { echo "FAIL: isFilterDefault rent check missing"; exit 1; }
grep -q "selectedCategory === 'Residential'" src/components/filters/GuidedFilterSheet.tsx \
  || { echo "FAIL: isFilterDefault Residential check missing"; exit 1; }
grep -q "types.length === 0" src/components/filters/GuidedFilterSheet.tsx \
  || { echo "FAIL: isFilterDefault types.length check missing"; exit 1; }

# 8. KBD-02 grep gate must remain 0 across src/.
[ "$(grep -r --include='*.ts' --include='*.tsx' -c 'keyboardVerticalOffset' src/ | awk -F: '{sum+=$2} END{print sum+0}')" = "0" ] \
  || { echo "FAIL: KBD-02 grep gate broken"; exit 1; }

# 9. Component still compiles + the test file passes.
npx tsc --noEmit src/components/filters/GuidedFilterSheet.tsx 2>&1 | grep -v "^$" | grep -v "GuidedFilterSheet.tsx" && echo "WARN: unrelated tsc noise in scope file (review)" || true
npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx --runInBand
    </automated>
  </verify>

  <done>
- `filters.reset` present in BOTH `en.ts` (`Reset`) and `ru.ts` (`Сбросить`), parity script PASS.
- `GuidedFilterSheet.tsx` renders the Reset Pressable LEFT of the X inside a
  right-aligned actions wrapper; `isFilterDefault` predicate and `handleReset`
  handler exist at the component-body scope.
- `handleReset` body order: `setTransactionType` → `setSelectedCategory` →
  `setTypes` → `setStep(0)` (Pitfall 4 holds).
- Reset Pressable has BOTH `disabled={isFilterDefault}` and
  `accessibilityState={{ disabled: isFilterDefault }}` wired.
- New jest test passes — Reset disabled at default, enabled with
  `types=['Apartment']`, press invokes the three prop setters with
  `setSelectedCategory.invocationCallOrder < setTypes.invocationCallOrder`.
- All existing tests in `GuidedFilterSheet.test.tsx` still pass (regression budget = 0).
- `git diff --name-only` shows exactly the 4 files in `files_modified` — no others.
  </done>
</task>

</tasks>

<verification>
Phase-level (already covered by Task 1's `<verify>`; restated for the orchestrator):

| Check | How |
|---|---|
| i18n parity | `bash scripts/check-i18n-parity.sh` PASS |
| Pitfall 4 in `handleReset` | awk gauntlet: `setSelectedCategory` line < `setTypes` line, comments stripped |
| Reset disabled state wired | grep `accessibilityState={{ disabled: isFilterDefault }}` AND `disabled={isFilterDefault}` |
| Reset returns to step 0 | grep `setStep(0);` inside the new handler |
| KBD-02 still 0 | recursive grep `keyboardVerticalOffset` in `src/` = 0 |
| Jest green | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx --runInBand` |
| Scope respect | `git diff --name-only` = exactly the 4 files |
</verification>

<success_criteria>
- User can open the Guided filter sheet and see a Reset button left of the X in the header.
- At default state (`Rent · Residential · []`) Reset is visibly dimmed and non-interactive.
- Changing the deal, category, or type makes Reset turn accent (`colors.filterAccent`).
- Tapping Reset returns the sheet to step 0 with `Rent · Residential · []` and the
  Show count back to its broadest value — sheet stays OPEN (D-04, not an apply).
- Both EN (`Reset`) and RU (`Сбросить`) render correctly; i18n parity script PASS.
- All `GuidedFilterSheet` jest cases still pass; the one new case passes.
- No regression in invariants 1–9 above.
</success_criteria>

<on_device_qa>
Quick manual smoke (iPhone + Android × light/dark × EN/RU) — non-blocking, run
after merge:
1. Open Home with `filterStyle = guided`. Header reads `Filters … [Reset] [X]`. Reset is dimmed (textTertiary, opacity 0.5).
2. Switch deal to **Buy** → Reset turns accent (periwinkle `colors.filterAccent`).
3. Advance to Category → pick **Commercial** → Reset still accent.
4. Advance to Type → multi-select one chip → Reset still accent.
5. Tap Reset → sheet returns to step 0 with Rent · Residential · []; sheet stays open; Reset back to dimmed.
6. RU sanity: `Сбросить` renders without truncation in both light and dark mode.
</on_device_qa>

<output>
After completion, create
`.planning/quick/260601-elb-guided-sheet-header-reset-button-task-6-/260601-elb-SUMMARY.md`
following the standard quick-task summary template (per-task status table, verification table,
invariants audit, deviations, on-device QA checklist).
</output>

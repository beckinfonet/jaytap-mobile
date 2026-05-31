---
phase: 13-shared-filter-data-model-asyncstorage-persistence
reviewed: 2026-05-31T19:04:47Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - App.tsx
  - src/context/FilterStyleContext.tsx
  - src/context/__tests__/FilterStyleContext.test.tsx
  - src/screens/HomeScreen.tsx
  - src/utils/buildFilterQuery.ts
  - src/utils/__tests__/buildFilterQuery.test.ts
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-05-31T19:04:47Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 13 ships the M6 filter-variants foundation: a canonical `buildFilterQuery()` predicate factory (DATA-01 + DATA-02) and a `FilterStyleProvider` that persists the user's variant selection via AsyncStorage (DATA-03). The implementation correctly mirrors the existing `LanguageContext` AsyncStorage pattern referenced by the memory note, the test suites are thorough (corrupt-value fall-through, write-then-read invariant, outside-provider guard, persist-failure swallow), and the HomeScreen wiring keeps the city + freetext search filters out of the canonical shape per the D-06 boundary.

The code is correctness-tight for the documented contract. Two WARNINGs concern (a) a real (if narrow) load-vs-write race in `FilterStyleContext` and (b) `dealType === undefined` slipping into the `rent` bucket inside `buildFilterQuery` — neither test asserts the undefined case. INFO findings call out the foundation-only nature of the change (no consumer reads `useFilterStyle()` yet, so the provider performs a startup AsyncStorage read with no user-visible benefit until Phase 14), absent runtime validation on `setFilterStyle`, and minor test-file hygiene.

No security defects, no secrets, no dangerous APIs, no KBD-02 violations (`keyboardVerticalOffset` grep gate clean in `src/`), no Firebase SDK introduction. App.tsx provider tree is consistent.

## Warnings

### WR-01: Initial `loadFilterStyle()` can overwrite an in-flight user `setFilterStyle()` write on cold start

**File:** `src/context/FilterStyleContext.tsx:18-47`
**Issue:** The mount effect kicks off `loadFilterStyle()` (async `getItem`), but `setFilterStyle` is reachable from any consumer the instant the provider mounts. If a consumer (or a synthetic auto-restore, or a deep-link side effect) calls `setFilterStyle('cascading')` before the mount-time `getItem` resolves, the resolution order can become:

1. User: `setItem('@jaytap_filter_style', 'cascading')` → state = `'cascading'`.
2. Mount effect's `getItem` resolves with the *previous* persisted value (or `null`) — that read was queued before step 1's write.
3. `setFilterStyleState(stored)` overwrites the user's just-applied selection back to the old value (or silently no-ops to `'guided'` for `null`).

AsyncStorage operations on RN serialize per-key, but only after both calls have been *issued*; if `getItem` is in flight when `setItem` lands, the in-memory value the user just chose can flicker back. The result is a hard-to-reproduce "I changed my filter style and it bounced back on app open" bug that only fires when a consumer mutates before mount-load completes.

Today no Phase 13 consumer exercises this (`useFilterStyle()` has no callers in the shipped diff — see IN-01). Phase 14 will, and the test suite does not cover this ordering.

**Fix:** Guard the load against post-mount mutations with a "has the user already chosen?" sentinel, or skip the state-write when the in-memory value already differs from the default:

```tsx
const [filterStyle, setFilterStyleState] = useState<FilterStyle>('guided');
const userChoseRef = useRef(false);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const stored = await AsyncStorage.getItem(FILTER_STYLE_STORAGE_KEY);
      if (cancelled || userChoseRef.current) return;
      if (
        stored === 'guided' ||
        stored === 'cascading' ||
        stored === 'master' ||
        stored === 'sentence'
      ) {
        setFilterStyleState(stored);
      }
    } catch (e) {
      console.error('Failed to load filter-style preference', e);
    }
  })();
  return () => { cancelled = true; };
}, []);

const setFilterStyle = async (s: FilterStyle) => {
  userChoseRef.current = true;
  try {
    await AsyncStorage.setItem(FILTER_STYLE_STORAGE_KEY, s);
    setFilterStyleState(s);
  } catch (e) {
    console.error('Failed to save filter-style preference', e);
  }
};
```

Add a regression test that calls `setFilterStyle('cascading')` while `getItem` is pending (mock `getItem` with a deferred-resolution promise that resolves to `'master'` only after the user write).

---

### WR-02: `buildFilterQuery` puts properties with `dealType === undefined` into the `rent` bucket — unintentional, not tested

**File:** `src/utils/buildFilterQuery.ts:73-76`
**Issue:** The deal clause is:

```ts
const isSale = p.dealType === 'sale';
if (deal === 'sale' && !isSale) return false;
if (deal === 'rent' && isSale) return false;
```

For `p.dealType === undefined` (or any unexpected non-`'sale'` value like a future `'lease'` variant), `isSale` is `false`, so:

- `deal === 'sale'` → rejects (correct — undefined isn't sale).
- `deal === 'rent'` → accepts (probably wrong — undefined isn't rent either).

A listing with corrupted/missing `dealType` therefore appears under the **rent** tab but not the **sale** tab. The JSDoc comment ("M3 collapse: rent_long + rent_daily → rent bucket") suggests the intent was to collapse the two rent dealTypes, not to swallow undefined. The test suite (`buildFilterQuery.test.ts`) does not assert undefined / unknown dealType at all — only `rent_long`, `rent_daily`, `sale` are exercised.

If brownfield data on the Railway backend ever contains a `dealType: null` row, it will silently leak into renter discovery. The category clause does have an explicit unknown→Residential safe-default; the deal clause does not.

**Fix:** Either (a) explicitly reject unknown `dealType` from both buckets, or (b) explicitly document and test the "unknown → rent" choice. Option (a) is safer:

```ts
// 1. Deal clause — preserves M3 rent_long+rent_daily → rent collapse.
// Unknown / undefined / null dealType is rejected from BOTH buckets (defense
// in depth against brownfield corruption; mirrors the pattern in
// propertyTypeToCategory which safe-defaults but at least is explicit).
const isSale = p.dealType === 'sale';
const isRent = p.dealType === 'rent_long' || p.dealType === 'rent_daily';
if (deal === 'sale' && !isSale) return false;
if (deal === 'rent' && !isRent) return false;
```

Add a test case:

```ts
test('rejects property with undefined dealType from both rent and sale buckets', () => {
  const rentP = buildFilterQuery({ deal: 'rent', category: 'Residential', types: [] });
  const saleP = buildFilterQuery({ deal: 'sale', category: 'Residential', types: [] });
  const broken = mkProperty('apartment', undefined as unknown as Property['dealType']);
  expect(rentP(broken)).toBe(false);
  expect(saleP(broken)).toBe(false);
});
```

## Info

### IN-01: `FilterStyleProvider` is mounted but has zero consumers in this changeset

**File:** `App.tsx:1532-1536`, `src/context/FilterStyleContext.tsx`
**Issue:** `useFilterStyle()` is not called anywhere in the reviewed diff. The provider runs an AsyncStorage `getItem` on every app cold start and adds a context layer, but no UI reads the value yet. This is consistent with Phase 13's "foundation-only" framing and Phase 14 will add consumers — flagging here so the next reviewer doesn't mistake it for dead code, and so the team consciously accepts the cold-start I/O cost for one milestone.

**Fix:** No action required for Phase 13. If Phase 14 slips, revisit whether the provider should be removed from `App.tsx` and re-added when the first consumer lands (cheapest-possible startup).

---

### IN-02: `setFilterStyle` has no runtime validation; an unsafe-cast caller can persist an invalid value

**File:** `src/context/FilterStyleContext.tsx:40-47`
**Issue:** `setFilterStyle(s: FilterStyle)` writes `s` straight to AsyncStorage with no whitelist check. TypeScript prevents the obvious mistake at compile time, but any `setFilterStyle('rainbow' as any)` (deep-link handler, dev-only override, future config-driven dispatch) would persist `'rainbow'`. The in-memory state would also be `'rainbow'` until the next reload, at which point `loadFilterStyle`'s allow-list silently resets to `'guided'`.

The cost is two extra equality checks; the value is that the in-memory state can never diverge from the persisted, whitelist-clean value.

**Fix:**

```ts
const VALID: readonly FilterStyle[] = ['guided', 'cascading', 'master', 'sentence'] as const;
const setFilterStyle = async (s: FilterStyle) => {
  if (!VALID.includes(s)) {
    console.error('Invalid filter style', s);
    return;
  }
  try {
    await AsyncStorage.setItem(FILTER_STYLE_STORAGE_KEY, s);
    setFilterStyleState(s);
  } catch (e) {
    console.error('Failed to save filter-style preference', e);
  }
};
```

---

### IN-03: HomeScreen `hospitalityProperties` strip does not consume `buildFilterQuery` — duplicates deal-bucket semantics inline

**File:** `src/screens/HomeScreen.tsx:284-290`
**Issue:** The Hospitality strip (`hospitalityProperties` useMemo) re-implements the deal-bucket rule:

```ts
(transactionType === 'rent' ? p.dealType !== 'sale' : p.dealType === 'sale')
```

It also re-implements category gating via `propertyTypeToCategory(p.propertyType) === 'Hospitality'`. The whole filter is exactly what `buildFilterQuery({ deal: transactionType, category: 'Hospitality', types: [] })` produces. Keeping two parallel deal expressions invites drift the next time the deal taxonomy changes (M5 brought up bedroom/bathroom; if M7 splits `rent_daily` back out as a separate bucket, this strip needs a separate fix).

This was an explicit Phase 13 boundary decision (the strip was not in scope), so this is not a blocker — flagging for the next phase that touches Hospitality rendering.

**Fix:** In the phase that next touches the Hospitality strip, replace the inline filter with:

```ts
const hospitalityProperties = useMemo(() => {
  const predicate = buildFilterQuery({
    deal: transactionType,
    category: 'Hospitality',
    types: [],
  });
  return properties.filter(predicate);
}, [properties, transactionType]);
```

The "deal=rent matches undefined dealType" mismatch (WR-02) lives in both paths today — fixing WR-02 in `buildFilterQuery` plus this consolidation closes the loophole in both.

---

### IN-04: `mkProperty` fixture casts away `Property` shape — useful, but document the trade

**File:** `src/utils/__tests__/buildFilterQuery.test.ts:20-29`
**Issue:** `mkProperty` returns `({ id, propertyType, dealType } as unknown as Property)`. This is fine — the predicate only reads two fields — but the test will silently keep passing if `buildFilterQuery` ever starts reading a third (e.g., `p.status`, `p.location`, `p.owner`). A future change to also reject `status === 'archived'` inside the predicate would not surface until production.

**Fix:** Add a sentinel fixture that fills `status: 'live'` (and any other field the predicate is expected to ignore) so additions to the predicate body become test failures:

```ts
const mkProperty = (
  propertyType: Property['propertyType'] | undefined,
  dealType: Property['dealType'] = 'rent_long',
  id: string = 'p',
): Property => ({
  id,
  propertyType,
  dealType,
  status: 'live',
  // intentionally minimal — additions to the predicate that read new fields
  // should fail here and force the test author to declare what they observe.
} as unknown as Property);
```

Not a blocker.

---

### IN-05: `Probe` test helper mutates module-scoped `ctx` — fine for serial Jest, but brittle if tests ever run in parallel

**File:** `src/context/__tests__/FilterStyleContext.test.tsx:36-46`
**Issue:** `let ctx: ReturnType<typeof useFilterStyle>` is module-scoped and reassigned on every `<Probe />` render. Jest's default `testEnvironment` runs tests within a file serially, so this is safe today. If the file is ever sharded across workers, or a new `describe` block forgets to `unmount` (the file does have an `afterEach` for `lastRenderer`, which is correct — flagging for awareness, not action), `ctx` could leak across tests.

The `afterEach` unmount is a good guard. No fix required for Phase 13; INFO only.

**Fix:** No action required. If parallel test execution is enabled later, wrap each test in a local `let ctx` captured via a render-prop:

```tsx
const renderWithCtx = async () => {
  let captured: ReturnType<typeof useFilterStyle>;
  const Capture = () => { captured = useFilterStyle(); return null; };
  await act(async () => {
    TestRenderer.create(<FilterStyleProvider><Capture /></FilterStyleProvider>);
  });
  return captured!;
};
```

---

_Reviewed: 2026-05-31T19:04:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

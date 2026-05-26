---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
reviewed: 2026-05-26T02:06:53Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/PropertyCard.tsx
  - src/components/HospitalityCard.tsx
  - src/components/ListingMetaTable.tsx
  - src/screens/PropertyDetailsScreen.tsx
  - src/components/__tests__/PropertyCard.test.tsx
  - src/components/__tests__/HospitalityCard.test.tsx
  - src/components/__tests__/ListingMetaTable.test.tsx
  - src/screens/__tests__/PropertyDetailsScreen.test.tsx
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-26T02:06:53Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 8 ships the M4 "Counts & Labels" display-surface refactor cleanly on the production code path: the four render-side invariants in CONTEXT (D-01 cell anatomy, D-02 office/commercial hide, D-03 dead-fallback removal, D-04 single bathroomCount read, D-06 inline fragment, D-09 surgical ListingMetaTable removal) are all implemented exactly as planned. The KBD-02 grep gate is clean (0 `keyboardVerticalOffset` in `src/`), EN/RU parity holds at 650/650 keys with all four new keys present, and no `useTheme()` violation was introduced in the modified branches.

No BLOCKER-class defects found — there are no security issues, no data-loss risks, no broken render paths.

The findings are concentrated in the **test layer** and **stale/dead-doc** territory:

1. **Test fragility in PropertyDetailsScreen.test.tsx** — `PropertyService.getPropertyById` is mocked to resolve to `{}`, which would clobber the initial property in any test that flushes microtasks. The suite happens to pass today only because `react-test-renderer`'s `act()` doesn't auto-flush async effects. Anyone adding an `await` or `await act(...)` later will see all 5 cases regress.
2. **Unnecessary `as any` casts on i18n keys** — the four new keys are present in `TranslationKeys`, so the `as any` on every `t('property.specs.* as any)` call site silently erodes type safety with no transition justification. This was modelled on a documented "interim cast during union regen" pattern, but the keys already exist in the union.
3. **Stale references to a deleted sibling test** — multiple new test docstrings claim `PropertyCard.specChip.test.tsx` is "left UNTOUCHED" and reference its line numbers as canonical helper sources; the file was deleted in `bc5e790` after the docstrings were written, so the references are dead links. Doesn't break anything but makes future readers chase a ghost.
4. **Stale HospitalityCard file-level doc** — the top docblock still describes the body row as `"{rooms} rooms · {maxGuests} max guests"`, with no mention of the new bathrooms fragment D-06 added.

None of these block the phase. The first one (test fragility) is the closest to a real WARNING because it materially raises the cost of changing any test in that file later.

## Warnings

### WR-01: PropertyService mock resolves to empty object, would clobber initial property if microtasks flushed

**File:** `src/screens/__tests__/PropertyDetailsScreen.test.tsx:47-56`
**Issue:** The `PropertyService.getPropertyById` mock is set to `jest.fn().mockResolvedValue({})`. PropertyDetailsScreen's `useEffect` at lines 294-303 of the screen calls `getPropertyById(initialProperty.id).then(fresh => setProperty(fresh))`. If any test ever transitions to `await act(async () => { ... })` or otherwise flushes the microtask queue (a common refactor when adding interactivity assertions), `setProperty({})` will fire, wiping out the test's `basics: { bedrooms: 2, ... }` fixture before any assertion runs. All five test cases would then regress simultaneously and the regression would be hard to diagnose because the failure surface is "every value missing" rather than "this specific behaviour broke." The current synchronous-only render coverage hides this dependence on a Jest internal-scheduling detail.
**Fix:**
```ts
jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    // Resolve to the input so the silent background refresh is a no-op for tests
    getPropertyById: jest.fn((id: string) => Promise.resolve({ id })),
    // ...
  },
}));
```
Better yet, hoist `getPropertyById` into a `let` and reset it in each test's `setupMocks` to return the exact property under test:
```ts
const { PropertyService } = require('../../services/PropertyService');
(PropertyService.getPropertyById as jest.Mock).mockResolvedValue(property);
```

### WR-02: `as any` casts on i18n keys that exist in the TranslationKeys union — silent type-safety erosion

**File:** `src/components/PropertyCard.tsx:293, 302` and `src/screens/PropertyDetailsScreen.tsx:1065, 1073`
**Issue:** Every new `t()` call site uses `t('property.specs.bedrooms' as any)`, `t('property.specs.bathrooms' as any)`, `t(bedsLabelKey as any)`. The CONTEXT documented `as any` as an interim pattern for keys that haven't been added to the `TranslationKeys` union yet — but Plan 08-01 (committed in the same wave, BEFORE the consuming JSX) added all three `property.specs.*` keys to `en.ts` and `ru.ts`. `TranslationKeys = keyof typeof en` therefore includes them at compile time. The `as any` casts are dead defensive code that silently disables the i18n type-checker for these call sites — if `property.specs.bedrooms` were ever renamed or removed, the compiler would no longer catch the consuming JSX. (PropertyDetailsScreen.tsx has 11 `as any` total in the file; the 2 that Phase 8 added/touched are gratuitous.)
**Fix:** Drop the casts. The types resolve cleanly:
```tsx
// PropertyCard.tsx
<Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bedrooms')}</Text>
// ...
<Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bathrooms')}</Text>

// PropertyDetailsScreen.tsx
const bedsLabelKey: TranslationKeys = isHospitality ? 'property.specs.rooms' : 'property.specs.bedrooms';
// then:
<Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t(bedsLabelKey)}</Text>
<Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.specs.bathrooms')}</Text>
```
(Importing `TranslationKeys` from `../locales` may be needed in PropertyDetailsScreen if it isn't already.)

### WR-03: PropertyCard specs strip renders a *single* cell on office/commercial — flex layout leaves the bathroom cell flush-left under `flexDirection: 'row'`, not centered

**File:** `src/components/PropertyCard.tsx:285-306` (+ styles `specsContainer` at 456-469)
**Issue:** When `propertyType === 'office' || 'commercial'`, both the Beds cell *and* the vertical divider are gated off (lines 289-298), leaving only one child inside `specsContainer`. The container has `flexDirection: 'row'`, `alignItems: 'center'`, `paddingHorizontal: 14`, `gap: 10`, but no `justifyContent` override — so the lone Baths cell sits left-aligned inside a horizontal row, not centered. PropertyDetailsScreen's `specsContainer` correctly uses `justifyContent: 'space-around'` (line 1991) and handles the same single-cell case cleanly. CONTEXT's D-02 anticipated asymmetric rendering but did not call out that PropertyCard's container lacks the equivalent `justifyContent`. Pre-Phase-8 the container was always 2 cells, so the missing `justifyContent` never showed; post-Phase-8 it's a visible alignment regression on every office/commercial card.
**Fix:** Either add `justifyContent: 'center'` to `styles.specsContainer` (sticks the lone Baths cell in the middle, matches PropertyDetailsScreen visual), or center-align dynamically:
```tsx
<View style={[
  styles.specsContainer,
  { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
  !showBedsCell && { justifyContent: 'center' },
]}>
```
Recommend the dynamic form to preserve today's 2-cell flush-start layout on residential while centering the single-cell layout on commercial.

### WR-04: HospitalityCard's `' · '` separator pattern relies on React.Fragment children expanding to *separate* string children — works today but is brittle to a React renderer change

**File:** `src/components/HospitalityCard.tsx:212-219`
**Issue:** The conditional uses React.Fragment shorthand for the bathrooms slot:
```tsx
{property.basics?.bathroomCount !== undefined ? (
  <>{' · '}{property.basics.bathroomCount} {t('hospitality.bathrooms')}</>
) : null}
```
The companion test `HospitalityCard.test.tsx` Test 2 *load-bears* on counting exactly one ` · ` separator in `collectTexts` to prove no orphan separator leaks. The implementation works because React.Fragment's children get spread into the parent `<Text>`'s children array, and the test's recursive `walk` descends into the fragment node. However: this pattern subtly relies on the fact that `<>{' · '}{n} {label}</>` produces 4 separate string/number children rather than concatenating to one — if a future renderer optimization (or `react-native` version bump) ever collapses the children, the regression-fence assertion `countSeparators(texts).toBe(1)` would incorrectly start matching `'Rooms  · Max Guests'` (one separator preserved) without catching that a real orphan separator was now in the rendered output. The fence is therefore weaker than its docstring claims.
**Fix:** Strengthen the fence by also asserting the *concatenated* output. Convert the meta line to a single computed string and the test to an exact-string assertion, OR add a positive assertion that no rendered string equals `' ·  · '` (double-separator). Concretely:
```tsx
// In HospitalityCard.tsx — compute the line as a string:
const bathFragment =
  property.basics?.bathroomCount !== undefined
    ? ` · ${property.basics.bathroomCount} ${t('hospitality.bathrooms')}`
    : '';
const rooms = property.basics?.hotelRooms ?? property.basics?.rooms ?? '-';
const maxGuests = property.maxGuests ?? 0;
// ...
<Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
  {`${rooms} ${t('hospitality.rooms')}${bathFragment} · ${maxGuests} ${t('hospitality.maxGuests')}`}
</Text>
```
Then the test asserts the exact concatenated string, removing the fragment-shape coupling.

## Info

### IN-01: Stale sibling-fence docstring — `PropertyCard.specChip.test.tsx` referenced as "untouched" was deleted in `bc5e790`

**File:** `src/components/__tests__/PropertyCard.test.tsx:18-20` and `src/components/__tests__/ListingMetaTable.test.tsx:92-95`
**Issue:** The PropertyCard test header docstring states "Sibling fence: PropertyCard.specChip.test.tsx is left UNTOUCHED — it pins the 260525-ggp Task 1 read-path fallback as a historical regression fence." Commit `bc5e790` (visible in `git log`) deleted that file. The ListingMetaTable test similarly references `PropertyCard.specChip.test.tsx:111-124` as the source-of-truth for the `collectTexts` helper shape. Both references are now dead.
**Fix:** Update both docstrings. In PropertyCard.test.tsx remove the "Sibling fence" paragraph (lines 17-20). In ListingMetaTable.test.tsx replace `PropertyCard.specChip.test.tsx:111-124` with a reference to the in-repo equivalent (e.g., `PropertyCard.test.tsx:112-127` or `HospitalityCard.test.tsx:106-134`).

### IN-02: HospitalityCard file-level docblock not updated for Phase 8 D-06

**File:** `src/components/HospitalityCard.tsx:1-19`
**Issue:** Line 11 describes the body row as `"{rooms} rooms · {maxGuests} max guests" (D-10)` — Phase 8 D-06 inserted a conditional bathrooms fragment between rooms and maxGuests. The implementation comment at lines 206-211 captures D-06 correctly, but the file-level summary on line 11 lies.
**Fix:**
```tsx
 *   - body row: "{rooms} rooms · {bathroomCount} bathrooms? · {maxGuests} max guests"
 *     (D-10 + Phase 8 D-06; bathrooms fragment is conditional on basics.bathroomCount !== undefined)
```

### IN-03: `Number.isInteger ? String : toFixed(1)` decimal-format helper mentioned in CONTEXT was never extracted

**File:** `src/components/PropertyCard.tsx:301` and `src/components/HospitalityCard.tsx:216` and `src/screens/PropertyDetailsScreen.tsx:1072`
**Issue:** CONTEXT "Claude's Discretion — Decimal formatting on cards" (lines 80-81) explicitly allowed extracting `Number.isInteger(v) ? String(v) : v.toFixed(1)` into a `formatBathroomCount` utility "if the inline gets duplicated across all three surfaces." All three surfaces ended up rendering `bathroomCount` directly (`{property.basics?.bathroomCount ?? '-'}`) — relying on JavaScript's default number-to-string conversion. That works for `1.5` → `'1.5'` but produces `'1.50'` for any value like `1.50` (not possible from a stepper-validated 0.5 step but possible from any manually-edited backend record), and would silently print scientific notation for huge values. Not a current correctness bug (Phase 7 validates 0-10 step-0.5), but the CONTEXT-promised helper would have hardened it.
**Fix (optional):** Add `src/utils/formatCount.ts`:
```ts
export const formatCount = (v: number | undefined | null): string => {
  if (v == null) return '-';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
```
Replace the 3 render sites. Defer if the M4 backend constraint truly never produces non-step-0.5 floats.

### IN-04: Test fixture types diverge from Property type (`hotelRooms: 4 as any` in PropertyDetailsScreen test, `as unknown as Property` in 3 of 4 test files)

**File:** `src/screens/__tests__/PropertyDetailsScreen.test.tsx:274, 293` and all four test files' `makeProperty` helpers
**Issue:** The Property type declares `hotelRooms?: '1' | '2' | '3' | '4+'` (string literal union) but Test 4 and Test 5 pass `hotelRooms: 4 as any` and `hotelRooms: 1 as any` (numbers). The render path runs JS-side and stringifies numbers in `<Text>`, so the test passes — but the fixture is now incompatible with what backend Mongoose produces for hospitality. If `hotelRooms` later gains stricter type enforcement at the render site (`.toUpperCase()` for example), these fixtures will not catch it because they're already escape-hatched. Cross-checked against the HospitalityCard test which correctly uses `hotelRooms: '3'` (string). Mixed convention across the suite.
**Fix:** Use `hotelRooms: '4'`, `hotelRooms: '1'` in the PropertyDetailsScreen tests (strings, matching the type). The `as any` falls out and the fixture matches production data shape.

### IN-05: Plan 08-01 frontmatter claim "hospitality.bathrooms LEFT UNTOUCHED" is wrong — the key was added in this wave

**File:** `.planning/phases/08-display-surfaces-propertycard-hospitalitycard-propertydetail/08-01-PLAN.md:22`
**Issue:** The `must_haves.truths` array for Plan 08-01 includes: `"Existing keys property.beds, property.baths, property.bathroomPrivate/Shared/None, hospitality.rooms, hospitality.bathrooms are LEFT UNTOUCHED"`. But `hospitality.bathrooms` did NOT exist pre-Phase-8 — `grep -n` on en.ts shows it landed in this wave at line 285 with the comment `// Phase 6 (HOSP-05)` (mis-attributed). The plan asserted as a contract that the key was preserved; in fact the key was newly added by Plan 08-01 itself per D-07 in CONTEXT. The plan and implementation diverge on the key's provenance. The end-state is correct (the key exists with parity) but the plan's frontmatter would not survive a re-execution audit.
**Fix:** Out of scope for source-code fixes; flagging for planning-artifact hygiene. Edit Plan 08-01 frontmatter to list `hospitality.bathrooms` under the new keys (with `property.specs.*`), not under untouched keys.

---

_Reviewed: 2026-05-26T02:06:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

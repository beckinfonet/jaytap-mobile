# Phase 13: Shared Filter Data Model + AsyncStorage Persistence — Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure data-layer + persistence phase, no UI changes. Three things ship:

1. **HomeScreen filter state refactored from `selectedType: string | null` to `types: string[]`** (multi-select OR-union). The 9 existing call sites of `selectedType` in `src/screens/HomeScreen.tsx` are surgically updated. The currently visible single-chip filter row keeps writing `types: [singleType]` under the hood — users see **zero behavior change** until Phase 14 lights up the multi-select variants.

2. **`buildFilterQuery({ deal, category, types })` — a canonical, pure predicate factory** that every variant reads/writes and `filteredProperties` consumes. Lives in `src/utils/`. Returns `(p: Property) => boolean`.

3. **`useFilterStyle()` hook + `FilterStyleProvider` context** that persists `'guided' | 'cascading' | 'master' | 'sentence'` to AsyncStorage under `@jaytap_filter_style`. Default `'guided'`. Mirrors `LanguageContext.tsx` exactly. Lives in `src/context/`. Adds a 4th provider to `App.tsx`'s provider stack.

This phase is the **foundation for Phase 14** (variants) and **prerequisite for Phase 15** (Account Settings picker). No backend changes, no schema changes, no new i18n strings, no theme tokens consumed beyond what Phase 12 already shipped.

</domain>

<decisions>
## Implementation Decisions

### Hook architecture (DATA-03)

- **D-01: `FilterStyleProvider` context wraps `useFilterStyle()`.** Place in `src/context/FilterStyleContext.tsx`, structurally identical to `src/context/LanguageContext.tsx` (`AsyncStorage.getItem` on mount → `setLanguageState`; `AsyncStorage.setItem` then `setLanguageState` on write). Single in-memory source of truth — `setFilterStyle` in Phase 15's Account Settings will rerender Phase 14's HomeScreen variant dispatcher instantly without a focus event or remount. This is the only shape that satisfies FILT-03's "no app restart required" cleanly.
  - **Why not standalone hook with module-level subscribers (event-emitter pattern):** introduces a non-project pattern with no precedent in `src/`. Two existing providers (Language, Auth, Theme) all use the React Context shape; consistency wins.
  - **Why not "each consumer re-reads AsyncStorage on focus":** race-prone. The HomeScreen ↔ AccountSettings back-navigation does not always trigger a remount; depends on App.tsx's `isAccountSettingsOpen` state-machine pattern. Reading AsyncStorage on focus would either miss the write or duplicate work on every screen wake.

- **D-02: Provider placement: between `LanguageProvider` and `AuthProvider` in `App.tsx`.** New stack: `SafeAreaProvider → KeyboardProvider → ThemeProvider → LanguageProvider → FilterStyleProvider → AuthProvider`. Filter-style is independent of auth (anonymous users have a preference too), so it sits beneath auth. Sits above auth because nothing in the auth provider needs filter style.

- **D-03: Hook signature:** `useFilterStyle(): { filterStyle: FilterStyle; setFilterStyle: (s: FilterStyle) => Promise<void> }`. `FilterStyle = 'guided' | 'cascading' | 'master' | 'sentence'`. Exported from the same module. `setFilterStyle` is `async` to mirror `LanguageContext.setLanguage` and to allow callers to `await` the persist if they want sequencing.

### Query builder shape (DATA-02)

- **D-04: `buildFilterQuery({ deal, category, types })` returns a memo-friendly predicate `(p: Property) => boolean`.** Lives at `src/utils/buildFilterQuery.ts`. Pure utility (no React imports, no side effects). Phase 14 variants build the input args from their own UI state and drop the returned predicate into `properties.filter(...)` via `useMemo`.
  - **Why predicate over normalized object + sister `applyFilter(q, list)`:** minimum diff at `HomeScreen.tsx:186-247`. The existing `filteredProperties = useMemo(() => properties.filter(p => {...}), [...])` shape is preserved; the inline filter body becomes `buildFilterQuery({ deal: transactionType, category: selectedCategory, types })(p)`. No new indirection for hypothetical future URL/share-link serialization (deferred — Phase 14+ can refactor if it becomes a real requirement).
  - **Why not a hook (`useFilterQuery(...)`):** a hook wraps `useMemo` around a pure function — that's user-side responsibility. Keeps the helper as a plain function; callers `useMemo` at their own discretion.

- **D-05: Signature shape:**
  ```ts
  export type FilterDeal = 'rent' | 'sale';
  export type FilterArgs = {
    deal: FilterDeal;
    category: PropertyCategory;     // imported from src/utils/propertyCategory
    types: string[];                // empty = all types in category
  };
  export function buildFilterQuery(args: FilterArgs): (p: Property) => boolean;
  ```
  - `types: string[]` (not `PropertyType[]`) because HomeScreen's existing `selectedType: string | null` is already loosely typed; tightening here would force a cascade at every chip render-site. Keep the input loose; pin to `PropertyType` only at write-side in Phase 14.
  - `deal: 'rent'|'sale'` binary, matching M3 `Property.dealType === 'sale'` collapse pattern (rent_long + rent_daily both → "rent" bucket). Already locked by REQUIREMENTS DATA-01.

- **D-06: Predicate semantics (locked from REQUIREMENTS DATA-01 + DATA-02):**
  - Deal filter: `args.deal === 'sale' ? p.dealType === 'sale' : p.dealType !== 'sale'` (preserves M3 collapse).
  - Category filter: `propertyTypeToCategory(p.propertyType) === args.category`.
  - Types filter: `args.types.length === 0 || args.types.some(t => t.toLowerCase() === (p.propertyType ?? 'apartment').toLowerCase())` (OR-union; empty list means "any type in category"; lowercase comparison preserves the existing line 199-201 normalization pattern).
  - City + search-query filters do NOT belong inside `buildFilterQuery` — those are HomeScreen-specific filter dimensions that the canonical shape does not capture per REQUIREMENTS DATA-01 (which names only `deal | category | types`). They stay in `filteredProperties` as a `.filter(p => buildFilterQuery(...)(p) && matchesCity(p) && matchesSearch(p))` composition. Keeps Phase 14 variants from owning city/search.

### Verification mode (DATA-01 SC1)

- **D-07: Unit tests only — no temporary UI rewire, no debug fixture.** SC1 ("selecting two property types returns the OR-union") is satisfied by Jest tests on `buildFilterQuery` covering: empty `types: []` → all-in-category, `types: ['Apartment']` → single, `types: ['Apartment', 'House']` → union, cross-product against `deal: 'rent'|'sale'` × `category: 'Residential'|'Commercial'|'Hospitality'`. Phase 13's HomeScreen continues writing `types: [selectedType]` under the existing single-chip UI; users see zero behavior change.
  - **Why not "temporary hot-rewire" of existing chips to multi-select:** would expose a one-phase visual regression on a user-facing brownfield surface. The chips will look wrong vs. Phase 14's Guided/Cascading variants and the user would have to mentally separate "this is wrong because Phase 13 is staging multi-select" from "this is broken." Not worth it for a SC1 that tests already prove.
  - **Why not a debug-only fixture:** adds debug-surface code that gets removed in Phase 14. Not worth the round-trip; tests prove the same invariant deterministically.
  - **What SC1 manual-walk looks like in Phase 13:** there is none. Phase 13 ships invisibly. The first manual verification of multi-select happens in Phase 14 on the new variants.

### Phase split

- **D-08: Two atomic plans.**
  - **Plan 13-01 — Shared filter data model (DATA-01 + DATA-02):** create `src/utils/buildFilterQuery.ts` with the predicate factory + Jest tests; refactor `HomeScreen.tsx` lines 86-89 (state), 186-247 (filteredProperties memo), 199-201 (predicate body now via buildFilterQuery), 247 (deps array), 320-323 (togglePropertyType), 608 (chip `isActive` check). Atomic commit. Acceptance: SC1 + SC2 unit tests green; tsc 0 new errors; existing visible filter behavior unchanged (single-chip UI still single-select from user POV); KBD-02 grep gate exit 0.
  - **Plan 13-02 — `useFilterStyle` + `FilterStyleProvider` (DATA-03):** create `src/context/FilterStyleContext.tsx` mirroring LanguageContext shape; mount provider in `App.tsx` between LanguageProvider and AuthProvider; Jest tests on the hook (mocked AsyncStorage) covering default-on-fresh-install, persisted-value-survives-restart, write-then-read invariant, corrupted-value defaults to `'guided'`. Atomic commit. Acceptance: SC3 + SC4 covered by tests; tsc 0 new errors.
  - **Why split this way:** the two deliverables have zero file overlap and zero shared test setup. Mid-execution rollback is cleaner. Plan 13-02 can ship even if Plan 13-01 needs a follow-up. Mirrors Phase 12's two-plan pattern (D-06 there) — a project-known shipping shape.

### Claude's Discretion

These are decided by Claude per `feedback-discuss-phase-detail-level.md` (only escalate gray areas with real stakes):

- **D-09: `types[]` storage uses Pascal-case** (`'Apartment'`, `'House'`, etc.) — matches existing `selectedType` convention + `PROPERTY_TYPES` constant + HomeScreen.tsx:608 chip render. Lowercase comparison happens inside the predicate (preserves the line 199-201 normalization pattern). Phase 14 variants can pin to `PropertyType` if they want, but the canonical filter shape accepts loose `string[]`.

- **D-10: Corrupt / unknown AsyncStorage value on load defaults silently to `'guided'`.** `useFilterStyle()`'s mount-load validates the read value against `('guided' | 'cascading' | 'master' | 'sentence')`; anything else is ignored. No error toast, no console.warn (matches `LanguageContext` line 27 pattern: `if (stored === 'en' || stored === 'ru') setLanguageState(stored)` — invalid values silently fall through to default).

- **D-11: HomeScreen state variable name stays `transactionType` (not renamed to `deal`).** REQUIREMENTS DATA-01 says "transactionType ... becomes canonical `deal` ... in the shared model" — that means the canonical-model-side name is `deal`, but the local state variable in HomeScreen has no requirement to rename. Mapping happens at the buildFilterQuery call: `buildFilterQuery({ deal: transactionType, category: selectedCategory, types })`. Avoids touching 20+ render-site references just for a rename and keeps the diff focused.

- **D-12: Test files colocated under existing convention.** Project convention: there is no `src/utils/__tests__/` directory pattern today; `__tests__/` lives at project root with a single smoke test (`__tests__/App.test.tsx`). Phase 13 follows the project's emerging test-colocation pattern from M3+ (e.g. `src/utils/getTourPhotosUrl.ts` has its test next to it as `getTourPhotosUrl.test.ts` per quick-task 260525-eva). Test files: `src/utils/buildFilterQuery.test.ts` + `src/context/FilterStyleContext.test.tsx`.

- **D-13: Public API of `FilterStyleContext.tsx` matches `LanguageContext.tsx` verbatim in shape.** Exported names: `FilterStyle` type, `FilterStyleProvider` component, `useFilterStyle()` hook (throws if not inside provider, matching `LanguageContext.tsx:58`). No additional helpers in v1; if Phase 14 needs e.g. a `getFilterStyleLabel(style)` helper for the Settings picker, that lives at Phase 15's discretion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning Context

- `.planning/REQUIREMENTS.md` §M6 / DATA-01 / DATA-02 / DATA-03 — Phase 13 requirement bodies.
- `.planning/ROADMAP.md` §Phase 13 — Goal + 5 Success Criteria + Depends-on chain (Phase 12 ✅; gates Phase 14 + Phase 15).
- `.planning/PROJECT.md` — M6 current focus context.
- `.planning/STATE.md` — Phase 12 closed; Phase 13 next.

### Codebase Anchors

- `src/screens/HomeScreen.tsx:86-89` — The 3 filter state hooks (`transactionType`, `selectedCategory`, `selectedType`). Phase 13 Plan 13-01 refactors line 89.
- `src/screens/HomeScreen.tsx:186-247` — `filteredProperties` useMemo. Phase 13 Plan 13-01 rewrites the inline filter body to delegate to `buildFilterQuery`.
- `src/screens/HomeScreen.tsx:199-201` — Current selectedType predicate + lowercase comparison pattern. Predicate semantics in D-06 preserve this.
- `src/screens/HomeScreen.tsx:319-325` — `togglePropertyType` (single-select toggle today). Phase 13 keeps it single-select-via-array under the hood (writes `types: [type]` or `types: []`).
- `src/screens/HomeScreen.tsx:608` — Chip `isActive` check (`selectedType === item.label`). Phase 13 updates to `types.includes(item.label)`.
- `src/context/LanguageContext.tsx` — The pattern source for `FilterStyleContext.tsx`. Mirror shape, naming, AsyncStorage call sites, error handling.
- `src/utils/propertyCategory.ts` — Exports `PropertyCategory`, `PROPERTY_TYPES`, `propertyTypeToCategory`. `buildFilterQuery` imports `PropertyCategory` + `propertyTypeToCategory` from here.
- `src/types/Property.ts` — `Property` type (includes `propertyType?: string` and `dealType?: 'sale'|'rent_long'|'rent_daily'`). Both fields read by `buildFilterQuery`.
- `App.tsx:1527-1537` — Provider stack location for `FilterStyleProvider` insertion.

### Pattern Precedents

- `src/context/LanguageContext.tsx:5` — AsyncStorage key convention: `@jaytap_<feature>` (Phase 13 uses `@jaytap_filter_style`).
- `src/context/LanguageContext.tsx:17-54` — Provider shape (state on mount default → `useEffect` async load → validation against allowed-values → `set*` function persists then updates).
- `src/utils/getTourPhotosUrl.ts` + `src/utils/getTourPhotosUrl.test.ts` (quick-task 260525-eva, commit `d34c821`) — Pattern for pure utility + colocated test (D-12 follows this).

### Prior-Phase Decisions (M6 carry-forward)

- `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-CONTEXT.md` — Phase 12 D-06 two-plan split pattern (Phase 13 D-08 mirrors).
- `m6-scope-decisions-2026-05-31.md` (memory) — `filterStyle` is AsyncStorage device-local; v1 variants = Guided + Cascading; default 'guided'.
- `m6-filter-variants-are-the-point.md` (memory) — Variants are the value; data model must support all 4 even though only 2 are wired in v1.

### Hard Rules (CLAUDE.md + REQUIREMENTS.md §Hard rules)

- KBD-02: `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0 (3-milestone-held invariant per `m1-keyboard-kbd-02-invariants.md`).
- EN+RU bilingual parity: `scripts/check-i18n-parity.sh` exit 0 (Phase 13 adds zero strings — trivially satisfied).
- No Firebase SDK (`no-firebase-sdk.md`) — Phase 13 touches no auth code.
- No backend changes — Phase 13 is client-only.
- M6 hard rule: language pill stays in HomeScreen header (`m6-language-pill-stays-in-header.md`) — Phase 13 does not touch the header.

### Gate Commands (run during Plan 13-01 + 13-02 verification)

- `npx jest src/utils/buildFilterQuery.test.ts` — must pass all OR-union + cross-product cases (SC1 + SC2).
- `npx jest src/context/FilterStyleContext.test.tsx` — must pass default-on-fresh-install + persisted-survives-restart + corrupted-defaults (SC3 + SC4).
- `npx tsc --noEmit` — zero new errors against pre-Phase-13 baseline.
- `grep -rn "keyboardVerticalOffset" src/ | wc -l` — must equal 0.
- `scripts/check-i18n-parity.sh` — exit 0.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/context/LanguageContext.tsx`** — Direct structural template for `FilterStyleContext.tsx`. Same async-load-on-mount, same persist-then-set-state, same throw-outside-provider hook guard. Plan 13-02 can copy the file and rename: `Language → FilterStyle`, `language → filterStyle`, `'en'|'ru' → 'guided'|'cascading'|'master'|'sentence'`, `@jaytap_language → @jaytap_filter_style`.
- **`src/utils/propertyCategory.ts`** — `propertyTypeToCategory()` already handles `null | undefined → 'Residential'` safe default. `buildFilterQuery` consumes this verbatim — no duplicate normalization.
- **`src/utils/getTourPhotosUrl.ts` + `.test.ts`** — Pattern source for "pure utility + colocated test" (D-12).
- **Existing `filteredProperties` useMemo (HomeScreen.tsx:186-247)** — Survives Phase 13 refactor; only the inline `.filter(p => {...})` body changes (delegates to buildFilterQuery). The city + search-query filters stay inline (D-06 boundary decision).

### Established Patterns

- **AsyncStorage key prefix `@jaytap_`** — Set by `LanguageContext` (`@jaytap_language`). Phase 13 follows: `@jaytap_filter_style`. (Auth's keys `userToken | refreshToken | userData` predate this convention; they're not renamed.)
- **`useEffect(() => { loadX(); }, [])` for one-shot mount load** — established by `LanguageContext.tsx:20-22`. Phase 13's `useFilterStyle` mount-load follows verbatim.
- **No flash of wrong default:** `LanguageContext` initializes state to `'en'`, then overwrites with stored value during load. UI sees `'en'` for one render cycle before the real value lands. Phase 13's `'guided'` default works the same way. Acceptable because no `filterStyle`-dependent UI mounts in Phase 13 (the picker is Phase 15; HomeScreen variant dispatch is Phase 14). By the time Phase 14 reads `filterStyle`, the mount-load has resolved on app launch.
- **Provider hierarchy `App.tsx:1527-1537`** — Sequential nesting; new providers slot in by reading the file once and adding one line of JSX.
- **Test colocation** — `getTourPhotosUrl.test.ts` next to `getTourPhotosUrl.ts` (M3+ convention). Phase 13 follows.
- **Predicate-in-useMemo for filtered lists** — `filteredProperties = useMemo(() => properties.filter(...), [deps])`. Phase 13's refactor keeps this exact shape.

### Integration Points

- **HomeScreen.tsx is the only consumer of `buildFilterQuery` in Phase 13.** Phase 14 adds Guided + Cascading variants as additional consumers; Phase 15 adds the Settings picker. Phase 13 ships the utility "lonely" — that's by design.
- **`App.tsx` provider stack** — exactly one line of JSX added at line 1530-1531 (between LanguageProvider open and AuthProvider open) and one matching closing tag. No other App.tsx changes.
- **No cross-cuts into ChatService / PropertyService / AppointmentService** — Phase 13 has zero service-layer surface.
- **No theme tokens consumed beyond Phase 12's shipped set** — Phase 13 adds zero `colors.*` reads.
- **No i18n keys added** — Phase 13 ships zero new translation strings. Parity script trivially green.

</code_context>

<specifics>
## Specific Ideas

- **Mirror `LanguageContext.tsx` line-for-line.** The fastest, safest path for `FilterStyleContext.tsx` is `cp src/context/LanguageContext.tsx src/context/FilterStyleContext.tsx` then sed-rename. Plan 13-02 should call this out explicitly so the executor doesn't reinvent the shape.
- **`buildFilterQuery` should accept `types: string[]` not `PropertyType[]`.** Loose typing on the input preserves HomeScreen's existing `selectedType: string | null` shape (D-09). Phase 14 variants can build `string[]` from their own typed `PropertyType[]` chip selections — no type cascade backward into the utility.
- **Inline JSDoc comment block above `buildFilterQuery` explaining the canonical shape** — future M6 phases (and external readers) need to know why the city / search-query filters are NOT in the canonical shape (D-06 boundary).
- **Plan 13-01's `togglePropertyType` rewrite** — currently `if (selectedType === type) setSelectedType(null); else setSelectedType(type);`. Phase 13's version: `setTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])`. The user-visible behavior under Phase 13 still feels single-select because the chip UI only renders one active chip at a time per the existing render code; the array-shape rewrite is invisible until Phase 14.
- **Test fixtures should mock `Property` objects minimally** — only `dealType` + `propertyType` matter for the predicate. Don't import the full Mongoose-derived shape; build inline `as unknown as Property` fixtures.

</specifics>

<deferred>
## Deferred Ideas

- **`buildFilterQuery` returning a normalized object + sister `applyFilter(q, list)`** — useful if filter state ever needs URL/share-link serialization, but no concrete requirement in M6. Revisit if M7+ adds shareable search results. (D-04 rejected for now.)
- **`useFilterQuery({...})` hook wrapping `useMemo` around `buildFilterQuery`** — adds a hook for what is a pure function. If Phase 14 finds itself writing identical `useMemo(buildFilterQuery, [deps])` blocks in 3+ places, extract then.
- **Server-side `filterStyle` sync** — explicitly out of M6 scope per `m6-scope-decisions-2026-05-31.md`. If users complain about cross-device drift, M7+ candidate.
- **City + search-query filters becoming part of the canonical shape** — D-06 keeps them inline in HomeScreen. If Phase 14 variants want to own city/search too, refactor then.
- **Tightening `types: string[]` to `PropertyType[]`** in the canonical shape — would force a typing cascade into HomeScreen's existing chip render. Defer until Phase 14 stabilizes the variant chip components.
- **Removing the legacy `selectedType: string | null` semantics from comments / variable names elsewhere in HomeScreen.tsx** — there are no other code refs (the 9 grep matches are all on Plan 13-01's edit list), but the variable `togglePropertyType` keeps its old name even though it now operates on an array. If the function becomes confusing in Phase 14, rename then.
- **Debug fixture for cross-product manual verification** — D-07 rejected unit-tests-only path. If Phase 14 hits a surprising integration bug that needs a quick on-device sandbox, add a hidden debug control then.

</deferred>

---

*Phase: 13-shared-filter-data-model-asyncstorage-persistence*
*Context gathered: 2026-05-31*

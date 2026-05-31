# Phase 13: Shared Filter Data Model + AsyncStorage Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 13-shared-filter-data-model-asyncstorage-persistence
**Areas discussed:** Hook shape (DATA-03), Query builder shape (DATA-02), SC1 verification mode

---

## Hook shape (DATA-03)

| Option | Description | Selected |
|--------|-------------|----------|
| FilterStyleProvider context | Mirrors LanguageContext.tsx exactly: provider in App.tsx between LanguageProvider and AuthProvider, useFilterStyle() returns { filterStyle, setFilterStyle }. Single in-memory source — setFilterStyle in Settings rerenders HomeScreen instantly. 4th provider added to App.tsx. | ✓ |
| Standalone hook with module-level state | src/hooks/useFilterStyle.ts holds module-scoped state + a Set of subscribers (event-emitter pattern). No provider, but introduces a non-project pattern. Live-swap works but each consumer registers a listener. | |
| Plain hook — each consumer re-reads AsyncStorage | No shared state; each useFilterStyle() reads AsyncStorage on mount + on a focus event. Simplest code. Live-swap is racy: Settings→back-to-Home race depends on screen focus-event order; cold restart works fine. Likely fails FILT-03 "no app restart required" cleanly. | |

**User's choice:** FilterStyleProvider context (Recommended).
**Notes:** Live-swap requirement from FILT-03 (Phase 14) and the SET-02 picker (Phase 15) tipped this. Standalone hook with subscribers was rejected as non-project pattern; plain hook was rejected because the App.tsx state-machine doesn't guarantee remount on screen-back navigation.

---

## Query builder shape (DATA-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Predicate function (p: Property) => boolean | Returns a memo-friendly predicate that Phase 14 variants + HomeScreen drop into properties.filter(...). Pure utility in src/utils/buildFilterQuery.ts. Keeps existing filteredProperties shape; minimum diff at HomeScreen.tsx:186-247. | ✓ |
| Normalized object { deal, category, types } + sister applyFilter(q, list) | Returns plain data — useful if the filter ever needs to serialize to URL, share-link, or backend. Variants compose objects, HomeScreen calls applyFilter. Adds one indirection now for hypothetical future serialization. | |
| Hook useFilterQuery({deal,category,types}) returning memoized predicate | Wraps useMemo inside a hook so callers don't re-derive. Marginal value — useMemo at the call site does the same thing. Adds a hook for what is conceptually a pure function. | |

**User's choice:** Predicate function (Recommended).
**Notes:** Minimum-diff principle won. The normalized-object path was deferred to a future milestone if URL/share-link serialization becomes a real requirement. The hook path was rejected as over-wrapping a pure function — callers can `useMemo` at their own discretion.

---

## SC1 verification mode

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests only — no UI rewire | Jest tests on buildFilterQuery cover SC1 + SC2. HomeScreen's existing single-chip UI keeps writing types: [single] under the hood — user sees no behavior change. Ship Phase 13 invisibly; Phase 14 lights up multi-select. | ✓ |
| Temporary hot-rewire: existing chips become multi-select | Repurpose the current chip row in HomeScreen so tapping two chips selects both. Lets you eyeball multi-select on-device in Phase 13. Risk: visual regression on a brownfield surface the user will see for 1 phase only — the chips will look wrong vs. the Phase 14 variants. | |
| Debug fixture toggled via a dev-only screen/menu | Add a hidden debug control (e.g. long-press the filter icon) that toggles types[]=[apt,house] via setState. Lets manual verification happen without disturbing user-facing UI. Costs a small chunk of debug-surface code that gets removed in Phase 14. | |

**User's choice:** Unit tests only (Recommended).
**Notes:** Phase 13 ships invisibly. First on-device manual verification of multi-select happens in Phase 14 on the new variants. SC1's "or via a debug fixture" path is satisfied by deterministic Jest tests, not by adding throwaway surface code.

---

## Claude's Discretion

Decided by Claude per `feedback-discuss-phase-detail-level.md` (only escalate gray areas with real stakes):

- **D-09 — `types[]` casing:** Pascal-case (`'Apartment'`, etc.) to match existing `selectedType` + `PROPERTY_TYPES` constant; lowercase comparison happens inside the predicate (preserves the HomeScreen.tsx:199-201 normalization pattern).
- **D-10 — corrupt AsyncStorage load:** silently default to `'guided'`; validate the read value against the 4-string union, ignore otherwise (matches LanguageContext.tsx:27 pattern).
- **D-11 — `transactionType` variable name:** stays `transactionType` in HomeScreen (no rename to `deal`); the canonical name is `deal` only at the buildFilterQuery boundary. Avoids touching 20+ render-site references.
- **D-12 — test colocation:** `src/utils/buildFilterQuery.test.ts` + `src/context/FilterStyleContext.test.tsx` (M3+ convention per quick-task 260525-eva).
- **D-13 — FilterStyleContext API:** matches LanguageContext.tsx shape verbatim — `FilterStyle` type, `FilterStyleProvider` component, `useFilterStyle()` hook that throws outside provider. No helpers in v1.

---

## Deferred Ideas

- buildFilterQuery as normalized object + applyFilter — revisit if URL/share-link serialization becomes a requirement.
- useFilterQuery hook wrapping useMemo — extract if 3+ call sites end up with identical useMemo blocks.
- Server-side filterStyle sync — out of M6; M7+ candidate if cross-device drift becomes a complaint.
- City + search-query filters joining the canonical filter shape — D-06 keeps them inline in HomeScreen; revisit if Phase 14 variants want to own them.
- Tightening `types: string[]` to `PropertyType[]` — defer until Phase 14 stabilizes variant chip components.
- Renaming `togglePropertyType` to reflect its array shape — rename in Phase 14 if the old name becomes confusing.
- Debug fixture for cross-product on-device verification — add in Phase 14 only if a surprising integration bug needs a quick sandbox.

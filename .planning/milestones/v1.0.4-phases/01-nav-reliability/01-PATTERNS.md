# Phase 1: Nav Reliability - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 4 (1 modify, 1 append, 1 create, 1 directory+gitkeep)
**Analogs found:** 3 / 4 (videos/ directory needs no analog)

Pattern map is intentionally tight. This phase touches a single source file (`App.tsx`), appends one section to one documentation file (`CONVENTIONS.md`), and creates one new structured markdown document (`01-REPRO-MATRIX.md`). No new React components, no new services, no new screens, no tests, no i18n strings — so the usual "controller / service / hook analog" matrix is mostly N/A. The value here is verbatim quotes of the current code at each edit site so the planner/executor has unambiguous match context.

## File Classification

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `App.tsx` | MODIFY | root state-machine component | event-driven (render + user taps) | itself (existing `mainStackScreenStyle` / `fullScreenOverlayWrap` helpers) | self-pattern — extend in place |
| `.planning/codebase/CONVENTIONS.md` | APPEND | project documentation | static | Existing `## Styling Approach` section (same file, lines 230-256) | structural-template match |
| `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` | CREATE | phase documentation (QA matrix) | static | RESEARCH §3.9 embedded skeleton | template-in-research |
| `.planning/phases/01-nav-reliability/videos/.gitkeep` | CREATE | empty-dir anchor | static | n/a | n/a |

---

## Pattern Assignments

### `App.tsx` (root state-machine component, event-driven)

**Analog:** itself. This phase extends existing in-file helpers and their JSX consumers. All edit sites have clean surrounding context; the executor should use the quoted snippets below as its `<action>` match blocks verbatim.

#### Existing `useState` declarations (lines 32-76, AppContent body)

The planner needs to know which state variables will be referenced inside the new `OVERLAY_FLAGS` array, and where those declarations live. Five overlay-relevant declarations (already present, unchanged by this phase):

```typescript
// App.tsx:36 — PropertyDetails overlay trigger
const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
// App.tsx:37 — Tour3D via Matterport URL (early-return render)
const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);
// App.tsx:38 — Tour3D via Ricoh panoramic URL (early-return render)
const [activePhotosUrl, setActivePhotosUrl] = useState<string | null>(null);
// App.tsx:43 — CreateListing overlay trigger (gated by !!user)
const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
// App.tsx:47 — RenterListings overlay trigger
const [isRenterListingsOpen, setIsRenterListingsOpen] = useState(false);
```

`user` is destructured from `useAuth()` at line 33 (`const { user, loading } = useAuth();`) — no `useState`, but it is the final operand needed for `!!user && isCreateListingOpen`.

The `useState` block ends at App.tsx:76 (close of `setTabEverMounted({...})`). **Per CONTEXT D-10 and RESEARCH §2.1 fix-if-C1-confirmed**, the new `OVERLAY_FLAGS` array + `hideMainStackUnderOverlay` derivation must be placed **after line 76, before line 79** (the first `useEffect`), replacing the current definition at lines 508-509. Placing it here — adjacent to the state declarations it references — is the D-10 "visually adjacent" requirement.

**Declaration-style convention** to match (from lines 36-47): single-line `const [x, setX] = useState<T>(init);` per state, grouped without blank lines. The new array should follow the same density — no blank lines inside, a short comment block above, and keep the existing closing brace of `setTabEverMounted` on line 76 intact.

---

#### Edit site 1 — `mainStackScreenStyle` helper (lines 502-506)

**Current code (verbatim, for match context):**

```typescript
  const mainStackScreenStyle = (visible: boolean) =>
    ({
      flex: 1,
      display: visible ? 'flex' : 'none',
    }) as const;
```

**Surrounding context (lines 500-511, so the executor has 3+ lines above and below for unambiguous match):**

```typescript
  }

  const mainStackScreenStyle = (visible: boolean) =>
    ({
      flex: 1,
      display: visible ? 'flex' : 'none',
    }) as const;

  const hideMainStackUnderOverlay =
    !!selectedProperty || isRenterListingsOpen || (!!user && isCreateListingOpen);

  const fullScreenOverlayWrap = {
```

**Callers enumerated** (verified via `grep -n "mainStackScreenStyle" App.tsx`) — **all 6 consumers will inherit the new `pointerEvents` behavior with a single edit to the helper, no per-caller changes needed:**

| Line | JSX wrapper | Visibility prop |
|------|-------------|-----------------|
| 527 | Favorites wrapper | `showFavorites` |
| 545 | Appointments wrapper | `showAppointments` |
| 560 | AccountSettings wrapper | `showAccountSettings` |
| 571 | Profile wrapper | `showProfile` |
| 603 | Chat wrapper | `showChat` |
| 622 | Home wrapper | `showHome` |

**`show*` boolean sources** (lines 337-366) — these are derived booleans each caller passes in. The planner does NOT need to touch these; the helper receives the truth value and applies both `display` and `pointerEvents` uniformly.

Note that `showFavorites`, `showAppointments`, etc. include the `inMainStack = !selectedProperty` guard (line 338), so when PropertyDetails is open these all evaluate to `false`, and the corresponding keep-alive screens will correctly have `pointerEvents: 'none'` — which is exactly the behavior this phase wants.

---

#### Edit site 2 — `hideMainStackUnderOverlay` derivation (lines 508-509)

**Current code (verbatim):**

```typescript
  const hideMainStackUnderOverlay =
    !!selectedProperty || isRenterListingsOpen || (!!user && isCreateListingOpen);
```

**Surrounding context (lines 506-512):**

```typescript
    }) as const;

  const hideMainStackUnderOverlay =
    !!selectedProperty || isRenterListingsOpen || (!!user && isCreateListingOpen);

  const fullScreenOverlayWrap = {
    position: 'absolute' as const,
```

**Planner action** (per CONTEXT D-10 and RESEARCH §2.1 fix): delete these two lines in place, and insert the new `OVERLAY_FLAGS` array + derivation after line 76. The consumer at line 525 (`<View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>`) continues to work unchanged — same variable name, same boolean semantics.

**Consumer (line 525, no edit here):**

```typescript
        <View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>
```

---

#### Edit site 3 — `fullScreenOverlayWrap` style object (lines 511-519)

**Current code (verbatim):**

```typescript
  const fullScreenOverlayWrap = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 5,
  };
```

**Callers enumerated** (verified via `grep -n "fullScreenOverlayWrap" App.tsx`):

| Line | Consumer | Current usage | `pointerEvents` conflict? |
|------|----------|---------------|---------------------------|
| 780 | RenterListings wrapper | `style={[fullScreenOverlayWrap, { display: isRenterListingsOpen ? 'flex' : 'none' }]}` | No — already uses style-array form, just append a third entry |
| 798 | CreateListing wrapper | `style={fullScreenOverlayWrap}` | No — conditionally mounted via `{!!user && isCreateListingOpen && (...)}` at line 797, so always visible when rendered |

**Neither caller currently has a `pointerEvents` prop** (confirmed via `grep -n "pointerEvents" App.tsx` → no hits). No conflict exists; the planner can safely add `pointerEvents` via either the style-object path (augment the base `fullScreenOverlayWrap` with a constant) or per-call-site (for RenterListings, which has conditional visibility).

**Per RESEARCH §4.1**, the recommended shape per call site:

For RenterListings (line 780) — `pointerEvents` must track `isRenterListingsOpen` because the wrapper stays mounted while hidden via `display: 'none'`:

```typescript
// Current:
<View style={[fullScreenOverlayWrap, { display: isRenterListingsOpen ? 'flex' : 'none' }]}>
// Target (append third style entry):
<View style={[
  fullScreenOverlayWrap,
  { display: isRenterListingsOpen ? 'flex' : 'none' },
  { pointerEvents: isRenterListingsOpen ? 'auto' : 'none' },
]}>
```

For CreateListing (line 798) — conditional-mount, so always visible when in the tree:

```typescript
// Current:
<View style={fullScreenOverlayWrap}>
// Target:
<View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
```

---

#### Edit site 4 — PropertyDetails overlay wrapper (lines 715-726)

**Current code (verbatim):**

```typescript
        {selectedProperty && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              elevation: 4,
            }}
          >
```

**Notes:**
- This wrapper does NOT use `fullScreenOverlayWrap` (it has `zIndex: 2` / `elevation: 4`, while the shared helper uses `zIndex: 3` / `elevation: 5`). Separate edit required.
- Conditionally mounted via `{selectedProperty && (...)}` — so always visible when rendered.
- Per RESEARCH §4.1 the target is to add `pointerEvents: 'auto'` inline to the style literal.

**Target shape:**

```typescript
        {selectedProperty && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              elevation: 4,
              pointerEvents: 'auto',
            }}
          >
```

---

#### Edit site 5 (DEFERRED) — 23-dep BackHandler useEffect (lines 184-297)

**Status:** Not touched unless C2 investigation confirms. Pattern map notes its existence but does NOT over-specify; the full ref-pattern replacement is documented in RESEARCH §2.2 fix-if-C2-confirmed.

**Current line range:** `App.tsx:184-297` (the `useEffect(() => {...}, [...20 deps])` block; `useRef` is already imported at line 1, no new import needed).

---

#### Edit site 6 (TEMPORARY) — `show*` boolean cascade instrumentation (lines 337-388)

**Status:** Diagnostic logs only, stripped per D-02 before Wave 1 commits land. RESEARCH §2.1 §2.2 §2.3 §2.4 already give exact `console.log` strings and insertion lines — no pattern lookup needed. Planner just copies the log strings verbatim from RESEARCH into the `<action>` blocks.

**Cascade structure (lines 337-366) for reference** — these are derived booleans, NOT state, so they don't go in `OVERLAY_FLAGS`. The cascade already has a consistent `inMainStack && !prior... && this` shape per screen. Do not refactor the cascade in Phase 1.

---

### `.planning/codebase/CONVENTIONS.md` (project documentation, append-only)

**Analog:** existing `## Styling Approach` section at lines 230-256 of the same file (closest structural sibling — same topic area, same heading depth, same code-block-with-language-tag convention).

**Structural template to match (from CONVENTIONS.md:230-256, verbatim shape):**

```markdown
## Styling Approach

**React Native `StyleSheet.create` only.** No styled-components, no utility CSS, no styled-system.

**Theme integration:** Static structural styles live in `StyleSheet.create`; dynamic (color, theme) values are merged via style arrays:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
```

**Platform-specific styles** via `Platform.select`:
```typescript
...Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { ... }, shadowOpacity: 0.15 },
  android: { elevation: 12 },
}),
```
See `src/components/BottomNavigator.tsx:100–110`, `src/components/PropertyCard.tsx:391–411`.

...
```

**Observed conventions** the new subsection must match:

1. **Heading style:** `## <Title Case With Spaces>` — depth 2.
2. **Topic sentence first:** A 1-sentence bold lead paragraph stating the rule, then supporting details.
3. **Code blocks:** triple-backtick with language tag (`typescript` or `markdown`), no blank line inside the block.
4. **File refs use backticked paths** with line numbers — e.g. `` `App.tsx:502-506` ``, `` `src/components/BottomNavigator.tsx:100–110` ``. Note the en-dash (`–`) used for ranges in existing sections, though the hyphen-dash is also accepted (both appear in the file — planner can use `-` for consistency with RESEARCH.md references).
5. **Internal links** to research docs use relative Markdown links — see the existing pattern in CONVENTIONS.md (or copy the exact form from RESEARCH §4.4's pre-written block below).

**Insertion point:** line 256 (immediately after the "Fonts" bullet inside `## Styling Approach`) and BEFORE line 258 (`---` terminator). I.e., insert a new `## Keep-alive and overlay screens` section between the last bullet of Styling Approach and the closing `---` rule.

**Pre-written block (from RESEARCH §4.4 — copy verbatim into CONVENTIONS.md):**

````markdown
## Keep-alive and overlay screens

Keep-alive (tab) screens and full-screen overlays in `App.tsx` MUST use BOTH `display`
and `pointerEvents` to gate visibility, not either one alone.

**Keep-alive tab pattern:**
```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({ flex: 1, display: visible ? 'flex' : 'none', pointerEvents: visible ? 'auto' : 'none' }) as const;
```

**Full-screen overlay pattern:**
```typescript
<View style={[fullScreenOverlayWrap, { pointerEvents: isOpen ? 'auto' : 'none' }]}>
```

**Why:** `display: 'none'` removes the view from the layout tree, but on RN's responder system
(both old and Fabric) an absolute-positioned wrapper or descendant can still capture touches
meant for the bottom nav. See `.planning/phases/01-nav-reliability/01-RESEARCH.md` §4 and
[RNav #12824](https://github.com/react-navigation/react-navigation/issues/12824). Use style-based
`pointerEvents` (not the deprecated prop form).

**On adding a new full-screen overlay:** add the overlay's visibility flag to the `OVERLAY_FLAGS`
array in `App.tsx` so `hideMainStackUnderOverlay` keeps working. Review checklist item.
````

This block is ready as-is — no structural re-formatting required to fit CONVENTIONS.md's house style.

---

### `.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` (phase doc, CREATE)

**Analog:** None in the repo. There are no prior phase matrices, no prior QA-result tables under `.planning/`. The closest structural analog is the markdown skeleton embedded inline in RESEARCH §3.9, which is authoritative for this document's shape.

**Template source:** RESEARCH.md lines 499-527 — copy the skeleton verbatim, then the planner fills in `{date}` / `{sha-pre-wave-1}` / `{device/ver}` placeholders at Wave 0 when the baseline is recorded.

**Structural conventions to match** (from sibling `01-CONTEXT.md`, `01-RESEARCH.md`, `01-VALIDATION.md` already in the phase directory):

1. **H1 title** in the form `# Phase 1: <subject>` — matches `01-CONTEXT.md:1`, `01-RESEARCH.md:1`, `01-VALIDATION.md` (check existing file).
2. **Metadata block** immediately below H1: bold-labeled lines for date, commit, platforms — matches the `**Gathered:** 2026-04-22` / `**Status:** Ready for planning` pattern in `01-CONTEXT.md:3-4`.
3. **Section headings** at H2 (`##`), sub-sections at H3.
4. **Tables** use the pipe-delimited shape already used in CONTEXT.md and RESEARCH.md (e.g. CONTEXT.md is dense with `| ID | Description | ... |` tables).
5. **Cell markers** per RESEARCH §3.7: `✅ PASS` / `❌ FAIL` / `— N/A` / `? FLAKY`.

---

### `.planning/phases/01-nav-reliability/videos/` (directory + `.gitkeep`)

**Analog:** None. There are no `videos/` subdirectories elsewhere in the repo (confirmed — `.planning/phases/01-nav-reliability/` currently contains only the four markdown files `01-CONTEXT.md`, `01-DISCUSSION-LOG.md`, `01-RESEARCH.md`, `01-VALIDATION.md`).

**Pattern:** standard convention — empty `.gitkeep` file to make git track the otherwise-empty directory. No code involved. Planner can one-line `touch .planning/phases/01-nav-reliability/videos/.gitkeep`.

---

## Shared Patterns

### TypeScript style-object typing in App.tsx

**Source:** `App.tsx:502-519` — both `mainStackScreenStyle` and `fullScreenOverlayWrap` use inline object literals with `as const` or `'absolute' as const`-annotated fields. The planner's edits to these helpers should preserve the same typing discipline.

**Observed pattern (from line 502):**

```typescript
const mainStackScreenStyle = (visible: boolean) =>
  ({ ... }) as const;
```

`as const` widens literal types to readonly tuples; when adding `pointerEvents: visible ? 'auto' : 'none'`, the conditional string literal `'auto' | 'none'` is already a valid RN `ViewStyle['pointerEvents']` value — no additional type annotation needed.

**Observed pattern (from lines 511-519):**

```typescript
const fullScreenOverlayWrap = {
  position: 'absolute' as const,   // narrow 'absolute' literal, not 'absolute' | 'relative' | ...
  top: 0,
  ...
};
```

When adding `pointerEvents` to this object (or to a second spread partner object), use the same `'auto' as const` narrowing if the planner elects to bake `pointerEvents` directly into the shared object (they probably shouldn't, per RESEARCH §4.1 — but if they do, this is the convention).

### Style-array composition

**Source:** `App.tsx:780`, `App.tsx:798`, and elsewhere in the codebase (e.g. `CONVENTIONS.md:234` shows `<Text style={[styles.label, { color: colors.textSecondary }]}>`).

The codebase uniformly uses `style={[base, override1, override2]}` arrays to layer style objects. The RenterListings call site (line 780) already uses 2-element form; appending a third element for `pointerEvents` is the idiomatic extension.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/phases/01-nav-reliability/videos/` | empty-dir anchor | n/a | First `videos/` directory in repo. No convention exists. |

All other files in this phase have clean in-repo analogs (either self-extension of the same file, or a sibling section/document).

---

## Intentionally Out of Scope for Pattern Mapping

Per the pattern-mapping context these are NOT covered:

- **Diagnostic log sites (lines 337-388, 184-297, BottomNavigator onPress handlers):** RESEARCH §2.1-2.4 already provides exact `console.log` strings and line numbers. No pattern lookup needed.
- **Test patterns:** Per `01-VALIDATION.md`, this phase has no automated tests. Manual physical-device QA only (D-03).
- **i18n keys / UI strings:** No new UI strings in Phase 1. `src/locales/en.json` / `ru.json` untouched.
- **23-dep BackHandler refactor shape:** Deferred unless C2 confirms. RESEARCH §2.2 fix-if-C2-confirmed already contains the full replacement code. Pattern map does not pre-specify.

---

## Metadata

**Analog search scope:**
- `App.tsx` (single file — the only source-code file this phase touches)
- `.planning/codebase/CONVENTIONS.md` (section-structure template source)
- `.planning/phases/01-nav-reliability/` (phase-dir doc-structure templates)
- `src/` (grep for existing `pointerEvents` usage — confirmed 4 pre-existing call sites, all orthogonal to this phase)

**Files scanned:** 1 source file (`App.tsx`), 1 convention doc, 3 phase docs, plus targeted greps across `src/`.

**Pattern extraction date:** 2026-04-22

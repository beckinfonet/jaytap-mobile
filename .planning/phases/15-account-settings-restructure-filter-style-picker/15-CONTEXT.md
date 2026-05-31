# Phase 15: Account Settings Restructure + Filter-Style Picker — Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Three things ship on top of Phase 13's `useFilterStyle()` hook + Phase 14's `filters.*` namespace + Phase 12's palette tokens:

1. **AccountSettingsScreen restructured into the handoff's Direction A layout** — three labelled sections (ACCOUNT / PREFERENCES / DANGER ZONE) per handoff `profile-screens.jsx:263-297`. Section labels use the uppercase letter-spaced typographic treatment from `profile-shared.jsx:88-95` (12pt / weight 700 / `letterSpacing: 1.1` / `colors.textTertiary` — the "mute" equivalent). A fourth conditional **APPLICATION** section mounts between PREFERENCES and DANGER ZONE for non-landlord users, preserving today's "Become a Landlord" entry-point (Phase 4.5 `!canListProperties && onApplyLandlord` gate).

2. **`<FilterStyleRow>` expandable picker** inside PREFERENCES — handoff `profile-shared.jsx:140-174` pattern. Collapsed: sliders icon + "Search filter style" title + "How property filters appear" subtitle + current-value label + rotating chevron. Expanded: lists all 4 styles (Guided Steps / Cascading / Master–Detail / Sentence) each with icon + name + one-line description + radio. Guided + Cascading selectable (write via `useFilterStyle().setFilterStyle()`); Master–Detail + Sentence rendered with a "Coming soon" pill badge + hollow disabled radio + non-pressable. SET-02 spec maps verbatim to this component.

3. **Whole-screen Phase 12 token migration** — the existing screen still uses a hardcoded `themeStyles` block (`AccountSettingsScreen.tsx:71-79`) with iOS-Settings hex literals (#000 / #1E1E1E / #F2F2F7 / #FFFFFF / #3B82F6 / #FF453A). Phase 15 rips that block and rewrites every render-site against `colors.*` tokens shipped by Phase 12 (background / surface / bgDim / surface2 / hair2 / text / textSecondary / textTertiary / accent / accentSoft / accentLine / destructiveRed / iconChipFg). Accent flips from iOS blue → handoff pink (`colors.accent = #ff5a6f`); danger flips to `colors.destructiveRed = #ff4d4d`.

Every existing surface preserved verbatim per SET-03: Account info fields (FirstName / LastName / Phone / WhatsApp / Telegram) with edit-mode toggle + save flow; Language sliding-pill toggle (`LanguageContext.setLanguage()`); Delete account → `DeleteAccountModal`; Landlord application entry-point (Phase 4.5). Edit affordance moves from top-right pencil-only icon to the handoff's "✎ Edit" link inside the SectionLabel's `action` slot (pink accent + `Pencil` Lucide icon + "Edit" text).

Out of scope (deferred to other phases per ROADMAP + REQUIREMENTS): Master–Detail / Sentence variants becoming functional (FILT-04 / FILT-05 / SET-04 → Phase B); moving the HomeScreen header language pill into Account Settings (memory `m6-language-pill-stays-in-header.md` — explicitly rejected); Profile reskin (Phase 16); backend changes; server-side `filterStyle` sync (memory `m6-scope-decisions-2026-05-31.md` — device-local only).

</domain>

<decisions>
## Implementation Decisions

### Layout — Direction A (handoff `profile-screens.jsx:263-297`)

- **D-01: Three labelled sections — ACCOUNT / PREFERENCES / DANGER ZONE — in that order.** Maps SET-01 verbatim to handoff Direction A. Direction B (preview-cards) NOT adopted; SET-02 explicitly specifies an expandable row, which is Direction A's `FilterStyleRow`. Section gap = 22pt (handoff line 269). Outer scroll container padding = `padding: '2px 16px 110px'` (handoff line 269) — bottom 110pt clears the BottomNavigator overlay (`nav-overlay-hides-bottom-nav.md` — not relevant here since AccountSettings is full-screen route, but the safe-area inset stays).

- **D-02: Conditional 4th APPLICATION section mounts between PREFERENCES and DANGER ZONE.** Section label `APPLICATION` (shorter than today's "APPLICATION STATUS" — matches handoff uppercase rhythm). Only renders when today's gate holds: `!canListProperties && onApplyLandlord`. Card contains a single Row with `ChevronRight` chevron + "Become a Landlord" label (existing `landlordApp.becomeLandlord` key reused). Tapping calls `onApplyLandlord` prop (no change to App.tsx callsite). This is the closest-to-handoff structure that preserves SET-03 "no regression" — handoff doesn't show this section because the prototype assumes an authenticated landlord; the conditional means it's invisible for the same users the handoff modelled.

### Filter-style picker — `<FilterStyleRow>` (SET-02 / handoff `profile-shared.jsx:140-174`)

- **D-03: New component `src/components/FilterStyleRow.tsx`.** Stateful (manages `open` boolean internally for the expand/collapse). Reads `{ filterStyle, setFilterStyle }` from `useFilterStyle()` directly (Phase 13 `FilterStyleContext`) — does NOT take them as props. This keeps AccountSettingsScreen agnostic of filter-style internals; the row is self-contained.
  - **Why standalone component, not inline JSX in AccountSettingsScreen:** the collapsed/expanded state + 4 sub-rows + animation hook + "Coming soon" gating is ~140 LOC. Inlining bloats AccountSettingsScreen (already 516 LOC). Project precedent for "Settings sub-component": `LanguageToggleSwitch.tsx`, `ThemeToggleSwitch.tsx`, `EmailVerifyBanner.tsx` — small self-contained units.
  - **Why not in `src/components/filters/`:** the `filters/` directory holds the 4 filter variant UIs + their shared primitives. `FilterStyleRow` is a Settings-domain affordance that happens to write a filter preference — it's UI surface for the picker, not a filter UI itself. Lives at the components root.

- **D-04: 4 styles rendered from a shared `FILTER_STYLES` constant** (mirrors handoff `profile-shared.jsx:65-70`). Constant exported from `src/components/FilterStyleRow.tsx`:
  ```ts
  export const FILTER_STYLES: Array<{
    id: FilterStyle;
    labelKey: string;
    descKey: string;
    icon: LucideIcon;
    enabled: boolean;
  }> = [
    { id: 'guided',    labelKey: 'filters.style.guided',    descKey: 'filters.style.guidedDesc',    icon: ListChecks,  enabled: true  },
    { id: 'cascading', labelKey: 'filters.style.cascading', descKey: 'filters.style.cascadingDesc', icon: Layers,      enabled: true  },
    { id: 'master',    labelKey: 'filters.style.master',    descKey: 'filters.style.masterDesc',    icon: Columns2,    enabled: false },
    { id: 'sentence',  labelKey: 'filters.style.sentence',  descKey: 'filters.style.sentenceDesc',  icon: Quote,       enabled: false },
  ];
  ```
  Lucide icon picks: `ListChecks` (one-choice-at-a-time stepper feel), `Layers` (inline layers), `Columns2` (master-detail), `Quote` (sentence builder). Approximates handoff's `fs-steps` / `fs-layers` / `fs-columns` / `fs-quote` glyphs. Plan executor can substitute if a closer Lucide match exists.

- **D-05: Expand/collapse animation.** Chevron rotates 0° → 90° via `Animated.timing(rotate, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true })` interpolated to `rotateZ`. Body uses `LayoutAnimation.easeInEaseOut()` for the height transition (Android needs `UIManager.setLayoutAnimationEnabledExperimental(true)` — already wired at HomeScreen.tsx:22; safe to add here too). No reanimated. Mirrors Phase 14 D-11 (RN core `Animated` for single-purpose transitions).

- **D-06: "Coming soon" visual treatment for Master–Detail + Sentence rows.** Three-element disabled state:
  1. Row text in `colors.textSecondary` (60% opacity equivalent), icon in `colors.textTertiary`.
  2. Small uppercase pill badge to the RIGHT of the row text (just before the radio): `padding: '3px 8px'`, `borderRadius: 999`, `backgroundColor: colors.surface2`, `color: colors.textTertiary`, `fontSize: 10`, `fontWeight: 700`, `letterSpacing: 0.6`. Text: i18n `filters.style.comingSoon` ("Coming soon" / "Скоро").
  3. Hollow disabled radio: 22pt circle, `borderWidth: 1.75`, `borderColor: colors.hair2`, NO fill, NO check glyph.
  4. Row is `<Pressable disabled accessibilityState={{ disabled: true }}>` — no onPress, no tap feedback, no Alert. Quiet by design.
  - Tapping does nothing — including no Alert. Curiosity is satisfied by the badge itself; an Alert adds another i18n string for low information value.

- **D-07: Live-swap path (SC3).** Picker calls `useFilterStyle().setFilterStyle(id)`. Phase 13 `FilterStyleContext` rerenders every consumer including HomeScreen's variant dispatcher (Phase 14 D-05). Next HomeScreen filter-button press opens the new variant. No app restart, no remount, no focus event. Async setter — picker `await`s it so the row's right-edge value updates after persistence (matches `LanguageContext.setLanguage` pattern). Verifying this in the user's hands: pick Cascading in Settings → back to Home → tap filter button → Cascading panel opens. That's SC3.

### Whole-screen token migration

- **D-08: Rip `themeStyles{}` block (lines 71-79) entirely; rewrite every render-site against `colors.*`.** Mapping table:
  | Today | Phase 15 |
  |---|---|
  | `themeStyles.background` (`#000` dark / `#F2F2F7` light) | `colors.background` (`#121214` / `#f3f3f6`) |
  | `themeStyles.surface` (`#1E1E1E` / `#FFFFFF`) | `colors.surface` (`#1c1c20` / `#ffffff`) |
  | `themeStyles.text` (`#FFFFFF` / `#000000`) | `colors.text` (`#f4f4f6` / `#16161a`) |
  | `themeStyles.textSecondary` (`#8E8E93` / `#3C3C4399`) | `colors.textSecondary` |
  | `themeStyles.border` (`#2C2C2E` / `#E5E5EA`) | `colors.hair2` |
  | `themeStyles.accent` (iOS blue `#3B82F6`) | `colors.accent` (handoff pink `#ff5a6f`) |
  | `themeStyles.danger` (`#FF453A`) | `colors.destructiveRed` (`#ff4d4d`) |
  | inline `isDark ? '#FFF' : '#000'` (lines 141) | `colors.text` |
  | inline `isDark ? '#2C2C2E' : '#E8E8ED'` (line 215) | `colors.surface2` |

  Sweep also drops the in-screen `{ isDark }` destructure from `useTheme()` since no remaining call site needs the boolean — keep `colors` only. KeyboardAwareScrollView keeps `bottomOffset={20}`.

- **D-09: Accent flips iOS blue → handoff pink.** Surfaces affected: back-arrow chevron (`AccountSettingsScreen.tsx:174`), section title color (no longer needed — sections become uppercase muted per D-01), pencil "Edit" link (handoff D-10), Save button background (line 327). All read `colors.accent`. The visual delta is significant (blue → pink) but consistent with the rest of M6.

### Edit affordance — handoff "✎ Edit" link in SectionLabel action slot

- **D-10: `<SectionLabel>` action slot holds an `<EditLink>` for ACCOUNT only.** Layout: `<SectionLabel action={<EditLink onPress={toggleEdit} isEditing={isEditing}/>}>ACCOUNT</SectionLabel>`. EditLink renders:
  - When `!isEditing`: pink-accent inline row of `<Pencil size={15}/>` + "Edit" text (`colors.accent`, `fontSize: 13`, `fontWeight: 600`). Tap toggles edit mode.
  - When `isEditing`: nothing (`return null`) — the Save / Cancel buttons inside the ACCOUNT card take over.
  - i18n key: `common.edit` (likely already exists; if not, add EN "Edit" / RU "Изменить" in Plan 15-01).

- **D-11: Save / Cancel buttons render INSIDE the ACCOUNT card** as the bottom rows of the card (not below it). Matches handoff "edit mode is a card state" feel. Card becomes:
  ```
  ┌─ ACCOUNT card ─────────────────┐
  │ FirstName row                  │
  │ LastName row                   │
  │ Phone row                      │
  │ WhatsApp row                   │
  │ Telegram row                   │
  │ ──── (when isEditing) ──────── │
  │ [Cancel] [Save]                │
  └────────────────────────────────┘
  ```
  Cancel: `colors.surface2` background, `colors.text` text, hair2 border. Save: `colors.accent` background, `colors.onAccent` text. Buttons share `flexDirection: 'row'` with `gap: 12` inside a row that has card padding. Removes today's `styles.actionButtonsContainer` separate block.

### Section primitives

- **D-12: New `<SectionLabel>` shared component at `src/components/SectionLabel.tsx`.** Pure presentational; reusable by Phase 16 Profile reskin (which has similar ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS sections). Shape:
  ```tsx
  type Props = { children: string; action?: React.ReactNode };
  export const SectionLabel: React.FC<Props> = ({ children, action }) => {
    const { colors } = useTheme();
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>{children}</Text>
        {action}
      </View>
    );
  };
  // styles.label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 }
  // styles.row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 10 }
  ```
  Lives at the components root (not under any sub-domain) because it's a project-shared layout primitive. Co-located test `SectionLabel.test.tsx` snapshots the typography + action-slot wiring.

- **D-13: New `<Card>` wrapper component NOT extracted.** The handoff has a generic `Card` (`profile-shared.jsx:97-99`); Phase 15 inlines it as `<View style={[styles.card, { backgroundColor: colors.surface }]}>` because there are only 3 cards in the screen (ACCOUNT info, FilterStyleRow, DANGER ZONE delete, optional APPLICATION) and they don't share much beyond `borderRadius: 20, overflow: 'hidden'`. If Phase 16 Profile reskin finds it useful, extract then.

### i18n namespace split

- **D-14: Three namespace areas.**
  - **`filters.style.*`** (Phase 14 namespace extended) — style names + descriptions + the badge string. New keys:
    - `filters.style.guided` ("Guided steps" / "Пошаговый")
    - `filters.style.cascading` ("Cascading" / "Каскадный")
    - `filters.style.master` ("Master–detail" / "Категории и типы")
    - `filters.style.sentence` ("Sentence" / "Предложение")
    - `filters.style.guidedDesc` ("One choice at a time" / "По одному шагу")
    - `filters.style.cascadingDesc` ("All levels inline" / "Все уровни сразу")
    - `filters.style.masterDesc` ("Categories + types" / "Категории и типы")
    - `filters.style.sentenceDesc` ("Plain-language builder" / "Конструктор-фраза")
    - `filters.style.comingSoon` ("Coming soon" / "Скоро")
  - **`accountSettings.section.*`** — uppercase section labels:
    - `accountSettings.section.account` ("ACCOUNT" / "АККАУНТ")
    - `accountSettings.section.preferences` ("PREFERENCES" / "НАСТРОЙКИ")
    - `accountSettings.section.application` ("APPLICATION" / "ЗАЯВКА")
    - `accountSettings.section.dangerZone` ("DANGER ZONE" / "ОПАСНАЯ ЗОНА")
  - **`accountSettings.filterPicker.*`** — picker chrome:
    - `accountSettings.filterPicker.title` ("Search filter style" / "Стиль поиска")
    - `accountSettings.filterPicker.subtitle` ("How property filters appear" / "Как выглядят фильтры")
  - **`common.edit`** ("Edit" / "Изменить") — likely already exists; check first.

  EN+RU parity gate (`scripts/check-i18n-parity.sh`) runs per-plan. Cyrillic translations above are first-pass guesses — a native-RU pass is welcome but not blocking.

### Plan split

- **D-15: Two atomic plans.**
  - **Plan 15-01 — Screen restructure + token migration + SectionLabel primitive + APPLICATION section.** Create `src/components/SectionLabel.tsx` + tests. Rewrite `src/screens/AccountSettingsScreen.tsx` to the 3-section (+1 conditional) layout. Rip `themeStyles{}` block; swap every hex to `colors.*` per D-08. Flip accent → pink (D-09). Move "✎ Edit" affordance to SectionLabel action slot (D-10). Move Save/Cancel inside ACCOUNT card (D-11). Add `accountSettings.section.*` + `common.edit` i18n keys (if `common.edit` missing). Atomic commit. **Acceptance:** SET-01 SC1 + SET-03 SC4 satisfied; existing Account info edit + save flow works verbatim; Language toggle preserved; Delete account modal still routes; APPLICATION section appears only when `!canListProperties && onApplyLandlord`; i18n parity exit 0; tsc 0 new errors; KBD-02 grep gate stays 0; on-device walk APPROVED for iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark.
  - **Plan 15-02 — `<FilterStyleRow>` + filter-style picker behavior + i18n.** Create `src/components/FilterStyleRow.tsx` + tests covering: collapsed state shows current style label + chevron; expanded state lists 4 rows with correct icons + descriptions; tap on Guided/Cascading writes via `setFilterStyle()` and visually selects; tap on Master/Sentence is a no-op (Pressable disabled); "Coming soon" badge renders on the 2 disabled rows; chevron rotates on open. Mount inside AccountSettingsScreen PREFERENCES section (below Language toggle). Add `filters.style.*` i18n keys per D-14. Atomic commit. **Acceptance:** SET-02 SC2 + SC3 satisfied; SC3 live-swap proven by setting picker then pressing HomeScreen filter button — opens correct variant per Phase 14; i18n parity exit 0; tsc 0 new errors; co-located tests green.

  **Why split this way:** Plan 15-01 is the brownfield rewrite (every existing surface preserved + token swap + structural change — biggest risk surface, biggest test surface). Plan 15-02 layers on the new affordance. Mid-execution rollback is clean: if 15-02 turns out wrong, 15-01 has already delivered SET-01 + SET-03 + the visual coherence improvement. Mirrors Phase 13 D-08 (two-plan project shape).

### Claude's Discretion

These are decided per `feedback-discuss-phase-detail-level.md` (only escalate gray areas with real stakes):

- **D-16: Currently-selected style rendered at the RIGHT edge of the collapsed picker row** (handoff verbatim — `profile-shared.jsx:152` shows `<span style={{ color: fp.dim }}>{cur.label}</span>` to the right of the title + subtitle, before the chevron). SC3 phrasing "subtitle ... ('Currently: Guided Steps')" is loose — we read it as "the current value must be visible from the collapsed state" which the right-edge label satisfies. Avoids a redundant "Currently:" prefix.

- **D-17: Currently-selected style ALSO rendered as the radio-fill state** in the expanded body (handoff line 166: filled accent radio + check glyph). So the source-of-truth is double-visible: right-edge label collapsed, radio + accent-soft row background expanded.

- **D-18: Lucide icon for picker collapsed-row** — `SlidersHorizontal` (closest to handoff's `sliders` glyph at line 28). 38×38pt rounded-square chip with `colors.surface2` background + `colors.iconChipFg` icon color. Matches Phase 16's "38px icon chip" anatomy (already documented in `colors.iconChipFg` token comment).

- **D-19: APPLICATION section label = "APPLICATION"** (single word, uppercase, ~12 chars Cyrillic). Today's "APPLICATION STATUS" feels redundant given the row's own label "Become a Landlord" carries the actual call-to-action. Shorter sits better in handoff rhythm.

- **D-20: Co-located tests** — `SectionLabel.test.tsx`, `FilterStyleRow.test.tsx`, plus updates to any existing `AccountSettingsScreen.test.tsx` (if present; if not, the existing edit/save/delete flows are exercised via the screen-level interaction tests that Plan 15-01 should ship to lock SET-03 regression). Mirrors project convention from `getTourPhotosUrl.test.ts` / `buildFilterQuery.test.ts` / Phase 14 primitives.

- **D-21: Coming-soon copy is short** — "Coming soon" (EN) / "Скоро" (RU). Avoids longer phrasing like "В разработке" that crowds the pill. Native-RU review can refine.

- **D-22: Save/Cancel button heights stay 50pt** (existing line 486/498) — preserves muscle memory; only the placement changes. Border radius bumps from 12 → 14 to match the new card radius rhythm (handoff uses 14 for buttons inside cards).

- **D-23: Hit-slop on chevron-rotate button** — `hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }` (the row itself is already 50pt tall, well past iOS HIG 44pt min, so this is belt-and-suspenders).

- **D-24: No PropertyDetailsScreen / HomeScreen / ProfileScreen edits.** Phase 15 changes only AccountSettingsScreen + adds 2 components. Other consumers of `useFilterStyle` (Phase 14's HomeScreen) get the live-swap for free via context.

- **D-25: KeyboardAwareScrollView stays** (line 180). Phone / WhatsApp / Telegram fields are TextInputs; the keyboard-aware wrap is load-bearing per `m1-keyboard-kbd-02-invariants.md`. Existing `bottomOffset={20}` preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MoveIn Design Handoff (Account Settings + Filter-style picker)

- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-screens.jsx` lines 263–297 (Direction A `AccountSettingsA`) — Section order, gap, padding, identity of each section. Phase 15 maps Direction A verbatim + adds optional APPLICATION row.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-shared.jsx` lines 88–95 (`SectionLabel`) — Typography spec (fontSize 12, weight 700, letterSpacing 1.1, color = mute). Phase 15 D-12 extracts as primitive.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-shared.jsx` lines 140–174 (`FilterStyleRow` — Direction A expandable picker) — Authoritative shape for the picker: collapsed row anatomy, chevron rotate, expanded body, per-style row (icon + name + desc + radio), selected-state visual (accent-soft bg + accent-line border + filled accent radio + accent name color). Phase 15 D-03–D-06 + D-16–D-18 map to this.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-shared.jsx` lines 65–70 (`FILTER_STYLES` data) — 4-style array shape. Phase 15 D-04 mirrors with i18n keys + enabled flag.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/README.md` §"Account Settings" (lines 80–95) — Section list + interaction notes (live-swap, filter style is a preference). Phase 15 D-07 + SC3 cite this.

Re-extract from `MoveIn_ Real Estate_LD_Mode.zip` if `/tmp` is stale.

### Project Planning Context

- `.planning/REQUIREMENTS.md` §M6 / SET-01 / SET-02 / SET-03 — Phase 15 requirement bodies (3 reqs).
- `.planning/ROADMAP.md` §Phase 15 — Goal + 5 Success Criteria + Depends-on (Phase 12 ✅ + Phase 13 ✅; cross-cuts Phase 14 ✅ — the variants the picker selects between).
- `.planning/PROJECT.md` — M6 current focus context; "variants are the value" memory + handoff source location.
- `.planning/STATE.md` — Phases 12 / 13 / 14 closed; Phase 15 next.

### Phase 13 Foundation (read FIRST)

- `.planning/phases/13-shared-filter-data-model-asyncstorage-persistence/13-CONTEXT.md` — Locked Phase 13 decisions. D-01 + D-13 are the picker's contract: `useFilterStyle(): { filterStyle, setFilterStyle }`.
- `src/context/FilterStyleContext.tsx` — Phase 13 hook. Phase 15 picker imports `useFilterStyle` here (read + write).

### Phase 14 Cross-Cut (the variants this picker selects between)

- `.planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md` — D-05 HomeScreen variant dispatch (this is what live-swaps when picker writes); D-07 `filters.*` i18n namespace (Phase 15 extends with `filters.style.*` keys).
- `src/components/filters/GuidedFilterSheet.tsx` + `src/components/filters/CascadingFilter.tsx` — The two functional variants. Picker writes their selection.

### Phase 12 Palette Tokens (consumed verbatim)

- `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-CONTEXT.md` — D-04 MODE_INDEPENDENT_PALETTE, D-08 full token list. Phase 15 D-08 maps every hex to a Phase 12 token.
- `src/theme/colors.ts` — Single source of truth. Phase 15 uses: `background`, `bgDim`, `surface`, `surface2`, `hair2`, `text`, `textSecondary`, `textTertiary`, `iconChipFg`, `accent`, `accentSoft`, `accentLine`, `destructiveRed`, `onAccent`. Token-comment annotations in `colors.ts` reference Phase 15 explicitly for `bgDim` ("Phase 15 ACCOUNT section card dimming") and `destructiveRed` ("Phase 15 DANGER ZONE Delete-account row tint") — provisioning is already there.

### Codebase Anchors

- `src/screens/AccountSettingsScreen.tsx` (whole file, 516 LOC) — The brownfield surface Phase 15 rewrites.
  - Lines 71–79: `themeStyles{}` block — **DELETE in Plan 15-01.**
  - Lines 138–160: `renderInfoRow` helper — preserve, just swap color refs to `colors.*`.
  - Lines 171–178: header (back arrow + title + spacer) — preserve, swap accent.
  - Lines 186–205: MAIN INFORMATION section — REPLACE with ACCOUNT section using new SectionLabel + card.
  - Lines 207–294: Language section — REPLACE with PREFERENCES section containing Language sub-card + FilterStyleRow. Sliding-pill animation logic (lines 48–58, 222–246) PRESERVED verbatim — only colors swap.
  - Lines 298–314: Application Status section — REPLACE with conditional APPLICATION section (same gate `!canListProperties && onApplyLandlord`, same `onApplyLandlord` callback).
  - Lines 316–334: Action buttons container — MOVE inside ACCOUNT card per D-11.
  - Lines 336–342: Delete account link — REPLACE with DANGER ZONE section (Card containing Row with trash icon + "Delete account" label + chevron, `colors.destructiveRed` tint).
  - Lines 344–353: `DeleteAccountModal` — PRESERVE verbatim (no prop changes).
- `src/context/FilterStyleContext.tsx` — `useFilterStyle()` consumed by `FilterStyleRow`.
- `src/context/LanguageContext.tsx` — `useLanguage()` consumed by both AccountSettingsScreen (Language toggle) and FilterStyleRow (`t()`).
- `src/theme/ThemeContext.tsx` — `useTheme().colors` consumed throughout.
- `src/components/DeleteAccountModal.tsx` — Unchanged.
- `src/components/LanguageToggleSwitch.tsx` — Reference for an existing "settings sub-component" component shape.
- `src/components/EmailVerifyBanner.tsx` — Reference for an existing self-contained settings affordance (banner with i18n + theme + dismissal).
- `App.tsx:848-870` — Callsite for AccountSettingsScreen. Props unchanged (`onBack`, `onAccountDeleted`, `onApplyLandlord`). Phase 15 needs ZERO App.tsx edits.

### Pattern Precedents

- `src/components/StepperInput.tsx` (M4 Phase 7) — Reusable primitive with hit-slop + co-located test. SectionLabel + FilterStyleRow mirror this shape.
- `src/components/filters/primitives/*` (Phase 14) — Newest example of "small UI primitives + co-located test" pattern. Phase 15 SectionLabel + FilterStyleRow follow same convention.
- `src/utils/buildFilterQuery.test.ts` + `src/utils/getTourPhotosUrl.test.ts` — Co-located test convention.
- Phase 12 D-06 + Phase 13 D-08 + Phase 14 D-08 — Two-plan project-known shipping shape (Phase 14 expanded to three for more component code). Phase 15 D-15 mirrors Phase 13's two-plan shape.

### Hard Rules (CLAUDE.md + REQUIREMENTS.md §Hard rules)

- **CLAUDE.md no `react-navigation`:** AccountSettingsScreen continues using the App.tsx state-machine `onBack` callback. No nav library introduced.
- **CLAUDE.md M6 language pill stays in HomeScreen header** (memory `m6-language-pill-stays-in-header.md`): Phase 15 does NOT relocate the header's `<LanguageToggleSwitch>`. The Language toggle inside AccountSettings is a separate control (lines 207–294 today); both exist.
- **CLAUDE.md M6 filter variants are the value** (memory `m6-filter-variants-are-the-point.md`): the picker MUST list all 4 styles (per SET-02), with Guided + Cascading selectable + Master/Sentence "Coming soon". Don't collapse to one option.
- **CLAUDE.md no backend changes in M6:** Phase 15 client-only. No API call. No Mongoose change. Filter-style preference stays device-local AsyncStorage per Phase 13.
- **KBD-02:** `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0 (3-milestone invariant per `m1-keyboard-kbd-02-invariants.md`). Phase 15's KeyboardAwareScrollView stays at `bottomOffset={20}` — no `keyboardVerticalOffset` addition.
- **EN+RU bilingual parity:** `scripts/check-i18n-parity.sh` exit 0 after every plan that adds keys (Plans 15-01 + 15-02 each add a subset of the D-14 keys; parity gate is per-plan).
- **No Firebase SDK** (`no-firebase-sdk.md`): Phase 15 touches no auth-provider code (the existing `useAuth().user` + `useAuth().deleteAccount()` reads stay verbatim).
- **Reanimated 4.x peer constraint** (`reanimated-4-library-peer-constraint.md`): Phase 15 uses RN core `Animated` (D-05) — no peer-dep audit needed.
- **Subagent CWD-drift recurring** (`subagent-cwd-drift-recurring.md`): Planner MUST instruct executor to prepend `cd "$(git rev-parse --show-toplevel)" &&` to every Bash command + verify `git branch --show-current` before each commit. Pattern fired 3+ times.

### Gate Commands (run during Plan 15-01 + 15-02 verification)

- `npx jest src/components/SectionLabel.test.tsx src/components/FilterStyleRow.test.tsx` — primitive tests pass.
- `npx jest src/screens/AccountSettingsScreen` (if a test file lands) — screen regression tests pass.
- `npx tsc --noEmit` — zero NEW errors against pre-Phase-15 baseline (Phase 14 baseline carries through).
- `grep -rn "keyboardVerticalOffset" src/ | wc -l` — must equal 0.
- `scripts/check-i18n-parity.sh` — exit 0 after each plan that touches `src/locales/`.
- Plan 15-01 acceptance gate: `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` must return 0 matches (block fully removed). Sentinel for the migration being clean.
- Plan 15-02 acceptance gate: `grep -nE "useFilterStyle" src/components/FilterStyleRow.tsx` must return ≥1 match (picker uses the hook directly per D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/screens/AccountSettingsScreen.tsx:138-160`** — `renderInfoRow` helper already correct for the new ACCOUNT card. Just swap color references to `colors.*` tokens.
- **`src/screens/AccountSettingsScreen.tsx:48-58 + 222-246`** — Sliding-pill `Animated.Value` machinery for the Language toggle. Preserved verbatim; only background/accent colors swap. The `langSlide` interpolation logic is load-bearing.
- **`src/screens/AccountSettingsScreen.tsx:85-103`** — `loadProfile` async fetch + state hydration. Preserved verbatim — no shape change.
- **`src/screens/AccountSettingsScreen.tsx:105-136`** — `handleSave` validation + persistence. Preserved verbatim. Save-button placement changes per D-11 but the handler shape doesn't.
- **`src/context/FilterStyleContext.tsx`** — Phase 13 hook ready to consume. Plan 15-02 just imports `useFilterStyle()` inside `FilterStyleRow.tsx`.
- **`src/context/LanguageContext.tsx`** — `useLanguage().t()` already wired throughout. New i18n keys plug in without provider changes.
- **`src/theme/ThemeContext.tsx`** — `useTheme().colors` returns the Phase 12 token surface. Phase 15 D-08 swap is a pure call-site rewrite — no theme provider change.
- **Lucide icons** — `ChevronRight` already imported (line 16). New imports for Plan 15-01: `Pencil` (Edit link), `Trash2` (Delete account row icon). New imports for Plan 15-02: `SlidersHorizontal` (picker collapsed-row icon), `ChevronRight` (chevron rotate), `ListChecks` / `Layers` / `Columns2` / `Quote` (4 style icons), `Check` (selected radio glyph).

### Established Patterns

- **`src/components/<Single>.tsx` flat layout** — `SectionLabel.tsx` + `FilterStyleRow.tsx` live at the components root (mirrors `LanguageToggleSwitch.tsx`, `ThemeToggleSwitch.tsx`, `StepperInput.tsx`). The `filters/` subdirectory is reserved for the 4 filter variant UIs + their shared primitives; the picker is a Settings-domain affordance, not a filter UI.
- **`useTheme().colors.*` token reads** — No hex literals in component code. Phase 15 is the most-aggressive token-migration patch since Phase 12 itself.
- **Co-located tests** — `*.test.tsx` next to source. Project convention since M3+.
- **i18n key composition** — namespaced reads via `t('namespace.subnamespace.key')`. Phase 15 follows Phase 14's `filters.*` extension pattern.
- **Conditional sections via `{condition && <Section/>}`** — existing line 298 pattern. Phase 15 APPLICATION section uses the same shape.
- **`Animated.spring` for toggle pills + `Animated.timing` for one-shot transitions** — existing line 52 + Phase 14 sheet slide. Phase 15 chevron rotate uses `Animated.timing` (single-purpose).
- **`LayoutAnimation.easeInEaseOut()` for collapse/expand** — Phase 14 D-12 + this phase's FilterStyleRow open/close.
- **Brownfield rewrite within single file** — Phase 14 D-08 Plan 14-02 deleted 120 LOC of inline JSX + added new mount line atomically. Plan 15-01 does the same scale of brownfield surgery on AccountSettingsScreen.

### Integration Points

- **AccountSettingsScreen ↔ App.tsx callsite (lines 848-870)** — Props unchanged (`onBack`, `onAccountDeleted`, `onApplyLandlord`). Zero App.tsx edits.
- **AccountSettingsScreen ↔ AuthContext** — `useAuth().user` + `useAuth().deleteAccount()` reads unchanged.
- **AccountSettingsScreen ↔ LanguageContext** — `useLanguage().{language, setLanguage, t}` unchanged. Sliding-pill toggle preserved.
- **AccountSettingsScreen ↔ AuthService** — `getBackendUser` + `createBackendUser` calls unchanged.
- **AccountSettingsScreen ↔ DeleteAccountModal** — props unchanged (`visible`, `onClose`, `onConfirm`, `userEmail`).
- **FilterStyleRow ↔ FilterStyleContext** — read+write the `filterStyle` value. No middleware. Phase 14 HomeScreen variant dispatch picks up the next-press behavior change for free.
- **No backend round-trip** — `filterStyle` is device-local AsyncStorage per Phase 13. Phase 15 does not call any API.
- **No new keyboard-aware screens** — Phase 15 surface continues to use the existing `KeyboardAwareScrollView` for the Phone / WhatsApp / Telegram inputs. KBD-02 grep gate trivially preserved.
- **Phase 16 forward-fit** — `SectionLabel` primitive is intentionally project-shared (D-12). Phase 16 Profile reskin will consume it for ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS section labels.

</code_context>

<specifics>
## Specific Ideas

- **Card shadow** per handoff `profile-shared.jsx:97-99`: `borderRadius: 20, overflow: 'hidden'` + (Android-only) `elevation: 1` for a hair of separation from the bg. iOS gets no shadow — the surface delta against `colors.background` (e.g. `#1c1c20` on `#121214` in dark) is the separation cue.
- **Edit link icon-text gap** — 5pt (handoff line 271). `flexDirection: 'row', alignItems: 'center', gap: 5`.
- **FilterStyleRow collapsed-row layout** — `padding: '15px 16px'` (handoff line 146). Inner gaps: icon→text 14pt; text→right-edge value 8pt; value→chevron 8pt.
- **FilterStyleRow expanded-row layout** — `padding: 8` outer, each sub-row `padding: '12px 12px'` + `borderRadius: 13` + `marginBottom: 4` (handoff lines 156, 160).
- **Selected expanded-row visual** — `backgroundColor: colors.accentSoft`, `borderWidth: 1.5`, `borderColor: colors.accentLine`, name text `colors.text` (vs `colors.textSecondary` for unselected), radio filled `colors.accent` + check glyph `colors.onAccent`.
- **Filled radio dimensions** — 22pt diameter (handoff line 166). `borderRadius: 999`. Selected: `backgroundColor: colors.accent` + `borderWidth: 1.75` + `borderColor: colors.accent` + nested `<Check size={13} color={colors.onAccent}/>`. Unselected: transparent bg + `borderColor: colors.hair2`.
- **Chevron rotate** — start `0`, end `90` (handoff line 153 `transform: open ? 'rotate(90deg)' : 'none'`). RN equivalent: `transform: [{ rotateZ: rotateInterpolation }]` where `rotateInterpolation = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] })`.
- **Delete account row** — Trash icon in red-tinted chip (`backgroundColor: 'rgba(255,77,77,0.13)'` — handoff line 111), label "Delete account" in `colors.destructiveRed`, subtitle "Permanently remove your data" in `colors.textSecondary`, chevron right. Tap opens `DeleteAccountModal` (existing behavior).
- **Section gap** — `marginBottom: 24` between section blocks + `marginBottom: 12` between SectionLabel and first card (handoff lines 269, 277).
- **APPLICATION section card** — Single Row with: `ChevronRight` chevron + "Become a Landlord" label (`landlordApp.becomeLandlord` existing key) + no icon (or briefcase icon if Lucide has a fitting one — `Briefcase` works). Row tap calls `onApplyLandlord`.
- **Save button text color** — `colors.onAccent` (white). Cancel button text color — `colors.text` (theme primary).
- **Edit-mode subtle background tint on ACCOUNT card** — OPTIONAL polish: when `isEditing`, card bg shifts from `colors.surface` to `colors.bgDim` to signal mode. Skip for v1; revisit during on-device walk if it feels needed.
- **Test fixtures** — `FilterStyleRow.test.tsx` mocks `useFilterStyle()` to return both default ('guided') and post-pick ('cascading') states; verifies right-edge label updates + radio visual swap. Mocks `react-native-async-storage/async-storage` via the existing project jest-setup if needed.

</specifics>

<deferred>
## Deferred Ideas

- **SET-04 — Un-gate Master-Detail + Sentence options** in the picker once FILT-04 + FILT-05 ship. M6 Phase B. Phase 15 lands the "Coming soon" badge as forward-fit affordance.
- **Server-side `filterStyle` sync** — Per `m6-scope-decisions-2026-05-31.md`, preference is per-device. M7+ only if cross-device drift becomes a complaint.
- **`Card` primitive extraction** — Phase 15 inlines `<View style={[styles.card]}>` (D-13). Phase 16 Profile reskin can extract if reuse emerges.
- **Edit-mode card bg tint** (last bullet in §Specifics) — Skip for v1; revisit during on-device walk.
- **Filter-style picker preview thumbnails** — Direction B (preview cards) shows mini representations of each variant. Not adopted (Direction A locked by SET-02). Future polish if a "more visual" picker is requested.
- **Per-property-type EN/RU localization in the picker descriptions** — Picker descriptions ("One choice at a time" etc.) are picker chrome strings, NOT property labels. M4 Phase 9 `propertyType.*` namespace doesn't apply here.
- **Animated transition between Account Settings sections** — Scrolled list; no cross-section animation. If polish desired later, M7+ stagger-fade-in on scroll.
- **Re-skin DeleteAccountModal** — Out of Phase 15. The modal renders correctly with Phase 12 tokens already (verified at Phase 12 VR sweep). If a visual gap appears during on-device walk, file as quick-task.
- **Move Language toggle out** — Memory `m6-language-pill-stays-in-header.md` keeps the header pill; the in-screen Language toggle stays in PREFERENCES too. No removal.
- **Picker telemetry** (e.g. log when user changes style) — No analytics in JayTap today. Don't add for one event.
- **"Reset to default" affordance** for filter-style — Picker doesn't have one. If user picks Cascading and wants Guided back, they pick Guided. Trivial; no Reset needed.
- **Forward-fit hook signature** for future variants — `useFilterStyle` returns `{ filterStyle, setFilterStyle }`. If Phase B needs e.g. an `availableStyles` derived value, add then.

</deferred>

---

*Phase: 15-account-settings-restructure-filter-style-picker*
*Context gathered: 2026-05-31*

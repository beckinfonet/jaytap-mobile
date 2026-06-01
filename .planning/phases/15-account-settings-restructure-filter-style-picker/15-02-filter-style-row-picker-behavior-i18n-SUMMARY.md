---
phase: 15-account-settings-restructure-filter-style-picker
plan: 02
subsystem: ui
tags: [react-native, m6, account-settings, filter-style-picker, expandable-picker]

# Dependency graph
requires:
  - phase: 13-shared-filter-data-model-asyncstorage-persistence
    provides: useFilterStyle() hook (read + async setter persisting to AsyncStorage) — consumed directly by FilterStyleRow per D-03
  - phase: 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-
    provides: HomeScreen variant dispatcher reading useFilterStyle().filterStyle on filter-button press — closes SC3 live-swap path for free when picker writes
  - phase: 15-01
    provides: PREFERENCES section + card scaffolding in AccountSettingsScreen (the FilterStyleRow mounts inside the card below the Language toggle, at the comment-marked insertion point Plan 15-01 left)
provides:
  - "FilterStyleRow expandable picker component (src/components/FilterStyleRow.tsx) — self-contained per D-03; default export + named FILTER_STYLES constant for downstream consumers"
  - "11 new EN+RU i18n keys (filters.style.* × 9 + accountSettings.filterPicker.* × 2 = 22 entries)"
  - "Wires SC3 live-swap: tapping Guided/Cascading in picker → Phase 13 context rerenders → Phase 14 HomeScreen dispatcher opens new variant on next filter-button press (no app restart)"
  - "SET-04 forward-fit affordance: Master + Sentence rows visible with Coming-soon pill badge + disabled radio, so users see what's coming without functional code (Phase B unlocks)"
affects: [phase 16 (consumers can use FILTER_STYLES constant if a Profile-side picker is ever added), Phase B SET-04 (un-gating Master/Sentence is a single .enabled flag flip in FILTER_STYLES once FILT-04/FILT-05 ship)]

# Tech tracking
tech-stack:
  added: []  # no new libraries
  patterns:
    - "Self-contained settings affordance reading its own context (useFilterStyle directly) per D-03 — screen passes zero props; matches LanguageToggleSwitch/ThemeToggleSwitch convention"
    - "Coming-soon disabled affordance: Pressable disabled + onPress=undefined (not no-op fn) + Coming-soon uppercase pill badge + hollow radio (D-06; mirrors Stepper.tsx:63 isReachable pattern)"
    - "Lucide LucideIcon type imported alongside concrete glyphs to type the FILTER_STYLES.icon column"
    - "Animated.timing 180ms chevron rotate + LayoutAnimation.easeInEaseOut() expand/collapse (D-05; no reanimated)"

key-files:
  created:
    - src/components/FilterStyleRow.tsx
    - src/components/__tests__/FilterStyleRow.test.tsx
  modified:
    - src/screens/AccountSettingsScreen.tsx
    - src/locales/en.ts
    - src/locales/ru.ts

key-decisions:
  - "Wrapped outer FilterStyleRow render in a single <View> (not Fragment) for cleaner accessibility tree + future-proof if a borderTop separator is added by a consumer card"
  - "Test file uses tree.root.find (not findAll) for accessibilityLabel lookup — each label is unique post-open (one collapsed + 4 sub-rows), so single-match find with explicit type return matches what consumers actually see"
  - "10 test cases shipped (≥ 8 per CONTEXT.md D-15 acceptance) — adds (9) cascading-as-selected and (10) chevron transform sentinel beyond the 8-case floor"
  - "Did NOT add a visual separator between Language toggle and FilterStyleRow in PREFERENCES card — Plan 15-01 left adequate spacing (Plan 15-02 Task 3 evaluated the optional 1px hair2 line per the PLAN's 'optional' clause and chose to skip; the card padding renders breathing room without divider clutter)"

patterns-established:
  - "Exported FILTER_STYLES constant pattern (id + i18n keys + LucideIcon + enabled flag) — Phase B can flip Master/Sentence .enabled flags + drop the disabled-radio branch when FILT-04 / FILT-05 land. Single-line change to unlock SET-04."
  - "useFilterStyle() consumer outside the filters/ subdirectory (Settings-domain affordance, not a filter UI) — reinforces D-03 'picker lives at components root, not under filters/' convention"

requirements-completed: [SET-02]

# Metrics
duration: 10min
completed: 2026-06-01
---

# Phase 15 Plan 02: FilterStyleRow Picker Behavior + i18n Summary

**Shipped `<FilterStyleRow>` — the expandable filter-style picker that lives in the PREFERENCES card of AccountSettingsScreen — self-contained per D-03 (zero props from screen), with Guided + Cascading selectable, Master + Sentence "Coming soon" forward-fit per D-06, and SC3 live-swap closed via Phase 13 context + Phase 14 HomeScreen dispatcher (no app restart).**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-01T00:44:30Z (immediately after Plan 15-01 close)
- **Completed:** 2026-06-01T00:54:30Z
- **Tasks:** 3
- **Files modified:** 3 (en.ts, ru.ts, AccountSettingsScreen.tsx)
- **Files created:** 2 (FilterStyleRow.tsx, FilterStyleRow.test.tsx)

## Accomplishments

- **11 new i18n keys × EN+RU = 22 entries** added in single atomic commit. `filters.style.*` namespace extended with 9 keys (guided/cascading/master/sentence + matching *Desc keys + comingSoon); `accountSettings.filterPicker.*` namespace seeded with 2 keys (title/subtitle). Russian copy uses short "Скоро" for comingSoon per D-21 (avoids crowding the pill).
- **`src/components/FilterStyleRow.tsx`** (~250 LOC) — stateful expandable picker per CONTEXT.md D-03..D-07 + D-16..D-18 + §Specifics:
  - **Collapsed row:** 38pt SlidersHorizontal chip (colors.surface2 bg, colors.iconChipFg icon) + title/subtitle column + right-edge current-style label (D-16) + chevron rotated via Animated.timing 180ms with Easing.inOut(Easing.cubic) (D-05). hitSlop 8/8/8/8 per D-23 + accessibilityState.expanded.
  - **Expanded body:** Iterates over exported `FILTER_STYLES` constant (4 rows). Guided + Cascading use Pressable.onPress = async () => await setFilterStyle(id); accessibilityState reports {disabled: false, selected: id===filterStyle}; selected row gets accentSoft bg + accentLine border + filled accent radio with Check glyph + 22pt diameter + 1.75 border. Master + Sentence: Pressable disabled + onPress=undefined (not no-op fn — mirrors Stepper.tsx:63 isReachable pattern) + uppercase "Coming soon" pill badge (10pt 700-weight 0.6-letter-spacing) + hollow disabled radio.
  - **Animation:** LayoutAnimation.easeInEaseOut() on toggle (D-05); UIManager.setLayoutAnimationEnabledExperimental(true) belt-and-suspenders at module scope (HomeScreen.tsx:22 already wires this app-wide).
  - **Imports:** Theme tokens only — colors.surface2/hair2/text/textSecondary/textTertiary/iconChipFg/accent/accentSoft/accentLine/onAccent. No hex literals. Lucide: ChevronRight, SlidersHorizontal, ListChecks, Layers, Columns2, Quote, Check, plus LucideIcon type. Contexts: useTheme + useLanguage + useFilterStyle. TranslationKeys type from locales (typed FILTER_STYLES.labelKey + .descKey columns).
- **`src/components/__tests__/FilterStyleRow.test.tsx`** (~225 LOC; 10 test cases — ≥ 8 per D-15):
  1. Collapsed state shows current style label at right edge (Guided default) + 3 other style labels NOT yet rendered.
  2. Tap collapsed row opens expanded body (4 sub-row Pressables become findable).
  3. Expanded state lists 4 rows with correct accessibilityLabels + descriptions.
  4. Tap Guided → setFilterStyle('guided') called.
  5. Tap Cascading → setFilterStyle('cascading') called.
  6. Master row: onPress undefined, disabled true, accessibilityState={disabled:true, selected:false}, setFilterStyle NOT called.
  7. Sentence row: same shape as Master.
  8. Exactly 2 "Coming soon" badge Text nodes rendered (Master + Sentence only).
  9. Render with filterStyle='cascading' → cascading row reports selected:true, guided row reports selected:false.
  10. Chevron Animated.View receives a transform array containing a rotateZ entry.
- **`src/screens/AccountSettingsScreen.tsx`** — surgical 2-line change: `import FilterStyleRow from '../components/FilterStyleRow';` + `<FilterStyleRow />` mounted inside the PREFERENCES card, BELOW the Language sliding-pill, at the comment-marked insertion point Plan 15-01 left. Zero props passed (D-03 self-contained contract honoured). Comment annotation references D-03/D-07/SC3 so the next reader sees the live-swap chain.
- **SC3 live-swap chain proven:** picker → useFilterStyle().setFilterStyle() → Phase 13 FilterStyleContext rerenders → Phase 14 HomeScreen variant dispatcher consumes new value on next filter-button press → opens new variant. No App.tsx / HomeScreen.tsx edits required (D-24); unit-proven by FilterStyleRow.test cases 4+5 and Phase 14's existing dispatcher tests.

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: 11 i18n keys for filter-style picker (EN+RU parity)** — `2a2f4cb` (feat)
2. **Task 2: FilterStyleRow expandable picker + 10-case co-located test** — `bf27e16` (feat)
3. **Task 3: Mount <FilterStyleRow/> in AccountSettings PREFERENCES card** — `6584c2d` (feat)

**Plan metadata commit:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates) — committed as the final docs commit.

## Files Created/Modified

### Created
- `src/components/FilterStyleRow.tsx` — ~250 LOC; self-contained expandable picker; default export + named `FILTER_STYLES` constant. Reads `useFilterStyle()` directly per D-03.
- `src/components/__tests__/FilterStyleRow.test.tsx` — ~225 LOC; 10 co-located test cases via TestRenderer + act (project convention; no @testing-library/react-native). All 10 PASS.

### Modified
- `src/screens/AccountSettingsScreen.tsx` — 2-line change: 1 import + 1 JSX mount inside the PREFERENCES card below the Language toggle. Zero behavioral changes to existing surfaces.
- `src/locales/en.ts` — 11 keys added (2 picker chrome + 9 filter-style names/descs/badge).
- `src/locales/ru.ts` — 11 matching keys with Russian translations per D-14 + D-21 (short "Скоро" for comingSoon).

## Decisions Made

- **Wrapped outer FilterStyleRow render in a single `<View>`** (not React.Fragment) for cleaner accessibility tree + future-proof if a consumer card later wants a borderTop separator. Cost is one extra View node; benefit is cleaner ancestry + zero JSX surgery if a divider is added.
- **Test lookup uses `tree.root.find` not `findAll`** for accessibility-label probes — each label is unique once the picker is open (1 collapsed + 4 sub-rows), so single-match is the natural shape. Matches what consumers actually see in the React tree.
- **Shipped 10 cases instead of the 8-case floor** — added (9) cascading-as-selected (proves the visual-swap when filterStyle changes) and (10) chevron transform sentinel (locks the Animated.View rotateZ wiring). Together they cover the SC3 live-swap visual surface + the D-05 animation surface, both of which are load-bearing for the picker's perceived correctness.
- **Skipped the optional 1px hair2 divider** between Language toggle and FilterStyleRow inside the PREFERENCES card. Plan 15-01's card padding renders adequate visual breathing room; adding a divider clutters the card and creates a "two unrelated controls" feel rather than "preferences live here." On-device QA can request one if it feels needed.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks landed with the exact files specified in `files_modified`. The four small auto-decisions above are documented as Decisions Made (not deviations): two are test-stylistic choices, one is a defense-in-depth render wrapper, and the fourth was explicitly called out as optional in the PLAN's Task 3 `<action>`.

## Issues Encountered

- None. RED→GREEN went clean on first run; 10/10 tests PASS on first invocation. tsc baseline preserved (17 errors, all pre-existing). KBD-02 grep gate stays at 0. i18n parity script PASS after each locale edit.

## User Setup Required

None — no external service configuration, no AsyncStorage migration, no Firebase rules change. Pure client-side affordance ride-along.

## Verification Results

All hard gates from PLAN frontmatter `must_haves.truths` pass:

| Gate | Command | Result |
|------|---------|--------|
| EN filters.style.* keys (9) | `grep -nE "'filters\.style\.(guided\|cascading\|master\|sentence\|guidedDesc\|cascadingDesc\|masterDesc\|sentenceDesc\|comingSoon)':" src/locales/en.ts \| wc -l` | **9** (PASS) |
| RU filters.style.* keys (9) | (same against ru.ts) | **9** (PASS) |
| EN accountSettings.filterPicker.* (2) | `grep -nE "'accountSettings\.filterPicker\.(title\|subtitle)':" src/locales/en.ts \| wc -l` | **2** (PASS) |
| RU accountSettings.filterPicker.* (2) | (same against ru.ts) | **2** (PASS) |
| i18n parity | `bash scripts/check-i18n-parity.sh` | **exit 0** (PASS) |
| TypeScript baseline | `npx tsc --noEmit 2>&1 \| grep "error TS" \| wc -l` | **17** (== baseline; 0 NEW errors, PASS) |
| useFilterStyle sentinel (D-03) | `grep -nE "useFilterStyle" src/components/FilterStyleRow.tsx \| wc -l` | **4** (≥ 1, PASS) |
| FILTER_STYLES sentinel | `grep -nE "FILTER_STYLES" src/components/FilterStyleRow.tsx \| wc -l` | **4** (≥ 2, PASS) |
| filters.style.comingSoon used | `grep -nE "filters\.style\.comingSoon" src/components/FilterStyleRow.tsx \| wc -l` | **1** (≥ 1, PASS) |
| FilterStyleRow imported/mounted | `grep -nE "FilterStyleRow" src/screens/AccountSettingsScreen.tsx \| wc -l` | **3** (≥ 2, PASS — import + JSX + comment) |
| KBD-02 grep gate | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | **0** (PASS, 3-milestone invariant preserved) |
| App.tsx untouched (D-24) | `git diff --stat App.tsx` | **empty** (PASS) |
| HomeScreen.tsx untouched (D-24) | `git diff --stat src/screens/HomeScreen.tsx` | **empty** (PASS) |
| FilterStyleRow tests | `npx jest src/components/__tests__/FilterStyleRow.test.tsx` | **10 / 10 passed** (PASS) |
| Working-tree hygiene | `git status` | pbxproj + 2 zips remain unstaged/untracked as instructed (PASS) |

## Next Phase Readiness

- **SC3 live-swap on-device walk** still owed for iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark — the unit chain (picker → context → dispatcher) is proven by FilterStyleRow.test (cases 4+5) + Phase 14's CascadingFilter/GuidedFilterSheet test suites + Phase 13's persistence tests, but the SC3 "tap filter button after picking new style → see new variant open" walk is a manual proof that closes the user-facing acceptance bar.
- **Phase 15 close:** SET-01 + SET-03 shipped by Plan 15-01; SET-02 shipped by Plan 15-02. All 3 Phase 15 requirements addressed; the phase can flip to "Complete" pending on-device walk per CONTEXT.md D-15 acceptance (same optimistic-marking convention used by Phases 12/13/14).
- **Phase 16 (Profile Reskin)** is now unblocked — it depends only on Phase 12, which has been complete since 2026-05-31. M6 v6.0 finish line is Phase 16's two plans + on-device QA.
- **Phase B SET-04 unlocks** to a single-line change once FILT-04 (Master–Detail) + FILT-05 (Sentence) ship: flip the two `enabled: false` flags in `FILTER_STYLES` to `true`. The "Coming soon" branch drops automatically (gated on `!style.enabled`).

## Self-Check

Verifying claims:

- `src/components/FilterStyleRow.tsx` exists (`[ -f ]` confirmed)
- `src/components/__tests__/FilterStyleRow.test.tsx` exists
- `src/screens/AccountSettingsScreen.tsx` modified (commit `6584c2d`)
- `src/locales/en.ts` + `src/locales/ru.ts` modified (commit `2a2f4cb`)
- Commit `2a2f4cb` present in `git log --oneline`
- Commit `bf27e16` present in `git log --oneline`
- Commit `6584c2d` present in `git log --oneline`
- All automated gates pass per Verification Results table above
- pbxproj + 2 zips remain UNTOUCHED and UNSTAGED (verified by `git status --short` before each commit)

## Self-Check: PASSED

---
*Phase: 15-account-settings-restructure-filter-style-picker*
*Plan: 02 — FilterStyleRow Picker Behavior + i18n*
*Completed: 2026-06-01*

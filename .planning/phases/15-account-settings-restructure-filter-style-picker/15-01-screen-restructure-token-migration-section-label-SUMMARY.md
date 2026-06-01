---
phase: 15-account-settings-restructure-filter-style-picker
plan: 01
subsystem: ui
tags: [react-native, m6, account-settings, palette-migration, brownfield-rewrite, section-label]

# Dependency graph
requires:
  - phase: 12-whole-app-palette-migration-dark-light-visual-regression-swe
    provides: colors.* token surface (background, surface, surface2, hair2, text, textSecondary, textTertiary, iconChipFg, accent, accentSoft, accentLine, onAccent, destructiveRed) consumed verbatim by the rewritten screen
provides:
  - "SectionLabel primitive (src/components/SectionLabel.tsx) — pure presentational uppercase letter-spaced label with optional action slot; Phase 16 forward-fit ready"
  - "AccountSettingsScreen restructured into ACCOUNT / PREFERENCES / [APPLICATION] / DANGER ZONE sections per MoveIn handoff Direction A"
  - "Pink-accent (#ff5a6f) Account Settings surface — themeStyles{} block eliminated; every render-site reads colors.* tokens"
  - "4 accountSettings.section.* EN+RU i18n keys (account, preferences, application, dangerZone)"
  - "EditLink inline subcomponent pattern (pencil + 'Edit' link inside SectionLabel action slot) — reusable convention for Phase 16"
  - "PREFERENCES card scaffolding (Language sliding-pill + reserved area for Plan 15-02 <FilterStyleRow/>)"
affects: [phase 15-02 (FilterStyleRow mounts inside the PREFERENCES card this plan created), phase 16 (Profile reskin consumes SectionLabel + EditLink patterns)]

# Tech tracking
tech-stack:
  added: []  # no new libraries — used existing react-native + lucide-react-native + react-native-keyboard-controller
  patterns:
    - "Inline EditLink subcomponent rendered through SectionLabel.action slot (D-10)"
    - "Save/Cancel buttons inside the card they edit, not in a global bottom row (D-11)"
    - "Inline Card (View with borderRadius 20 + overflow hidden) instead of extracted <Card/> primitive (D-13)"
    - "Phase 12 token migration via single useTheme().colors destructure — no isDark branching for color decisions"
    - "Co-located test for new component (CheckSquare convention) + skip optional screen test when mocking cost > regression value"

key-files:
  created:
    - src/components/SectionLabel.tsx
    - src/components/__tests__/SectionLabel.test.tsx
  modified:
    - src/screens/AccountSettingsScreen.tsx
    - src/locales/en.ts
    - src/locales/ru.ts

key-decisions:
  - "Skipped optional regression test src/screens/__tests__/AccountSettingsScreen.test.tsx (D-20 hedge applied) — mocking useAuth + AuthService + useLanguage + useTheme for ~150 LOC of brownfield surgery exceeds the test's regression value; rely on SectionLabel.test + tsc + i18n parity gate + Plan 15-02 + on-device QA instead"
  - "Removed unused 'Switch' import — leftover from pre-Phase-4.5 cosmetic toggle; flagged by TS but not tracked in baseline"
  - "Used 'colors.onAccent' (white) for the selected-language label color in the Language toggle pill instead of '#FFFFFF' hex (token-purity for the migration phase)"
  - "Inlined EditLink as a module-level subcomponent (not exported) — consumed only by AccountSettings's ACCOUNT card; Phase 16 may promote to shared primitive if reuse emerges"

patterns-established:
  - "SectionLabel + EditLink slot pattern: <SectionLabel action={<EditLink ... />}>UPPERCASE</SectionLabel> — Phase 16 ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS sections can adopt this verbatim"
  - "Card row with icon chip + label + chevron (38x38pt rounded chip + label/flex:1 + ChevronRight) — DANGER ZONE delete row + APPLICATION become-landlord row use the same shape; reusable for Phase 16 navigation rows"

requirements-completed: [SET-01, SET-03]

# Metrics
duration: 12min
completed: 2026-06-01
---

# Phase 15 Plan 01: Screen Restructure + Token Migration + SectionLabel Summary

**AccountSettingsScreen rewritten into MoveIn Direction-A 4-section layout (ACCOUNT / PREFERENCES / conditional APPLICATION / DANGER ZONE) with hardcoded themeStyles block ripped, every render-site migrated to Phase 12 colors.* tokens, accent flipped iOS-blue → handoff pink, and a reusable SectionLabel primitive extracted for Phase 16 forward-fit.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-01T00:32:30Z
- **Completed:** 2026-06-01T00:44:30Z
- **Tasks:** 2
- **Files modified:** 3 (en.ts, ru.ts, AccountSettingsScreen.tsx)
- **Files created:** 2 (SectionLabel.tsx, SectionLabel.test.tsx)

## Accomplishments

- New `SectionLabel` primitive (`src/components/SectionLabel.tsx`) — pure presentational uppercase letter-spaced label with optional action slot per handoff `profile-shared.jsx:88-95`. 3-case co-located test (`__tests__/SectionLabel.test.tsx`) covers label rendering, action slot present, action slot omitted. All 3 tests green.
- `AccountSettingsScreen.tsx` restructured into 4 labelled sections in handoff Direction-A order: ACCOUNT → PREFERENCES → (conditional APPLICATION when `!canListProperties && onApplyLandlord`) → DANGER ZONE. Every section header uses the new `<SectionLabel>` primitive (7 usages: 4 section headers + 3 internal in EditLink).
- `themeStyles{}` block (formerly lines 71-79) ripped entirely; every render-site now reads `useTheme().colors.*` Phase 12 tokens. `isDark` destructure dropped (no remaining call site). Sentinel `grep themeStyles src/screens/AccountSettingsScreen.tsx` returns 0.
- Accent flipped iOS-blue `#3B82F6` → handoff pink `colors.accent` (#ff5a6f); danger flipped → `colors.destructiveRed` (#ff4d4d). Back-arrow, Save button, EditLink, and Language sliding pill all render in pink.
- Edit affordance moved from top-right pencil-only icon to the new `EditLink` inline subcomponent (pink Pencil + "Edit" text) inside the ACCOUNT `SectionLabel`'s action slot. Reuses existing `common.edit` key (en.ts:7).
- Save/Cancel buttons moved INSIDE the ACCOUNT card as a bottom row when `isEditing===true` (D-11). Border radius 12 → 14 per D-22; height 50pt preserved.
- DANGER ZONE delete row built with a red-tinted icon chip (`rgba(255,77,77,0.13)`) + Trash2 in `colors.destructiveRed` + label + chevron. `setShowDeleteModal(true)` handler + `DeleteAccountModal` mount preserved verbatim (props unchanged).
- APPLICATION section built as a Card with Briefcase icon chip + label + chevron; reuses existing `landlordApp.becomeLandlord` key; same `!canListProperties && onApplyLandlord` gate as today.
- 4 new EN+RU keys added for `accountSettings.section.{account,preferences,application,dangerZone}`. `common.edit/cancel/save` correctly NOT re-added (already exist at en.ts:7/4/5 per PATTERNS Correction §2).

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: Add SectionLabel + 4 section i18n keys + co-located test** — `c404111` (feat)
2. **Task 2: Brownfield rewrite AccountSettingsScreen — sections + token migration + pink accent** — `20f6dd8` (refactor)

**Plan metadata commit:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates) — committed as the final docs commit.

## Files Created/Modified

### Created
- `src/components/SectionLabel.tsx` — Pure presentational uppercase letter-spaced label with optional action slot. ~50 LOC. Reads `colors.textTertiary` from `useTheme()`; no hex literals.
- `src/components/__tests__/SectionLabel.test.tsx` — 3 co-located tests (TestRenderer + act + jest.mock theme context, mirroring CheckSquare.test convention).

### Modified
- `src/screens/AccountSettingsScreen.tsx` — Brownfield rewrite: 4-section layout, themeStyles{} block removed, every color call-site swapped to colors.*, accent flipped to pink, Save/Cancel moved inside ACCOUNT card, Edit affordance moved to SectionLabel action slot, APPLICATION + DANGER ZONE rebuilt with icon-chip card pattern. Preserved verbatim per "Reusable Assets": loadProfile, handleSave, renderInfoRow signature, langSlide Animated.Value + spring effect, sliding-pill interpolation block, language toggle TouchableOpacity blocks, DeleteAccountModal mount. KeyboardAwareScrollView preserved at `bottomOffset={20}`. ~232 insertions / ~202 deletions in a single atomic commit.
- `src/locales/en.ts` — Added 4 new keys under `accountSettings.section.*` namespace (ACCOUNT / PREFERENCES / APPLICATION / DANGER ZONE).
- `src/locales/ru.ts` — Added 4 matching keys (АККАУНТ / НАСТРОЙКИ / ЗАЯВКА / ОПАСНАЯ ЗОНА).

## Decisions Made

- **Optional screen-regression test skipped (D-20 hedge applied).** Per the plan's "if mocking proves too heavy (>1 hour scope), skip this file" guidance: mocking `useAuth`, `AuthService`, `useLanguage`, `useTheme`, and the sliding-pill `Animated.Value` for a brownfield rewrite this size exceeds the regression value. The SectionLabel test + TypeScript baseline + i18n parity script + Plan 15-02 + on-device QA together provide the coverage.
- **Removed unused `Switch` import** from `react-native`. It was a leftover from the pre-Phase-4.5 cosmetic toggle (the comment at line 296 references "the isRenterApplicant Switch this replaces"). Not flagged in the TS baseline.
- **Used `colors.onAccent` (white) for the selected-language label** in the Language sliding-pill toggle, replacing the prior `'#FFFFFF'` hex literal. Keeps Phase 12 token-purity for the migration phase.
- **Inlined `EditLink` as a module-level subcomponent** (not exported). Consumed only by AccountSettings's ACCOUNT card. If Phase 16 finds a second consumer, promote to shared `src/components/EditLink.tsx`.

## Deviations from Plan

None — plan executed exactly as written. Three small auto-decisions documented above as Decisions Made (not deviations): they were explicit hedges/discretion points the plan itself called out (D-20 optional test, token purity, EditLink scope).

## Issues Encountered

- **Test assertion fix during Task 1 RED→GREEN.** Initial `findAllByProps({ testID: 'action-slot' })` returned 2 matches (host Text + the React Element wrapper) — React Test Renderer surfaces the prop on both internal levels. Switched to `findAllByType(Text).toHaveLength(2)` + `findTexts(tree.root).toContain('EditLink')` to assert action-slot presence robustly. Test pattern aligned with CheckSquare.test convention. Resolved before commit.

## User Setup Required

None — no external service configuration required. Pure client-side restructure.

## Verification Results

All hard gates from PLAN frontmatter `must_haves.truths` pass:

| Gate | Command | Result |
|------|---------|--------|
| themeStyles sentinel | `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx \| wc -l` | **0** (PASS) |
| KBD-02 grep gate | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | **0** (PASS, invariant preserved) |
| SectionLabel uses | `grep -nE "SectionLabel" src/screens/AccountSettingsScreen.tsx \| wc -l` | **7** (≥4 sections, PASS) |
| section.* keys used | `grep -nE "accountSettings\.section\." src/screens/AccountSettingsScreen.tsx \| wc -l` | **4** (PASS) |
| EN section keys | `grep -nE "'accountSettings\.section\.(account\|preferences\|application\|dangerZone)':" src/locales/en.ts \| wc -l` | **4** (PASS) |
| RU section keys | `grep -nE "'accountSettings\.section\.(account\|preferences\|application\|dangerZone)':" src/locales/ru.ts \| wc -l` | **4** (PASS) |
| i18n parity | `bash scripts/check-i18n-parity.sh` | **exit 0** (PASS) |
| TypeScript baseline | `npx tsc --noEmit 2>&1 \| grep "error TS" \| wc -l` | **17** (== baseline; 0 NEW errors, PASS) |
| Filtered new-error count | `npx tsc --noEmit \| filter-baseline \| grep "error TS" \| wc -l` | **0** (PASS) |
| SectionLabel test | `npx jest src/components/__tests__/SectionLabel.test.tsx` | **3 / 3 passed** (PASS) |
| Related tests still green | `npx jest --testPathPattern="(SectionLabel\|EmailVerifyBanner\|StepperInput)"` | **16 / 16 passed** (PASS) |
| App.tsx untouched | `git diff --stat App.tsx HEAD` | **empty** (PASS, zero callsite edits) |
| Working-tree hygiene | `git status` | pbxproj + 2 zips remain unstaged/untracked as instructed (PASS) |

## Next Phase Readiness

- **Plan 15-02 (`<FilterStyleRow>` picker)** can now mount inside the PREFERENCES card scaffolding this plan created. The plan reserved the area below the Language toggle with a comment-marked insertion point; 15-02 imports `FilterStyleRow` and adds `<FilterStyleRow />` there.
- **Phase 16 (Profile reskin)** can consume `SectionLabel` verbatim for ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS section labels. The EditLink + icon-chip-row patterns are also lift-and-shift candidates.
- **On-device QA** still owed for iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark — per CONTEXT.md D-15 acceptance, this happens before SET-01/SET-03 close as fully verified. The traceability table is being flipped optimistically post-implementation per project convention (Phases 12/13/14 use the same pattern).

## Self-Check

Verifying claims:

- ✅ `src/components/SectionLabel.tsx` exists (`[ -f ]` confirmed)
- ✅ `src/components/__tests__/SectionLabel.test.tsx` exists
- ✅ `src/screens/AccountSettingsScreen.tsx` modified (commit `20f6dd8`)
- ✅ `src/locales/en.ts` + `src/locales/ru.ts` modified (commit `c404111`)
- ✅ Commit `c404111` present in `git log --oneline`
- ✅ Commit `20f6dd8` present in `git log --oneline`
- ✅ All automated gates pass per Verification Results table above
- ✅ pbxproj + zips remain UNTOUCHED and UNSTAGED (verified by `git status --short` before each commit)

## Self-Check: PASSED

---
*Phase: 15-account-settings-restructure-filter-style-picker*
*Plan: 01 — Screen Restructure + Token Migration + SectionLabel*
*Completed: 2026-06-01*

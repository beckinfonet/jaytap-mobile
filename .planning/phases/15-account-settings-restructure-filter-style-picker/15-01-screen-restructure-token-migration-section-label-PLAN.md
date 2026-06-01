---
phase: 15-account-settings-restructure-filter-style-picker
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/SectionLabel.tsx
  - src/components/__tests__/SectionLabel.test.tsx
  - src/screens/AccountSettingsScreen.tsx
  - src/screens/__tests__/AccountSettingsScreen.test.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: true
requirements: [SET-01, SET-03]
requirements_addressed: [SET-01, SET-03]
tags: [m6, account-settings, palette-migration, react-native]

must_haves:
  truths:
    - "Opening AccountSettings shows three labelled sections in order ACCOUNT / PREFERENCES / DANGER ZONE per D-01, and a conditional APPLICATION section between PREFERENCES and DANGER ZONE for non-landlord users per D-02 (SC1)."
    - "Editing Account info still saves First Name / Last Name / Phone / WhatsApp / Telegram via the preserved-verbatim handleSave (lines 105-136), with Save/Cancel buttons rendered INSIDE the ACCOUNT card per D-11 (SC4)."
    - "Language toggle still persists via LanguageContext.setLanguage() with the sliding-pill Animated.Value machinery (lines 48-58 + 222-246) preserved verbatim per D-08 + Reusable Assets (SC4)."
    - "Delete account row still opens DeleteAccountModal via setShowDeleteModal(true); DeleteAccountModal mount (lines 344-353) unchanged (SC4)."
    - "APPLICATION section renders ONLY when !canListProperties && onApplyLandlord per D-02; reuses landlordApp.becomeLandlord key (SC1)."
    - "Accent flips from iOS blue #3B82F6 → handoff pink colors.accent (#ff5a6f) per D-09; danger flips to colors.destructiveRed (#ff4d4d)."
    - "themeStyles{} block (lines 71-79) fully removed per D-08; every render-site reads colors.* tokens (Phase 12 single source of truth)."
    - "App.tsx callsite (lines 848-870) untouched — props onBack/onAccountDeleted/onApplyLandlord unchanged per Integration Points."
    - "SectionLabel is a reusable presentational primitive at src/components/SectionLabel.tsx per D-12, intentionally project-shared for Phase 16 forward-fit."
    - "Hard gate KBD-02: grep -rn 'keyboardVerticalOffset' src/ | wc -l == 0 (3-milestone invariant per m1-keyboard-kbd-02-invariants.md)."
    - "Hard gate parity: scripts/check-i18n-parity.sh exits 0 after locale edits (4 new section keys × EN+RU = 8 entries; common.edit/cancel/save reused, NOT re-added per PATTERNS.md Correction §2)."
    - "Hard gate TypeScript: npx tsc --noEmit produces 0 NEW errors vs pre-Phase-15 baseline (Phase 14 baseline preserved: ChatScreen / DeleteListingModal / TourSelectionScreen / ThemeContext / StepperInput.test pre-existing errors)."
    - "Sentinel: grep -nE 'themeStyles' src/screens/AccountSettingsScreen.tsx returns 0 matches post-commit (CONTEXT.md Gate Commands)."
    - "No backend changes (M6 client-only); no Firebase SDK imports added; no react-navigation introduced."
    - "Executor prepends `cd \"$(git rev-parse --show-toplevel)\" && ` to every Bash invocation (defense against subagent-cwd-drift-recurring.md — pattern fired 3+ times)."
    - "Executor verifies `git branch --show-current` before each commit."
  artifacts:
    - path: src/components/SectionLabel.tsx
      provides: "Pure presentational primitive — uppercase letter-spaced label + optional action slot per D-12"
      min_lines: 25
    - path: src/components/__tests__/SectionLabel.test.tsx
      provides: "Co-located test — renders label children, renders action slot when provided, omits action slot otherwise (3 cases minimum)"
      min_lines: 50
    - path: src/screens/AccountSettingsScreen.tsx
      provides: "Brownfield-rewritten screen — 3 (+1 conditional) labelled sections; themeStyles block removed; accent flipped to pink; Save/Cancel inside ACCOUNT card"
      contains: "<SectionLabel"
    - path: src/locales/en.ts
      provides: "4 new section label keys under accountSettings.section.* namespace"
      contains: "'accountSettings.section.account'"
    - path: src/locales/ru.ts
      provides: "Russian translations for the 4 new section label keys (TypeScript parity gate)"
      contains: "'accountSettings.section.account'"
  key_links:
    - from: "src/components/SectionLabel.tsx"
      to: "src/theme/ThemeContext.tsx"
      via: "useTheme()"
      pattern: "useTheme\\(\\)"
    - from: "src/screens/AccountSettingsScreen.tsx"
      to: "src/components/SectionLabel.tsx"
      via: "import { SectionLabel } (or default import)"
      pattern: "SectionLabel"
    - from: "src/screens/AccountSettingsScreen.tsx"
      to: "src/theme/ThemeContext.tsx"
      via: "useTheme().colors only (no isDark)"
      pattern: "useTheme\\(\\)"
    - from: "src/screens/AccountSettingsScreen.tsx"
      to: "src/components/DeleteAccountModal.tsx"
      via: "DeleteAccountModal mount with unchanged props (preserved verbatim)"
      pattern: "DeleteAccountModal"
---

<objective>
Restructure `AccountSettingsScreen.tsx` into the MoveIn handoff's Direction A layout (ACCOUNT / PREFERENCES / DANGER ZONE + conditional APPLICATION) while migrating every render-site from the hardcoded `themeStyles{}` block to Phase 12 `colors.*` tokens. Extract a reusable `<SectionLabel>` primitive that Phase 16 will also consume. Preserve every existing flow (Account info edit/save, Language sliding-pill toggle, Delete account, Become-a-Landlord entry) verbatim per SET-03.

Purpose: This is the brownfield foundation. Plan 15-02 mounts `<FilterStyleRow />` INSIDE the PREFERENCES section that this plan creates; it cannot exist without this restructure landing first.

Output:
- NEW: `src/components/SectionLabel.tsx` (~30 LOC pure-presentational primitive)
- NEW: `src/components/__tests__/SectionLabel.test.tsx` (3 cases — render label, render action slot, omit action slot)
- NEW: `src/screens/__tests__/AccountSettingsScreen.test.tsx` (optional but recommended per D-20 — locks SET-03 regression for ~150 LOC brownfield surgery)
- MODIFIED: `src/screens/AccountSettingsScreen.tsx` (~150 LOC replaced; themeStyles block ripped; structure rewritten; accent flipped to pink)
- MODIFIED: `src/locales/en.ts` + `src/locales/ru.ts` (4 new keys × 2 locales = 8 entries — `accountSettings.section.{account,preferences,application,dangerZone}` only; `common.edit`/`common.cancel`/`common.save` reused per PATTERNS.md Correction §2)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md
@.planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md
@.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-CONTEXT.md
@src/theme/colors.ts
@src/theme/ThemeContext.tsx
@src/screens/AccountSettingsScreen.tsx
@src/components/DeleteAccountModal.tsx
@src/components/filters/primitives/CheckSquare.tsx
@src/components/filters/primitives/__tests__/CheckSquare.test.tsx
@src/components/__tests__/EmailVerifyBanner.test.tsx
@src/locales/en.ts
@src/locales/ru.ts

<interfaces>
<!-- Contracts the executor needs from existing code -->

From src/theme/ThemeContext.tsx (Phase 12 tokens available via useTheme().colors):
- background, bgDim, surface, surface2, hair, hair2
- text, textSecondary, textTertiary
- iconChipFg
- accent (#ff5a6f), accentSoft, accentLine, onAccent
- destructiveRed (#ff4d4d)

From src/screens/AccountSettingsScreen.tsx (PRESERVE these line ranges VERBATIM per CONTEXT.md Reusable Assets):
- Lines 23-43: Component signature + props ({ onBack, onAccountDeleted, onApplyLandlord })
- Lines 30-31: LANG_TRACK_PADDING + LANG_INNER_GAP constants
- Lines 36-41: isValidName + isValidPhone helpers
- Lines 48-58: langSlide Animated.Value + langTrackWidth state + spring effect (load-bearing!)
- Lines 60-69: Form state (isEditing exists; do NOT add)
- Lines 85-103: loadProfile async fetch + state hydration
- Lines 105-136: handleSave validation + persistence
- Lines 138-160: renderInfoRow helper (signature/JSX unchanged; only color refs swap to colors.*)
- Lines 222-246: Sliding-pill Animated.View interpolation block (langSlide.interpolate math is load-bearing!)
- Lines 247-292: Language toggle inner TouchableOpacity blocks (emoji flags + check glyph)
- Lines 344-353: DeleteAccountModal mount (props unchanged)

From src/components/DeleteAccountModal.tsx:
- Props: visible, onClose, onConfirm, userEmail (unchanged contract)

App.tsx:848-870 callsite (CONTEXT.md Integration Points):
- Props passed: onBack, onAccountDeleted, onApplyLandlord — UNCHANGED, zero App.tsx edits in this plan.

Existing i18n keys to REUSE (confirmed at en.ts lines 4-7 — do NOT re-add):
- 'common.cancel' (line 4) → "Cancel"
- 'common.save' (line 5) → "Save"
- 'common.edit' (line 7) → "Edit"
- 'landlordApp.becomeLandlord' (already exists — reuse for APPLICATION row label)
- 'accountSettings.saving' (already exists — reuse for Save button loading state)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 4 new section label keys to en.ts + ru.ts; create SectionLabel.tsx primitive + co-located test</name>
  <read_first>
    - src/locales/en.ts (entire — head + accountSettings.* block around lines 231-253 + existing common.* at lines 4-7; do NOT re-add common.edit/cancel/save per PATTERNS.md Correction §2)
    - src/locales/ru.ts (head + matching block — confirm TypeScript Record&lt;TranslationKeys, string&gt; gate per PATTERNS.md Pattern §6)
    - src/components/filters/primitives/CheckSquare.tsx (analog for SectionLabel — pure presentational primitive shape per PATTERNS.md Pattern §1)
    - src/components/filters/primitives/__tests__/CheckSquare.test.tsx (analog for SectionLabel test — TestRenderer + act + jest.mock useTheme pattern per PATTERNS.md Pattern §2)
    - src/theme/ThemeContext.tsx (useTheme() shape — return { colors, isDark })
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §D-12 (SectionLabel props + style spec) + §D-14 (i18n namespace split; only 4 section keys land here)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md §Pattern Assignments 1 + 2 + §Corrections 1, 2, 3
  </read_first>
  <action>
    Per D-12 and D-14 (Plan 15-01 i18n subset):

    (1) Edit `src/locales/en.ts`: append 4 new keys to the existing `accountSettings.*` block (after the existing `'accountSettings.applicationStatus'` line around line 234, before any non-accountSettings keys):
    ```
    'accountSettings.section.account': 'ACCOUNT',
    'accountSettings.section.preferences': 'PREFERENCES',
    'accountSettings.section.application': 'APPLICATION',
    'accountSettings.section.dangerZone': 'DANGER ZONE',
    ```
    Do NOT re-add `common.edit` / `common.cancel` / `common.save` — they already exist at lines 7/4/5 per PATTERNS.md Correction §2.

    (2) Edit `src/locales/ru.ts`: append the SAME 4 keys with Russian values per D-14 (single word per D-19; native-RU refinement is fine):
    ```
    'accountSettings.section.account': 'АККАУНТ',
    'accountSettings.section.preferences': 'НАСТРОЙКИ',
    'accountSettings.section.application': 'ЗАЯВКА',
    'accountSettings.section.dangerZone': 'ОПАСНАЯ ЗОНА',
    ```
    Place at the corresponding position relative to the `ru.ts` `accountSettings.*` block. TypeScript's `Record<TranslationKeys, string>` shape is the primary parity gate per PATTERNS.md Pattern §6 — `tsc` will fail if any en.ts key is missing in ru.ts.

    (3) Create NEW file `src/components/SectionLabel.tsx` per D-12 spec + PATTERNS.md Pattern §1 (analog: CheckSquare.tsx export-default convention):
    - `import React from 'react'; import { StyleSheet, Text, View } from 'react-native'; import { useTheme } from '../theme/ThemeContext';`
    - Props: `{ children: string; action?: React.ReactNode }`
    - Render: `<View style={styles.row}><Text style={[styles.label, { color: colors.textTertiary }]}>{children}</Text>{action}</View>`
    - Styles: `row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 10 }, label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 }`
    - Export: `export default SectionLabel` (matches CheckSquare/DealToggle/Stepper convention per PATTERNS.md Pattern §1 "Note on export style"). NO hex literals — only `colors.textTertiary` from `useTheme()`.

    (4) Create NEW file `src/components/__tests__/SectionLabel.test.tsx` per PATTERNS.md Pattern §2 (note path is 2 levels up: `'../../theme/ThemeContext'`):
    - Mock `useTheme` via `jest.mock('../../theme/ThemeContext', ...)` returning `{ isDark: true, colors: { textTertiary: 'rgba(244,244,246,0.40)' } }`
    - 3 test cases:
      a. `renders the uppercase label text` — `TestRenderer.create(<SectionLabel>ACCOUNT</SectionLabel>)`, `findAllByType(Text)` includes 'ACCOUNT'
      b. `renders the action slot when provided` — pass `action={<Text testID="action-slot">Edit</Text>}`, assert `findAllByProps({ testID: 'action-slot' })` length === 1
      c. `omits the action slot when no action prop` — only one Text node (the label itself)

    All 4 file edits land in ONE atomic commit. After write, run `scripts/check-i18n-parity.sh` and `npx jest src/components/__tests__/SectionLabel.test.tsx` and `npx tsc --noEmit` to verify before commit. Prepend `cd "$(git rev-parse --show-toplevel)" && ` to every Bash invocation per subagent-cwd-drift-recurring.md.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && grep -nE "'accountSettings\.section\.(account|preferences|application|dangerZone)':" src/locales/en.ts | wc -l | grep -q "^4$" && grep -nE "'accountSettings\.section\.(account|preferences|application|dangerZone)':" src/locales/ru.ts | wc -l | grep -q "^4$" && bash scripts/check-i18n-parity.sh && npx jest src/components/__tests__/SectionLabel.test.tsx --silent && npx tsc --noEmit 2>&1 | grep -vE "(ChatScreen|DeleteListingModal|TourSelectionScreen|ThemeContext|StepperInput\.test)" | grep -E "error TS" | wc -l | grep -q "^0$"</automated>
  </verify>
  <done>
    - 4 new EN keys + 4 new RU keys for `accountSettings.section.*` present in both locale files.
    - `common.edit/cancel/save` NOT re-added (still exist only at en.ts:7/4/5).
    - `src/components/SectionLabel.tsx` exists; exports default React.FC; reads `useTheme().colors.textTertiary`; no hex literals.
    - `src/components/__tests__/SectionLabel.test.tsx` exists; all 3 tests pass.
    - Parity script exits 0; tsc has 0 new errors against pre-Phase-15 baseline.
    - One atomic commit on the worktree branch (verified via `git branch --show-current` before commit).
  </done>
</task>

<task type="auto">
  <name>Task 2: Brownfield-rewrite AccountSettingsScreen.tsx — rip themeStyles block, flip to colors.* tokens + pink accent, restructure into 3-section (+1 conditional) layout, move Save/Cancel inside ACCOUNT card, move Edit affordance to SectionLabel action slot, ship optional regression test</name>
  <read_first>
    - src/screens/AccountSettingsScreen.tsx (ENTIRE FILE, all 516 LOC — must understand what to PRESERVE verbatim before editing; particularly lines 48-58, 71-79, 85-103, 105-136, 138-160, 222-246, 247-292, 344-353)
    - src/theme/colors.ts (Phase 12 token names verbatim — confirm: background, bgDim, surface, surface2, hair2, text, textSecondary, textTertiary, iconChipFg, accent, accentSoft, accentLine, destructiveRed, onAccent)
    - src/theme/ThemeContext.tsx (useTheme() shape)
    - src/components/SectionLabel.tsx (created in Task 1 — confirm default export shape for import)
    - src/components/DeleteAccountModal.tsx (props contract — visible/onClose/onConfirm/userEmail; preserve verbatim)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §"Codebase Anchors" (line-by-line surgical map: 71-79 rip, 138-160 preserve+swap, 186-205 replace, 207-294 replace, 298-314 conditional replace, 316-334 move, 336-342 replace, 344-353 preserve) + §D-08 (token mapping table) + §D-09 (accent flip iOS-blue → pink) + §D-10 (EditLink inline subcomponent shape) + §D-11 (Save/Cancel inside ACCOUNT card) + §D-13 (Card NOT extracted — inline `<View style={[styles.card]}>`) + §D-22 (button border-radius 12 → 14, height 50 preserved) + §D-23 (chevron hit-slop 8/8/8/8) + §D-25 (KeyboardAwareScrollView stays at bottomOffset={20})
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md §Pattern Assignments 5 + §Pattern Assignments 6 (locale append placement) + §Hard-Rule Compliance Cross-Check
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §"Specifics" — Card style (borderRadius 20, overflow hidden), Delete account row (trash icon in red-tinted chip `rgba(255,77,77,0.13)`), section gaps (24 between blocks, 12 between SectionLabel and first card), Edit link icon-text gap (5pt)
  </read_first>
  <action>
    Per D-01..D-13 (full brownfield surgery — implements SET-01 + SET-03):

    (1) **PRESERVE verbatim** (CONTEXT.md Reusable Assets — these are LOAD-BEARING):
    - Imports: keep all existing imports. ADD: `LayoutAnimation` not needed in this plan (Plan 15-02 only). ADD: `Pencil`, `Trash2`, `Briefcase` (or other suitable APPLICATION-row icon — `Briefcase` is fine) to lucide-react-native imports. ADD: `import SectionLabel from '../components/SectionLabel';` (default-import to match Task 1 export style).
    - Component signature + props (lines 23-43)
    - Constants LANG_TRACK_PADDING + LANG_INNER_GAP (lines 30-31)
    - Helpers isValidName + isValidPhone (lines 36-41)
    - langSlide Animated.Value + langTrackWidth + spring effect (lines 48-58)
    - Form state (lines 60-69) including `isEditing`
    - loadProfile (lines 85-103)
    - handleSave (lines 105-136)
    - renderInfoRow function signature + JSX shape (lines 138-160) — just swap color refs per D-08 mapping
    - Sliding-pill Animated.View interpolation block (lines 222-246)
    - Language toggle inner TouchableOpacity blocks (lines 247-292) — emoji flags + check glyph preserved
    - DeleteAccountModal mount (lines 344-353) — props unchanged
    - KeyboardAwareScrollView at `bottomOffset={20}` — DO NOT add `keyboardVerticalOffset` (KBD-02 invariant)

    (2) **RIP** per D-08:
    - DELETE lines 71-79 (`themeStyles{}` block) ENTIRELY. Sentinel: `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` must return 0 matches post-commit.
    - Change `useTheme()` destructure to `const { colors } = useTheme();` only (drop `isDark` — no remaining call site needs it; lines 141 + 215 also rewrite per the mapping table below).

    (3) **TOKEN MAPPING** per D-08 (apply globally — every render-site):
    - `themeStyles.background` → `colors.background`
    - `themeStyles.surface` → `colors.surface`
    - `themeStyles.text` → `colors.text`
    - `themeStyles.textSecondary` → `colors.textSecondary`
    - `themeStyles.border` → `colors.hair2`
    - `themeStyles.accent` → `colors.accent` (iOS blue → handoff pink per D-09)
    - `themeStyles.danger` → `colors.destructiveRed`
    - `isDark ? '#FFF' : '#000'` (line 141 etc.) → `colors.text`
    - `isDark ? '#2C2C2E' : '#E8E8ED'` (line 215) → `colors.surface2`

    (4) **REPLACE the 4 JSX sections** per D-01..D-13 (in this order, inside the existing KeyboardAwareScrollView):

    (a) **ACCOUNT section** (replaces lines 186-205 MAIN INFORMATION + absorbs lines 316-334 action buttons per D-11):
    ```
    <SectionLabel action={!isEditing ? <EditLink onPress={() => setIsEditing(true)} /> : undefined}>
      {t('accountSettings.section.account')}
    </SectionLabel>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {renderInfoRow(...firstName)}
      {renderInfoRow(...lastName)}
      {renderInfoRow(...phone)}
      {renderInfoRow(...whatsapp)}
      {renderInfoRow(...telegram)}
      {isEditing && (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity
            style={{ flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair2 }}
            onPress={() => setIsEditing(false)} disabled={saving}
          ><Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent }}
            onPress={handleSave} disabled={saving}
          ><Text style={{ color: colors.onAccent, fontWeight: '600', fontSize: 16 }}>{saving ? t('accountSettings.saving') : t('common.save')}</Text></TouchableOpacity>
        </View>
      )}
    </View>
    ```
    Card style: `{ borderRadius: 20, overflow: 'hidden', padding: 16 }`. Button height 50 + radius 14 per D-22.

    (b) **EditLink inline subcomponent** per D-10 (define INSIDE this file, before the main AccountSettingsScreen function or as a local const):
    ```tsx
    const EditLink: React.FC<{ onPress: () => void }> = ({ onPress }) => {
      const { colors } = useTheme();
      const { t } = useLanguage();
      return (
        <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button" accessibilityLabel={t('common.edit')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Pencil size={15} color={colors.accent} strokeWidth={2} />
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>{t('common.edit')}</Text>
        </Pressable>
      );
    };
    ```
    Reuses `t('common.edit')` per PATTERNS.md Correction §2 (already at en.ts:7). When `isEditing===true`, the EditLink is not rendered (the action prop is `undefined`); Save/Cancel inside the card take over.

    (c) **PREFERENCES section** (replaces lines 207-294 Language section):
    ```
    <SectionLabel>{t('accountSettings.section.preferences')}</SectionLabel>
    <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 12 }]}>
      {/* Language sliding-pill toggle — sliding-pill machinery PRESERVED from lines 222-292; only colors swap per D-08 */}
      {/* PLACEHOLDER for FilterStyleRow — Plan 15-02 will mount <FilterStyleRow /> here below the Language toggle */}
    </View>
    ```
    For Plan 15-01, the PREFERENCES card contains only the Language toggle. Plan 15-02 adds `<FilterStyleRow />` underneath.

    (d) **APPLICATION section** (conditional — replaces lines 298-314 Application Status; D-02 gate `!canListProperties && onApplyLandlord`):
    ```
    {!canListProperties && onApplyLandlord && (
      <>
        <SectionLabel>{t('accountSettings.section.application')}</SectionLabel>
        <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <TouchableOpacity onPress={onApplyLandlord} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <Briefcase size={20} color={colors.iconChipFg} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('landlordApp.becomeLandlord')}</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </>
    )}
    ```
    Reuses existing `landlordApp.becomeLandlord` key per D-02.

    (e) **DANGER ZONE section** (replaces lines 336-342 Delete account link):
    ```
    <SectionLabel>{t('accountSettings.section.dangerZone')}</SectionLabel>
    <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 12 }]}>
      <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,77,77,0.13)', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={18} color={colors.destructiveRed} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.destructiveRed, fontSize: 16, fontWeight: '600' }}>{t('accountSettings.deleteAccount')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{t('accountSettings.deleteAccountSubtitle')}</Text>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
    ```
    Reuse existing `accountSettings.deleteAccount` key (already in en.ts). For the subtitle, REUSE an existing key if `accountSettings.deleteAccountSubtitle` or similar exists; otherwise omit the subtitle Text (do NOT add new key in this plan — additional copy keys are out of scope for Plan 15-01).

    (5) **Section spacing** per CONTEXT.md §Specifics: `marginBottom: 24` between section blocks; `marginBottom: 12` between SectionLabel and first card. Outer scroll container content padding 110pt at bottom for safe-area clearance.

    (6) **OPTIONAL but RECOMMENDED**: Ship `src/screens/__tests__/AccountSettingsScreen.test.tsx` per D-20 to lock SET-03 regression. Minimum cases:
    - Renders 3 section labels (ACCOUNT, PREFERENCES, DANGER ZONE) — find by accessing rendered Text children
    - APPLICATION section renders when `!canListProperties && onApplyLandlord` are both true; does NOT render when canListProperties is true
    - Tapping Edit affordance flips isEditing → Save/Cancel buttons appear INSIDE the card
    - Tapping the Delete row sets showDeleteModal to true (mock `useAuth()` minimally — return `{ user: { email: 'test@test.com', uid: 'u1', emailVerified: true }, deleteAccount: jest.fn() }`)
    Mock `useTheme`, `useLanguage`, `useAuth`, `AuthService` (for `getBackendUser`/`createBackendUser`). Follow PATTERNS.md Pattern §"Test infrastructure" — TestRenderer + act + jest.mock contexts. If mocking proves too heavy (>1 hour scope), skip this file per D-20 ("if a test file lands") and rely on Plan 15-02 + on-device QA.

    (7) **ATOMICITY** per PATTERNS.md §"Brownfield rewrite atomicity": this is a SINGLE atomic commit. After write, run all gates before commit. Prepend `cd "$(git rev-parse --show-toplevel)" && ` to every Bash invocation per subagent-cwd-drift-recurring.md. Verify `git branch --show-current` shows the expected worktree branch before commit.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && [ "$(grep -nE 'themeStyles' src/screens/AccountSettingsScreen.tsx | wc -l | tr -d ' ')" = "0" ] && [ "$(grep -rn 'keyboardVerticalOffset' src/ | wc -l | tr -d ' ')" = "0" ] && [ "$(grep -nE 'SectionLabel' src/screens/AccountSettingsScreen.tsx | wc -l | tr -d ' ')" -ge "4" ] && [ "$(grep -nE "accountSettings\.section\." src/screens/AccountSettingsScreen.tsx | wc -l | tr -d ' ')" -ge "3" ] && bash scripts/check-i18n-parity.sh && npx tsc --noEmit 2>&1 | grep -vE "(ChatScreen|DeleteListingModal|TourSelectionScreen|ThemeContext|StepperInput\.test)" | grep -E "error TS" | wc -l | tr -d ' ' | grep -q "^0$"</automated>
  </verify>
  <done>
    - `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` returns 0 matches (D-08 sentinel passed).
    - `<SectionLabel>` appears at least 3 times (ACCOUNT, PREFERENCES, DANGER ZONE) and up to 4 times when APPLICATION renders (D-01 + D-02).
    - Save/Cancel buttons render INSIDE the ACCOUNT card when `isEditing===true` (D-11).
    - Edit affordance is a pink Pencil+text link inside the ACCOUNT SectionLabel's action slot (D-10); reuses `t('common.edit')`.
    - Delete account row in DANGER ZONE card opens DeleteAccountModal via `setShowDeleteModal(true)`; modal mount + props unchanged (SC4).
    - APPLICATION section renders only when `!canListProperties && onApplyLandlord` (D-02 gate); calls `onApplyLandlord` on tap; reuses `landlordApp.becomeLandlord`.
    - KBD-02 sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0.
    - Parity gate `scripts/check-i18n-parity.sh` exits 0.
    - tsc 0 new errors against pre-Phase-15 baseline.
    - Test file `src/screens/__tests__/AccountSettingsScreen.test.tsx` exists if executor judged it within scope; if shipped, all cases pass.
    - One atomic commit on the worktree branch (verified via `git branch --show-current` before commit).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User input → AccountSettings form fields | First Name / Last Name / Phone / WhatsApp / Telegram strings cross into AsyncStorage + backend via existing AuthService (UNCHANGED by this plan — preserved verbatim from lines 105-136). |
| Render path → Phase 12 tokens | colors.* tokens read from useTheme() — no untrusted data in render path. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-01 | T (Tampering) | AccountSettingsScreen handleSave | accept | handleSave preserved VERBATIM from lines 105-136 — no new write paths introduced; M2 Phase 1 backend role authority still gates writes server-side. |
| T-15-02 | I (Info Disclosure) | DeleteAccountModal | accept | Modal mount + props unchanged (lines 344-353 preserved verbatim); no new info surfaces. |
| T-15-03 | E (Elevation of Privilege) | APPLICATION section onApplyLandlord callback | accept | Same `!canListProperties && onApplyLandlord` gate as today (lines 298-314); Phase 4.5 landlord-app flow unchanged; backend still authoritative on role grant. |
| T-15-04 | D (Denial of Service) | Brownfield rewrite scope | mitigate | Atomic commit per PATTERNS.md §"Brownfield rewrite atomicity"; no transient broken state across commit boundary; rollback = single `git revert`. |
</threat_model>

<verification>
1. Grep sentinel: `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` → 0 matches.
2. Grep sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` → 0.
3. i18n parity: `scripts/check-i18n-parity.sh` → exit 0.
4. TypeScript: `npx tsc --noEmit` → 0 new errors vs pre-Phase-15 baseline (Phase 14 baseline of ChatScreen/DeleteListingModal/TourSelectionScreen/ThemeContext/StepperInput.test errors preserved).
5. Test (Task 1): `npx jest src/components/__tests__/SectionLabel.test.tsx` → all pass.
6. Test (Task 2 optional): `npx jest src/screens/__tests__/AccountSettingsScreen.test.tsx` → all pass (if file shipped).
7. SC1 behavior: opening AccountSettings shows 3 labelled sections (or 4 with APPLICATION) in correct order.
8. SC4 behavior: Account info edit + save still works; Language toggle still persists; Delete account still opens modal.
9. No App.tsx edits: `git diff --stat App.tsx` → empty.
</verification>

<success_criteria>
- Plan 15-01 lands as ONE atomic commit on the correct worktree branch.
- `src/components/SectionLabel.tsx` is a reusable primitive consumed by AccountSettings (3+ uses); Phase 16 forward-fit ready.
- AccountSettingsScreen restructured into ACCOUNT / PREFERENCES / DANGER ZONE (+ conditional APPLICATION) per D-01 + D-02.
- `themeStyles{}` block fully removed; every render-site reads `colors.*` (Phase 12 tokens); accent flipped to pink per D-09.
- Save/Cancel buttons live INSIDE the ACCOUNT card per D-11; Edit affordance in SectionLabel action slot per D-10.
- All preserved-verbatim behaviors (loadProfile, handleSave, sliding-pill Language toggle, DeleteAccountModal mount) work unchanged.
- KBD-02 grep gate stays at 0; parity script exits 0; tsc 0 new errors.
- SC1 + SC4 satisfied; SC5 partially (parity for the 4 section keys; remaining filter-style keys land in Plan 15-02).
</success_criteria>

<output>
After completion, create `.planning/phases/15-account-settings-restructure-filter-style-picker/15-01-SUMMARY.md` per execute-plan workflow.
</output>

---
phase: 16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/profile/ProfileRow.tsx
  - src/components/profile/ProfileTile.tsx
  - src/components/profile/ProfileToolTile.tsx
  - src/components/profile/IdentityCard.tsx
  - src/components/profile/RoleBadge.tsx
  - src/components/profile/OutlinedLogoutPill.tsx
  - src/components/profile/__tests__/ProfileRow.test.tsx
  - src/components/profile/__tests__/ProfileTile.test.tsx
  - src/components/profile/__tests__/ProfileToolTile.test.tsx
  - src/components/profile/__tests__/IdentityCard.test.tsx
  - src/components/profile/__tests__/RoleBadge.test.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/LandlordApplicationStatusBanner.tsx
autonomous: true
requirements:
  - PROF-01
  - PROF-02
  - PROF-03
must_haves:
  truths:
    - "The 6 profile primitive components (ProfileRow, ProfileTile, ProfileToolTile, IdentityCard, RoleBadge, OutlinedLogoutPill) exist and export typed components consumable by ProfileScreen.tsx in Plan 16-02."
    - "Every new i18n string used in Plan 16-02 exists in BOTH en.ts and ru.ts (parity gate green)."
    - "LandlordApplicationStatusBanner reads the 3 status-accent colors from Phase 12 palette tokens (colors.landlordGreen / colors.warning / colors.destructiveRed) instead of M3-era hardcoded hexes #059669 / #D97706 / #DC2626."
    - "ProfileScreen.tsx remains UNTOUCHED in this plan — zero risk to the existing screen."
    - "All 5 new primitive test files exit 0 via jest."
    - "No new fetchers introduced — primitives are pure presentational components reading only their props."
  artifacts:
    - path: "src/components/profile/ProfileRow.tsx"
      provides: "Grouped-row primitive (38px icon chip + label/sub + chevron) consumed by user layout's ACTIVITY + HOSTING cards"
      min_lines: 40
    - path: "src/components/profile/ProfileTile.tsx"
      provides: "2x2 grid tile primitive (vertical stack: icon-on-top + label + sub + optional badge) with optional accent-fill variant for Create Listing"
      min_lines: 50
    - path: "src/components/profile/ProfileToolTile.tsx"
      provides: "Admin tile variant with optional pendingCount badge + wide=true full-width override for odd 3rd tile (Role Management)"
      min_lines: 50
    - path: "src/components/profile/IdentityCard.tsx"
      provides: "Avatar + name + email + 'Account settings ›' pill + optional RoleBadge slot; whole card tappable per D-03"
      min_lines: 50
    - path: "src/components/profile/RoleBadge.tsx"
      provides: "Accent-soft pill with Shield icon + uppercase ADMIN/MODERATOR text"
      min_lines: 20
    - path: "src/components/profile/OutlinedLogoutPill.tsx"
      provides: "Calm outlined log-out pill (textSecondary, hair2 border, transparent bg, alignSelf:center) replacing today's full-width destructive button per D-02"
      min_lines: 25
    - path: "src/locales/en.ts"
      provides: "~19 new EN keys under profile.section.* / profile.staffBadge.* / profile.tile.* / profile.tool.* / profile.youreLandlord.*"
      contains: "profile.section.activity"
    - path: "src/locales/ru.ts"
      provides: "~19 new RU keys (parity with en.ts)"
      contains: "profile.section.activity"
    - path: "src/components/LandlordApplicationStatusBanner.tsx"
      provides: "Token-swapped banner — 3 hardcoded hexes replaced with Phase 12 colors.* tokens; self-suppression at line 88 preserved verbatim"
      contains: "colors.landlordGreen"
  key_links:
    - from: "src/components/profile/RoleBadge.tsx"
      to: "src/theme/colors.ts"
      via: "useTheme().colors (reads colors.accent + colors.accentSoft)"
      pattern: "colors\\.(accent|accentSoft)"
    - from: "src/components/profile/ProfileRow.tsx"
      to: "src/theme/colors.ts"
      via: "useTheme().colors (reads colors.surface2 + colors.iconChipFg + colors.text + colors.textTertiary)"
      pattern: "colors\\.(surface2|iconChipFg|text|textTertiary)"
    - from: "src/components/LandlordApplicationStatusBanner.tsx"
      to: "src/theme/colors.ts"
      via: "useTheme().colors swap for the 3 status branches (approved/submitted/rejected)"
      pattern: "colors\\.(landlordGreen|warning|destructiveRed)"
    - from: "src/locales/ru.ts"
      to: "src/locales/en.ts"
      via: "TranslationKeys type-parity enforced by tsc + check-i18n-parity.sh"
      pattern: "profile\\.(section|staffBadge|tile|tool|youreLandlord)"
---

<objective>
Ship the additive primitive + i18n layer that Plan 16-02 will consume to rewrite ProfileScreen.

Purpose: De-risk the brownfield ProfileScreen rewrite by landing all new components, all new strings, and the LandlordBanner token swap as a separate atomic commit. Primitives are dead code until 16-02 imports them — so this plan is zero-risk to the running app. If 16-02 needs to be reverted, this plan stays committed (no regression).

Output: 6 new primitive files under `src/components/profile/`, 5 co-located test files, ~19 EN+RU bilingual key pairs added to `src/locales/{en,ru}.ts`, and a surgical 3-hex token swap in `src/components/LandlordApplicationStatusBanner.tsx`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md
@.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md
@.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md
@.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-VALIDATION.md

<!-- Source files Plan 16-01 references; primitives copy these patterns. -->
@src/components/SectionLabel.tsx
@src/components/FilterStyleRow.tsx
@src/components/StatusPill.tsx
@src/screens/AccountSettingsScreen.tsx
@src/components/LandlordApplicationStatusBanner.tsx
@src/theme/colors.ts
@src/theme/ThemeContext.tsx
@src/context/LanguageContext.tsx
@src/locales/en.ts
@src/locales/ru.ts
@src/components/__tests__/SectionLabel.test.tsx
@src/components/__tests__/FilterStyleRow.test.tsx
</context>

<interfaces>
<!-- Key contracts new primitives MUST conform to so Plan 16-02 can consume them without exploration. -->

<!-- ProfileRow — consumed by user layout's ACTIVITY (Favorites + Appointments) and HOSTING (My Listings) cards -->
```typescript
import type { LucideIcon } from 'lucide-react-native';
export interface ProfileRowProps {
  Icon: LucideIcon;          // e.g. Heart, Calendar, ClipboardList
  title: string;             // already-localized (caller passes t('profile.favorites'))
  sub?: string;              // already-localized sub-label (caller passes t('profile.tile.favoritesSub'))
  onPress: () => void;
  accent?: boolean;          // when true: backgroundColor=colors.accent, fg=colors.onAccent (Create Listing variant)
  testID?: string;
}
export default function ProfileRow(props: ProfileRowProps): JSX.Element;
```

<!-- ProfileTile — consumed by admin layout's MY ACTIVITY 2x2 grid (Favorites, Appointments, My Listings, Create Listing accent-filled) -->
```typescript
export interface ProfileTileProps {
  Icon: LucideIcon;
  title: string;             // already-localized
  sub?: string;              // already-localized
  onPress: () => void;
  accent?: boolean;          // Create Listing variant
  testID?: string;
}
export default function ProfileTile(props: ProfileTileProps): JSX.Element;
```

<!-- ProfileToolTile — consumed by admin layout's ADMIN TOOLS section (Landlord Apps, Moderation Queue, Role Management) -->
```typescript
export interface ProfileToolTileProps {
  Icon: LucideIcon;
  title: string;             // already-localized
  sub?: string;              // already-localized
  onPress: () => void;
  badge?: number;            // pendingCount; hide pill when undefined or 0
  wide?: boolean;            // when true: width '100%' (used by D-05 odd-last-tile rule)
  testID?: string;
}
export default function ProfileToolTile(props: ProfileToolTileProps): JSX.Element;
```

<!-- IdentityCard — consumed by both layouts (top of screen) -->
```typescript
export interface IdentityCardProps {
  email: string;             // user?.email ?? ''
  role: 'admin' | 'moderator' | 'user';  // when admin|moderator, renders <RoleBadge role={role} /> below name
  onPress: () => void;       // whole card tappable per D-03; pill is visual affordance only
  accountSettingsLabel: string;  // already-localized (caller passes t('profile.accountSettings'))
  testID?: string;
}
export default function IdentityCard(props: IdentityCardProps): JSX.Element;
```

<!-- RoleBadge — consumed by IdentityCard (and possibly nowhere else) -->
```typescript
export interface RoleBadgeProps {
  role: 'admin' | 'moderator';
  label: string;             // already-localized uppercase: ADMIN or MODERATOR
  testID?: string;
}
export default function RoleBadge(props: RoleBadgeProps): JSX.Element;
```

<!-- OutlinedLogoutPill — consumed by both layouts (bottom of screen, centered) -->
```typescript
export interface OutlinedLogoutPillProps {
  label: string;             // already-localized: t('profile.logOut')
  loading?: boolean;         // shows ActivityIndicator when true; disables press
  onPress: () => void;
  testID?: string;
}
export default function OutlinedLogoutPill(props: OutlinedLogoutPillProps): JSX.Element;
```

<!-- LandlordApplicationStatusBanner (modified) — interface UNCHANGED -->
```typescript
// File still exports: export const LandlordApplicationStatusBanner: React.FC<{ onPress: () => void }>;
// Plan 16-02 mounts it unchanged in user layout. The 3 hex literals at lines 108/113/120 get token-swapped; nothing else changes.
// Critical: line 88 early-return `if (isAdmin || isModerator) return null` stays VERBATIM.
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add EN+RU i18n keys (parity-gated)</name>

  <files>
src/locales/en.ts
src/locales/ru.ts
  </files>

  <read_first>
- src/locales/en.ts (read full file — identify existing `profile.*` block around lines 212-228 and `landlordApp.banner.*` block around lines 529-537; identify the TranslationKeys union)
- src/locales/ru.ts (read full file — verify the matching `profile.*` block exists at the same structural location)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md (read the "Test patterns for primitives" section AND the "i18n parity — Plan 16-01" section — both list the exact 19 new keys with EN values; planner-defined RU values follow below)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md (read § Specifics — the user-supplied RU strings for section labels and role badges)
- scripts/check-i18n-parity.sh (read full file — understand the exact comparison the script makes so we add keys in matching shape)
  </read_first>

  <behavior>
    Static-key parity test (not a jest unit test — bash sentinel):
    - Test 1: `bash scripts/check-i18n-parity.sh` exits 0 after both files are written.
    - Test 2: Every new EN key has a matching RU key with the same path.
    - Test 3: TypeScript `npx tsc --noEmit` reports no new errors in `src/locales/`.
    - Test 4: `grep -c "profile.section.activity" src/locales/en.ts` returns 1; same for ru.ts.
    - Test 5: `grep -c "profile.staffBadge.admin" src/locales/en.ts` returns 1; same for ru.ts.
  </behavior>

  <action>
Add the following ~19 bilingual key pairs to en.ts and ru.ts (insertion point: directly after the existing `profile.*` block ending around line 228 in en.ts and line 230 in ru.ts — extend the block, do NOT scatter keys elsewhere). Pull the EN strings verbatim from PATTERNS.md § i18n parity. Pull RU translations for section labels and role badges verbatim from CONTEXT.md § Specifics; planner finalizes the remaining RU tile/tool sub-label translations using standard EN→RU patterns from existing `profile.*` and `moderation.*` precedent.

Section labels (4 keys):
- `profile.section.activity` → EN "ACTIVITY" / RU "АКТИВНОСТЬ"
- `profile.section.hosting` → EN "HOSTING" / RU "ОБЪЯВЛЕНИЯ"
- `profile.section.myActivity` → EN "MY ACTIVITY" / RU "МОЯ АКТИВНОСТЬ"
- `profile.section.adminTools` → EN "ADMIN TOOLS" / RU "ИНСТРУМЕНТЫ АДМИНА"

Staff pill + role badges (3 keys):
- `profile.section.staff` → EN "STAFF" / RU "ПЕРСОНАЛ"
- `profile.staffBadge.admin` → EN "ADMIN" / RU "АДМИН"
- `profile.staffBadge.moderator` → EN "MODERATOR" / RU "МОДЕРАТОР"

Tile sub-labels (4 keys, per D-01 — static generic strings, no live counts):
- `profile.tile.favoritesSub` → EN "Saved properties" / RU "Сохранённые объекты"
- `profile.tile.appointmentsSub` → EN "Upcoming" / RU "Предстоящие"
- `profile.tile.myListingsSub` → EN "Your listings" / RU "Ваши объявления"
- `profile.tile.createListingSub` → EN "New property" / RU "Новый объект"

Admin tool tiles (6 keys):
- `profile.tool.applications` → EN "Landlord Applications" / RU "Заявки арендодателей"
- `profile.tool.applicationsSub` → EN "Pending review" / RU "Ожидают проверки"
- `profile.tool.moderation` → EN "Moderation Queue" / RU "Очередь модерации"
- `profile.tool.moderationSub` → EN "Listings to review" / RU "Объявления на проверку"
- `profile.tool.roles` → EN "Role Management" / RU "Управление ролями"
- `profile.tool.rolesSub` → EN "Staff & permissions" / RU "Персонал и права"

Identity card pill + Create Listing sub (2 keys):
- `profile.accountSettingsCta` → EN "Account settings ›" / RU "Настройки аккаунта ›"  (D-03 visual pill; planner may instead reuse existing `profile.accountSettings` if cleaner — choose at write-time and document choice in commit message)
- `profile.createListingSub` (alias of `profile.tile.createListingSub` if duplicating feels noisy — pick ONE key and use it from both row + tile call-sites in Plan 16-02)

Both files MUST be edited in the SAME commit. Run `bash scripts/check-i18n-parity.sh` BEFORE committing — if it fails, fix the mismatch (typo, missing key) before the commit lands.
  </action>

  <verify>
    <automated>bash scripts/check-i18n-parity.sh && npx tsc --noEmit 2>&1 | grep -c "src/locales" | grep -q "^0$" && echo "PASS"</automated>
  </verify>

  <acceptance_criteria>
- Source: `grep -c "profile.section.activity" src/locales/en.ts` returns 1
- Source: `grep -c "profile.section.activity" src/locales/ru.ts` returns 1
- Source: `grep -c "profile.staffBadge.admin" src/locales/en.ts` returns 1
- Source: `grep -c "profile.staffBadge.admin" src/locales/ru.ts` returns 1
- Source: `grep -c "profile.tool.roles" src/locales/en.ts` returns 1
- Source: `grep -c "profile.tool.roles" src/locales/ru.ts` returns 1
- Sentinel: `bash scripts/check-i18n-parity.sh` exits 0
- Sentinel: `npx tsc --noEmit` produces no new errors in `src/locales/*.ts`
- Source: `git diff App.tsx` returns empty (D-24 invariant)
- Sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 grep gate)
  </acceptance_criteria>

  <done>
All ~19 new key pairs land in both en.ts and ru.ts. Parity script exits 0. tsc reports no new errors in locales. The Plan 16-02 executor can reference any of the new keys via `t('profile.section.activity')`, `t('profile.staffBadge.admin')`, etc. without "missing translation" errors.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build 6 profile primitives + 5 co-located tests</name>

  <files>
src/components/profile/ProfileRow.tsx
src/components/profile/ProfileTile.tsx
src/components/profile/ProfileToolTile.tsx
src/components/profile/IdentityCard.tsx
src/components/profile/RoleBadge.tsx
src/components/profile/OutlinedLogoutPill.tsx
src/components/profile/__tests__/ProfileRow.test.tsx
src/components/profile/__tests__/ProfileTile.test.tsx
src/components/profile/__tests__/ProfileToolTile.test.tsx
src/components/profile/__tests__/IdentityCard.test.tsx
src/components/profile/__tests__/RoleBadge.test.tsx
  </files>

  <read_first>
- src/components/FilterStyleRow.tsx (read full file — lines 21-43 for imports pattern, lines 106-151 for the 38px icon-chip + label/sub + chevron Pressable shape that ProfileRow copies verbatim except for the chevron-rotation logic which Phase 16 does NOT need)
- src/components/SectionLabel.tsx (read full file — Phase 15 precedent for clean small primitive; especially the `action?: React.ReactNode` slot prop pattern)
- src/components/StatusPill.tsx (read full file — pill geometry analog for RoleBadge: paddingVertical 4 / paddingHorizontal 8 / borderRadius 12 → RoleBadge changes to borderRadius 999 + adds Shield icon)
- src/screens/AccountSettingsScreen.tsx (lines 222-236 + lines 477-501 — outlined-button precedent for OutlinedLogoutPill, AND lines 484-501 for the `linkRow` + `iconChip` style pattern ProfileRow inherits)
- src/screens/PropertyDetailsScreen.tsx (lines 970-988 JSX + lines 1989-2004 styles — the `mediaGridCard` 2x2 grid tile is the closest existing tile precedent; ProfileTile adapts the vertical-stack inner layout per CONTEXT § Specifics "icon LARGE on top, not inline")
- src/screens/ProfileScreen.tsx (lines 199-225 for IdentityCard's existing data shape and JSX, lines 451-464 for `pendingBadge` styles ProfileToolTile inherits, lines 329-349 for OutlinedLogoutPill's existing handler-call shape — ALL of this is the CURRENT implementation being refactored)
- src/components/__tests__/SectionLabel.test.tsx (read full file — the simplest test precedent: useTheme jest.mock + findTexts helper + TestRenderer.create + act)
- src/components/__tests__/FilterStyleRow.test.tsx (read full file — the multi-mock precedent: useTheme + useLanguage + findPressableByLabel helper for Pressable handler tests)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md (read § Pattern Assignments — has the exact reference JSX for every primitive)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md (§ Code Examples — has the verbatim reference shapes for Role-badge pill, 38pt icon-chip row, Accent-filled "Create Listing" row, Outlined log-out pill)
- src/theme/colors.ts (verify all consumed tokens exist: accent, accentSoft, landlordGreen, destructiveRed, surface, surface2, hair, hair2, text, textSecondary, textTertiary, onAccent, iconChipFg — all confirmed present)
  </read_first>

  <behavior>
ProfileRow.test.tsx (2 cases):
- Test 1: Renders the passed `title` and `sub` strings via findTexts.
- Test 2: Tapping the Pressable invokes the `onPress` prop exactly once.

ProfileTile.test.tsx (3 cases):
- Test 1: Default tile renders title + sub.
- Test 2: `accent={true}` variant uses `colors.accent` background + `colors.onAccent` foreground (assert via tree props).
- Test 3: No-sub variant (sub omitted) does not render a second Text under the title.

ProfileToolTile.test.tsx (4 cases):
- Test 1: `badge={0}` → no badge view rendered.
- Test 2: `badge={5}` → badge view rendered containing text "5".
- Test 3: `badge={undefined}` → no badge view rendered.
- Test 4: `wide={true}` → tile root style includes `width: '100%'` (or equivalent flex override); `wide={false}` → tile root width is `'48%'` (or `minWidth: '48%'`).

IdentityCard.test.tsx (3 cases):
- Test 1: `role='admin'` → renders `<RoleBadge>` child with admin label.
- Test 2: `role='moderator'` → renders `<RoleBadge>` child with moderator label.
- Test 3: `role='user'` → no RoleBadge rendered; tapping the card invokes `onPress` once.

RoleBadge.test.tsx (2 cases):
- Test 1: Renders the passed `label` text in uppercase.
- Test 2: Contains a Shield lucide icon (assert via `tree.root.findAllByType(...)` or by accessibility props).

OutlinedLogoutPill — NO test file (per RESEARCH § Wave Structure Recommendation: "no test — 20 LOC presentational"). The component IS exported and consumed in Plan 16-02; behavior is verified by ProfileScreen-handlers.test.tsx in Plan 16-02.
  </behavior>

  <action>
Create 6 primitive files under `src/components/profile/` and 5 co-located test files under `src/components/profile/__tests__/`. The directory does not exist yet — create it. Every primitive consumes `useTheme().colors` inline at render-sites; geometry-only styles live in `StyleSheet.create()`. No themeStyles{} useMemo blocks.

Implementation specifics by file:

**ProfileRow.tsx** — Copy FilterStyleRow.tsx lines 106-151 as the structural starting point. Strip the `expanded` / `onToggle` / chevron-rotation logic (Phase 16 rows are nav-only, not expandable). Geometry: paddingVertical 15, paddingHorizontal 16, gap 14. 38px icon chip with `backgroundColor: colors.surface2`, `borderRadius: 12`. Icon size 20 strokeWidth 1.75, color `colors.iconChipFg`. Title fontSize 16 weight 600 color `colors.text`. Sub fontSize 12.5 marginTop 1 color `colors.textTertiary`. Trailing ChevronRight size 18 color `colors.textTertiary`. `accent={true}` variant: outer Pressable backgroundColor `colors.accent`, borderRadius 18, padding 15; inner icon-chip backgroundColor `rgba(255,255,255,0.2)` (literal allowed — semi-transparent white over accent fill); icon color `colors.onAccent`; title color `colors.onAccent`; sub color `'rgba(255,255,255,0.85)'` (literal allowed — semi-transparent white over accent fill); ChevronRight color `colors.onAccent`. Pressable props: `accessibilityRole="button"`, `accessibilityLabel={title}`, `hitSlop={{top:8,bottom:8,left:8,right:8}}`.

**ProfileTile.tsx** — Vertical-stack layout (icon on top, label below, sub below): paddingVertical 14, paddingHorizontal 14, borderRadius 18, backgroundColor `colors.surface`, borderWidth 1, borderColor `colors.hair`. Width: `'48%'` (or `flex: 1, minWidth: '48%'` — pick at write time). Inner stack: icon chip 44x44 borderRadius 14 backgroundColor `colors.surface2`, then 12px vertical gap, then title fontSize 15 weight 600 color `colors.text`, then sub fontSize 12 color `colors.textTertiary`. `accent={true}` variant: backgroundColor `colors.accent`, no border; inner icon-chip uses `rgba(255,255,255,0.2)`; title/sub/icon use `colors.onAccent` (sub may use `rgba(255,255,255,0.85)`). Pressable props: same accessibility shape as ProfileRow.

**ProfileToolTile.tsx** — Same geometry as ProfileTile (so the admin grid is visually uniform). Adds: a `badge?: number` prop that renders the existing pendingBadge geometry from current ProfileScreen.tsx:455-464 (borderRadius 10, paddingHorizontal 6, paddingVertical 2, minWidth 20) positioned top-right of the tile (absolute or via flex order — planner picks). Badge backgroundColor `colors.accent`; badge text color `colors.onAccent` (replaces the current `'#FFFFFF'` hex); fontSize 11 weight 600 lineHeight 14. Render badge ONLY when `badge != null && badge > 0`. Adds: a `wide?: boolean` prop — when true, override the width to `'100%'` (D-05 odd-last-tile rule). No accent variant (admin tools are never accent-filled per handoff).

**IdentityCard.tsx** — Outer TouchableOpacity (NOT Pressable — match current screen's existing pattern) onPress={onPress} activeOpacity={0.8}. Card geometry: padding 20 (or 18-20), borderRadius 20, backgroundColor `colors.surface`. Inner row: avatar 54x54 borderRadius 27 backgroundColor `colors.surface2`, avatar text: 1-char uppercase initial fontSize 22 weight 700 color `colors.text` (bump from current 50/24/bold to handoff 54-56/22-24/700). Right of avatar: name/email column (marginLeft 16, flex 1) with email fontSize 16 weight 700 color `colors.text` marginBottom 2. Below email IF `role !== 'user'`: render `<RoleBadge role={role} label={...} />` with marginTop 8 (planner passes the role-mapped label string from caller, e.g. `t('profile.staffBadge.admin')`). Below name (NOT below the badge): a small accent-soft pill containing `accountSettingsLabel` text (non-interactive visual affordance per D-03). Trailing ChevronRight size 20 color `colors.textTertiary`.

**RoleBadge.tsx** — Pure View (no Pressable — visual affordance only). Row with flexDirection 'row', alignItems 'center', gap 6, alignSelf 'flex-start'. Pill geometry: paddingVertical 4, paddingHorizontal 10, borderRadius 999. backgroundColor `colors.accentSoft`. Shield lucide icon size 13 strokeWidth 1.75 color `colors.accent`. Text after icon: fontSize 11.5 weight 700 letterSpacing 0.4 textTransform 'uppercase' color `colors.accent`. Text content = the passed `label` prop (caller passes already-uppercase localized string from `profile.staffBadge.*`).

**OutlinedLogoutPill.tsx** — Pressable onPress={onPress} disabled={loading}. Geometry: flexDirection 'row', alignItems 'center', gap 9, alignSelf 'center', marginTop 4, paddingVertical 12, paddingHorizontal 22, borderRadius 999, borderWidth 1, borderColor `colors.hair2`, backgroundColor 'transparent'. When `loading` is true: render `<ActivityIndicator color={colors.textSecondary} />` (replaces icon+text content). When `loading` is false: render LogOut lucide icon size 17 strokeWidth 1.75 color `colors.textSecondary` THEN Text `{label}` fontSize 14.5 weight 600 color `colors.textSecondary`. Per D-02: calm outlined treatment — NOT destructive red. Per CONTEXT D-02 rationale: reduces accidental-tap regret.

Test files — Use react-test-renderer + act, NOT @testing-library/react-native (project convention from SectionLabel.test.tsx). Mock `useTheme` with the exact tokens consumed by each primitive (build a comprehensive `colors` object dump like ModerationQueueScreen.test.tsx lines 54-80 — missing token = test crash). Mock `useLanguage` for IdentityCard's RoleBadge case (caller passes label strings). Use `findTexts` helper from SectionLabel.test.tsx and `findPressableByLabel` from FilterStyleRow.test.tsx. Quick-run: `npx jest src/components/profile/__tests__/ -x` should pass all 5 files in <3 seconds.
  </action>

  <verify>
    <automated>npx jest --testPathPattern="src/components/profile/__tests__" -x</automated>
  </verify>

  <acceptance_criteria>
- Source: `ls src/components/profile/*.tsx | wc -l` returns 6 (ProfileRow, ProfileTile, ProfileToolTile, IdentityCard, RoleBadge, OutlinedLogoutPill)
- Source: `ls src/components/profile/__tests__/*.test.tsx | wc -l` returns 5
- Source: Every primitive file imports `useTheme` from `'../../theme/ThemeContext'` — verified by `grep -l "useTheme" src/components/profile/*.tsx | wc -l` returns 6
- Sentinel: `! grep -rn "themeStyles" src/components/profile/` exits 0 (no themeStyles{} useMemo blocks introduced)
- Sentinel: `! grep -rEn "#[0-9A-Fa-f]{6}" src/components/profile/*.tsx | grep -v "rgba"` matches at most 2 lines (the semi-transparent white literals `'rgba(255,255,255,0.2)'` and `'rgba(255,255,255,0.85)'` for accent-fill variants are allowed; no opaque hex literals)
- Test command: `npx jest --testPathPattern="src/components/profile/__tests__" -x` exits 0
- Source: `grep -c "wide" src/components/profile/ProfileToolTile.tsx` returns ≥ 2 (prop declaration + style override)
- Source: `grep -c "badge" src/components/profile/ProfileToolTile.tsx` returns ≥ 2 (prop declaration + render gate)
- Source: `grep -c "Shield" src/components/profile/RoleBadge.tsx` returns ≥ 1
- Sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 grep gate)
- Source: `git diff App.tsx` returns empty (D-24 invariant)
- Source: `git diff src/screens/ProfileScreen.tsx` returns empty (Plan 16-02 owns this file)
  </acceptance_criteria>

  <done>
6 primitive components + 5 test files committed. All tests green. tsc clean on the new directory. No themeStyles{} introduced. The Plan 16-02 executor can `import ProfileRow from '../components/profile/ProfileRow'` (and the other 5) without errors. ProfileScreen.tsx UNTOUCHED.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Token-swap LandlordApplicationStatusBanner (3 hardcoded hexes → Phase 12 tokens)</name>

  <files>
src/components/LandlordApplicationStatusBanner.tsx
  </files>

  <read_first>
- src/components/LandlordApplicationStatusBanner.tsx (read full file — the 3 hex literals are at confirmed lines 108 `'#059669'`, 113 `'#D97706'`, 120 `'#DC2626'`; line 88 has the load-bearing `if (isAdmin || isModerator) return null` self-suppression that MUST stay verbatim)
- src/theme/colors.ts (verify lines 10, 11, 37 — confirmed `landlordGreen: '#35c98f'`, `destructiveRed: '#ff4d4d'`, `warning: '#F59E0B'` are all present in BOTH light and dark mode blocks of the export)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md (read § D-08 — the surgical scope is the 3 hexes; soft-tint + border refinement per RESEARCH Pitfall 4 is OPTIONAL planner discretion)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md (read § Pitfall 4 — light-mode contrast risk for landlord green; recommended `rgba(53,201,143,0.10)` soft-tint background + `rgba(53,201,143,0.28)` border for the approved branch as defense-in-depth)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md (read § LandlordApplicationStatusBanner section — exact token-swap mapping table at lines 470-501)
  </read_first>

  <behavior>
This task has NO new jest test file (the component had no test before; adding one is out of scope). Verification is purely static:
- Test 1: `grep -c "#059669" src/components/LandlordApplicationStatusBanner.tsx` returns 0 (was 1).
- Test 2: `grep -c "#D97706" src/components/LandlordApplicationStatusBanner.tsx` returns 0 (was 1).
- Test 3: `grep -c "#DC2626" src/components/LandlordApplicationStatusBanner.tsx` returns 0 (was 1).
- Test 4: `grep -c "colors.landlordGreen" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1.
- Test 5: `grep -c "colors.destructiveRed" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1.
- Test 6: `grep -c "colors.warning" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1.
- Test 7: `grep -c "isAdmin || isModerator" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1 (line 88 self-suppression preserved).
- Test 8: tsc reports no new errors in the file.
  </behavior>

  <action>
Surgical 3-hex token swap per the PATTERNS § LandlordApplicationStatusBanner mapping table (lines 470-501):

| Line | Old | New | Branch |
|---|---|---|---|
| 108 | `accent = '#059669';` | `accent = colors.landlordGreen;` | approved |
| 113 | `accent = '#D97706';` | `accent = colors.warning;` | submitted |
| 120 | `accent = '#DC2626';` | `accent = colors.destructiveRed;` | rejected |

The `colors` identifier is already in scope (component already calls `const { colors } = useTheme();` at the top — verify on read; if not, add it). Do NOT touch the line 88 `if (isAdmin || isModerator) return null` self-suppression — that's load-bearing for Plan 16-02's "mount unconditionally in user layout" anti-pattern guard. Do NOT touch the `'withdrawn'` branch at line 125 (already uses `colors.textSecondary` token). Do NOT touch the `colors.primary` fallback at line 102 (anti-pattern per CONTEXT D-08 — out of scope unless trivially in line of sight).

OPTIONAL planner discretion per RESEARCH Pitfall 4 (light-mode contrast defense): if scope permits, also add `rgba(53,201,143,0.10)` soft-tint background and `rgba(53,201,143,0.28)` border for the approved branch container. SKIP this if it expands the diff beyond the surgical 3-line swap — the user can request it later if light-mode QA flags contrast issues. Document the choice in the commit message.

No new strings, no new tests, no functional behavior change.
  </action>

  <verify>
    <automated>grep -c "'#059669'\|'#D97706'\|'#DC2626'" src/components/LandlordApplicationStatusBanner.tsx | grep -q "^0$" && grep -c "colors.landlordGreen\|colors.warning\|colors.destructiveRed" src/components/LandlordApplicationStatusBanner.tsx | grep -qE "^[3-9]$|^[1-9][0-9]+$" && grep -q "isAdmin || isModerator" src/components/LandlordApplicationStatusBanner.tsx && npx tsc --noEmit 2>&1 | grep -c "LandlordApplicationStatusBanner" | grep -q "^0$" && echo "PASS"</automated>
  </verify>

  <acceptance_criteria>
- Source: `grep -c "'#059669'" src/components/LandlordApplicationStatusBanner.tsx` returns 0
- Source: `grep -c "'#D97706'" src/components/LandlordApplicationStatusBanner.tsx` returns 0
- Source: `grep -c "'#DC2626'" src/components/LandlordApplicationStatusBanner.tsx` returns 0
- Source: `grep -c "colors.landlordGreen" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1
- Source: `grep -c "colors.warning" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1
- Source: `grep -c "colors.destructiveRed" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1
- Source: `grep -c "isAdmin || isModerator" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 1 (self-suppression preserved)
- Test command: `npx tsc --noEmit` reports no new errors in `src/components/LandlordApplicationStatusBanner.tsx`
- Source: `git diff App.tsx` returns empty (D-24 invariant)
- Sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 grep gate)
  </acceptance_criteria>

  <done>
3 hex literals swapped for Phase 12 palette tokens. Self-suppression at line 88 preserved verbatim. tsc clean on the file. No new jest test introduced.
  </done>
</task>

</tasks>

<verification>
Run after Plan 16-01 completes — these must ALL pass before Plan 16-02 begins:

1. **Test suite green:** `npx jest --testPathPattern="src/components/profile" -x` exits 0
2. **i18n parity:** `bash scripts/check-i18n-parity.sh` exits 0
3. **tsc clean:** `npx tsc --noEmit` reports no new errors in `src/components/profile/`, `src/locales/`, or `src/components/LandlordApplicationStatusBanner.tsx`
4. **KBD-02 grep gate:** `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0
5. **App.tsx untouched:** `git diff App.tsx` returns empty
6. **ProfileScreen.tsx untouched:** `git diff src/screens/ProfileScreen.tsx` returns empty
7. **No themeStyles in new dir:** `! grep -rn "themeStyles" src/components/profile/` exits 0
8. **No opaque hexes in new dir:** `! grep -rEn "#[0-9A-Fa-f]{6}" src/components/profile/*.tsx | grep -v "rgba"` matches at most 0 lines
9. **LandlordBanner hexes gone:** `grep -c "'#059669'\|'#D97706'\|'#DC2626'" src/components/LandlordApplicationStatusBanner.tsx` returns 0
10. **LandlordBanner tokens present:** `grep -c "colors.landlordGreen\|colors.warning\|colors.destructiveRed" src/components/LandlordApplicationStatusBanner.tsx` returns ≥ 3
</verification>

<success_criteria>
- 6 primitive component files exist in `src/components/profile/` and export typed components matching the `<interfaces>` contracts above.
- 5 co-located test files exist in `src/components/profile/__tests__/` and exit 0 via jest.
- ~19 new EN+RU key pairs land in `src/locales/{en,ru}.ts`; parity script exits 0; tsc clean.
- `src/components/LandlordApplicationStatusBanner.tsx` reads the 3 status-branch colors from Phase 12 palette tokens; self-suppression at line 88 preserved verbatim.
- `src/screens/ProfileScreen.tsx` UNTOUCHED (Plan 16-02 owns this file).
- `App.tsx` UNTOUCHED (D-24 invariant carried forward).
- KBD-02 grep gate stays 0.
- All 3 phase requirement IDs (PROF-01, PROF-02, PROF-03) are addressed in this plan's `requirements` frontmatter — Plan 16-01 ships the additive layer used by Plan 16-02's render to satisfy them.
</success_criteria>

<output>
After completion, create `.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-01-SUMMARY.md` documenting:
- The 6 primitives shipped with their final exported props shape
- The exact final i18n keys added (in case 16-02 uses a slightly different name)
- The LandlordBanner token-swap commit SHA
- Any planner discretion choices made (e.g. accountSettingsCta vs accountSettings key reuse; optional soft-tint applied or skipped on landlord banner)
- Confirmation that ProfileScreen.tsx + App.tsx remain untouched
</output>

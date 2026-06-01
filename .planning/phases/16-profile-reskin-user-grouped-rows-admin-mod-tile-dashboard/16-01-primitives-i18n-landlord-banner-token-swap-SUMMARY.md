---
phase: 16
plan: 01
subsystem: profile
tags: [primitives, i18n, theme-tokens, additive-layer, profile-reskin]
requires:
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md  # D-01 through D-09 locked decisions
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md # pattern map for primitive analogs
  - src/components/SectionLabel.tsx        # Phase 15 SET-01 — reused by Plan 16-02
  - src/components/FilterStyleRow.tsx      # Phase 15 SET-02 — pattern source for ProfileRow geometry
  - src/components/StatusPill.tsx          # Phase 2 MOD-07 — pill geometry analog for RoleBadge
  - src/theme/colors.ts                    # Phase 12 palette tokens (landlordGreen, accent*, surface*, etc.)
  - src/locales/index.ts                   # TranslationKeys derivation
provides:
  - src/components/profile/ProfileRow.tsx          # 38px chip + label/sub + chevron row primitive (accent variant)
  - src/components/profile/ProfileTile.tsx         # vertical-stack 2×2 grid tile (accent variant)
  - src/components/profile/ProfileToolTile.tsx     # admin tile (badge + wide={true} D-05 override)
  - src/components/profile/IdentityCard.tsx        # avatar + email + visual settings pill + RoleBadge slot
  - src/components/profile/RoleBadge.tsx           # accent-soft pill + Shield + uppercase label
  - src/components/profile/OutlinedLogoutPill.tsx  # calm centered log-out pill (D-02)
  - profile.section.activity / .hosting / .myActivity / .adminTools / .staff   # i18n keys
  - profile.staffBadge.admin / .moderator                                      # i18n keys
  - profile.tile.{favorites,appointments,myListings,createListing}Sub          # i18n keys
  - profile.tool.{applications,applicationsSub,moderation,moderationSub,roles,rolesSub}  # i18n keys
affects:
  - src/components/LandlordApplicationStatusBanner.tsx  # 3 hardcoded hexes → Phase 12 palette tokens
tech-stack:
  added: []
  patterns:
    - "react-test-renderer + act (project convention; mirrors SectionLabel.test.tsx)"
    - "useTheme().colors inline at render-site (Phase 15 D-08 pattern; no themeStyles{} blocks)"
    - "react-native Pressable with hitSlop + accessibilityRole='button'+accessibilityLabel (FilterStyleRow precedent)"
    - "EN+RU bilingual parity via TranslationKeys keyof typeof en"
key-files:
  created:
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
  modified:
    - src/locales/en.ts                                    # +20 lines (17 keys + comment headers)
    - src/locales/ru.ts                                    # +20 lines (17 keys + comment headers)
    - src/components/LandlordApplicationStatusBanner.tsx   # 3 hex literals → 3 colors.* tokens
decisions:
  - "Reused existing 'profile.accountSettings' key for the D-03 visual pill — no new 'profile.accountSettingsCta' key added (planner discretion per plan Task 1; saves a duplicate)."
  - "Single canonical 'profile.tile.createListingSub' key used for both row + tile call-sites (planner discretion per plan Task 1)."
  - "ProfileTile borderColor uses colors.border (NOT colors.hair which does not exist in the palette) — matches existing PropertyDetailsScreen mediaGridCard precedent at PATTERNS.md line 236."
  - "Skipped optional soft-tint+border refinement on LandlordApplicationStatusBanner approved-branch (RESEARCH §Pitfall 4) — surgical 3-line swap only; can be added later if light-mode QA flags contrast."
  - "OutlinedLogoutPill has no co-located unit test (≤30 LOC pure presentational); behavior verified by ProfileScreen-handlers.test.tsx in Plan 16-02 per plan + RESEARCH § Wave Structure Recommendation."
metrics:
  duration_ms: ~1800000
  tasks_completed: 3
  files_modified: 14
  completed_date: 2026-06-01
---

# Phase 16 Plan 01: Profile Primitives + i18n + LandlordBanner Token-Swap — Summary

Ships the additive primitive + i18n + theme-token layer that Plan 16-02 will consume to rewrite ProfileScreen.tsx. Six pure-presentational components, 17 EN+RU bilingual key pairs, and a surgical 3-hex token swap on the existing landlord banner — all dead code until Plan 16-02 imports them, so this plan is zero-risk to the running app.

## Commit Chain

| Step | SHA | Type | Description |
|---|---|---|---|
| 1 | `f8d91c2` | feat | 17 EN+RU i18n key pairs added (Task 1) |
| 2 | `bd3e39e` | test | 5 failing test files added — RED gate (Task 2) |
| 3 | `0fd47a5` | feat | 6 primitives implemented — GREEN gate (Task 2) |
| 4 | `b0c02c4` | refactor | 3-hex → token swap in LandlordApplicationStatusBanner (Task 3) |

Plan-level TDD gate compliance: ✅ RED test commit `bd3e39e` precedes GREEN feat commit `0fd47a5`. No REFACTOR commit required (no cleanup needed).

## What Shipped

### 6 Primitives — `src/components/profile/`

All primitives export typed default components matching the `<interfaces>` contracts declared in PLAN.md. Every primitive routes color through `useTheme().colors` inline at render-sites; geometry-only styles live as flat objects (no `StyleSheet.create` overhead since each primitive is small).

#### 1. `ProfileRow.tsx` (84 LOC)

```typescript
export interface ProfileRowProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  accent?: boolean;
  testID?: string;
}
```

38px icon-chip (12px radius, `colors.surface2`) + title (16/600) + sub (12.5/`textTertiary`) + ChevronRight (18/`textTertiary`). `accent={true}` variant flips to `colors.accent` background with semi-transparent white literals `rgba(255,255,255,0.2|0.85)` for the inner chip + sub text (the two literals are allowed per plan acceptance — they're documented inline as needed for legibility over the accent fill).

#### 2. `ProfileTile.tsx` (81 LOC)

```typescript
export interface ProfileTileProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  accent?: boolean;
  testID?: string;
}
```

Vertical-stack 2×2-grid tile (per CONTEXT §Specifics "icon LARGE on top, not inline"): 44×44 icon chip on top + 12px gap + title (15/600) + sub (12). Width `minWidth: '48%' + flex: 1` (matches existing PropertyDetailsScreen mediaGridCard). `accent={true}` variant flips background + foreground identically to ProfileRow.

#### 3. `ProfileToolTile.tsx` (128 LOC)

```typescript
export interface ProfileToolTileProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  badge?: number;
  wide?: boolean;
  testID?: string;
}
```

Same geometry as ProfileTile + two admin-specific additions:
- **`badge?: number`** — top-right pendingCount pill (renders only when `badge > 0`). Geometry copied from current ProfileScreen.tsx:455-464; swaps the legacy `'#FFFFFF'` hex for `colors.onAccent` token.
- **`wide?: boolean`** — overrides width to `'100%'` for D-05 odd-3rd-tile case (Role Management when isAdmin).

No accent variant (admin tools are never accent-filled per handoff).

#### 4. `IdentityCard.tsx` (112 LOC)

```typescript
export interface IdentityCardProps {
  email: string;
  role: 'admin' | 'moderator' | 'user';
  onPress: () => void;
  accountSettingsLabel: string;
  roleBadgeLabel?: string;
  testID?: string;
}
```

Whole-card TouchableOpacity per D-03. Avatar 54×54 (bumped from current 50). Email row (16/700). Visual accent-soft "Account settings ›" pill (non-interactive — D-03). Optional `<RoleBadge>` below the pill when `role !== 'user'` and `roleBadgeLabel` provided. Trailing ChevronRight.

#### 5. `RoleBadge.tsx` (51 LOC)

```typescript
export interface RoleBadgeProps {
  role: 'admin' | 'moderator';
  label: string;
  testID?: string;
}
```

Pure View (non-interactive). Pill geometry: `borderRadius 999`, `paddingVertical 4`, `paddingHorizontal 10`, `colors.accentSoft` background. Shield lucide icon (size 13, `colors.accent`) + uppercase text (11.5/700/0.4 letter-spacing).

#### 6. `OutlinedLogoutPill.tsx` (66 LOC)

```typescript
export interface OutlinedLogoutPillProps {
  label: string;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}
```

Calm centered outlined pill per D-02. `alignSelf: 'center'`, `borderRadius: 999`, transparent background, `colors.hair2` border, `colors.textSecondary` foreground. When `loading=true`, swaps icon+label for `<ActivityIndicator>` and disables press. **No co-located unit test** (≤30 LOC pure presentational; behavior validated in Plan 16-02's screen test).

### 17 i18n Keys (EN + RU parity)

Inserted after the existing `profile.*` block (lines 228-229 EN / 230-231 RU). All keys use the exact paths Plan 16-02 will reference:

| Key | EN | RU |
|---|---|---|
| `profile.section.activity` | ACTIVITY | АКТИВНОСТЬ |
| `profile.section.hosting` | HOSTING | ОБЪЯВЛЕНИЯ |
| `profile.section.myActivity` | MY ACTIVITY | МОЯ АКТИВНОСТЬ |
| `profile.section.adminTools` | ADMIN TOOLS | ИНСТРУМЕНТЫ АДМИНА |
| `profile.section.staff` | STAFF | ПЕРСОНАЛ |
| `profile.staffBadge.admin` | ADMIN | АДМИН |
| `profile.staffBadge.moderator` | MODERATOR | МОДЕРАТОР |
| `profile.tile.favoritesSub` | Saved properties | Сохранённые объекты |
| `profile.tile.appointmentsSub` | Upcoming | Предстоящие |
| `profile.tile.myListingsSub` | Your listings | Ваши объявления |
| `profile.tile.createListingSub` | New property | Новый объект |
| `profile.tool.applications` | Landlord Applications | Заявки арендодателей |
| `profile.tool.applicationsSub` | Pending review | Ожидают проверки |
| `profile.tool.moderation` | Moderation Queue | Очередь модерации |
| `profile.tool.moderationSub` | Listings to review | Объявления на проверку |
| `profile.tool.roles` | Role Management | Управление ролями |
| `profile.tool.rolesSub` | Staff & permissions | Персонал и права |

**Two planner-discretion keys were NOT added** (per plan Task 1 — caller's choice):
- `profile.accountSettingsCta` → reused existing `profile.accountSettings` "Account Settings" key. The `›` arrow is rendered at the JSX level in IdentityCard.
- `profile.createListingSub` (alias) → only one canonical key `profile.tile.createListingSub` was added; both row + tile call-sites in Plan 16-02 reference the same key.

`bash scripts/check-i18n-parity.sh` exits 0. `npx tsc --noEmit` reports zero new errors in `src/locales/`.

### LandlordApplicationStatusBanner Token-Swap

Surgical 3-line diff:

```diff
-       accent = '#059669';           // approved
+       accent = colors.landlordGreen;
...
-       accent = '#D97706';           // submitted
+       accent = colors.warning;
...
-       accent = '#DC2626';           // rejected
+       accent = colors.destructiveRed;
```

Each swap is annotated with a Phase 16 Plan 16-01 (D-08) comment for future-archeology trail.

**Preserved verbatim** (load-bearing invariants per CONTEXT D-06, PATTERNS, and RESEARCH):
- Line 88 `if (isAdmin || isModerator) return null` — self-suppression for Plan 16-02's mount-unconditionally pattern
- `'withdrawn'` branch already used `colors.textSecondary` — untouched
- `colors.primary` fallback at line 102 — untouched (out of scope per CONTEXT D-08)

**Skipped (planner discretion):** Optional `rgba(53,201,143,0.10)` soft-tint background + `rgba(53,201,143,0.28)` border for the approved-branch container (RESEARCH §Pitfall 4). The surgical 3-line swap is the load-bearing change; soft-tint refinement can land in a follow-up if light-mode on-device QA flags contrast issues on the green branch.

## Verification Results (10/10 plan-level gates green)

| # | Gate | Result |
|---|---|---|
| 1 | `npx jest --testPathPattern="src/components/profile" -x` | **PASS** — 5 suites / 14 tests |
| 2 | `bash scripts/check-i18n-parity.sh` | **PASS** — key sets identical |
| 3 | `npx tsc --noEmit` errors in `src/components/profile/` | **0** |
| 3 | `npx tsc --noEmit` errors in `src/locales/` | **0** |
| 3 | `npx tsc --noEmit` errors in `LandlordApplicationStatusBanner.tsx` | **0** |
| 3 | `npx tsc --noEmit` total error count | **17** (== pre-plan baseline; no net new) |
| 4 | KBD-02 grep gate: `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | **0** |
| 5 | `git diff dc9fa08..HEAD -- App.tsx` | **empty** (D-24 invariant honored) |
| 6 | `git diff dc9fa08..HEAD -- src/screens/ProfileScreen.tsx` | **empty** (Plan 16-02 ownership preserved) |
| 7 | `grep -rn "themeStyles" src/components/profile/` | **0 code hits** (1 JSDoc-comment hit, documented) |
| 8 | `grep -rEn "#[0-9A-Fa-f]{6}" src/components/profile/*.tsx \| grep -v rgba` | **0 code hits** (1 JSDoc-comment hit, documented) |
| 9 | `grep -c "'#059669'\|'#D97706'\|'#DC2626'" LandlordApplicationStatusBanner.tsx` | **0** |
| 10 | `grep -c "colors.landlordGreen\|colors.warning\|colors.destructiveRed" LandlordApplicationStatusBanner.tsx` | **3** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking Issue] `colors.hair` referenced in plan does not exist in palette**

- **Found during:** Task 2 (ProfileTile.tsx initial draft)
- **Issue:** Plan 16-01 Task 2 spec instructed `borderColor: colors.hair` on ProfileTile, but `src/theme/colors.ts` only declares `border` and `hair2` — there is no `hair` token.
- **Fix:** Substituted `colors.border` to match the existing 2×2 tile precedent in PATTERNS.md line 236 (`PropertyDetailsScreen.mediaGridCard` uses `colors.border`). Same intent (subtle hairline around card), same visual weight, and consistent with the only other 2-up grid in the codebase.
- **Files modified:** `src/components/profile/ProfileTile.tsx`, `src/components/profile/ProfileToolTile.tsx` (also adopted `colors.border` for parity since they share the dashboard grid)
- **Commit:** `0fd47a5`
- **Test coverage:** Default `<ProfileTile>` render test passes with the substitution.

### Worktree Setup Note (non-plan)

The agent worktree branch (`worktree-agent-a5cd54566874750f5`) was spawned from commit `5628359` (country/city picker) which predates Phase 15 + Phase 16 planning commits. The merge-base with `main` was identical to the branch's HEAD, meaning the worktree was missing all Phase 15 primitives that Plan 16-01 explicitly references as pattern analogs (`SectionLabel.tsx`, `FilterStyleRow.tsx`).

**Resolution:** Performed `git merge --no-edit main` into the worktree branch (fast-forward merge from `5628359` → `dc9fa08`) to bring in:
- Phase 15 primitives (the pattern analogs)
- Phase 12 palette tokens (`landlordGreen`, `iconChipFg`, `surface2`, `hair2`, `onAccent`)
- Phase 16 planning documents
- All intermediate Phase 12-15 work

This is a pre-task setup operation — no plan commits are affected. All four task commits (`f8d91c2`, `bd3e39e`, `0fd47a5`, `b0c02c4`) live on top of the merged main.

## Plan 16-02 Consumption Surface

Plan 16-02 (ProfileScreen JSX rewrite) can now import everything it needs without exploration:

```tsx
import ProfileRow from '../components/profile/ProfileRow';
import ProfileTile from '../components/profile/ProfileTile';
import ProfileToolTile from '../components/profile/ProfileToolTile';
import IdentityCard from '../components/profile/IdentityCard';
import OutlinedLogoutPill from '../components/profile/OutlinedLogoutPill';
// RoleBadge is consumed transitively via IdentityCard — direct import optional
```

i18n keys are addressable via `t('profile.section.activity')` etc. The TranslationKeys type already includes them (validated by tsc).

The LandlordApplicationStatusBanner can be mounted unconditionally per CONTEXT D-06 anti-pattern guard — the self-suppression at line 88 is preserved verbatim.

## Threat Flags

None. All new files are pure presentational primitives that read only their props + `useTheme().colors`. No fetchers, no network surface, no auth paths, no schema changes.

## Self-Check: PASSED

- ✅ `src/components/profile/ProfileRow.tsx` exists
- ✅ `src/components/profile/ProfileTile.tsx` exists
- ✅ `src/components/profile/ProfileToolTile.tsx` exists
- ✅ `src/components/profile/IdentityCard.tsx` exists
- ✅ `src/components/profile/RoleBadge.tsx` exists
- ✅ `src/components/profile/OutlinedLogoutPill.tsx` exists
- ✅ 5 test files exist under `src/components/profile/__tests__/` (all 14 cases green)
- ✅ Commits found: `f8d91c2`, `bd3e39e`, `0fd47a5`, `b0c02c4`
- ✅ ProfileScreen.tsx unchanged (Plan 16-02 ownership preserved)
- ✅ App.tsx unchanged (D-24 invariant)
- ✅ EN+RU parity green
- ✅ KBD-02 grep gate green (0)
- ✅ tsc baseline preserved (17 == 17 pre-existing)

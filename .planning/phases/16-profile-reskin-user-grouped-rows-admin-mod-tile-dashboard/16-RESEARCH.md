# Phase 16: Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) — Research

**Researched:** 2026-05-31
**Domain:** React Native screen visual refactor (brownfield) — role-discriminated dual layout, M6 palette consumer
**Confidence:** HIGH

## Summary

Phase 16 is a single-file, single-screen presentational reskin of `src/screens/ProfileScreen.tsx` (486 LOC today) that splits one shared layout into two role-discriminated layouts (grouped-rows for regular users; 2×2 tile dashboard + role-gated ADMIN TOOLS for admin/moderator), against the Phase 12 palette + Phase 15 `SectionLabel` primitive. Every data-fetch, count-fetcher, prop wiring, and role-gate is already in the file or in a shared component — the work is structural JSX rewrite + new icon-chip / tile / role-badge / outlined-pill primitives + new i18n keys. The phase has no backend, no schema, no data-layer, and no App.tsx call-site change [VERIFIED: roadmap §Phase 16 Goal + ProfileScreen.tsx + App.tsx:873-885].

The "do not hand-roll" surface is small: `SectionLabel` already ships (Phase 15), `LandlordApplicationStatusBanner` already ships and self-suppresses for admin/moderator (no re-wrap needed), the palette tokens (`accent`/`accentSoft`/`landlordGreen`/`destructiveRed`/`iconChipFg`/`surface2`/`hair2`/`textTertiary`) are all in place from Phase 12, the `useRole()` discriminator is in place from M2, and `PropertyService.getModerationQueueCount` + `moderationCountRefreshKey` invalidation are wired and load-bearing (CR-02 memo lives inline in the file). The realistic landmines are (1) tile-width math for the odd-tile-full-width Role Management case (admin-only), (2) preserving the existing AppState 60s-cooldown ref so background-return refresh keeps working, (3) the landlord banner's existing `LandlordApplicationStatusBanner` early-return for admin/moderator makes the "banner ONLY for regular users" gate work for free, and (4) the `themeStyles{}` block (lines 99-111) hardcodes iOS blue accent + non-M6 hexes — must be ripped and rewritten against `useTheme().colors` (same surgical pattern Phase 15 used).

**Primary recommendation:** Single-screen brownfield rewrite split across **2 plans** — Plan 16-01 ships shared primitives (tile, role-badge, icon-chip row, outlined log-out pill, landlord soft-banner) + new i18n keys + token migration of existing styles; Plan 16-02 swaps the JSX body for the role-discriminated layout and proves both branches render. Mirrors Phase 15's two-plan shape and the same "rip themeStyles, swap to colors.*" surgical pattern.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role discrimination (user vs admin/mod layout) | Client (React component) | — | `useRole()` hook already returns `isAdmin`/`isModerator`/`role` — pure client read [VERIFIED: hooks/useRole.ts:122-135] |
| Pending-count badge (Moderation Queue) | Client (ProfileScreen self-fetch) | API (`PropertyService.getModerationQueueCount`) | Existing M2 Phase 3 CR-02 pattern: ProfileScreen owns count state, App.tsx bumps `moderationCountRefreshKey` to invalidate [VERIFIED: ProfileScreen.tsx:58-97 + App.tsx:107,884] |
| Landlord-application banner | Client (`LandlordApplicationStatusBanner`) | API (`LandlordApplicationService.getMine`) | Self-suppresses for admin/moderator via `if (isAdmin \|\| isModerator) return null` [VERIFIED: LandlordApplicationStatusBanner.tsx:88] |
| Theme tokens | Client (ThemeContext consumer) | — | `useTheme().colors` — Phase 12 palette already in place [VERIFIED: theme/colors.ts] |
| Navigation routing | Parent (App.tsx) | — | 9 handler props passed verbatim; Phase 16 does NOT modify App.tsx [VERIFIED: App.tsx:871-887] |
| i18n strings | Client (`useLanguage().t`) | — | Existing `profile.*` + new section/badge keys in EN+RU [VERIFIED: locales/en.ts + ru.ts] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` | 0.84.0 | Base UI primitives (View, Text, TouchableOpacity, ScrollView, ActivityIndicator, AppState, StyleSheet) | Project-locked; New Architecture; no migration in scope [VERIFIED: package.json] |
| `react-native-safe-area-context` | ^5.5.2 | `SafeAreaView` for header inset handling | Already used in ProfileScreen.tsx + AccountSettingsScreen.tsx [VERIFIED: import] |
| `lucide-react-native` | ^0.564.0 | Icons (`Heart`, `Calendar`, `ClipboardList`, `Plus`, `LogOut`, `Inbox`, `UserCog`, `ChevronRight`, **`Shield`** NEW, **`House`** NEW) | Already used; Shield + House exports confirmed [VERIFIED: icons.d.ts grep] |

### Supporting (already in repo, reused)
| Module | Path | Purpose | When to Use |
|--------|------|---------|-------------|
| `useTheme()` | `src/theme/ThemeContext.tsx` | Get `colors.*` tokens + `isDark` | Every render-site needing a color |
| `useLanguage()` | `src/context/LanguageContext.tsx` | `t(key)` + locale switch | Every user-visible string |
| `useRole()` | `src/hooks/useRole.ts` | `role` / `isAdmin` / `isModerator` / `can(action)` | Layout discrimination + tile gating |
| `useAuth()` | `src/context/AuthContext.tsx` | `user` + `logout(silent)` | Identity card + log-out handler |
| `SectionLabel` | `src/components/SectionLabel.tsx` | Uppercase letter-spaced section header w/ optional action slot | Every "ACTIVITY"/"HOSTING"/"MY ACTIVITY"/"ADMIN TOOLS" label [VERIFIED: file content] |
| `LandlordApplicationStatusBanner` | `src/components/LandlordApplicationStatusBanner.tsx` | Self-fetching landlord-app status row | Mounted between identity card + ACTIVITY section; self-suppresses for staff [VERIFIED: line 88 early-return] |
| `PropertyService.getModerationQueueCount` | `src/services/PropertyService.ts` | Returns moderation pending count number | Tile badge on Moderation Queue tool (admin/mod) |
| `AppointmentService.getOwnerSettings` | existing | Existing `blockSize` fetcher; **may be unused after reskin** | Verify before deletion — was used for the "viewing time slots" panel that doesn't appear in handoff |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single shared layout w/ conditional rows | Two top-level branches (`if (isAdmin \|\| isModerator) return <AdminLayout/>; return <UserLayout/>;`) | Two branches is what handoff specs — DIFFERENT layouts (rows vs tiles), not "rows-plus-extras". Branch split is cleaner and matches the handoff `ProfileHub` / `ProfileAdmin` function shape [CITED: profile-screens.jsx:37,98,155] |
| Inline tile JSX in ProfileScreen | Extract `<ActivityTile>` / `<ToolTile>` reusable components | Tiles appear 4× (2×2 grid) + 2-3× (ADMIN TOOLS) — extracting saves ~80 LOC and tests cleaner. Extract is the recommendation. [ASSUMED — based on Phase 15 D-13 "extract when reused 3+ times" precedent] |
| Custom expandable rows (à la FilterStyleRow) | Plain Pressable rows | User-layout has no expand/collapse — rows are nav-only. Simpler Pressable suffices. |

**Installation:**
No new packages required. All needed lucide icons are already exported.

**Version verification:** [VERIFIED via local file system]
- `lucide-react-native@0.564.0` exports `Shield`, `House`, `UserCog`, `Heart`, `Calendar`, `ClipboardList`, `Plus`, `LogOut`, `Inbox`, `ChevronRight`. `Home` is NOT exported in this version — must use `House` if a house-style icon is wanted (the handoff uses `'listings'` glyph which we map to `ClipboardList` — already imported).

## Architecture Patterns

### System Architecture Diagram

```
       App.tsx (parent state machine)
                │
                │ 9 nav handler props + moderationCountRefreshKey
                ▼
       ProfileScreen.tsx
            │
            ├─► useAuth().user           ── identity card data
            ├─► useRole().{role, can}    ── layout branch + tile gating
            ├─► useLanguage().t          ── all visible strings
            ├─► useTheme().colors        ── all colors (NO themeStyles{} block)
            │
            ├─► AuthService.getBackendUser(localId)
            │     └─ canListProperties → enables "Create Listing" / "My Listings" in user layout
            │
            ├─► PropertyService.getModerationQueueCount()
            │     └─ on mount + AppState 'active' (60s cooldown) + moderationCountRefreshKey bump
            │     └─ pendingCount → badge on Moderation Queue tile (admin/mod only)
            │
            ├─► LandlordApplicationStatusBanner
            │     └─ self-fetches LandlordApplicationService.getMine()
            │     └─ self-suppresses for isAdmin || isModerator
            │
            └─► Render branch
                  │
                  ├─ regular user (role='user') ──► Grouped-rows layout
                  │     identity card → landlord banner → ACTIVITY card →
                  │     HOSTING card → Create Listing accent row → Log out pill
                  │
                  └─ admin/moderator (role='admin'|'moderator') ──► Tile dashboard
                        identity card (w/ role badge) → MY ACTIVITY 2×2 tiles →
                        ADMIN TOOLS (role-gated tiles, Role Mgmt admin-only) →
                        Log out pill
```

### Recommended File Layout (Phase 16 deltas only)
```
src/
├── screens/
│   └── ProfileScreen.tsx              # ── REWRITTEN; ~486 → ~550 LOC expected (two layouts inline)
├── components/
│   ├── SectionLabel.tsx               # ── REUSED (Phase 15); no change
│   ├── LandlordApplicationStatusBanner.tsx  # ── REUSED; no change
│   ├── profile/                       # ── NEW directory (mirrors src/components/filters/ Phase 14 pattern)
│   │   ├── ProfileIdentityCard.tsx    # ── NEW (avatar + name + email + Settings pill + optional role badge)
│   │   ├── ProfileRow.tsx             # ── NEW (38px icon chip + label/sub + chevron — user-layout grouped row)
│   │   ├── ProfileTile.tsx            # ── NEW (40-42px icon chip + label/sub + optional badge — 2×2 grid tile)
│   │   ├── ProfileToolTile.tsx        # ── NEW (admin tile variant w/ optional pending-count badge + wide/odd-width support)
│   │   └── LogOutPill.tsx             # ── NEW (outlined pill, centered, replaces today's full-width bottom button)
│   └── __tests__/
│       ├── ProfileIdentityCard.test.tsx   # ── NEW
│       ├── ProfileRow.test.tsx            # ── NEW
│       ├── ProfileTile.test.tsx           # ── NEW
│       └── ProfileToolTile.test.tsx       # ── NEW (badge gating + wide variant)
├── locales/
│   ├── en.ts                          # ── EDITED — add profile.section.*, profile.youreLandlord.*, profile.staffBadge, etc.
│   └── ru.ts                          # ── EDITED — RU parity
```

> Component-folder choice (`src/components/profile/`) mirrors `src/components/filters/primitives/` from Phase 14 D-08, which created a folder when 4+ related primitives shipped together. If the planner opts to inline the primitives in ProfileScreen for atomicity, that's also valid — final call is the planner's. [VERIFIED: ls src/components/filters/]

### Pattern 1: Self-discriminating role branch
**What:** Render an early-return branch at the top of ProfileScreen body.
**When to use:** Two genuinely different layouts (not "rows-plus-extras").
**Example (reference shape — adapt during planning):**
```tsx
// Source: profile-screens.jsx:37 (ProfileHub) + :155 (ProfileAdmin) handoff verbatim
const isStaff = isAdmin || isModerator;
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    <Header title={t('profile.myProfile')} onBack={onBack} />
    {isStaff
      ? <AdminTileLayout {...handlers} pendingCount={pendingCount} role={role} />
      : <UserGroupedRowsLayout {...handlers} canListProperties={canListProperties} />}
  </SafeAreaView>
);
```

### Pattern 2: 2×2 grid with odd-tile-full-width fallback (admin layout)
**What:** Use `flexDirection: 'row'` + `flexWrap: 'wrap'` with each tile at `width: '48%'` (gap: 12), then conditionally set the last tile to `width: '100%'` when `TOOLS.length % 2 === 1`.
**Why:** Handoff specifies "Role Management renders full-width when it's the odd tile" — moderator sees 2 tools (Landlord Applications + Moderation Queue, even, 2×1 grid); admin sees 3 (the previous two + Role Management, odd, with Role Mgmt full-width). [CITED: profile-screens.jsx:228 `TOOLS.length % 2 === 1 && i === TOOLS.length - 1`]
**Reference shape:**
```tsx
// Source: profile-screens.jsx:166-194 (toolTile function)
const TOOLS = useMemo(() => [
  { id: 'apps',  Icon: Inbox,  labelKey: 'profile.tool.applications', subKey: 'profile.tool.applicationsSub', onPress: onReviewLandlordApplications, gate: canReviewLandlordApplications },
  { id: 'mod',   Icon: Shield, labelKey: 'profile.tool.moderation',   subKey: 'profile.tool.moderationSub',   onPress: onReviewModerationQueue,       gate: canViewModerationQueue, badge: pendingCount },
  { id: 'roles', Icon: UserCog, labelKey: 'profile.tool.roles',       subKey: 'profile.tool.rolesSub',        onPress: onOpenRoleManagement,           gate: canManageRoles },
].filter(t => t.gate && !!t.onPress), [pendingCount, ...handlers]);

// odd-tile-full-width: pass `wide={TOOLS.length % 2 === 1 && i === TOOLS.length - 1}` to each
```

### Pattern 3: AppState-listener with cooldown ref (PRESERVE VERBATIM)
**What:** The existing `lastCountFetchAt` ref + 60s cooldown + `AppState.addEventListener('change', onChange)` block at ProfileScreen.tsx:83-97 is load-bearing per the CR-02 memo and PATTERNS §E.
**When to use:** Preserve as-is across the rewrite — moderator returning from background needs fresh count.
**Critical:** Do NOT inline-rewrite this block; copy it verbatim into the new file. The 60s cooldown is independent from AuthContext.refreshRole and from ModerationQueueScreen's own cooldown.

### Anti-Patterns to Avoid
- **Anti-pattern: Re-inventing `themeStyles{}` for Phase 16.** The existing `useMemo(() => ({ background: isDark ? '#000' : '#F2F2F7', accent: '#3B82F6', ... }), [isDark])` at lines 99-111 is exactly the M3-era pattern Phase 12 eliminated. RIP it; consume `useTheme().colors` directly at render-sites (matches Phase 15 D-08 surgery on AccountSettingsScreen). The hardcoded iOS blue `#3B82F6` is the most visible visual regression — must flip to `colors.accent` (pink).
- **Anti-pattern: Modifying App.tsx call sites.** Phase 15 D-24 locked `App.tsx` off-limits; Phase 16 inherits that. All 9 nav handlers + `moderationCountRefreshKey` arrive as props; do NOT re-wire.
- **Anti-pattern: Wrapping `LandlordApplicationStatusBanner` in an `if (!isStaff)` guard.** The component already early-returns `null` for admin/moderator at line 88 — adding a redundant guard couples Phase 16 to that behavior. Mount it unconditionally in both layouts (it'll show in user, suppress in staff). Cleaner.
- **Anti-pattern: Hand-rolling a green-tinted "You're a Landlord" banner.** The existing `LandlordApplicationStatusBanner` already covers the approved/submitted/rejected/withdrawn/none state matrix with its own `accent` color logic (lines 100-131). For PROF-01 SC1 "green-tinted banner when applicable, gated as today" we keep that existing component — its `accent = '#059669'` for the approved branch is close enough to the M6 landlord-green `#35c98f` that it's a 1-line token swap, not a re-design. **Recommendation:** Do the token swap in Phase 16 (replace the 4 hardcoded hexes at lines 108/113/119 with `colors.landlordGreen`/`colors.warning`/`colors.destructiveRed`/`colors.textSecondary`) within scope. [VERIFIED: LandlordApplicationStatusBanner.tsx:100-131]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Uppercase section labels | New `<UppercaseHeader>` | `<SectionLabel>` from Phase 15 | Already ships w/ typography spec (12/700/1.1 letter-spacing) + optional action slot. Roadmap explicitly flags it as reusable for Phase 16. [VERIFIED: SectionLabel.tsx + roadmap §STATE.md M6 phase map] |
| Landlord status surface | New banner | `<LandlordApplicationStatusBanner>` | Already self-fetches, self-suppresses, handles 5 states (approved/submitted/rejected/withdrawn/none). Just token-swap the 4 hardcoded hexes. [VERIFIED: file content] |
| Role derivation | New email allowlist or claim parser | `useRole()` hook | Mongo `userType` is authority; ladder already covers customClaims + backendProfile + guest. [VERIFIED: useRole.ts:46-69] |
| Moderation count fetcher | New API call | `PropertyService.getModerationQueueCount` + existing `moderationCountRefreshKey` prop | CR-02 memo lives in the file; pattern survived 2 milestones + plan-checker scrutiny. [VERIFIED: ProfileScreen.tsx:64-97 + App.tsx:107] |
| Theme palette | New hex constants | `useTheme().colors` (Phase 12 tokens) | `accent` / `accentSoft` / `landlordGreen` / `destructiveRed` / `iconChipFg` / `surface2` / `hair2` / `textTertiary` all defined and mode-independent where the handoff requires it. [VERIFIED: theme/colors.ts:1-100] |
| Avatar circle w/ initial | New component | Inline View+Text (current ProfileScreen line 204-209 pattern is fine) | 30 LOC of JSX is shorter than a new file. Handoff uses 54-56pt diameter (vs current 50pt) and serif font for initial — adjust the literal values, no abstraction needed. |
| 38pt icon-chip background | New tinted-icon component | Inline `View` with `colors.surface2` bg (matches `AccountSettingsScreen.tsx:495-501` `iconChip` style) | Pattern shipped in Phase 15; copy the StyleSheet entry. [VERIFIED: AccountSettingsScreen.tsx:495] |

**Key insight:** Phase 16 is almost entirely consumption of primitives shipped by Phases 12/15 (palette + SectionLabel + theme hook) and M2 (useRole + LandlordApplicationStatusBanner + PropertyService.getModerationQueueCount). The only genuinely new visual primitives are (a) the 2×2 grid tile (small, simple), (b) the tool tile w/ pending-count badge (small, simple), (c) the role badge (pill w/ Shield + text — 15 LOC), and (d) the outlined log-out pill (replaces today's full-width red button — 20 LOC).

## Runtime State Inventory

> Required because the existing file holds runtime state (count fetcher, AppState listener, profile fetch). Verifying nothing else carries the old layout's data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — phase touches no MongoDB collection, no AsyncStorage, no SQLite. Verified by grep of phase scope (`grep -rn 'AsyncStorage\|@jaytap_' src/screens/ProfileScreen.tsx` → 0 matches). | None |
| Live service config | None — no backend route, no Railway env var, no third-party service config. Phase is presentational. | None |
| OS-registered state | None — no Task Scheduler, pm2, launchd, or systemd registration touched. | None |
| Secrets/env vars | None — phase reads no secrets; existing `PropertyService.getModerationQueueCount` already authenticates via `axios` interceptor with the user's token (unchanged). | None |
| Build artifacts | None — no schema regeneration, no codegen step, no native module addition. iOS Pods + Android Gradle untouched. | None |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old ProfileScreen layout cached, stored, or registered?* **Answer: nothing.** The phase is a pure-client visual rewrite. The Phase 15 carry-forward `useFilterStyle` AsyncStorage key is read by HomeScreen / FilterStyleRow, not ProfileScreen.

## Common Pitfalls

### Pitfall 1: Hardcoded `themeStyles{}` leftovers
**What goes wrong:** A render-site or styled-row keeps reading `themeStyles.accent` (today's iOS-blue `#3B82F6`) instead of `colors.accent` (M6 pink `#ff5a6f`). The visual review during on-device QA catches it, but only after the QA matrix walk burns time.
**Why it happens:** The existing file uses `themeStyles` in 14 distinct render-sites (grep `themeStyles\.` ProfileScreen.tsx → 14 matches). Missing one in the rewrite leaves a residual blue glyph against the new palette.
**How to avoid:** Before commit, grep `grep -c "themeStyles" src/screens/ProfileScreen.tsx` MUST equal 0. Plan-checker should enforce this as a Wave-0 gate.
**Warning signs:** Pencil/chevron/icons rendering iOS blue on the dev build; "Application Status" banner color drifts from the rest of the screen.

### Pitfall 2: Role-Management tile width fragility
**What goes wrong:** Moderator (2 tools, even) renders a clean 2×1 grid; admin (3 tools, odd) needs Role Mgmt at full-width — but a naive `flexBasis: '48%'` on the last tile leaves a half-width gap.
**Why it happens:** The handoff uses `gridColumn: '1 / -1'` CSS Grid which doesn't exist in RN. Equivalent RN pattern is `style={{ width: '100%' }}` overriding the `48%` default when `index === TOOLS.length - 1 && TOOLS.length % 2 === 1`.
**How to avoid:** Pass a `wide` prop to `<ProfileToolTile>` and render `width: wide ? '100%' : '48%'` (or equivalent flex). Co-located test should cover both `TOOLS.length === 2` (no wide) and `TOOLS.length === 3` (last is wide) cases.
**Warning signs:** Admin Profile renders Role Mgmt at half-width with empty space on the right.

### Pitfall 3: AppState cooldown ref lost during rewrite
**What goes wrong:** The `lastCountFetchAt` ref (line 83) gets dropped or reset during the JSX rewrite. Moderator backgrounds the app for 30s and returns → no count refresh (broken). OR: cooldown deleted entirely → moderator backgrounds repeatedly → spam of `getModerationQueueCount` calls.
**Why it happens:** AppState listener block (lines 83-97) is dense and inline; an executor focusing on JSX shape may treat it as boilerplate.
**How to avoid:** Treat lines 64-97 (both useEffects + cooldown ref) as **copy-verbatim** during rewrite. Pre-commit grep: `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` MUST equal 2 (ref declaration + cooldown comparison).
**Warning signs:** Moderation Queue badge stale after background-return; or `console.log` shows count fetcher firing >1× / minute.

### Pitfall 4: Landlord banner color contrast in light mode
**What goes wrong:** The existing banner hardcodes `accent = '#059669'` (deep green) for the approved branch — readable on dark surface, may look murky on light-mode `colors.surface` (`#ffffff`). New token `colors.landlordGreen` is `#35c98f` which is brighter; the soft-tint background also needs darkening (handoff uses `rgba(53,201,143,0.10)` tint).
**Why it happens:** The original banner was built for M2 dark-only; Phase 12 added light-mode but didn't audit the banner's hex constants.
**How to avoid:** During the token-swap of `LandlordApplicationStatusBanner`, render the soft-tint background using `rgba(53,201,143,0.10)` AND add `border: 1px solid rgba(53,201,143,0.28)` per handoff spec (`profile-screens.jsx:56`). Verify in both light + dark via on-device QA.
**Warning signs:** Banner illegible against `#f3f3f6` light bg; or banner text contrast fails WCAG AA in either mode.

### Pitfall 5: Role badge font-color contrast on accent-soft pill
**What goes wrong:** Handoff renders "ADMIN" as `color: ACC` (pink `#ff5a6f`) on `background: ACC_SOFT` (`rgba(255,90,111,0.16)`). On dark surface that's fine; on light surface the contrast is borderline.
**Why it happens:** `accentSoft` is the same RGBA in both modes (mode-independent token). The light-mode surface behind it amplifies contrast issues.
**How to avoid:** Test the role pill in both modes during on-device QA. If contrast fails, render `color: colors.accent` (the full `#ff5a6f` accent — has enough saturation against the soft fill in both modes per handoff intention). [CITED: profile-screens.jsx:207 `color: ACC, background: ACC_SOFT`]
**Warning signs:** "ADMIN" pill text washes out in light mode.

### Pitfall 6: KBD-02 grep gate regression
**What goes wrong:** Adding `keyboardVerticalOffset` to any view inside ProfileScreen would break the 3-milestone KBD-02 invariant.
**Why it happens:** ProfileScreen has no TextInputs today and shouldn't gain any in Phase 16 — but if a planner introduces an inline edit affordance "for free", the grep gate fires.
**How to avoid:** Pre-commit gate: `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0. Phase 16 should NOT add any TextInput; identity card is read-only, all account edits route to AccountSettings via `onViewAccountSettings`.

### Pitfall 7: TranslationKeys type drift
**What goes wrong:** Adding `profile.section.activity` to `en.ts` but not `ru.ts` (or vice versa) → `ru.ts: Record<TranslationKeys, string>` TypeScript fails. Or both added but spelled differently.
**Why it happens:** Bilingual parity requires both files edited in the same commit; manual sync is error-prone.
**How to avoid:** Run `scripts/check-i18n-parity.sh` as the last step of every i18n-touching commit. Plan should chain `npx tsc --noEmit` + `bash scripts/check-i18n-parity.sh` as a verification step. [VERIFIED: scripts/check-i18n-parity.sh]

## Code Examples

Verified patterns from project source (NOT copy-paste — adapt during planning):

### Existing pending-count + AppState cooldown block (PRESERVE)
```tsx
// Source: src/screens/ProfileScreen.tsx:59-97 (verbatim — copy through rewrite)
const [pendingCount, setPendingCount] = useState<number>(0);

useEffect(() => {
    if (!canViewModerationQueue) return;
    let cancelled = false;
    (async () => {
        try {
            const count = await PropertyService.getModerationQueueCount();
            if (!cancelled) setPendingCount(count);
        } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
}, [canViewModerationQueue, moderationCountRefreshKey]);

const lastCountFetchAt = useRef<number | null>(null);
useEffect(() => {
    if (!canViewModerationQueue) return;
    const onChange = (nextState: AppStateStatus) => {
        if (nextState !== 'active') return;
        const now = Date.now();
        if (lastCountFetchAt.current && now - lastCountFetchAt.current < 60_000) return;
        lastCountFetchAt.current = now;
        PropertyService.getModerationQueueCount()
            .then(setPendingCount)
            .catch(() => { /* non-fatal */ });
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
}, [canViewModerationQueue]);
```

### Role-badge pill (new — derived from handoff)
```tsx
// Source: /tmp/moveinzip_ld/.../profile-screens.jsx:207 + theme/colors.ts (translation)
// 11.5/700/letter-spacing 0.4 — Shield 13pt — accentSoft bg — accent fg
import { Shield } from 'lucide-react-native';
<View style={{
  flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
  paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
  backgroundColor: colors.accentSoft, alignSelf: 'flex-start',
}}>
  <Shield size={13} color={colors.accent} strokeWidth={1.75} />
  <Text style={{
    fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4,
    textTransform: 'uppercase', color: colors.accent,
  }}>
    {role === 'admin' ? t('profile.staffBadge.admin') : t('profile.staffBadge.moderator')}
  </Text>
</View>
```

### 38pt icon-chip row (user layout) — reuse Phase 15 pattern
```tsx
// Source: src/screens/AccountSettingsScreen.tsx:495-501 (iconChip style) + handoff Row pattern
// Pressable + chip + label/sub + chevron — non-accent variant
<Pressable
  onPress={onViewFavorites}
  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15 }}
>
  <View style={{
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Heart size={20} color={colors.iconChipFg} strokeWidth={1.75} />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
      {t('profile.favorites')}
    </Text>
    <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 1 }}>
      {/* sub-label — count if available, else generic */}
    </Text>
  </View>
  <ChevronRight size={18} color={colors.textTertiary} />
</Pressable>
```

### Accent-filled "Create Listing" row (user layout)
```tsx
// Source: profile-screens.jsx:81 — Row w/ accentBg=true
// In RN: backgroundColor: colors.accent, all text/icon = colors.onAccent
<Pressable onPress={onCreateListing} style={{
  flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15,
  backgroundColor: colors.accent, borderRadius: 18,
}}>
  <View style={{ /* chip with rgba(255,255,255,0.2) bg */ }}>
    <Plus size={20} color={colors.onAccent} strokeWidth={2} />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '600' }}>
      {t('profile.createListing')}
    </Text>
    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5 }}>
      {t('profile.createListingSub')}
    </Text>
  </View>
  <ChevronRight size={18} color={colors.onAccent} />
</Pressable>
```

### Outlined log-out pill (replaces today's full-width red button)
```tsx
// Source: profile-screens.jsx:86-88 (calm outlined pill, centered)
// Replaces ProfileScreen.tsx:329-349 logoutFooter + full-width logoutButton
<Pressable
  onPress={handleLogout}
  disabled={loggingOut}
  style={{
    flexDirection: 'row', alignItems: 'center', gap: 9,
    alignSelf: 'center', marginTop: 4,
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: 999, borderWidth: 1, borderColor: colors.hair2,
    backgroundColor: 'transparent',
  }}
>
  <LogOut size={17} color={colors.textSecondary} strokeWidth={1.75} />
  <Text style={{ color: colors.textSecondary, fontSize: 14.5, fontWeight: '600' }}>
    {t('profile.logOut')}
  </Text>
</Pressable>
```
> NOTE: Handoff renders log-out as a calm (`textSecondary`) outlined pill — NOT the destructive-red full-width button shipped today. This is a deliberate visual de-emphasis. Confirm during discuss-phase if the user wants to preserve the destructive-red treatment instead (would render `borderColor: colors.destructiveRed`, `color: colors.destructiveRed`). [CITED: profile-screens.jsx:86-88 + 143-145 + 232-234 — all three layouts use the calm pill]

## State of the Art

| Old Approach (Phase 1-Phase 11) | Current Approach (Phase 12-16) | When Changed | Impact |
|---------|-----------------------------|--------------|--------|
| Inline `themeStyles{}` useMemo blocks with isDark hex literals | `useTheme().colors` token reads | Phase 12 (2026-05-31) | Phase 16 must rip the existing 14-site themeStyles{} usage in ProfileScreen.tsx |
| Multiple ad-hoc "section header" patterns | Shared `<SectionLabel>` primitive | Phase 15 (2026-06-01) | Phase 16 consumes for ACTIVITY/HOSTING/MY ACTIVITY/ADMIN TOOLS |
| Single shared Profile layout w/ role conditionals | Two top-level layouts branched on `useRole().isAdmin \|\| isModerator` | Phase 16 (this phase) | Handoff dictates structurally-different layouts, not row variants |
| Full-width red Log Out button at bottom | Calm outlined pill, centered | Phase 16 (this phase) | Visual de-emphasis — confirm in discuss-phase |

**Deprecated/outdated in current ProfileScreen.tsx:**
- `blockSize: '30min' \| '60min'` state + `AppointmentService.getOwnerSettings()` fetcher (line 44 + lines 126-131) — appear to be remnants of an earlier "viewing time slots" panel that doesn't render in the current file. **Recommendation:** Verify with `grep -n "blockSize" src/screens/ProfileScreen.tsx` — if no JSX consumer exists, delete the state + fetcher during the rewrite. (Saves a network call + 5 LOC.) Quick check: the file's current JSX uses `availabilitySection` / `availabilityLabel` styles (lines 412-417) which are unreachable. [VERIFIED: styles defined but not used in current render path]
- Hardcoded iOS-blue `#3B82F6` accent everywhere — replaced by `colors.accent` (`#ff5a6f`).
- `themeStyles.danger = '#FF453A'` — replaced by `colors.destructiveRed` (`#ff4d4d`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Home` lucide icon NOT exported in 0.564.0 (use `House`) | Standard Stack | Low — confirmed via grep of `icons.d.ts` (Home not found; House exists). Planner must use `House` for any house-glyph use. [VERIFIED, but flagged because handoff uses `'listings'` (= ClipboardList) not house — Home/House may not even be needed] |
| A2 | "Calm outlined" log-out pill is the user-preferred visual | Code Examples | Medium — handoff shows all 3 layouts using the calm version, but project has shipped destructive-red full-width since M2 (3 milestones). Suggest discuss-phase confirmation. |
| A3 | The "blockSize" state + AppointmentService.getOwnerSettings() fetcher is dead code | State of the Art | Low — visual confirmation: lines 412-417 define `availabilitySection`/`availabilityLabel` styles that no JSX references. But the fetcher is wrapped in `.catch(() => null)` so it's not blocking. Verify with grep before deleting. |
| A4 | Sub-labels for tiles ("12 saved", "2 upcoming", "4 active", "New property") map to existing or new fetchers | Common Pitfalls / spec | Medium — handoff shows sub-text on tiles, but the project's existing ProfileScreen doesn't fetch favorite/appointment/listing counts. PROF-03 says counts should "source from the existing fetchers — no count regression" — but those fetchers may not exist in ProfileScreen scope; they may live in FavoritesScreen/AppointmentsScreen. **Planner must either: (a) add lightweight count fetchers to ProfileScreen, (b) render sub-labels with generic strings only (e.g. "Saved properties", "Upcoming"), or (c) confirm in discuss-phase.** This is the biggest "loose end" the planner will trip on. |
| A5 | A `src/components/profile/` directory is the right place for new sub-components | Recommended File Layout | Low — mirrors `src/components/filters/primitives/` from Phase 14 D-08; alternative is inlining in ProfileScreen for atomicity. Planner decides. |
| A6 | The role badge uses `colors.accent` foreground on `colors.accentSoft` background (not white-on-accent) | Code Examples | Low — handoff verbatim (`color: ACC`); only failure mode is light-mode contrast, mitigatable. |

**If user disagrees with A2 (log-out treatment) or A4 (tile sub-labels):** these are the only items that need clarification before planning. All other claims are tool-verified.

## Open Questions

1. **Tile sub-labels: do we have count fetchers in scope or do we render generic strings?**
   - What we know: PROF-03 SC3 says "favorite count, appointment count, and My Listings count source from the existing fetchers — no count regression." The current ProfileScreen.tsx does NOT call any of these fetchers; the counts live in FavoritesScreen / AppointmentsScreen / OwnerListingsScreen.
   - What's unclear: Does the planner add 3 new lightweight count-fetcher useEffects to ProfileScreen (parallels the existing moderation-count pattern), or render generic strings ("Saved properties", "Upcoming viewings", "Your listings"), or defer counts to a "PROF-04" follow-up?
   - Recommendation: Render generic strings in Phase 16 v1 (matches today's ProfileScreen which shows no counts) AND surface this as an open question during discuss-phase. The handoff is aspirational; the existing code is silent. If user wants counts, add a "PROF-04 backlog: tile count fetchers" line item — small, additive, no risk.

2. **Log Out treatment: calm outlined pill (handoff) vs destructive-red full-width button (today)?**
   - What we know: Handoff renders calm `textSecondary` outlined pill, centered. Today's file renders destructive-red full-width button pinned to bottom.
   - What's unclear: User intent. The handoff is a visual de-emphasis; user may have a preference rooted in conversion concern ("log-out is dangerous, keep it red").
   - Recommendation: Default to handoff (calm pill) and explicitly flag in CONTEXT.md decisions. If user pushes back, swap colors to `destructiveRed` — geometry stays the same.

3. **"Account settings ›" pill anatomy: full pill on identity card vs current `accountSettings` text row.**
   - What we know: Today's file shows "Account Settings" as a sub-label below email (line 221), wrapping the whole identity card in a single TouchableOpacity. Handoff shows a separate accent-soft rounded pill containing "Account settings ›" text (`profile-screens.jsx:49`).
   - What's unclear: Does the whole card stay tappable, or only the pill?
   - Recommendation: Keep whole card tappable (current UX); render the pill visual treatment as a non-interactive child. Matches handoff visual + preserves today's tap target.

## Environment Availability

> No external dependencies — phase is pure RN client code against existing libraries. Environment check trivially passes.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `react-native@0.84.0` | Base UI | ✓ | 0.84.0 | — |
| `lucide-react-native@0.564.0` (Shield, House, UserCog, all already used icons) | Icons | ✓ | 0.564.0 | — |
| `react-native-safe-area-context@5.5.2` | SafeAreaView | ✓ | 5.5.2 | — |
| Node ≥22.11.0 | Tooling | ✓ | (system has 20.19.1 for RN client per memory; matches engines field) | — |
| Jest ^29.6.3 + react-test-renderer | Co-located tests | ✓ | 29.6.3 / 19.2.3 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

> nyquist_validation is enabled in `.planning/config.json` (key present, value `true`). Including this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.6.3 + react-test-renderer 19.2.3 (RN preset) |
| Config file | `jest.config.js` (preset: 'react-native'; testPathIgnorePatterns excludes `.claude/worktrees`) |
| Setup file | `jest.setup.js` (mocks AsyncStorage + gesture-handler + keyboard-controller) |
| Quick run command | `npx jest src/components/__tests__/ProfileTile.test.tsx -x` (per primitive) |
| Per-component run | `npx jest src/components/__tests__/Profile*.test.tsx -x` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | User layout renders identity card + landlord banner + ACTIVITY + HOSTING + Create Listing + Log Out for role='user' | unit (react-test-renderer w/ mocked useRole + useAuth + useTheme) | `npx jest src/screens/__tests__/ProfileScreen-user.test.tsx -x` | ❌ Wave 0 |
| PROF-02 | Admin layout renders identity card w/ role badge + 2×2 MY ACTIVITY tiles + ADMIN TOOLS (3 tiles for admin, 2 for moderator, Role Mgmt full-width when odd) | unit (react-test-renderer w/ mocked useRole returning admin then moderator) | `npx jest src/screens/__tests__/ProfileScreen-admin.test.tsx -x` | ❌ Wave 0 |
| PROF-03 | All 9 nav handler props fire on tap; moderation badge reads pendingCount; landlord banner respects gate; AppState cooldown ref preserved | unit (mock handlers + invoke press) | `npx jest src/screens/__tests__/ProfileScreen-handlers.test.tsx -x` | ❌ Wave 0 |
| PROF-01..03 | i18n parity gate | static (bash + tsc) | `bash scripts/check-i18n-parity.sh && npx tsc --noEmit` | ✓ (script exists) |
| PROF-01..03 | KBD-02 grep gate (must stay 0) | static (bash) | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` (expect 0) | ✓ (manual) |
| Primitives | `<ProfileRow>` icon-chip + label + sub + chevron renders | unit | co-located | ❌ Wave 0 |
| Primitives | `<ProfileTile>` icon-chip + label + sub + accent-fill variant renders | unit | co-located | ❌ Wave 0 |
| Primitives | `<ProfileToolTile>` badge gating + wide=true full-width variant | unit | co-located | ❌ Wave 0 |
| Primitives | `<ProfileIdentityCard>` role badge gating (admin/moderator/user) | unit | co-located | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest src/components/__tests__/Profile*.test.tsx src/screens/__tests__/ProfileScreen*.test.tsx -x && bash scripts/check-i18n-parity.sh`
- **Per wave merge:** `npx jest && bash scripts/check-i18n-parity.sh && npx tsc --noEmit`
- **Phase gate:** Full suite green + on-device walk APPROVED on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark × (user account + admin account + moderator account) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/components/__tests__/ProfileIdentityCard.test.tsx` — covers role badge gating (3 cases: admin / moderator / user-no-badge)
- [ ] `src/components/__tests__/ProfileRow.test.tsx` — covers icon-chip render + onPress fires (2 cases)
- [ ] `src/components/__tests__/ProfileTile.test.tsx` — covers accent-fill variant + label/sub render (3 cases: default tile / accent tile / no-sub tile)
- [ ] `src/components/__tests__/ProfileToolTile.test.tsx` — covers badge=0 hidden / badge>0 shown / wide=true full-width (4 cases)
- [ ] `src/screens/__tests__/ProfileScreen-user.test.tsx` — covers user layout structure (1 case: role='user' shows ACTIVITY+HOSTING+Create+LogOut; no admin tiles)
- [ ] `src/screens/__tests__/ProfileScreen-admin.test.tsx` — covers admin layout (2 cases: admin sees 3 tools + Role Mgmt full-width; moderator sees 2 tools + no Role Mgmt)
- [ ] `src/screens/__tests__/ProfileScreen-handlers.test.tsx` — covers tap → handler call for all 9 props (9 cases)

## Project Constraints (from CLAUDE.md + memory)

These directives are LOCKED — research and plans MUST comply.

- **Custom App.tsx state machine — NO `react-navigation`** (CLAUDE.md). Phase 16 reads 9 nav handler props passed from App.tsx; no internal nav library.
- **App.tsx is OFF-LIMITS** (Phase 15 D-24 invariant carried forward). Phase 16 MUST NOT modify `App.tsx`. All wiring already exists at App.tsx:873-885.
- **EN+RU bilingual parity** for every new string (`scripts/check-i18n-parity.sh` exit 0). Gate runs per-commit.
- **`useTheme()` tokens — no hardcoded colors** (CLAUDE.md). Phase 16 must rip the existing `themeStyles{}` block (14 hex literals) and consume `colors.*` directly.
- **KBD-02 grep gate** (`m1-keyboard-kbd-02-invariants.md`): `grep -rn "keyboardVerticalOffset" src/ \| wc -l` MUST equal 0. Phase 16 has no TextInputs so this is trivially preserved.
- **Manual physical-device QA** (CLAUDE.md): iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark. M6 explicitly requires both modes per Phase 12 palette migration.
- **Mongo `userType` is role authority** (memory `identity-vs-user-store.md`). `useRole()` ladder already enforces this; Phase 16 reads `useRole().role` only.
- **3-category 9-type taxonomy preserved** (CLAUDE.md "ad-hoc fixes" guard). Phase 16 doesn't touch listing taxonomy.
- **No Firebase SDK** (memory `no-firebase-sdk.md`). Phase 16 imports nothing Firebase-related (REST-only via existing AuthContext).
- **Geographic scope KG+KZ+UZ, not Bishkek-only** (memory `geographic-scope.md`). Phase 16 has no city/region copy; identity card shows name + email only.

## Sources

### Primary (HIGH confidence)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ProfileScreen.tsx` (486 LOC) — current implementation; the file being rewritten
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/theme/colors.ts` — Phase 12 palette tokens
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/SectionLabel.tsx` — Phase 15 primitive (reused)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/LandlordApplicationStatusBanner.tsx` — self-suppressing banner (reused)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts` — role discrimination ladder
- `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx:107,873-887` — `moderationCountRefreshKey` wiring + 9 nav-handler prop pass-through
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` + `ru.ts` — existing `profile.*` + `landlordApp.*` + `moderation.*` + `admin.roles.*` + `common.*` keys
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md` — PROF-01..03 verbatim
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/ROADMAP.md` §Phase 16 — goal + 5 success criteria
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md` — Phase 15 decisions; SectionLabel reuse contract; "rip themeStyles" surgical pattern; D-24 App.tsx invariant
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/AccountSettingsScreen.tsx` — sibling reskin example (Phase 15 shipped)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/FilterStyleRow.tsx` — pattern reference for icon-chip + sub + tap-handler row
- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-screens.jsx` — handoff: ProfileHub (user grouped rows) + ProfileDashboard + ProfileAdmin (tile dashboard + admin tools)
- `/tmp/moveinzip_ld/design_handoff_profile_filters/profile-shared.jsx` — handoff: SectionLabel, Card, Row, Avatar, FilterStyleRow primitives + ACC/ACC_SOFT/ICON_BG/ICON_FG tokens
- `/tmp/moveinzip_ld/design_handoff_profile_filters/README.md` §3 "My Profile" — spec, hifi tokens, role gating rules
- `/Users/beckmaldinVL/development/mobileApps/JayTap/jest.config.js` + `jest.setup.js` — test runner config

### Secondary (MEDIUM confidence)
- `node_modules/lucide-react-native/dist/icons.d.ts` — Shield, House, UserCog, Inbox export verification (grep)
- Memory: `m6-language-pill-stays-in-header.md`, `m6-scope-decisions-2026-05-31.md`, `m6-filter-variants-are-the-point.md`, `m6-phase-15-shipped-2026-06-01.md`, `m1-keyboard-kbd-02-invariants.md`, `subagent-cwd-drift-recurring.md`

### Tertiary (LOW confidence)
- None — every claim in this research is sourced from project files or the handoff bundle.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json, all icons verified exported
- Architecture: HIGH — pattern follows Phase 15 exactly (same scale of surgery, same primitives layered on, same 2-plan shape recommended)
- Pitfalls: HIGH — pitfalls 1-3 are project-historical (themeStyles drift, count fetcher ref loss, KBD-02 grep gate); pitfalls 4-6 derive from handoff spec specifics
- Wave structure: HIGH — 2 plans is the strong recommendation, mirrors Phase 15; 3 plans (split user/admin) is viable but adds merge churn for a screen that's already a single file
- Open question A4 (tile sub-labels): MEDIUM — handoff is aspirational; existing code is silent; planner will likely surface this during discuss-phase

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (30 days — stable client-only RN code; no upstream library changes expected; M6 palette already shipped)

---

## Wave Structure Recommendation

**Recommended: 2 plans (mirrors Phase 15 D-15).**

### Plan 16-01 — Profile primitives + token migration + i18n
- Create `src/components/profile/ProfileIdentityCard.tsx` + co-located test
- Create `src/components/profile/ProfileRow.tsx` + co-located test
- Create `src/components/profile/ProfileTile.tsx` + co-located test (default + accent-fill variants)
- Create `src/components/profile/ProfileToolTile.tsx` + co-located test (badge gating + wide variant)
- Create `src/components/profile/LogOutPill.tsx` (no test — 20 LOC presentational)
- Add `profile.section.activity`, `profile.section.hosting`, `profile.section.myActivity`, `profile.section.adminTools`, `profile.staffBadge.admin`, `profile.staffBadge.moderator`, `profile.staffBadge.staff`, `profile.youreLandlord.title`, `profile.youreLandlord.sub`, `profile.tile.favoritesSub`, `profile.tile.appointmentsSub`, `profile.tile.myListingsSub`, `profile.createListingSub`, `profile.tool.applications`, `profile.tool.applicationsSub`, `profile.tool.moderation`, `profile.tool.moderationSub`, `profile.tool.roles`, `profile.tool.rolesSub` keys to `en.ts` + `ru.ts` (~19 new bilingual pairs)
- Token-swap `LandlordApplicationStatusBanner.tsx` 4 hardcoded hexes → `colors.landlordGreen` / `colors.warning` / `colors.destructiveRed` / `colors.textSecondary`
- Atomic commit. Gates: tsc 0 new errors, i18n parity exit 0, KBD-02 grep gate stays 0, all new tests green.

### Plan 16-02 — ProfileScreen.tsx rewrite (role-discriminated layout)
- Rip `themeStyles{}` block (lines 99-111); rewrite every render-site against `useTheme().colors`
- Delete dead `blockSize` state + `AppointmentService.getOwnerSettings()` fetcher (per A3, if grep confirms)
- Preserve verbatim: pending-count + AppState cooldown blocks (lines 64-97); landlord-application banner mount; 9 navigation handler bindings
- Replace single-card JSX body with role-branched render (`isStaff ? <AdminLayout/> : <UserLayout/>`)
- Inline user layout (identity card → landlord banner → ACTIVITY card → HOSTING card → Create Listing accent row → Log Out pill)
- Inline admin layout (identity card w/ role badge → MY ACTIVITY 2×2 tiles → ADMIN TOOLS section w/ role-gated tiles, Role Mgmt full-width when odd → Log Out pill)
- Co-located tests for both branches (PROF-01 / PROF-02) + handler call-through test (PROF-03)
- Atomic commit. Gates: tsc 0 new errors, i18n parity exit 0, KBD-02 grep gate stays 0, themeStyles grep = 0, full jest suite green, on-device QA APPROVED (8-cell matrix: iPhone × Android × EN × RU × light × dark × {user, admin}).

**Why split this way:** Plan 16-01 is the additive primitive layer (zero risk to existing screen — primitives ship as unused files until 16-02 consumes them). Plan 16-02 is the brownfield rewrite (highest risk, biggest test surface). Mid-execution rollback is clean: 16-02 can be reverted while 16-01 stays committed (primitives are dead code, no regression). Mirrors Phase 13/14/15's "primitives-first, integration-second" project shape.

**Alternative considered (3 plans — split user/admin layouts):** Adds a third atomic commit but the two layouts share the identity card + log-out pill + landlord banner mount → 60% overlap → the third plan would mostly re-touch the same file. Two plans is tighter.

**Alternative considered (1 plan — single atomic rewrite):** Highest risk; biggest commit; smallest rollback granularity. Rejected for the same reason Phase 15 split into 2.

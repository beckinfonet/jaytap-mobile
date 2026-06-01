# Phase 16: Profile Reskin — Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 13 (5–7 new primitives candidate, 4 modified, 4 test stubs)
**Analogs found:** 13 / 13 (all matched — same-author/same-epoch precedent in repo)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/screens/ProfileScreen.tsx` (REWRITE) | screen | presentation-only + 2 self-fetchers (preserve verbatim) | `src/screens/AccountSettingsScreen.tsx` | exact (same epoch, same surgical-rewrite pattern Phase 15 did) |
| `src/components/profile/ProfileRow.tsx` (NEW or co-located) | primitive | presentation-only | `src/components/FilterStyleRow.tsx` (collapsed-row part, lines 106-151) + `src/screens/AccountSettingsScreen.tsx` `linkRow` (lines 484-501) | exact (same 38px icon-chip + label/sub + chevron anatomy) |
| `src/components/profile/ProfileTile.tsx` (NEW or co-located) | primitive | presentation-only | `src/screens/PropertyDetailsScreen.tsx` `mediaGridCard` (lines 1989-2004 styles + 970-988 JSX) | exact (existing 2×2 grid tile in same repo) |
| `src/components/profile/ProfileToolTile.tsx` (NEW or co-located) | primitive | presentation-only | Same as ProfileTile + `pendingBadge` from current `ProfileScreen.tsx:455-464` | role-match + badge precedent |
| `src/components/profile/IdentityCard.tsx` (NEW or co-located) | primitive | presentation-only | Current `ProfileScreen.tsx:199-225` (existing identity TouchableOpacity) | exact (same data shape, swap palette only) |
| `src/components/profile/RoleBadge.tsx` (NEW or co-located) | primitive | presentation-only | `src/components/StatusPill.tsx` (Phase 2 MOD-07 primitive) | role-match (same pill geometry; different fg/bg tokens) |
| `src/components/profile/OutlinedLogoutPill.tsx` (NEW or co-located) | primitive | presentation-only | `src/screens/AccountSettingsScreen.tsx` `cardActionButton` + cancel-style (lines 222-236, 477-483) | role-match (outlined button pattern) |
| `src/components/profile/ProfileCard.tsx` (NEW or co-located, optional container) | primitive | presentation-only | `src/screens/AccountSettingsScreen.tsx` `card` style (lines 436-441) | exact (rounded-surface container) |
| `src/locales/en.ts` (~10 new keys) | i18n | presentation-only | existing `profile.*` block (en.ts lines 212-228) + `landlordApp.banner.*` (lines 529-537) | exact |
| `src/locales/ru.ts` (~10 new keys, parity) | i18n | presentation-only | existing `profile.*` block (ru.ts lines 214-230) + `landlordApp.banner.*` (lines 531+) | exact |
| `src/components/LandlordApplicationStatusBanner.tsx` (token-swap only) | component | self-fetcher (preserve) | itself — surgical edit at lines 102, 108, 113, 120, 125 | self |
| `src/components/profile/__tests__/*.test.tsx` (per primitive) | test | presentation-only | `src/components/__tests__/SectionLabel.test.tsx` + `src/components/__tests__/FilterStyleRow.test.tsx` | exact (project test convention) |
| `src/screens/__tests__/ProfileScreen-*.test.tsx` (3 files) | test | presentation-only | `src/screens/__tests__/ModerationQueueScreen.test.tsx` lines 39-52 (useRole mock pattern) | exact |

---

## Pattern Assignments

### `src/screens/ProfileScreen.tsx` (screen, rewrite — Plan 16-02)

**Analog:** `src/screens/AccountSettingsScreen.tsx` (Phase 15 sibling reskin — same shape of surgery, already shipped)

**Imports pattern** (AccountSettingsScreen.tsx lines 1-23):
```tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Pencil, Trash2, Briefcase } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import SectionLabel from '../components/SectionLabel';
```
For Phase 16, add `useRole` from `../hooks/useRole` and the lucide icons listed in CONTEXT § Specifics (`Shield`, `Heart`, `Calendar`, `ClipboardList`, `Plus`, `LogOut`, `UserCog`, `Inbox`, `ChevronRight`).

**Theme consumption pattern** (AccountSettingsScreen.tsx line 74 — single hook, inline at render-site):
```tsx
const { colors } = useTheme();
// later:
<View style={[styles.card, { backgroundColor: colors.surface }]}>
<Text style={[styles.infoLabel, { color: colors.text }]}>
<View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
```
**This replaces the existing `themeStyles{}` useMemo block at ProfileScreen.tsx:99-111. After rewrite, `grep -c "themeStyles" src/screens/ProfileScreen.tsx` MUST equal 0.** (Pitfall 1 from RESEARCH.md.)

**StyleSheet.create separation** (AccountSettingsScreen.tsx lines 409-554 — geometry only, no colors):
```tsx
const styles = StyleSheet.create({
    container: { flex: 1 },
    section: { marginBottom: 24 },
    card: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 4 },
    iconChip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
```
**Geometry only — every color is inlined at the call-site.**

**Role-discrimination branch pattern** (NEW — match RESEARCH.md Pattern 1):
```tsx
const { isAdmin, isModerator } = useRole();
const isStaff = isAdmin || isModerator;
// ... header + scroll wrap ...
{isStaff ? <AdminLayoutJSX /> : <UserLayoutJSX />}
```
Both branches share the same SafeAreaView + header + log-out pill — only the middle (cards vs tile grid) differs.

**PRESERVE VERBATIM** (ProfileScreen.tsx lines 59-97 — copy lines exactly through the rewrite per Pitfall 3):
```tsx
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
**Pre-commit gate:** `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` MUST equal 2 (ref decl + cooldown comparison).

**Preserve also** (ProfileScreen.tsx lines 113-148 — backend-profile fetcher with `canListProperties` outcome):
```tsx
useEffect(() => {
    if (!user?.localId) { ... return; }
    let cancelled = false;
    const run = async () => {
        // ... AuthService.getBackendUser(user.localId) → setCanListProperties
    };
    run();
    return () => { cancelled = true; };
}, [user?.localId]);
```
**RESEARCH §State of the Art A3 candidate for deletion:** `blockSize` state + `AppointmentService.getOwnerSettings()` call inside this effect. Grep `blockSize` in ProfileScreen.tsx first — if no JSX consumer exists (it doesn't render the `availabilitySection` styled view), delete the state declaration (line 44) and remove the `getOwnerSettings()` Promise.all branch (lines 128, 131).

**Handler-call pattern** (preserve verbatim):
```tsx
const handleLogout = async () => {
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.logOut'), style: 'destructive', onPress: async () => {
            try { setLoggingOut(true); await logout(true); onBack(); }
            catch (error) { Alert.alert(t('common.error'), t('profile.logOutFailed')); }
            finally { setLoggingOut(false); }
        }},
    ]);
};
```
(Source: current ProfileScreen.tsx:150-177 — keep this. `silent=true` on logout(true) is load-bearing.)

---

### `src/components/profile/ProfileRow.tsx` (primitive, user-layout grouped row) — Plan 16-01

**Analog A (closest geometry):** `src/components/FilterStyleRow.tsx` collapsed-row section (lines 106-151) — same 38px icon-chip + title/sub stack + chevron.

**Imports pattern** (FilterStyleRow.tsx lines 21-43):
```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
```

**38px icon-chip + label/sub + chevron core pattern** (FilterStyleRow.tsx lines 106-151 — copy structure verbatim, just swap icon prop and onPress handler):
```tsx
<Pressable
  onPress={onPress}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  accessibilityRole="button"
  accessibilityLabel={title}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  }}
>
  {/* 38pt icon chip per Phase 16 row anatomy */}
  <View
    style={{
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Icon size={20} color={colors.iconChipFg} strokeWidth={1.75} />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
      {title}
    </Text>
    {sub && (
      <Text style={{ color: colors.textTertiary, fontSize: 12.5, marginTop: 1 }}>
        {sub}
      </Text>
    )}
  </View>

  <ChevronRight size={18} color={colors.textTertiary} />
</Pressable>
```

**Analog B (accent-filled variant for "Create Listing" row):** RESEARCH.md Code Examples §"Accent-filled 'Create Listing' row". Token map: `backgroundColor: colors.accent`, foreground icon/text uses `colors.onAccent`.

---

### `src/components/profile/ProfileTile.tsx` (primitive, 2×2 grid tile) — Plan 16-01

**Analog:** `src/screens/PropertyDetailsScreen.tsx` `mediaGridCard` — the only existing 2×2 grid tile in the codebase. Same author, same epoch.

**Container pattern** (PropertyDetailsScreen.tsx lines 1989-2004):
```tsx
mediaGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  width: '100%',
},
mediaGridCard: {
  flex: 1,
  minWidth: '48%',   // <— this is the 2×2 trick — flex:1 + minWidth:48% gives equal-width pair-per-row
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderRadius: 16,
  borderWidth: 1,
  gap: 10,
},
```

**Tile JSX pattern** (PropertyDetailsScreen.tsx lines 970-988):
```tsx
<TouchableOpacity
  style={[
    styles.mediaGridCard,
    { backgroundColor: colors.surface, borderColor: colors.border },
    !isActive && { opacity: 0.6 }
  ]}
  onPress={isActive ? handleTap : undefined}
  disabled={!isActive}
>
  <Instagram size={24} color={isActive ? colors.text : colors.textSecondary} strokeWidth={1.5} />
  <Text style={[styles.mediaGridLabel, { color: isActive ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
    {label}
  </Text>
  <ChevronRight size={20} color={isActive ? colors.textSecondary : colors.textTertiary} />
</TouchableOpacity>
```

**Adaptation for Phase 16 MY ACTIVITY tiles** (per CONTEXT D-05 + RESEARCH Pattern 2):
- Add a `wide?: boolean` prop. When `true`, override the tile width to `'100%'` (or `minWidth: '100%'`) for the admin-3-tools Role Mgmt full-width case.
- Add an `accent?: boolean` prop for the "Create Listing" accent-filled variant — when true, set `backgroundColor: colors.accent` and switch text/icon to `colors.onAccent`.
- Replace single-row inline geometry with vertical stack (icon-on-top, label, sub-label, optional badge top-right) — handoff §Tile geometry says icon LARGE on top, not inline. Reference: RESEARCH.md Code Examples (no exact precedent — vertical-tile is novel — but the row-tile geometry above is the closest existing analog and the planner adapts the inner layout).

---

### `src/components/profile/ProfileToolTile.tsx` (primitive, ADMIN TOOLS tile w/ badge + wide)

**Analog:** same as ProfileTile (above) + the existing `pendingBadge` in current ProfileScreen.tsx lines 451-464.

**Pending-badge extraction pattern** (current ProfileScreen.tsx:451-464):
```tsx
pendingBadge: {
  borderRadius: 10,
  paddingHorizontal: 6,
  paddingVertical: 2,
  minWidth: 20,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
},
pendingBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', lineHeight: 14 },
```
**JSX shape** (current ProfileScreen.tsx:295-299):
```tsx
{displayCount > 0 && (
  <View style={[styles.pendingBadge, { backgroundColor: colors.accent }]}>
    <Text style={styles.pendingBadgeText}>{displayCount}</Text>
  </View>
)}
```
**Adapt for Phase 16:** swap `'#FFFFFF'` to `colors.onAccent` token (it's there as `colors.onAccent` already). Keep the `displayCount > 0` gate — empty badge for 0 is correct (Mail/Slack precedent).

**`wide` prop pattern** (RESEARCH Pattern 2):
```tsx
// callsite:
{TOOLS.map((tool, i) => (
  <ProfileToolTile
    key={tool.id}
    {...tool}
    wide={TOOLS.length % 2 === 1 && i === TOOLS.length - 1}
  />
))}

// inside tile:
style={[
  styles.tile,
  wide ? { width: '100%' } : { minWidth: '48%', flex: 1 },
]}
```
**Test coverage requirement** (Pitfall 2): assert `TOOLS.length === 2` produces zero `wide=true` tiles; `TOOLS.length === 3` produces exactly one (the last).

---

### `src/components/profile/RoleBadge.tsx` (primitive, ADMIN / MODERATOR pill)

**Analog:** `src/components/StatusPill.tsx` (Phase 2 MOD-07 — same pill geometry, different palette).

**Pill StyleSheet pattern** (StatusPill.tsx lines 50-62):
```tsx
pill: {
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 12,
  alignSelf: 'flex-start',
},
label: {
  fontSize: 11,
  fontWeight: '600',
  lineHeight: 14,
},
```

**Adaptation for Phase 16 role badge** (per RESEARCH Code Examples §Role-badge pill + handoff `profile-screens.jsx:207`):
- Geometry: change `borderRadius: 12` → `borderRadius: 999` (full pill), `paddingHorizontal: 10` (handoff uses 10), `paddingVertical: 4` (matches StatusPill).
- Add a `Shield` lucide icon (size 13, strokeWidth 1.75) before the text, with `gap: 6`.
- Use `flexDirection: 'row'` + `alignItems: 'center'` on the container.
- Background: `colors.accentSoft`. Foreground (icon + text): `colors.accent`.
- Text: `fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase'`.

**Full reference code** (from RESEARCH.md Code Examples §"Role-badge pill"):
```tsx
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
Note: RESEARCH §Pitfall 5 flags that `colors.accent` (pink) on `colors.accentSoft` (rgba pink soft) may be borderline contrast in light mode — verify during on-device QA, fall back to `colors.text` foreground if contrast fails.

---

### `src/components/profile/OutlinedLogoutPill.tsx` (primitive, calm outlined pill)

**Analog:** AccountSettingsScreen.tsx cancel-button pattern (lines 222-236) — outlined button with neutral fill, surface2 background, hair2 border.

**Pattern reference** (AccountSettingsScreen.tsx:222-236 + 477-483):
```tsx
<TouchableOpacity
  style={[
    styles.cardActionButton,  // height: 50, borderRadius: 14, justifyContent + alignItems center, flex: 1
    {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.hair2,
    },
  ]}
  onPress={() => setIsEditing(false)}
  disabled={saving}
>
  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text>
</TouchableOpacity>
```

**Adaptation for Phase 16 log-out pill** (per CONTEXT D-02 + RESEARCH Code Examples §"Outlined log-out pill"):
- Geometry: NOT full-width — `alignSelf: 'center'`, `borderRadius: 999` (full pill), `paddingVertical: 12, paddingHorizontal: 22`.
- Border color: `colors.hair2` (neutral, not destructive).
- Background: `'transparent'` (not surface2).
- Foreground: `colors.textSecondary` (calm) for both `LogOut` icon (size 17) and label text (`fontSize: 14.5, fontWeight: '600'`).
- Layout: `flexDirection: 'row', alignItems: 'center', gap: 9`.

**Full reference code** (RESEARCH.md Code Examples §"Outlined log-out pill"):
```tsx
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

**`loggingOut` ActivityIndicator branch:** the current implementation (ProfileScreen.tsx:340-347) renders `<ActivityIndicator color={themeStyles.danger} />` when `loggingOut === true`. Preserve this loading-state branch — adapt to `<ActivityIndicator color={colors.textSecondary} />` to match the calm tone.

---

### `src/components/profile/IdentityCard.tsx` (primitive, avatar + name + email + role-badge pill)

**Analog:** current `ProfileScreen.tsx:199-225` (existing identity card JSX — read the data shape from it; swap the palette).

**Existing JSX shape to refactor** (ProfileScreen.tsx:199-225):
```tsx
<TouchableOpacity
  style={[styles.profileCard, { backgroundColor: themeStyles.surface }]}
  onPress={onViewAccountSettings}
  activeOpacity={0.8}
>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={[styles.avatar, { backgroundColor: themeStyles.avatarBg }]}>
      <Text style={[styles.avatarText, { color: themeStyles.text }]}>
        {user?.email?.charAt(0).toUpperCase() || 'U'}
      </Text>
    </View>
    <View style={{ marginLeft: 16, flex: 1 }}>
      <Text style={[styles.email, { color: themeStyles.text }]}>{user?.email}</Text>
      <Text style={[styles.role, { color: themeStyles.accent }]}>
        {/* role text */}
      </Text>
      <Text style={[styles.accountSettings, { color: themeStyles.textSecondary }]}>{t('profile.accountSettings')}</Text>
    </View>
    <ChevronRight size={20} color={themeStyles.textSecondary} />
  </View>
</TouchableOpacity>
```

**Adaptation per CONTEXT D-03 (whole-card tappable) + handoff:**
- Outer wrapper: `<TouchableOpacity onPress={onViewAccountSettings}>` — preserve whole-card tap target.
- Avatar: bump diameter 50 → 54-56 per handoff (CONTEXT §Specifics + Don't Hand-Roll §"Avatar circle w/ initial").
- Replace inline role-text Text node with the new `<RoleBadge role={role} />` primitive (when `isAdmin || isModerator`) — pill renders below name, not as third text line.
- Replace the `accountSettings` Text node with a small accent-soft "Account settings ›" pill (non-interactive, visual affordance only per D-03). Reuse `accountSettings.title` key or add `profile.accountSettingsCta`.
- Swap all `themeStyles.*` → `colors.*` per D-07.

---

### `src/components/profile/ProfileCard.tsx` (optional container — Claude's Discretion per D-09)

**Analog:** `src/screens/AccountSettingsScreen.tsx` `card` style (lines 436-441):
```tsx
card: {
  borderRadius: 20,
  overflow: 'hidden',
  paddingHorizontal: 16,
  paddingVertical: 4,
},
```

**Usage pattern** (AccountSettingsScreen.tsx lines 209, 254, 354 — same container wrap, different inner content):
```tsx
<View style={[styles.card, { backgroundColor: colors.surface }]}>
  {/* children — rows with separators */}
</View>
```

For Phase 16: ACTIVITY card wraps Favorites + Appointments rows with `<View style={[styles.separator, { backgroundColor: colors.hair2 }]} />` between them (matches AccountSettingsScreen.tsx line 211 pattern). HOSTING card wraps the My Listings row.

---

### `src/components/LandlordApplicationStatusBanner.tsx` (MODIFY — token swap, Plan 16-01)

**Analog:** itself. Surgical 4-hex swap.

**Lines to edit** (LandlordApplicationStatusBanner.tsx:102, 108, 113, 120, 125):

Current (M3-era hexes):
```tsx
let accent = colors.primary;          // line 102 — fallback
// ...
case 'approved':
  // ...
  accent = '#059669';                  // line 108 — deep green
  break;
case 'submitted':
  // ...
  accent = '#D97706';                  // line 113 — amber
  break;
case 'rejected':
  // ...
  accent = '#DC2626';                  // line 120 — red
  break;
case 'withdrawn':
  // ...
  accent = colors.textSecondary;       // line 125 — already a token, leave alone
  break;
```

**Token swap (per CONTEXT D-08 + RESEARCH §Pitfall 4):**
| Line | Old | New | Rationale |
|---|---|---|---|
| 108 | `'#059669'` | `colors.landlordGreen` | `#35c98f` — Phase 12 landlord-green token, used for the approved branch |
| 113 | `'#D97706'` | `colors.warning` | `#F59E0B` — Phase 12 amber-500 already used for `RejectionBanner` |
| 120 | `'#DC2626'` | `colors.destructiveRed` | `#ff4d4d` — Phase 12 destructive token |
| 102 | `colors.primary` (fallback) | leave as-is OR swap to `colors.textSecondary` | optional — only hit when state is `'none'` |

**Optional second-pass per RESEARCH §Pitfall 4:** add `rgba(53,201,143,0.10)` soft-tint background + `rgba(53,201,143,0.28)` border for the approved branch container. **Defer to planner judgment** — single-hex swap is the load-bearing change; soft-tint is a nice-to-have if scope permits.

**Verify after edit:** banner still renders in all 5 states (approved/submitted/rejected/withdrawn/none), still self-suppresses for `isAdmin || isModerator` at line 88 (do NOT touch line 88).

---

### `src/locales/en.ts` + `src/locales/ru.ts` (i18n parity — Plan 16-01)

**Analog:** existing `profile.*` block (en.ts lines 212-228 / ru.ts lines 214-230) + `landlordApp.banner.*` block (en.ts lines 529-537 / ru.ts lines 531+).

**Existing key pattern** (en.ts lines 212-228):
```ts
'profile.myProfile': 'My Profile',
'profile.role.admin': 'Admin',
'profile.role.moderator': 'Moderator',
'profile.role.host': 'Host',
'profile.role.member': 'Member',
'profile.accountSettings': 'Account Settings',
'profile.favorites': 'Favorites',
'profile.appointments': 'Appointments',
'profile.myListings': 'My Listings',
'profile.createListing': 'Create Listing',
'profile.logOut': 'Log Out',
'profile.logOutConfirm': 'Are you sure you want to log out?',
'profile.logOutFailed': 'Failed to log out. Please try again.',
```

**New keys to add (per CONTEXT §Specifics + RESEARCH §Wave Structure Recommendation):**
```ts
// Section labels
'profile.section.activity': 'ACTIVITY',
'profile.section.hosting': 'HOSTING',
'profile.section.myActivity': 'MY ACTIVITY',
'profile.section.adminTools': 'ADMIN TOOLS',
'profile.section.staff': 'STAFF',  // small pill label inside ADMIN TOOLS section header
// Role badges
'profile.staffBadge.admin': 'ADMIN',
'profile.staffBadge.moderator': 'MODERATOR',
// Tile sub-labels (D-01 — static generic strings, no live counts)
'profile.tile.favoritesSub': 'Saved properties',
'profile.tile.appointmentsSub': 'Upcoming',
'profile.tile.myListingsSub': 'Your listings',
'profile.tile.createListingSub': 'New property',
// Admin tool tile titles + subs
'profile.tool.applications': 'Landlord Applications',
'profile.tool.applicationsSub': 'Pending review',
'profile.tool.moderation': 'Moderation Queue',
'profile.tool.moderationSub': 'Listings to review',
'profile.tool.roles': 'Role Management',
'profile.tool.rolesSub': 'Staff & permissions',
```
Mirror in `ru.ts` with parity translations (CONTEXT §Specifics gives the RU strings for section + role badges; planner finalizes tile sub-labels).

**Gate:** `bash scripts/check-i18n-parity.sh` MUST exit 0 — file already exists at `scripts/check-i18n-parity.sh`.

---

### Test patterns for primitives — `src/components/profile/__tests__/*.test.tsx` (Plan 16-01)

**Analog (smallest, simplest):** `src/components/__tests__/SectionLabel.test.tsx` — Phase 15 sibling primitive test, same epoch, same author.

**Imports + mock setup** (SectionLabel.test.tsx lines 1-25):
```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
import SectionLabel from '../SectionLabel';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
});
```

**Helper for text-collection** (SectionLabel.test.tsx lines 27-30):
```tsx
const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));
```

**Test body pattern** (SectionLabel.test.tsx lines 32-60):
```tsx
describe('PrimitiveName', () => {
  test('renders the label text', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<PrimitiveName>...</PrimitiveName>);
    });
    expect(findTexts(tree.root)).toContain('expected text');
  });
});
```

**For Pressable / handler tests:** use `FilterStyleRow.test.tsx` lines 77-87 helper to find a Pressable by `accessibilityLabel` and invoke `props.onPress()` inside `act()`:
```tsx
const findPressableByLabel = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined => {
  return tree.root.find(
    (n) =>
      !!n.props &&
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === label,
  );
};
```

**Mock multiple hooks pattern** (FilterStyleRow.test.tsx lines 26-37):
```tsx
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

const { useTheme } = require('../../theme/ThemeContext');
const { useLanguage } = require('../../context/LanguageContext');
// ...
useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
```

---

### Test patterns for ProfileScreen — `src/screens/__tests__/ProfileScreen-*.test.tsx` (Plan 16-02)

**Analog:** `src/screens/__tests__/ModerationQueueScreen.test.tsx` — closest precedent for a screen test that mocks `useRole()` with different role values.

**useRole mock pattern** (ModerationQueueScreen.test.tsx lines 39-52):
```tsx
jest.mock('../../hooks/useRole', () => {
  const actual = jest.requireActual('../../hooks/useRole');
  return {
    ...actual,
    useRole: () => ({
      role: 'moderator',
      isAdmin: false,
      isModerator: true,
      isAuthenticated: true,
      can: () => true,
    }),
  };
});
```

**Per-test variants for PROF-01 / PROF-02 / PROF-03:**
- `ProfileScreen-user.test.tsx` — set mock to `{ role: 'user', isAdmin: false, isModerator: false, can: (a) => a === 'manageListings' ? false : false }`.
- `ProfileScreen-admin.test.tsx` — split into TWO mock setups inside the file: one with `role: 'admin'` (3 tools, Role Mgmt full-width), one with `role: 'moderator'` (2 tools, no Role Mgmt).
- `ProfileScreen-handlers.test.tsx` — mock returns `isAdmin: true` so the admin layout's 9 tappable surfaces are all mounted; pass jest.fn() for each prop and assert call-through.

**Theme mock pattern** (ModerationQueueScreen.test.tsx lines 54-80) — use the same comprehensive `colors` object dump so missing tokens don't crash.

**LanguageContext mock pattern** (ModerationQueueScreen.test.tsx lines 82-88):
```tsx
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,  // identity translator
  }),
}));
```

**For `wide` tile coverage** (Pitfall 2): the admin-3-tools test should grep the rendered tree for the Role Management Pressable and assert its style includes `width: '100%'` (or equivalent flex override).

---

## Shared Patterns

### Pattern S-1: Theme consumption via `colors.*` tokens (CRITICAL — anti-pattern enforced)

**Source:** `src/screens/AccountSettingsScreen.tsx` (Phase 15 shipped, line 74 + every render-site)
**Apply to:** ALL Phase 16 files. Both new primitives AND the ProfileScreen rewrite AND the LandlordApplicationStatusBanner token-swap.

**Pattern:**
```tsx
const { colors } = useTheme();
// inline at render site, not at module scope:
<View style={[styles.card, { backgroundColor: colors.surface }]}>
<Text style={[styles.label, { color: colors.text }]}>
```

**Anti-pattern banned:** `themeStyles{}` useMemo blocks (the M3-era pattern Phase 12 eliminated). **Grep gate:** `grep -c "themeStyles" src/screens/ProfileScreen.tsx` MUST equal 0 after Plan 16-02. **No hardcoded hex literals** anywhere — every color routes through `colors.*` (LandlordBanner is the last hex holdout, swept in Plan 16-01).

**Verification command:** `! grep -rn "#[0-9A-Fa-f]\{6\}" src/components/profile/ src/screens/ProfileScreen.tsx` (after rewrite). Exception: pre-existing `pendingBadgeText` hex `'#FFFFFF'` should swap to `colors.onAccent`.

---

### Pattern S-2: SectionLabel for all section headers

**Source:** `src/components/SectionLabel.tsx` (Phase 15 SET-01)
**Apply to:** ALL section labels in Phase 16 — ACTIVITY, HOSTING, MY ACTIVITY, ADMIN TOOLS.

**Pattern:**
```tsx
import SectionLabel from '../components/SectionLabel';
// usage:
<SectionLabel>{t('profile.section.activity')}</SectionLabel>

// with action slot (e.g., STAFF pill inside ADMIN TOOLS header):
<SectionLabel action={<StaffPill />}>{t('profile.section.adminTools')}</SectionLabel>
```

The `action?: React.ReactNode` prop already exists (SectionLabel.tsx line 22) — perfect for the handoff's STAFF pill that sits to the right of "ADMIN TOOLS".

---

### Pattern S-3: Lucide icons with consistent strokeWidth + color

**Source:** FilterStyleRow.tsx + AccountSettingsScreen.tsx + ProfileScreen.tsx (current) — all use `strokeWidth={1.5}` or `{1.75}` and route color through `colors.*` tokens.

**Apply to:** every icon in Phase 16 primitives.

**Pattern:**
```tsx
<Heart size={20} color={colors.iconChipFg} strokeWidth={1.75} />     // grouped-row icon
<ChevronRight size={18} color={colors.textTertiary} />               // row chevron
<Shield size={13} color={colors.accent} strokeWidth={1.75} />        // role-badge icon
<LogOut size={17} color={colors.textSecondary} strokeWidth={1.75} /> // log-out pill
```

**Icon size convention** (verified across the codebase):
- 38px chip foreground icon: `size={20}`
- Standalone row chevron: `size={18}`
- Pill icon (role badge): `size={13}`
- Log-out pill icon: `size={17}`
- Pending-count badge: no icon (just numeric text)

---

### Pattern S-4: i18n bilingual parity via `useLanguage().t()`

**Source:** every screen in `src/screens/` + every component reads strings via `t(key)`.
**Apply to:** all new strings in Phase 16. Add to BOTH `en.ts` AND `ru.ts` in the SAME commit.

**Pattern:**
```tsx
const { t } = useLanguage();
// ...
<Text>{t('profile.section.activity')}</Text>
```

**Gate:** `bash scripts/check-i18n-parity.sh` (verified present in `scripts/`). Plus `npx tsc --noEmit` to enforce `TranslationKeys` typing.

---

### Pattern S-5: Co-located test convention

**Source:** SectionLabel.test.tsx + FilterStyleRow.test.tsx + StepperInput.test.tsx
**Apply to:** every new Phase 16 primitive test.

**Conventions:**
- Path: `src/components/__tests__/Foo.test.tsx` (for components in `src/components/`) OR `src/components/profile/__tests__/Foo.test.tsx` (if directory exists) — match whatever directory the source file lives in.
- Test runner: `react-test-renderer` + `act` (NOT `@testing-library/react-native` — project doesn't use it).
- Mock pattern: `jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }))` + `require()` at module top to get the mock handle.
- Helper: `findTexts(root)` to collect all rendered text (project convention from SectionLabel.test.tsx).
- Run per-component: `npx jest src/components/__tests__/ProfileTile.test.tsx -x`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| (none) | — | — | Every Phase 16 file has a strong analog within the codebase. RESEARCH.md confidence is HIGH; this phase is almost entirely consumption of primitives from Phases 12/14/15 + M2. |

---

## Anti-Patterns to Avoid (per CONTEXT + RESEARCH + project memory)

| Anti-pattern | Source | Enforcement |
|---|---|---|
| `keyboardVerticalOffset` anywhere in `src/` | M1 KBD-02 invariant (memory `m1-keyboard-kbd-02-invariants.md`) | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` MUST equal 0 |
| Modifying `App.tsx` | Phase 15 D-24 → Phase 16 inherits (CONTEXT canonical_refs) | `git diff App.tsx` MUST be empty for both Plan 16-01 and 16-02 |
| Hardcoded hex literals (`#XXXXXX`) | Phase 12 palette migration (RESEARCH §Anti-Patterns) | `! grep -rn "#[0-9A-Fa-f]\{6\}" src/components/profile/ src/screens/ProfileScreen.tsx` (Plan 16-02 verification) |
| Re-introducing `themeStyles{}` useMemo block | Phase 15 D-08 surgical pattern | `grep -c "themeStyles" src/screens/ProfileScreen.tsx` MUST equal 0 after Plan 16-02 |
| New fetchers for tile counts | CONTEXT D-01 (PROF-04 backlog) | Tile sub-labels are static i18n strings only; moderation pendingCount is the ONLY live number on the admin dashboard |
| Wrapping `<LandlordApplicationStatusBanner>` in `if (!isStaff)` | RESEARCH §Anti-Patterns | Banner self-suppresses at line 88 — redundant guards forbidden; mount unconditionally in user-layout branch |
| Hand-rolling a green "You're a Landlord" banner | RESEARCH §Don't Hand-Roll | Reuse existing `<LandlordApplicationStatusBanner>` with token-swap (Plan 16-01) |
| Email allowlist / claim-parser for role | useRole.ts is the canonical ladder | Read `useRole().isAdmin` / `.isModerator` / `.role` — no parallel branches |
| Touching the `lastCountFetchAt` cooldown block (60s) | CR-02 memo + RESEARCH §Pitfall 3 | Copy lines 83-97 of current ProfileScreen.tsx VERBATIM through the Plan 16-02 rewrite; verify `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` equals 2 |
| Adding TextInputs to ProfileScreen | Identity card is read-only per handoff + KBD-02 | All edit affordances route through `onViewAccountSettings` → AccountSettingsScreen |

---

## Metadata

**Analog search scope:**
- `src/components/` (43 files, includes filters/admin/details/profile subdirs)
- `src/components/__tests__/` (8 files — Phase 15 + earlier test precedent)
- `src/screens/` (incl. ProfileScreen.tsx + AccountSettingsScreen.tsx + PropertyDetailsScreen.tsx + ModerationQueueScreen.tsx)
- `src/screens/__tests__/` (8 files — useRole mock precedent)
- `src/hooks/useRole.ts` (canonical role discriminator)
- `src/theme/colors.ts` (Phase 12 palette)
- `src/locales/en.ts` + `ru.ts` (existing profile.* keys baseline)
- `App.tsx` (read-only — prop pass-through verification at line 873-885)
- `scripts/check-i18n-parity.sh` (gate verified present)

**Files scanned:** ~25 (targeted reads + 4 broad grep passes for grid/pill/uppercase/accentSoft patterns)

**Pattern extraction date:** 2026-06-01

**Notes for planner:**
1. **Co-locate vs extract (CONTEXT D-09 discretion):** The 6 primitives are small (Row ~50 LOC, Tile ~50 LOC, RoleBadge ~25 LOC, OutlinedLogoutPill ~30 LOC, IdentityCard ~60 LOC, ProfileCard ~15 LOC). Total ~230 LOC extracted = roughly half of current ProfileScreen.tsx. Each primitive is reused 2-6 times across the two layouts → reuse signal is positive → recommendation is to extract into `src/components/profile/` (mirrors `src/components/filters/primitives/`). But Phase 15's `FilterStyleRow.tsx` (271 LOC) is the larger extracted-but-single-consumer precedent — single-consumer extraction is also valid when the primitive is logically distinct.
2. **Plan 16-01 should ship primitives + i18n + LandlordBanner token-swap atomically.** The primitives are dead code until 16-02 consumes them, so 16-01 is zero-risk.
3. **Plan 16-02's PRESERVE block is non-negotiable.** Lines 59-97 of current ProfileScreen.tsx (pendingCount state + both useEffects + lastCountFetchAt ref) must be copied verbatim into the rewritten file. Suggest making this a quoted block in the plan's `<read_first>` section so the executor cannot accidentally rewrite the cooldown semantics.
4. **The `pendingBadgeText: { color: '#FFFFFF' }` hex** at current ProfileScreen.tsx:464 should be swapped to `colors.onAccent` token during Plan 16-02 (one of the 14 themeStyles sweep targets, plus this stray non-themeStyles hex).

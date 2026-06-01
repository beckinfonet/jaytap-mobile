---
phase: 15-account-settings-restructure-filter-style-picker
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/components/SectionLabel.tsx
  - src/components/__tests__/SectionLabel.test.tsx
  - src/components/FilterStyleRow.tsx
  - src/components/__tests__/FilterStyleRow.test.tsx
  - src/screens/AccountSettingsScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-05-31
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 15 ships a clean, well-tested implementation of the SectionLabel primitive, FilterStyleRow expandable picker, and the AccountSettingsScreen restructure. EN+RU i18n parity for the 15 new keys (4 `accountSettings.section.*` + 2 `accountSettings.filterPicker.*` + 9 `filters.style.*`) is confirmed. All project invariants pass:

- **KBD-02 (`keyboardVerticalOffset` count in `src/`)**: still **0** after this phase
- **EN+RU i18n parity**: 15/15 new keys present in both `en.ts` and `ru.ts`
- **App.tsx not modified (D-24)**: `git diff 4324a8531..HEAD -- App.tsx` returns empty
- **No `react-navigation` migration**: confirmed (custom App.tsx state machine untouched)
- **FilterStyleContext contract**: matches consumption in `FilterStyleRow` (`filterStyle: FilterStyle`, `setFilterStyle: (s) => Promise<void>`)

Two warnings are about the *incompleteness* of the stated migration goal "from hardcoded `themeStyles{}` to `colors.*` tokens": three hardcoded color literals remain in `AccountSettingsScreen.tsx` after the migration. These were pre-existing literals (not introduced by Phase 15), but they were inside lines the phase touched, so the phase had the opportunity to migrate them and did not. Two of them are visibly load-bearing for the light/dark contrast story (the DANGER ZONE icon-chip tint and the language sliding-pill checkmark color).

Four info-level items cover defensive coding suggestions for FilterStyleRow.

## Critical Issues

None.

## Warnings

### WR-01: DANGER ZONE icon chip uses hardcoded `rgba(255,77,77,0.13)` — token migration incomplete

**File:** `src/screens/AccountSettingsScreen.tsx:381`
**Issue:** The migration goal (per CLAUDE.md "use `useTheme()` tokens — no hardcoded colors; dark/light parity required" + the phase's stated "migrated from hardcoded `themeStyles{}` to Phase 12 `colors.*` tokens") leaves this rgba literal in place:

```tsx
<View style={[styles.iconChip, { backgroundColor: 'rgba(255,77,77,0.13)' }]}>
    <Trash2 size={18} color={colors.destructiveRed} />
</View>
```

The tint is *intentionally* the destructive-red-at-13%-opacity to match the `colors.destructiveRed` foreground, but in light mode (Phase 12 light tokens just landed per memory 2026-05-31) a high-opacity red-on-white may not be the right hue. This literal will look identical in both themes, defeating the dark/light parity goal.

**Fix:** Add a dedicated `colors.destructiveSoft` token in `src/theme/colors.ts` (mirroring the existing `accent` → `accentSoft` pair) and consume it here. Example:

```ts
// src/theme/colors.ts (light + dark blocks)
destructiveSoft: isDark ? 'rgba(255,77,77,0.13)' : 'rgba(255,77,77,0.10)',
```

```tsx
// AccountSettingsScreen.tsx
<View style={[styles.iconChip, { backgroundColor: colors.destructiveSoft }]}>
```

### WR-02: Language-track shadow + checkmark use hardcoded `#000` / `rgba(255,255,255,0.95)`

**File:** `src/screens/AccountSettingsScreen.tsx:263, 541`
**Issue:** Two more leftover hardcoded literals in the same screen the phase explicitly migrated:

- Line 263: `shadowColor: '#000'` (inline on the language track)
- Line 541: `color: 'rgba(255,255,255,0.95)'` (static style in `styles.languageCheck`)

The shadow color `#000` is theme-neutral (dark shadow on any background is the standard pattern), so it is *defensible* to leave it. The `rgba(255,255,255,0.95)` is more problematic: it's the white tint of the `'✓'` glyph that overlays the sliding pink pill. In dark mode this reads correctly (white-on-pink). In light mode the same white-on-pink still reads, so functionally OK, but it does NOT participate in the theme token system the phase claims to have completed.

**Fix:** Replace the static color with `colors.onAccent` and inline it in the per-render style (since the check sits on top of the `colors.accent` pill, `colors.onAccent` is exactly the semantically correct token). The check has to move out of the static `StyleSheet.create()` block and into the inline style array — same pattern Phase 15 already uses everywhere else in this file:

```tsx
// Replace styles.languageCheck.color with inline:
<Text style={[styles.languageCheck, { color: colors.onAccent }]}>✓</Text>
```

And remove the `color: 'rgba(255,255,255,0.95)'` line from the `languageCheck` StyleSheet entry.

## Info

### IN-01: `async/await` wrapper around `setFilterStyle` is unnecessary

**File:** `src/components/FilterStyleRow.tsx:163`
**Issue:**
```tsx
onPress={style.enabled ? async () => { await setFilterStyle(style.id); } : undefined}
```
The `async () => { await ... }` wrapper adds no value — `setFilterStyle` already returns a `Promise<void>` and `FilterStyleContext` (lines 40-47) swallows every error internally. The wrapper doesn't observe the promise's resolution either. React's `onPress` doesn't care whether the handler returns a Promise.

**Fix:** Either simplify to `onPress={style.enabled ? () => setFilterStyle(style.id) : undefined}`, or attach a `.catch` to surface the unlikely double-failure case (current AsyncStorage catch + something downstream). Simpler is better.

### IN-02: `useEffect` dependency-array hygiene

**File:** `src/screens/AccountSettingsScreen.tsx:99-101`
**Issue:** The mount-time `loadProfile()` effect has an empty deps array; `loadProfile` is referenced from the effect but not declared as a dep:

```tsx
useEffect(() => {
    loadProfile();
}, []);
```

React's exhaustive-deps lint rule fires on this. This is a *pre-existing* pattern (not introduced by Phase 15), but the phase touched surrounding code and could have addressed it. Risk is low because `loadProfile` only reads `user?.localId` at call time, but if the screen ever needs to re-load on user-id change, it silently won't.

**Fix:** Either wrap `loadProfile` in `useCallback([user?.localId])` and depend on it, or inline the load:

```tsx
useEffect(() => {
    if (!user?.localId) return;
    let cancelled = false;
    (async () => {
        try {
            const profile = await AuthService.getBackendUser(user.localId);
            if (cancelled || !profile) return;
            setFirstName(profile.firstName || '');
            // … etc
        } catch (e) { console.error('Failed to load profile', e); }
    })();
    return () => { cancelled = true; };
}, [user?.localId]);
```

The `cancelled` guard also fixes the latent setState-after-unmount warning the current pattern has.

### IN-03: `'←'` back-button glyph + flag emojis are non-themable text content

**File:** `src/screens/AccountSettingsScreen.tsx:192, 302, 324`
**Issue:** Three Unicode glyphs are baked into the JSX as text:
- Line 192: `'←'` (back arrow — a `<ChevronLeft>` icon would be `useTheme()`-aware)
- Lines 302/324: `'🇺🇸'`/`'🇷🇺'` flag emojis (render inconsistently across iOS/Android — Android still falls back to "US"/"RU" boxes on some OEM ROMs)

All three are pre-existing; not regressions. But since Phase 15 already imports `lucide-react-native` icons (`ChevronRight`, `Pencil`, `Trash2`, `Briefcase`), the `'←'` glyph is a 1-line swap for `<ChevronLeft size={24} color={colors.accent} />` and gets us pixel-consistent cross-platform rendering for free.

**Fix:** Replace `'←'` with `<ChevronLeft />`. Flags are a bigger conversation (designer-led copy choice) — leave alone for now.

### IN-04: Forward-fit unreachable-state risk if AsyncStorage ever contains `'master'`/`'sentence'`

**File:** `src/components/FilterStyleRow.tsx:101-146` + `src/context/FilterStyleContext.tsx:25-31`
**Issue:** `FilterStyleContext.loadFilterStyle()` accepts any of the 4 stored values (`guided | cascading | master | sentence`) as valid. If a user's AsyncStorage ever contains `'master'` or `'sentence'` (manual edit, future-version downgrade, restored backup from a v2 build), the collapsed-row's right-edge label will display "Master–detail"/"Sentence", but tapping that row in the expanded body does nothing (Pressable is disabled). The user has no in-app affordance to discover that picking Guided or Cascading will "fix" the state.

This is unreachable in v1 because no code path writes `'master'`/`'sentence'` — but the type system allows it (`FilterStyle` is a 4-member union), so it's a latent rough edge for Phase B forward-fit. Worth a sanity defensive line.

**Fix (optional, defensive):** In `loadFilterStyle`, accept only the enabled subset for now:

```ts
if (stored === 'guided' || stored === 'cascading') {
    setFilterStyleState(stored);
}
// master / sentence fall through to 'guided' default until Phase B implements them.
```

When Phase B lands the two new variants, flip the gate. Alternative: tighten `FILTER_STYLES.find(...)` in `FilterStyleRow.tsx:101` to ignore disabled entries when computing the collapsed-row label, so an unreachable persisted state at least doesn't surface a confusing label.

---

_Reviewed: 2026-05-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

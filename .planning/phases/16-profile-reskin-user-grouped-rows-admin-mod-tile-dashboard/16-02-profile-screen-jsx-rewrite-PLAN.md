---
phase: 16
plan: 02
type: execute
wave: 2
depends_on:
  - "16-01"
files_modified:
  - src/screens/ProfileScreen.tsx
  - src/screens/__tests__/ProfileScreen-user.test.tsx
  - src/screens/__tests__/ProfileScreen-admin.test.tsx
  - src/screens/__tests__/ProfileScreen-handlers.test.tsx
autonomous: false
requirements:
  - PROF-01
  - PROF-02
  - PROF-03
must_haves:
  truths:
    - "A regular user opening Profile sees the grouped-row layout: identity card → optional landlord banner → ACTIVITY card (Favorites + Appointments rows) → HOSTING card (My Listings row) → Create Listing accent-filled row → Log Out outlined pill."
    - "An admin or moderator opening Profile sees the tile-dashboard layout: identity card with RoleBadge → MY ACTIVITY 2×2 tiles (Favorites, Appointments, My Listings, Create Listing accent) → ADMIN TOOLS section with role-gated tiles (Landlord Apps + Mod Queue for both, Role Mgmt admin-only, Role Mgmt rendered full-width when odd 3rd tile)."
    - "Moderation Queue tile shows the pendingCount accent badge fetched via the existing PropertyService.getModerationQueueCount + moderationCountRefreshKey invalidation block, copied verbatim from current ProfileScreen.tsx lines 59-97."
    - "All 9 navigation handler props (onCreateListing, onViewListings, onViewFavorites, onViewAppointments, onViewAccountSettings, onApplyLandlord, onReviewLandlordApplications, onReviewModerationQueue, onOpenRoleManagement) wire to the same call-sites as before — App.tsx is untouched."
    - "Landlord application status banner mounts unconditionally in user layout AND admin layout; the component's existing line 88 self-suppression handles the admin/moderator branch."
    - "The themeStyles{} useMemo block (current lines 99-111) is removed; every color in the rewritten file routes through useTheme().colors."
    - "The AppState 60s-cooldown ref (lastCountFetchAt) is preserved verbatim — moderator returning from background still sees a fresh count after 60s."
    - "EN+RU bilingual parity holds; KBD-02 grep gate stays 0; App.tsx remains untouched."
  artifacts:
    - path: "src/screens/ProfileScreen.tsx"
      provides: "Two role-discriminated layouts; preserves all 9 nav handlers + pendingCount fetcher block + landlord banner mount"
      contains: "useRole"
      min_lines: 200
    - path: "src/screens/__tests__/ProfileScreen-user.test.tsx"
      provides: "Asserts user layout structure (ACTIVITY + HOSTING + Create Listing + Log Out; no admin tiles)"
      min_lines: 40
    - path: "src/screens/__tests__/ProfileScreen-admin.test.tsx"
      provides: "Asserts admin layout structure (3 tools with Role Mgmt full-width) and moderator layout structure (2 tools, no Role Mgmt)"
      min_lines: 60
    - path: "src/screens/__tests__/ProfileScreen-handlers.test.tsx"
      provides: "Asserts all 9 nav handler props fire on tap of their corresponding pressable; assertions match accessibilityLabel route"
      min_lines: 50
  key_links:
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/hooks/useRole.ts"
      via: "useRole() destructure of isAdmin + isModerator + role + can"
      pattern: "useRole\\(\\)"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/services/PropertyService.ts"
      via: "PropertyService.getModerationQueueCount() called in 2 useEffects (mount + AppState active)"
      pattern: "getModerationQueueCount"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/profile/ProfileRow.tsx"
      via: "ProfileRow imported and rendered in user-layout ACTIVITY + HOSTING cards"
      pattern: "from '../components/profile/ProfileRow'"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/profile/ProfileTile.tsx"
      via: "ProfileTile imported and rendered in admin-layout MY ACTIVITY 2x2 grid"
      pattern: "from '../components/profile/ProfileTile'"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/profile/ProfileToolTile.tsx"
      via: "ProfileToolTile imported and rendered in admin-layout ADMIN TOOLS section with wide-on-odd rule"
      pattern: "from '../components/profile/ProfileToolTile'"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/profile/IdentityCard.tsx"
      via: "IdentityCard imported and rendered at top of both layouts"
      pattern: "from '../components/profile/IdentityCard'"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/profile/OutlinedLogoutPill.tsx"
      via: "OutlinedLogoutPill imported and rendered at bottom of both layouts"
      pattern: "from '../components/profile/OutlinedLogoutPill'"
    - from: "src/screens/ProfileScreen.tsx"
      to: "src/components/LandlordApplicationStatusBanner.tsx"
      via: "Mounted unconditionally; component self-suppresses for admin/moderator at line 88"
      pattern: "LandlordApplicationStatusBanner"
---

<objective>
Brownfield rewrite of `src/screens/ProfileScreen.tsx` to replace one shared layout with two role-discriminated layouts per PROF-01 and PROF-02, while preserving every existing fetcher, prop wiring, and the load-bearing CR-02 cooldown block per PROF-03.

Purpose: Ship the visible Phase 16 value — user-side grouped-row Profile + admin/mod-side tile-dashboard Profile — without regressing the moderation pending-count badge or the landlord application banner gate. This is the highest-risk plan of the phase because the file is brownfield with a load-bearing 60s cooldown ref that has survived 2 milestones of plan-checker scrutiny.

Output: Single file rewrite of `src/screens/ProfileScreen.tsx` consuming the primitives shipped by Plan 16-01, plus 3 co-located screen test files proving both layouts render correctly and all 9 nav handlers fire.
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
@.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-01-primitives-i18n-landlord-banner-token-swap-PLAN.md

<!-- The file being rewritten — the rewrite target -->
@src/screens/ProfileScreen.tsx

<!-- The 6 new primitives Plan 16-01 just shipped — Plan 16-02 consumes ALL of them -->
@src/components/profile/ProfileRow.tsx
@src/components/profile/ProfileTile.tsx
@src/components/profile/ProfileToolTile.tsx
@src/components/profile/IdentityCard.tsx
@src/components/profile/RoleBadge.tsx
@src/components/profile/OutlinedLogoutPill.tsx

<!-- Phase 15 sibling — same surgical rip-and-rewrite pattern; the precedent we mirror -->
@src/screens/AccountSettingsScreen.tsx
@src/components/SectionLabel.tsx

<!-- Read-only consumers / preserved blocks -->
@src/hooks/useRole.ts
@src/services/PropertyService.ts
@src/components/LandlordApplicationStatusBanner.tsx
@src/context/AuthContext.tsx
@src/theme/colors.ts
@src/theme/ThemeContext.tsx
@src/context/LanguageContext.tsx
@src/locales/en.ts
@src/locales/ru.ts

<!-- Test precedent — useRole mock pattern + comprehensive colors mock -->
@src/screens/__tests__/ModerationQueueScreen.test.tsx

<!-- DO NOT EDIT — verify untouched -->
@App.tsx
</context>

<verbatim_preserve_block>
<!--
  The following block from src/screens/ProfileScreen.tsx lines 59-97 (CR-02) is LOAD-BEARING.
  Copy it VERBATIM into the rewritten file. The executor must NOT paraphrase, "simplify", or
  "modernize" this block. The 60s cooldown ref, the cancelled flag, the AppState.addEventListener
  pattern, and the moderationCountRefreshKey dependency in the first useEffect are ALL
  required. Pre-commit gates verify literal token preservation:

  - grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx MUST equal 2
  - grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx MUST equal ≥ 2
  - grep -c "60_000" src/screens/ProfileScreen.tsx MUST equal 1
-->

```tsx
const [pendingCount, setPendingCount] = useState<number>(0);

// Self-fetch on mount AND whenever moderationCountRefreshKey changes (App.tsx
// bumps it on queue close so the badge updates immediately after a mod action).
useEffect(() => {
    if (!canViewModerationQueue) return;
    let cancelled = false;
    (async () => {
        try {
            const count = await PropertyService.getModerationQueueCount();
            if (!cancelled) setPendingCount(count);
        } catch {
            /* non-fatal — badge silently stays at 0 (server 403 / network blip) */
        }
    })();
    return () => { cancelled = true; };
}, [canViewModerationQueue, moderationCountRefreshKey]);

// AppState 'active' refresh — own per-screen cooldown ref (PATTERNS §E).
// The 60s cooldown is independent from the AuthContext refreshRole cooldown AND from
// the ModerationQueueScreen's own cooldown — each consumer fires its OWN work on
// its OWN schedule. CR-02 fix: this listener is now load-bearing (no parent-owned
// count to shadow it), so a moderator returning from background sees a fresh count.
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

  The block must remain syntactically identical to current ProfileScreen.tsx lines 59-97 except that
  the surrounding comments may be reformatted (preserving meaning) and `useState<number>(0)` may be
  combined with adjacent state hoisting only if no identifier rename happens. The literal `60_000`,
  the identifier `lastCountFetchAt`, the identifier `moderationCountRefreshKey`, and the
  `AppState.addEventListener('change', onChange)` call are required tokens.
</verbatim_preserve_block>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write 3 ProfileScreen test files (Wave 0 — failing tests first)</name>

  <files>
src/screens/__tests__/ProfileScreen-user.test.tsx
src/screens/__tests__/ProfileScreen-admin.test.tsx
src/screens/__tests__/ProfileScreen-handlers.test.tsx
  </files>

  <read_first>
- src/screens/__tests__/ModerationQueueScreen.test.tsx (read full file — the canonical screen-test precedent in this repo: useRole jest.mock with role/isAdmin/isModerator/can shape, comprehensive useTheme colors dump at lines 54-80, useLanguage identity-translator pattern at lines 82-88)
- src/screens/__tests__/PropertyDetailsScreen.test.tsx (read full file — additional precedent for screen-level testing of compositions, mocking patterns for AuthContext, ThemeContext)
- src/components/__tests__/FilterStyleRow.test.tsx (read lines 77-87 — `findPressableByLabel` helper pattern used to find Pressables by accessibilityLabel and assert their onPress fires)
- src/screens/ProfileScreen.tsx (the CURRENT implementation — read to understand the prop interface, the 9 handler names, and the existing accessibilityLabel patterns at lines 289 and 314 which the test asserts against)
- src/hooks/useRole.ts (read full file — understand the exact shape useRole() returns so mocks are accurate: role, isAdmin, isModerator, isAuthenticated, can(action))
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md (read § Test patterns for ProfileScreen — has the useRole mock pattern at lines 638-654 and per-test-variant breakdown at lines 656-660)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-VALIDATION.md (read § Per-Task Verification Map — confirms automated command shape `npm test -- --testPathPattern="ProfileScreen"`)
- src/components/profile/IdentityCard.tsx (read file shipped in Plan 16-01 — verify the IdentityCard exports and its accessibilityLabel pattern so handler test can find it)
- src/components/profile/OutlinedLogoutPill.tsx (read file shipped in Plan 16-01 — verify the pill has a `label` prop the handler test can find by accessibilityLabel)
  </read_first>

  <behavior>
ProfileScreen-user.test.tsx (1 case, ~40 LOC):
- Test 1: When `useRole` mock returns `{ role: 'user', isAdmin: false, isModerator: false, can: (a) => a === 'manageListings' ? true : false }`, the tree renders:
  - 1 IdentityCard (no RoleBadge child)
  - SectionLabel "ACTIVITY" (or `profile.section.activity` key)
  - 2 ProfileRow primitives (Favorites + Appointments)
  - SectionLabel "HOSTING"
  - 1 ProfileRow (My Listings)
  - 1 ProfileRow with accent=true (Create Listing)
  - 1 OutlinedLogoutPill
  - 0 ProfileTile primitives
  - 0 ProfileToolTile primitives
  - 0 instances of `SectionLabel "ADMIN TOOLS"`
- Use `tree.root.findAllByType(ProfileRow)`, `tree.root.findAllByType(ProfileTile)` etc. for structural assertions.

ProfileScreen-admin.test.tsx (2 cases, ~80 LOC):
- Test 1 (admin): useRole mock returns `{ role: 'admin', isAdmin: true, isModerator: false, can: (a) => true }`:
  - 1 IdentityCard containing 1 RoleBadge child
  - SectionLabel "MY ACTIVITY"
  - 4 ProfileTile primitives (Favorites, Appointments, My Listings, Create Listing accent)
  - SectionLabel "ADMIN TOOLS"
  - 3 ProfileToolTile primitives (Landlord Apps, Moderation Queue, Role Management)
  - The LAST ProfileToolTile (Role Management) has prop `wide={true}` (assert by reading the prop or by reading its rendered style.width === '100%')
  - 0 ProfileRow primitives
- Test 2 (moderator): useRole mock returns `{ role: 'moderator', isAdmin: false, isModerator: true, can: (a) => a === 'manageRoles' ? false : true }`:
  - 1 IdentityCard containing 1 RoleBadge child (moderator label)
  - 4 ProfileTile primitives in MY ACTIVITY
  - 2 ProfileToolTile primitives in ADMIN TOOLS (Landlord Apps + Moderation Queue ONLY — Role Management NOT mounted)
  - NO ProfileToolTile has `wide={true}` (even count, normal 2-up grid)

ProfileScreen-handlers.test.tsx (9 cases, ~80 LOC):
- Mock useRole as admin (so all 9 surfaces mount). Pass jest.fn() for each of the 9 nav-handler props plus moderationCountRefreshKey. For each handler, locate its Pressable via `findPressableByLabel` (using the accessibilityLabel that's a localized string — the identity translator returns the key, so search by key), invoke `props.onPress()` inside `act()`, and assert `expect(onPressMock).toHaveBeenCalledTimes(1)`.
- 9 sub-cases — one per handler: onCreateListing, onViewListings, onViewFavorites, onViewAppointments, onViewAccountSettings, onApplyLandlord, onReviewLandlordApplications, onReviewModerationQueue, onOpenRoleManagement.
- onApplyLandlord may need user role (landlord banner only fires for non-staff) — split out as its own sub-case with `useRole` mocked back to `role: 'user'` if needed; otherwise rely on the banner self-suppression and skip the assertion if mounting the test in admin mode hides the banner.

All 3 test files exist BEFORE the rewrite happens, fail meaningfully (they reference imports + primitives that exist from Plan 16-01 but the screen still has the OLD JSX so e.g. `findAllByType(ProfileRow)` returns 0). Task 2's rewrite makes them pass.
  </behavior>

  <action>
Create 3 test files under `src/screens/__tests__/`. Use react-test-renderer + act (project convention). Mock all of: useTheme (full colors object dump per ModerationQueueScreen.test.tsx pattern), useLanguage (identity translator `t: (k: string) => k`), useRole (per-test setup as above), useAuth (return `{ user: { localId: 'test', email: 'test@example.com' }, logout: jest.fn() }`), and PropertyService.getModerationQueueCount (return resolved 0 by default).

For `useAuth`, mock the import path as `'../../context/AuthContext'`. For `useRole`, mock the import path as `'../../hooks/useRole'`. For `PropertyService`, mock `'../../services/PropertyService'` with `{ PropertyService: { getModerationQueueCount: jest.fn().mockResolvedValue(0) } }`.

For `AuthService.getBackendUser` and `AppointmentService.getOwnerSettings`, mock them to resolve to null/non-throwing values so the existing profile-fetch useEffect doesn't crash the test.

Use the comprehensive colors object dump pattern (copy from ModerationQueueScreen.test.tsx and ensure ALL tokens consumed by the rewrite are present: accent, accentSoft, landlordGreen, destructiveRed, surface, surface2, hair, hair2, text, textSecondary, textTertiary, onAccent, iconChipFg, background — missing tokens = test crash).

For per-test variants in ProfileScreen-admin.test.tsx, use `jest.isolateModules(() => { ... })` or split into TWO describe blocks each with their own `beforeEach` resetting the useRole mock — pick whichever is cleanest. PATTERNS.md § Test patterns suggests "split into TWO mock setups inside the file" — follow that pattern.

For the Role Management wide-prop assertion: prefer reading the prop directly from the ProfileToolTile instance via `tree.root.findAllByType(ProfileToolTile)[2].props.wide === true`. This is more robust than asserting on rendered style.

Run-command sanity: `npx jest --testPathPattern="src/screens/__tests__/ProfileScreen" -x` should run all 3 files. They'll FAIL against the current ProfileScreen (which has no ProfileRow/ProfileTile/etc.). Task 2 makes them pass.
  </action>

  <verify>
    <automated>npx jest --testPathPattern="src/screens/__tests__/ProfileScreen-(user|admin|handlers)" --passWithNoTests 2>&1 | grep -qE "Tests:.*([0-9]+ (failed|passed))" && echo "WAVE-0-COMPLETE"</automated>
  </verify>

  <acceptance_criteria>
- Source: `ls src/screens/__tests__/ProfileScreen-user.test.tsx` exists (size > 1500 bytes)
- Source: `ls src/screens/__tests__/ProfileScreen-admin.test.tsx` exists (size > 2500 bytes)
- Source: `ls src/screens/__tests__/ProfileScreen-handlers.test.tsx` exists (size > 2500 bytes)
- Source: All 3 files import from `'../../components/profile/ProfileRow'`, `'../../components/profile/ProfileTile'`, etc. — verified by `grep -l "components/profile/" src/screens/__tests__/ProfileScreen-*.test.tsx | wc -l` returns 3
- Source: All 3 files mock useRole — verified by `grep -l "useRole" src/screens/__tests__/ProfileScreen-*.test.tsx | wc -l` returns 3
- Test command: `npx jest --testPathPattern="src/screens/__tests__/ProfileScreen-(user|admin|handlers)"` RUNS the files (exit code is allowed to be non-zero since these tests currently fail — that's the expected "RED" state for TDD task 1)
- Source: `git diff App.tsx` returns empty (D-24 invariant)
- Source: `git diff src/screens/ProfileScreen.tsx` returns empty (Task 2 owns the screen rewrite)
- Sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 grep gate)
  </acceptance_criteria>

  <done>
3 ProfileScreen test files committed. They reference all 6 Plan 16-01 primitives. They run via jest (may currently fail — that's RED in RED→GREEN). Task 2's rewrite turns them GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Rewrite ProfileScreen.tsx with role-discriminated layouts</name>

  <files>
src/screens/ProfileScreen.tsx
  </files>

  <read_first>
- src/screens/ProfileScreen.tsx (the file being REWRITTEN — read FULL file once; especially lines 59-97 the verbatim-preserve cooldown block, lines 99-111 the themeStyles{} block to RIP, lines 113-148 the profile-fetcher useEffect (preserve, possibly drop blockSize), lines 150-177 the handleLogout handler (preserve verbatim), lines 199-225 the existing identity card JSX (replace with `<IdentityCard>`), lines 233-323 the menu card JSX (this is the body being split into two role-branched layouts), lines 327-349 the logout footer JSX (replace with `<OutlinedLogoutPill>`))
- src/components/profile/ProfileRow.tsx (Plan 16-01 output — confirm props match interfaces declared in Plan 16-01 frontmatter)
- src/components/profile/ProfileTile.tsx (Plan 16-01 output)
- src/components/profile/ProfileToolTile.tsx (Plan 16-01 output — confirm `wide` prop)
- src/components/profile/IdentityCard.tsx (Plan 16-01 output — confirm `role` prop accepts 'admin'|'moderator'|'user')
- src/components/profile/OutlinedLogoutPill.tsx (Plan 16-01 output — confirm `loading` prop)
- src/components/profile/RoleBadge.tsx (Plan 16-01 output — used inside IdentityCard via its `role` prop)
- src/components/SectionLabel.tsx (Phase 15 — used for all 4 section labels: ACTIVITY, HOSTING, MY ACTIVITY, ADMIN TOOLS; supports `action?: React.ReactNode` slot for the STAFF pill inside ADMIN TOOLS)
- src/components/LandlordApplicationStatusBanner.tsx (Plan 16-01 token-swapped — mounted unconditionally in both layouts)
- src/screens/AccountSettingsScreen.tsx (Phase 15 sibling — the EXACT precedent for the surgical "rip themeStyles{}, swap to inline colors.*" pattern; mirror the file structure: hooks at top, StyleSheet.create() at bottom with geometry-only entries)
- src/hooks/useRole.ts (verify `useRole()` returns `{ role, isAdmin, isModerator, can }` so the destructure is correct)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md (re-read § Implementation Decisions — D-01 through D-09 are all load-bearing; particularly D-04 useRole as discriminator, D-05 odd-tile-wide rule, D-06 landlord banner placement, D-07 theme inline-styles, D-08 LandlordBanner token-swap already done in Plan 16-01)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md (re-read § ProfileScreen.tsx section — has the exact import shape, theme consumption pattern, role-discrimination branch pattern, preserved-block contract, StyleSheet separation rule)
- .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md (re-read § Pitfalls — particularly Pitfall 1 themeStyles drift, Pitfall 2 Role-Management tile width fragility, Pitfall 3 AppState cooldown ref preservation, Pitfall 5 role-badge contrast)
- App.tsx (READ-ONLY — confirm the 9 nav-handler prop names exactly match what the current ProfileScreen interface expects; specifically that `moderationCountRefreshKey` is still passed; lines 871-887)
  </read_first>

  <behavior>
After this task, the 3 test files from Task 1 turn from RED to GREEN:

ProfileScreen-user.test.tsx (1 case):
- The rendered tree contains: 1 IdentityCard, 1 LandlordApplicationStatusBanner (self-suppressing), SectionLabel matching `t('profile.section.activity')`, 2 ProfileRow primitives (Favorites + Appointments), SectionLabel matching `t('profile.section.hosting')`, 1 ProfileRow (My Listings), 1 ProfileRow with `accent={true}` (Create Listing), 1 OutlinedLogoutPill. ZERO ProfileTile or ProfileToolTile primitives.

ProfileScreen-admin.test.tsx (2 cases):
- Admin: 1 IdentityCard (RoleBadge child), SectionLabel `profile.section.myActivity`, 4 ProfileTile (1 has `accent={true}` — Create Listing), SectionLabel `profile.section.adminTools` (with STAFF pill action slot), 3 ProfileToolTile, the 3rd one (Role Management) has `wide={true}`.
- Moderator: 1 IdentityCard (RoleBadge moderator), 4 ProfileTile, 2 ProfileToolTile, NONE wide.

ProfileScreen-handlers.test.tsx (9 cases):
- Each of the 9 handler-prop mocks is invoked exactly once when the corresponding Pressable is tapped.

Pre-commit static gates (in addition to the test suite):
- `grep -c "themeStyles" src/screens/ProfileScreen.tsx` returns 0 (the M3-era pattern is fully ripped)
- `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` returns 2 (verbatim preserve)
- `grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx` returns ≥ 2 (prop reference + useEffect dep)
- `grep -c "useRole" src/screens/ProfileScreen.tsx` returns ≥ 2 (import + destructure)
- `grep -c "#[0-9A-Fa-f]\{6\}" src/screens/ProfileScreen.tsx` returns 0 (no opaque hex literals; rgba semi-transparent literals may exist if Plan 16-01's accent variants get inlined here — but generally those live in the primitives now)
- `git diff App.tsx` returns empty
- KBD-02 grep gate stays 0
- i18n parity exits 0
- tsc reports no new errors in the file
  </behavior>

  <action>
Rewrite `src/screens/ProfileScreen.tsx` end-to-end. File structure (mirror AccountSettingsScreen.tsx Phase 15 precedent):

**Imports (top of file):**
- React + hooks: `useState`, `useEffect`, `useRef`, `memo` (drop `useMemo` since themeStyles{} is gone)
- RN: `View`, `Text`, `StyleSheet`, `TouchableOpacity` (or `Pressable` — match current screen), `Alert`, `ScrollView`, `ActivityIndicator`, `AppState`, `AppStateStatus`
- safe-area: `SafeAreaView`
- lucide: `Heart`, `Calendar`, `ClipboardList`, `Plus`, `LogOut` (only if not imported via OutlinedLogoutPill), `Inbox`, `UserCog`, `Briefcase` (or another for Landlord Applications — planner picks closest semantic per CONTEXT § Specifics), `ChevronRight` (only if still needed directly), `Shield` (only if not encapsulated in RoleBadge — which it should be)
- contexts/hooks: useAuth, useRole, useLanguage, useTheme
- services: AuthService, PropertyService (drop AppointmentService if blockSize is dropped per A3 — see action step below)
- components: LandlordApplicationStatusBanner, SectionLabel, IdentityCard, ProfileRow, ProfileTile, ProfileToolTile, OutlinedLogoutPill

**Props interface (PRESERVE VERBATIM from current):**
Keep `interface ProfileScreenProps` shape exactly as it is at lines 14-33 of current file. ALL 9 handler props + `moderationCountRefreshKey` + `onBack`. The CR-02 comment block at lines 23-29 stays verbatim — it documents load-bearing wiring.

**Hook destructure:**
```
const { user, logout } = useAuth();
const { t } = useLanguage();
const { colors, isDark } = useTheme();   // isDark may not be needed; drop if unused
const { can, role, isAdmin, isModerator } = useRole();
const isStaff = isAdmin || isModerator;
```

**State + can() gates (preserve from current):**
`canListProperties`, `loading`, `loggingOut`, `canManageListings`, `canReviewLandlordApplications`, `canViewModerationQueue`, `canManageRoles` — all stay. DROP `blockSize` and its associated state declaration at current line 44 IF and only if `grep -c "blockSize" src/screens/ProfileScreen.tsx` returns 4 (the current count — all 4 are declaration/setter, not JSX consumer). Verify before dropping. If dropped, also drop `AppointmentService.getOwnerSettings()` from the Promise.all at lines 126-131 and the `if (settings) setBlockSize(...)` line.

**Preserved blocks (copy VERBATIM — see <verbatim_preserve_block> above):**
- The pendingCount state + the 2 useEffects + the lastCountFetchAt ref (current lines 59-97). MUST be copied verbatim into the rewritten file. Do not paraphrase comments. Do not rename `lastCountFetchAt`. Do not change `60_000`. Do not remove `cancelled` flag. Do not change the AppState listener signature.
- The profile-fetcher useEffect (current lines 113-148) — preserve the AuthService.getBackendUser call + the `canListProperties` extraction. If blockSize is dropped per above, remove only the AppointmentService leg of the Promise.all and the `if (settings) setBlockSize(...)` consumer.
- The handleLogout handler (current lines 150-177) — preserve VERBATIM, including the `logout(true)` silent flag, the Alert.alert two-button shape, and the onBack() call on success.

**RIP block (current lines 99-111):**
The entire `themeStyles = useMemo(...)` block. Remove the declaration and every `themeStyles.X` reference in the file. Replace each reference with the corresponding `colors.X` token at the render site (inline). Mapping table:
- `themeStyles.background` → `colors.background`
- `themeStyles.surface` → `colors.surface`
- `themeStyles.text` → `colors.text`
- `themeStyles.textSecondary` → `colors.textSecondary` (or `colors.textTertiary` for the dimmer slots — judge by context)
- `themeStyles.border` → `colors.hair` (or `colors.hair2` for stronger weight)
- `themeStyles.accent` → `colors.accent` (the iOS blue `#3B82F6` becomes M6 pink — this is the headline visual change)
- `themeStyles.avatarBg` → `colors.surface2` (handled internally by IdentityCard)
- `themeStyles.danger` → `colors.destructiveRed` (only used in current logout footer; OutlinedLogoutPill handles its own color now — D-02 calm treatment, not destructive)

**Loading state (preserve):**
The early-return `if (loading) return <ActivityIndicator ... />` at current lines 179-185 stays. Swap `themeStyles.background` to `colors.background` and `themeStyles.accent` to `colors.accent`.

**Header (preserve):**
The header at current lines 188-195 stays structurally — back-arrow TouchableOpacity, headerTitle, spacer. Swap colors inline. The header is OUTSIDE the role-discriminated branch — same for both layouts.

**ScrollView wrap — ROLE-DISCRIMINATED BRANCH:**
After the header, mount `<IdentityCard role={isAdmin ? 'admin' : isModerator ? 'moderator' : 'user'} email={user?.email ?? ''} onPress={onViewAccountSettings} accountSettingsLabel={t('profile.accountSettings')} />`. Then mount `<LandlordApplicationStatusBanner onPress={onApplyLandlord} />` unconditionally — the banner self-suppresses for staff at its own line 88. Then branch:

```
{isStaff ? <AdminLayout /> : <UserLayout />}
```

Both branches are inlined within ProfileScreen (not extracted to new components — they're small enough and use props that are all in scope).

**UserLayout (per PROF-01):**
- `<SectionLabel>{t('profile.section.activity')}</SectionLabel>`
- ACTIVITY card container (View with `colors.surface` bg + borderRadius 20, paddingHorizontal 16, paddingVertical 4 — match AccountSettingsScreen.tsx `card` style):
  - `<ProfileRow Icon={Heart} title={t('profile.favorites')} sub={t('profile.tile.favoritesSub')} onPress={onViewFavorites} />`
  - Separator: `<View style={[styles.separator, { backgroundColor: colors.hair2 }]} />` between rows
  - `<ProfileRow Icon={Calendar} title={t('profile.appointments')} sub={t('profile.tile.appointmentsSub')} onPress={onViewAppointments} />`
- `<SectionLabel>{t('profile.section.hosting')}</SectionLabel>`
- HOSTING card container:
  - `<ProfileRow Icon={ClipboardList} title={t('profile.myListings')} sub={t('profile.tile.myListingsSub')} onPress={onViewListings} />` — only rendered if `canManageListings`
- `<ProfileRow accent Icon={Plus} title={t('profile.createListing')} sub={t('profile.tile.createListingSub')} onPress={onCreateListing} />` — only rendered if `canManageListings`; outside the HOSTING card (full-width accent row per handoff)

**AdminLayout (per PROF-02):**
- `<SectionLabel>{t('profile.section.myActivity')}</SectionLabel>`
- 2x2 grid wrap: `<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>`:
  - `<ProfileTile Icon={Heart} title={t('profile.favorites')} sub={t('profile.tile.favoritesSub')} onPress={onViewFavorites} />`
  - `<ProfileTile Icon={Calendar} title={t('profile.appointments')} sub={t('profile.tile.appointmentsSub')} onPress={onViewAppointments} />`
  - `<ProfileTile Icon={ClipboardList} title={t('profile.myListings')} sub={t('profile.tile.myListingsSub')} onPress={onViewListings} />`
  - `<ProfileTile accent Icon={Plus} title={t('profile.createListing')} sub={t('profile.tile.createListingSub')} onPress={onCreateListing} />`
- `<SectionLabel action={<StaffPill />}>{t('profile.section.adminTools')}</SectionLabel>` — render an inline StaffPill view (accent-soft small pill containing `t('profile.section.staff')`) as the action-slot child
- TOOLS array (memoized): build dynamically per D-04 + D-05:
  ```
  const TOOLS = useMemo(() => [
    canReviewLandlordApplications && onReviewLandlordApplications ? { id: 'apps', Icon: Briefcase (or Inbox), title: t('profile.tool.applications'), sub: t('profile.tool.applicationsSub'), onPress: onReviewLandlordApplications } : null,
    canViewModerationQueue && onReviewModerationQueue ? { id: 'mod', Icon: Inbox, title: t('profile.tool.moderation'), sub: t('profile.tool.moderationSub'), onPress: onReviewModerationQueue, badge: pendingCount } : null,
    canManageRoles && onOpenRoleManagement ? { id: 'roles', Icon: UserCog, title: t('profile.tool.roles'), sub: t('profile.tool.rolesSub'), onPress: onOpenRoleManagement } : null,
  ].filter(Boolean) as ToolDef[], [canReviewLandlordApplications, canViewModerationQueue, canManageRoles, onReviewLandlordApplications, onReviewModerationQueue, onOpenRoleManagement, pendingCount]);
  ```
- 2-up grid for TOOLS with odd-last-wide rule (D-05):
  ```
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {TOOLS.map((tool, i) => {
      const wide = TOOLS.length % 2 === 1 && i === TOOLS.length - 1;
      return <ProfileToolTile key={tool.id} {...tool} wide={wide} />;
    })}
  </View>
  ```

**OutlinedLogoutPill (both layouts):**
After the role-branched body and after closing the ScrollView, render:
```
<OutlinedLogoutPill label={t('profile.logOut')} loading={loggingOut} onPress={handleLogout} />
```
Place it inside a small footer container that uses `colors.background`. Drop the current `logoutFooter` styles (borderTop, fixed bottom anchor) — the calm pill design centers in normal flow per D-02.

**StyleSheet.create() (bottom of file):**
GEOMETRY ONLY. No colors. Match AccountSettingsScreen.tsx pattern. Keep `container`, `scrollView`, `scrollContent`, `header`, `headerTitle`, `iconButton`. Drop `profileCard`, `avatar`, `avatarText`, `email`, `role`, `accountSettings`, `availabilitySection`, `availabilityLabel`, `blockSizeButton`, `blockSizeText`, `availabilityHint`, `menuCard`, `menuRow`, `menuDivider`, `createListingRow`, `menuText`, `pendingBadge`, `pendingBadgeText`, `logoutFooter`, `logoutButton`, `logoutContent`, `logoutText` — all of those are now owned by primitives or no longer needed. Add: `card` (borderRadius 20, overflow hidden, paddingHorizontal 16, paddingVertical 4), `separator` (height 1), and tile-grid wrappers as needed.

Export with `memo()` wrapper preserved (current line 354).

**Pre-commit gates (run before the atomic commit):**
1. `grep -c "themeStyles" src/screens/ProfileScreen.tsx` MUST equal 0
2. `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` MUST equal 2
3. `grep -c "60_000" src/screens/ProfileScreen.tsx` MUST equal 1
4. `grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx` MUST equal ≥ 2
5. `grep -c "useRole" src/screens/ProfileScreen.tsx` MUST equal ≥ 2 (import + call)
6. `grep -cE "#[0-9A-Fa-f]{6}" src/screens/ProfileScreen.tsx` MUST equal 0
7. `git diff App.tsx` MUST be empty
8. `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0
9. `bash scripts/check-i18n-parity.sh` MUST exit 0
10. `npx tsc --noEmit` MUST report no new errors in `src/screens/ProfileScreen.tsx`
11. `npx jest --testPathPattern="src/screens/__tests__/ProfileScreen-(user|admin|handlers)" -x` MUST exit 0
12. Full suite gate: `npx jest -x` MUST exit 0

If ANY gate fails, fix before commit. The themeStyles grep gate (gate 1) and the lastCountFetchAt grep gate (gate 2) are the two highest-risk checks per RESEARCH § Pitfalls 1 + 3.
  </action>

  <verify>
    <automated>npx jest --testPathPattern="src/screens/__tests__/ProfileScreen-(user|admin|handlers)" -x && grep -c "themeStyles" src/screens/ProfileScreen.tsx | grep -q "^0$" && grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx | grep -q "^2$" && grep -c "60_000" src/screens/ProfileScreen.tsx | grep -q "^1$" && grep -c "useRole" src/screens/ProfileScreen.tsx | grep -vE "^#" | head -1 | grep -qE "^[2-9]|^[1-9][0-9]+$" && bash scripts/check-i18n-parity.sh && echo "GREEN"</automated>
  </verify>

  <acceptance_criteria>
- Source: `grep -c "themeStyles" src/screens/ProfileScreen.tsx` returns 0 (M3-era pattern fully ripped per D-07 + Pitfall 1)
- Source: `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` returns 2 (CR-02 cooldown ref preserved per Pitfall 3)
- Source: `grep -c "60_000" src/screens/ProfileScreen.tsx` returns 1 (60s cooldown literal preserved)
- Source: `grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx` returns ≥ 2 (prop ref + useEffect dep array)
- Source: `grep -c "useRole" src/screens/ProfileScreen.tsx` returns ≥ 2 (import + destructure call)
- Source: `grep -c "isAdmin || isModerator" src/screens/ProfileScreen.tsx` returns ≥ 1 (role-discrimination branch per D-04)
- Source: `grep -cE "^[^/]*#[0-9A-Fa-f]{6}" src/screens/ProfileScreen.tsx` returns 0 (no opaque hex literals outside comments — D-07 + Phase 12 anti-pattern)
- Source: Imports from `'../components/profile/ProfileRow'`, `ProfileTile`, `ProfileToolTile`, `IdentityCard`, `OutlinedLogoutPill` — verified by `grep -c "components/profile/" src/screens/ProfileScreen.tsx` returns ≥ 5
- Source: Imports from `'../components/SectionLabel'` (Phase 15 reuse)
- Source: `LandlordApplicationStatusBanner` mounted exactly once (unconditionally) — verified by `grep -c "<LandlordApplicationStatusBanner" src/screens/ProfileScreen.tsx` returns 1
- Behavior: Tapping each of the 4 user-layout rows fires the correct nav-handler prop verbatim — proven by ProfileScreen-handlers.test.tsx GREEN for {onViewFavorites, onViewAppointments, onViewListings, onCreateListing}
- Behavior: Tapping each of the 4 admin-layout tiles + 3 admin-tools tiles fires the correct nav-handler prop — proven by ProfileScreen-handlers.test.tsx GREEN for {onViewFavorites, onViewAppointments, onViewListings, onCreateListing, onReviewLandlordApplications, onReviewModerationQueue, onOpenRoleManagement}
- Behavior: Identity card tap fires onViewAccountSettings — proven by handler test for `onViewAccountSettings`
- Behavior: When admin role, the 3rd ProfileToolTile (Role Management) has `wide={true}` — proven by ProfileScreen-admin.test.tsx admin case
- Behavior: When moderator role, only 2 ProfileToolTile mount (no Role Management) — proven by ProfileScreen-admin.test.tsx moderator case
- Test command: `npx jest --testPathPattern="src/screens/__tests__/ProfileScreen-(user|admin|handlers)" -x` exits 0
- Test command: `npx jest -x` exits 0 (full suite green — no other test regressed)
- Sentinel: `bash scripts/check-i18n-parity.sh` exits 0
- Sentinel: `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 grep gate)
- Sentinel: `npx tsc --noEmit` reports no new errors in `src/screens/ProfileScreen.tsx`
- Source: `git diff App.tsx` returns empty (D-24 invariant — App.tsx OFF-LIMITS)
  </acceptance_criteria>

  <done>
ProfileScreen.tsx rewritten with two role-discriminated layouts. The 3 test files from Task 1 turn GREEN. themeStyles{} fully ripped. The CR-02 cooldown block is preserved verbatim. All 9 nav handlers wire correctly. App.tsx untouched. KBD-02 + i18n parity gates still green. Ready for manual on-device QA at Task 3.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: On-device QA — 8-cell × 3-role matrix</name>

  <what-built>
Plan 16-02 ships ProfileScreen.tsx with two role-discriminated layouts. The automated suite proves structural correctness; manual on-device QA proves visual fidelity, token rendering, contrast in light/dark mode, font weights, icon-chip sizing, tile geometry, badge contrast, role-pill styling, and full-width Role Management tile rendering.

Static gates already green:
- themeStyles{} fully ripped (`grep -c` = 0)
- CR-02 cooldown block preserved verbatim (`grep -c "lastCountFetchAt"` = 2)
- All 9 nav handlers wire correctly (ProfileScreen-handlers.test.tsx GREEN)
- Both layouts render correctly with correct primitive counts (ProfileScreen-user/admin.test.tsx GREEN)
- i18n parity GREEN, KBD-02 grep gate 0, tsc clean
- App.tsx untouched
  </what-built>

  <how-to-verify>
**Matrix: 2 devices × 2 modes × 2 locales × 3 roles = 24 cells. Empirical-sampling-mass-disposition (M3 RETROSPECTIVE lesson 4) acceptable for the visual cells; walk-and-confirm required for the golden-path cells (the 4 cells listed below as "Golden path").**

Devices:
- A. iPhone 15 Pro Max
- B. Moto G XT2513V

Modes:
- 1. Light mode
- 2. Dark mode

Locales:
- E. EN
- R. RU

Roles:
- u. Regular user (test account with no admin/mod flag — verify ProfileScreen-user layout)
- m. Moderator (test account with userType='moderator')
- a. Admin (test account with userType='admin')

**Golden-path cells (walk-and-confirm required, do these 4 first):**
1. A.1.E.u — iPhone × light × EN × user: verify identity card renders avatar circle + email + accent-soft "Account settings ›" pill; verify ACTIVITY card has Favorites + Appointments rows with 38px chips + chevrons + sub-labels; verify HOSTING card has My Listings row; verify Create Listing accent-pink row; verify outlined log-out pill centered at bottom; tap Account Settings → routes to settings screen; tap Favorites → Favorites; tap Appointments → Appointments; tap My Listings → My Listings; tap Create Listing → flow; tap Log Out → Alert → Cancel returns; Log Out → confirm dismisses back.
2. A.2.R.a — iPhone × dark × RU × admin: verify identity card has "АДМИН" accent-soft pill with Shield icon below name; verify MY ACTIVITY 2x2 grid with 4 tiles (the 4th — "Создать объявление" — is accent-pink filled); verify ADMIN TOOLS section label with "ПЕРСОНАЛ" pill on the right; verify 3 tool tiles (Landlord Apps, Moderation Queue with pendingCount badge if any pending, Role Management); verify Role Management tile is FULL-WIDTH (not half-width with empty space); tap each of the 9 handlers → all route correctly.
3. B.1.E.m — Moto × light × EN × moderator: verify identity card has "MODERATOR" accent-soft pill; verify ADMIN TOOLS has ONLY 2 tiles (Landlord Apps + Moderation Queue — NO Role Management); verify 2x1 grid is clean half-width tiles each (no full-width override); verify Moderation Queue pendingCount badge renders if any pending listings exist.
4. B.2.R.u — Moto × dark × RU × user: verify all visual primitives in Russian; verify landlord-application status banner renders correctly with the green-tinted Phase 12 landlordGreen token; verify the banner self-suppresses for the admin/mod accounts (sanity check by signing in as admin and verifying it does NOT appear); verify outlined log-out pill has clear contrast against dark background.

**Sampling cells (empirical-mass-disposition — sample 4-6 cells across the remaining 20; pass if no visible regressions):**
- A.1.E.m / A.1.E.a / A.2.E.u / A.1.R.u / B.1.R.a / B.2.E.m — sample at minimum 6 of these 20

**Specific checks (apply across cells, focus during sampling):**
- Pitfall 1: No iOS-blue `#3B82F6` residual anywhere — all accent surfaces should render M6 pink `#ff5a6f`. If any glyph or border is still iOS-blue, that's a themeStyles leak.
- Pitfall 2: Admin Role Management tile is full-width, not half-width with a gap to its right.
- Pitfall 3: After signing into a moderator account, backgrounding the app for >60s, then returning to ProfileScreen → Moderation Queue pendingCount badge SHOULD refresh once (one network call). Do NOT see multiple rapid calls (cooldown broken) or stale count (listener broken).
- Pitfall 4: Landlord application status banner has readable contrast in BOTH light AND dark mode against the new Phase 12 palette.
- Pitfall 5: "ADMIN" / "MODERATOR" role pill text is readable against the accent-soft background in both light and dark modes; if illegible in light mode, fall-back to `colors.text` foreground is acceptable (planner discretion at time of QA).
- Pitfall 6: No keyboard pops anywhere (there are no TextInputs on this screen).

**Functional checks:**
- Identity card tap navigates to Account Settings (whole card tappable per D-03).
- Log Out → Alert with localized Cancel/Log Out buttons → tapping Log Out fires `logout(true)` silent path → onBack() returns to home; tapping Cancel dismisses Alert.
- Each tile/row tap routes to its expected screen (no dead taps).
- Landlord banner — for a user account with a pending application, banner appears between identity card and ACTIVITY card; tap it → routes to landlord application screen.
- pendingCount badge on Moderation Queue tile: with 0 pending, no badge; with N>0 pending, badge shows N and is accent-pink with white text.

**Resume signal:**
Type one of:
- `approved` — all golden-path cells PASS + sampling cells show no regressions
- `approved-with-notes: <notes>` — overall PASS but minor observations to capture in 16-02-SUMMARY.md
- `failed: <cell-id>: <description>` — at least one regression found; rollback Plan 16-02 or open a hotfix task
  </how-to-verify>

  <resume-signal>Type "approved" or "approved-with-notes: ..." or "failed: ..." with cell + description</resume-signal>
</task>

</tasks>

<verification>
Run after Task 2 completes and BEFORE Task 3 checkpoint:

1. **Test suite green:** `npx jest -x` exits 0 (full suite — no regressions elsewhere)
2. **Phase 16 tests green:** `npx jest --testPathPattern="ProfileScreen|profile/" -x` exits 0
3. **i18n parity:** `bash scripts/check-i18n-parity.sh` exits 0
4. **tsc clean:** `npx tsc --noEmit` reports no new errors in `src/screens/ProfileScreen.tsx`
5. **themeStyles ripped:** `grep -c "themeStyles" src/screens/ProfileScreen.tsx` returns 0
6. **CR-02 preserved:** `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx` returns 2
7. **60s cooldown literal preserved:** `grep -c "60_000" src/screens/ProfileScreen.tsx` returns 1
8. **moderationCountRefreshKey preserved:** `grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx` returns ≥ 2
9. **useRole imported + called:** `grep -c "useRole" src/screens/ProfileScreen.tsx` returns ≥ 2
10. **No opaque hexes:** `grep -cE "^[^/]*#[0-9A-Fa-f]{6}" src/screens/ProfileScreen.tsx` returns 0
11. **KBD-02 grep gate:** `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0
12. **App.tsx untouched:** `git diff App.tsx` returns empty
13. **Primitives imported:** `grep -c "components/profile/" src/screens/ProfileScreen.tsx` returns ≥ 5
14. **LandlordBanner mounted unconditionally:** `grep -c "<LandlordApplicationStatusBanner" src/screens/ProfileScreen.tsx` returns 1
</verification>

<success_criteria>
- ProfileScreen.tsx renders two role-discriminated layouts (user grouped rows OR admin tile dashboard) gated by `useRole().isAdmin || useRole().isModerator`.
- All 9 nav-handler props wire to the same call sites as before (App.tsx untouched).
- The CR-02 pendingCount fetcher + AppState 60s-cooldown block is preserved verbatim — moderator backgrounding+returning still triggers a refresh after the cooldown elapses.
- The landlord application status banner is mounted unconditionally; component's own line 88 self-suppression handles the admin/moderator branch.
- themeStyles{} block is fully ripped; every color reads from `useTheme().colors`.
- The Role Management tile renders full-width when admin (odd 3rd tile per D-05).
- All 3 Phase 16 test files (`ProfileScreen-user`, `ProfileScreen-admin`, `ProfileScreen-handlers`) exit 0.
- Full jest suite stays green; i18n parity exits 0; tsc no new errors; KBD-02 grep gate 0.
- On-device QA matrix walked APPROVED (≥4 golden-path cells confirmed + ≥6 sampling cells no regression) on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark × 3 roles.
</success_criteria>

<output>
After completion, create `.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-02-SUMMARY.md` documenting:
- The final commit SHA for the rewrite
- The post-rewrite LOC count (expected ~200-280 — should be significantly smaller than current 486 because primitives took most of the geometry)
- Confirmation of all 14 pre-commit gates GREEN
- The on-device QA matrix results (which cells were walked vs sampled; any "approved-with-notes" observations)
- Any planner discretion choices: which lucide icon used for Landlord Applications (Briefcase vs Inbox), whether blockSize was dropped or preserved, accountSettingsCta vs accountSettings key reuse, light-mode role-pill contrast fallback applied or not
- Closing the loop: ROADMAP § Phase 16 success criteria 1-5 each mapped to either the test that proves it (PROF-01/02/03 unit tests) or the QA cell that confirmed it
</output>

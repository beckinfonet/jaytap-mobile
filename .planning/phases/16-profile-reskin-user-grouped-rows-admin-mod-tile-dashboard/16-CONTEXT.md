# Phase 16: Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Mid-plan gray-area resolution (3 AskUserQuestion answers locked) + ROADMAP handoff spec + 16-RESEARCH.md

<domain>
## Phase Boundary

Single-file presentational rewrite of `src/screens/ProfileScreen.tsx`. Splits one shared layout into two role-discriminated layouts using `useRole()`:

- **Regular user (PROF-01):** identity card → optional landlord banner → ACTIVITY card (grouped rows: Favorites, Appointments) → HOSTING card (grouped row: My Listings) → Create Listing accent-filled row → Log out outlined pill.
- **Admin/Moderator (PROF-02):** identity card with role badge → MY ACTIVITY 2×2 tiles (Favorites, Appointments, My Listings, Create Listing accent-filled) → ADMIN TOOLS section (STAFF pill label, role-gated tiles: Landlord Applications + Moderation Queue for both, Role Management admin-only and full-width when odd) → Log out outlined pill.
- **PROF-03 (carry-forward wiring):** preserve all 9 nav-handler props, the `moderationCountRefreshKey` invalidation block (verbatim — load-bearing 60s cooldown), the landlord-application status banner, and all existing count sources. No App.tsx call-site change.

Phase 16 is **single-file** — no new screens, no new contexts, no new fetchers. The two reuse points from prior phases are `SectionLabel` (Phase 15) and the Phase 12 palette tokens (`colors.accent`, `accentSoft`, `landlordGreen`, `destructiveRed`, `destructiveSoft`, `iconChipFg`, `surface2`, `hair2`, `text`, `textSecondary`, `textTertiary`, `onAccent`).
</domain>

<decisions>
## Implementation Decisions

### D-01: Tile sub-labels use generic i18n strings, NOT live counts
Each MY ACTIVITY + ADMIN TOOLS tile gets a small static sub-label string under its title (e.g., "Saved properties", "Upcoming", "Your listings", "Pending review"). NO new count fetchers in Phase 16. The Moderation Queue tile still shows the existing `pendingCount` accent badge via the preserved fetcher block — that's the only live number on the dashboard.

Rationale: ships fast, no new failure surface, handoff spec is aspirational on counts but PROF-03 SC3 only mandates the Moderation Queue badge.

### D-02: Log Out treatment = calm outlined pill (both layouts)
Replace today's destructive-red full-width button with an outlined pill, neutral text color (`colors.text`), aligned center, in both user and admin layouts. Matches the handoff's de-emphasized treatment + reduces accidental-tap regret.

### D-03: Identity card = whole-card tappable
Tapping anywhere on the identity card (avatar + name + email + "Account settings ›" pill area) invokes `onViewAccountSettings`. The pill is a visual affordance only (non-interactive child). Largest tap target.

### D-04: `useRole()` is the canonical role discriminator
Use `useRole().isAdmin` and `useRole().isModerator` to pick which layout to render. The conditional renders ONE of the two layouts; both never mount simultaneously. Role-badge styling: admins = accent-filled pill with "ADMIN"; moderators = accent-filled pill with "MODERATOR"; both pair a `Shield` lucide icon.

### D-05: Role Management tile renders full-width when odd
ADMIN TOOLS section uses a 2-up tile grid. When `isAdmin` (showing 3 tools: Landlord Applications, Moderation Queue, Role Management), the third tile (Role Management) renders full-width. When `isModerator` (showing 2 tools), normal 2-up grid. Implement via `wide={TOOLS.length % 2 === 1 && i === TOOLS.length - 1}` on the tool tile primitive.

### D-06: Landlord banner placement (mount-outside-branch)
Mount `<LandlordApplicationStatusBanner>` **once, unconditionally, above the role branch** — the component's existing line 88 self-suppression returns null for admin/moderator, so the banner only renders for regular users. This is the canonical anti-pattern guard per RESEARCH §Anti-Patterns; do NOT wrap the mount in an `if (!isStaff)` guard (the component owns its own gating). Visual outcome: banner appears between identity card and ACTIVITY card on user layout, invisible on admin/mod layout.

### D-07: Theme consumption pattern follows Phase 15 inline-styles
Theme-dependent colors are inlined per-render via `style={[styles.row, { backgroundColor: colors.surface2 }]}` pattern. Static geometry stays in `StyleSheet.create()`. Mirrors Phase 15's `AccountSettingsScreen.tsx` pattern. Rip the existing `themeStyles{}` useMemo block (lines 99-111) per the Phase 15 D-08 surgical pattern.

### D-08: Token swap for `LandlordApplicationStatusBanner` (4 hardcoded hexes) is in scope
The existing landlord banner has 4 hardcoded color literals from M3-era. While reskinning ProfileScreen, swap those to the new `colors.landlordGreen` family. Single small additive change to keep palette parity across the whole user-layout area.

### D-09: 2-plan wave structure
- **Plan 16-01 (Wave 1):** Primitives + i18n + LandlordBanner token-swap. Adds the new `ProfileRow`, `ProfileCard`, `ProfileTile`, `IdentityCard`, `RoleBadge`, `OutlinedLogoutPill` (whatever ends up inside ProfileScreen vs. extracted as components — planner's call), the new i18n keys (EN+RU parity), and the `LandlordApplicationStatusBanner` token swap. Zero-risk additive — does NOT touch the ProfileScreen render path yet.
- **Plan 16-02 (Wave 2, depends on 16-01):** The ProfileScreen JSX rewrite — replaces the existing render with the two new layouts gated by `useRole()`. Copies the existing count-fetcher + `moderationCountRefreshKey` block verbatim. Removes the old `themeStyles{}` useMemo. Final cutover.

### Claude's Discretion
- Whether `ProfileRow` / `ProfileTile` / `ProfileCard` / `IdentityCard` / `RoleBadge` / `OutlinedLogoutPill` get extracted into `src/components/profile/` files or stay co-located inside `ProfileScreen.tsx` — planner picks based on LOC + reuse signal. Phase 15 precedent extracted SectionLabel + FilterStyleRow into `src/components/`; if the primitives are big enough to extract cleanly, do it; otherwise co-locate.
- Exact tile geometry math (gap, padding, corner radius) — pull from existing card patterns in the codebase or invent within reason. The handoff specs row anatomy precisely (38px chip / 16-600 label / 12.5 sub / chevron) but is silent on tile dimensions.
- Choice of `Pressable` vs `TouchableOpacity` — match whatever ProfileScreen uses today.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Handoff + Requirements
- `.planning/ROADMAP.md` § "Phase 16: Profile Reskin" — handoff spec + 5 success criteria
- `.planning/REQUIREMENTS.md` PROF-01, PROF-02, PROF-03 — verbatim requirement bodies
- `.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md` — single-file phase analysis (553 lines, HIGH confidence)

### Source code to preserve (read-first list for planner)
- `src/screens/ProfileScreen.tsx` — current 486 LOC implementation; rewrite target
- `src/hooks/useRole.ts` — `isAdmin` / `isModerator` / `role` / `can()` canonical role discriminator
- `src/theme/colors.ts` — Phase 12 + Phase 15 palette (landlordGreen, destructiveSoft, onAccent, iconChipFg, surface2, hair2, accent, accentSoft, text, textSecondary, textTertiary)
- `src/components/SectionLabel.tsx` — Phase 15 primitive; consumes for ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS section labels (action-slot prop covers the STAFF pill case)
- `src/components/LandlordApplicationStatusBanner.tsx` (or wherever it lives) — self-fetching + self-suppressing for admin/moderator; mount unconditionally in user layout
- `src/services/PropertyService.ts` `getModerationQueueCount` + the existing `moderationCountRefreshKey` + AppState 60s-cooldown pattern (CR-02 memo) — preserve verbatim through the rewrite
- `App.tsx` — DO NOT EDIT (D-24 invariant). All 9 nav-handler props read-only from this file.

### Phase 15 precedent
- `.planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md` — D-08 surgical themeStyles{} rip pattern
- `src/screens/AccountSettingsScreen.tsx` — inline-style theme consumption pattern (lines 315, 337 for inline `colors.onAccent`)
</canonical_refs>

<specifics>
## Specific Ideas

### Row anatomy (PROF-01, user layout)
- Container: 38px circular icon chip (background `colors.iconChipFg` or neutral surface variant)
- Icon: 18-20px lucide icon, `colors.text` or token-mapped
- Label: 16/600 weight, `colors.text`
- Sub: 12.5 weight, `colors.textTertiary` (dim)
- Chevron: right-aligned, `colors.textTertiary`, `ChevronRight` lucide

### Tile geometry (PROF-02, admin/mod layout)
- 2-up grid, equal-width tiles with gap
- Each tile: icon (large) + title + sub-label + (where applicable) pendingCount accent badge top-right
- "Create Listing" tile is accent-filled (`colors.accent` background, `colors.onAccent` foreground)
- Role Management tile renders full-width when it's the odd 3rd ADMIN TOOLS tile

### Required lucide icons (verified present in v0.564.0)
`Shield`, `Heart`, `Calendar`, `ClipboardList` (for My Listings; handoff `'listings'` maps here since `House` is not exported by lucide), `Plus` (Create Listing), `LogOut`, `UserCog` (Role Management), `Inbox` (Moderation Queue), `Briefcase` or similar (Landlord Applications — planner picks closest semantic), `ChevronRight` (row chevron).

### i18n keys to add (EN+RU parity required)
Under `profile.*` namespace. Section labels: `profile.section.activity` ("ACTIVITY" / "АКТИВНОСТЬ"), `profile.section.hosting` ("HOSTING" / "ОБЪЯВЛЕНИЯ"), `profile.section.myActivity` ("MY ACTIVITY" / "МОЯ АКТИВНОСТЬ"), `profile.section.adminTools` ("ADMIN TOOLS" / "ИНСТРУМЕНТЫ АДМИНА"). Role badges: `profile.role.admin` ("ADMIN" / "АДМИН"), `profile.role.moderator` ("MODERATOR" / "МОДЕРАТОР"). Tile titles + sub-labels: ~8 new keys. Staff pill: `profile.section.staff` ("STAFF" / "ПЕРСОНАЛ"). Planner produces final list.

### Identity card pill
"Account settings ›" — uses existing `accountSettings.title` key for the label, planner adds `profile.accountSettingsCta` if no existing key fits.
</specifics>

<deferred>
## Deferred Ideas

### PROF-04 backlog: tile count fetchers (post-Phase 16)
Per D-01, Phase 16 ships static generic sub-labels under the dashboard tiles. If user later wants live counts (e.g., "12 saved", "3 upcoming"), add a PROF-04 follow-up phase that:
- Adds count fetchers for favorites, appointments, my-listings (reuses existing endpoints)
- Surfaces them as the tile sub-label slot (already present from Phase 16's primitive)
- Mirrors the `moderationCountRefreshKey` cooldown pattern

### Backlog-worthy nice-to-haves NOT in Phase 16
- Avatar upload affordance on identity card (today's profile just shows initials)
- Edit name/email pencil in identity card (today's profile defers to Account Settings)
- Tap-to-reveal long-press menu on tiles (e.g., "Mark all as seen") — out of scope
</deferred>

---

*Phase: 16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard*
*Context gathered: 2026-06-01 via mid-plan gray-area resolution*
*3 locked decisions (D-01 sub-labels, D-02 logout, D-03 identity tap) + 6 derived design decisions (D-04 through D-09) from RESEARCH.md + ROADMAP handoff spec*

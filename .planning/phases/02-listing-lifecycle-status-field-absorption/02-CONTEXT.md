# Phase 2: Listing Lifecycle Status Field Absorption - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface a 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`) end-to-end across the renter, owner, and mod/admin surfaces — `Property` schema additions, role-aware filtering on read endpoints, OwnerListings 4-tab segmented control, status pills on PropertyCard (Avito-anchored RU labels), deep-link 404 guard, owner-side rejection messaging (per-PropertyDetailsScreen banner + persistent Home banner), `AppState 'active'` role-refresh hook, and a one-shot Mongo backfill that reconciles legacy listings with the new enum.

**Touches both repos:**
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — schema type, screens, components, locales
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — Property schema, route filtering, migration script

**Requirements covered:** MOD-01..MOD-09 (9 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- Moderation Queue UI / approve / reject / edit-on-behalf — Phase 3 (MOD-10..MOD-18)
- Archive actions (owner-archive button, mod-archive modal, restore-to-pending) — Phase 4 (ARCH-01..ARCH-05)
- Admin role management UI — Phase 5
- Any `/api/moderation/*` endpoints — Phase 3 owns the entire moderation route surface
- `serviceAreas` config storage location — Phase 3 (consumed by MOD-12 reject-reason enum)

</domain>

<decisions>
## Implementation Decisions

### Schema, default, and legacy data reconciliation

- **D-01 (New-submission status default — flip + drop `'draft'`):** Backend `Property.js:35` enum becomes `['pending', 'live', 'rejected', 'archived']` with `default: 'pending'`. Existing `'draft'` rows are migrated to `'pending'` in the same one-shot. No 5th owner-WIP state — keeps Phase 2 surface tight; CreateListingScreen submit always means "submit for review." Aligns with REQUIREMENTS.md MOD-01 enum + MOD-03 submit semantics.
- **D-02 (Legacy null-status fallback — belt + suspenders):** Three layers absorb legacy listings without a `status` field: (a) Mongoose schema patch ships `default: 'live'` so any post-deploy read of a status-less row coalesces to `'live'`; (b) one-shot `migrate-listings-m2.js` backfills all status-missing rows to `'live'` so the dataset becomes uniform; (c) client TypeScript reads use `(p.status ?? 'live')` defensively. Three layers, zero opportunity for a status-less row to slip through to renter-facing code.
- **D-03 (Migration mechanism — standalone, mirrors Phase 1 D-08):** New `JayTap-services/src/scripts/migrate-listings-m2.js` (sibling of `migrate-roles-m2.js`). Supports `--dry-run` (prints filters + match counts, no writes), idempotent `updateMany` filters that exclude already-migrated records, `--verify` subcommand asserting `db.properties.countDocuments({status: {$nin: ['pending', 'live', 'rejected', 'archived']}})` returns 0. NOT wired into Railway's release hook — manual `npm run migrate:listings-m2` against production `MONGO_URI` before backend code that depends on the new enum deploys (mirrors Phase 1's go/no-go gating).
- **D-04 (M1 backfill target — all existing → `'live'`):** Migration flips every existing M1 self-listed property to `'live'`, preserving its current visibility. Avoids a "Home empties out overnight" outcome. Matches ROADMAP.md success criteria #1 verbatim ("legacy listings continue to render"). The migration's two operations: (a) `{status: 'draft'} → {status: 'pending'}` for the legacy `'draft'` rows; (b) `{status: {$exists: false}} → {status: 'live'}` for status-less legacy rows.

**Derived deploy order (from D-01..D-04):**
1. Pre-deploy: `npm run migrate:listings-m2 -- --dry-run` against production Mongo, review output.
2. Pre-deploy: `npm run migrate:listings-m2` (live writes); `--verify` returns 0 mismatches.
3. Backend deploy: schema enum cutover (drop `'draft'`, add `'rejected'`), default flip to `'pending'`, route filtering changes, role-aware filter on `GET /api/properties` + `GET /api/properties/:id`.
4. Client deploy: status field on Property type, OwnerListings 4-tab control, status pills, banners, AppState refresh hook.

**Audit-field population for legacy backfill:** Migrated rows get NO synthetic `submittedAt` / `approvedAt` / `approvedByUid`. Audit fields stay null/missing for migrated-from-legacy rows. Acceptable because the audit surface (Phase 3 `moderationLog`) consumes them only for moderator actions taken AFTER M2 ship.

### Mod/admin read scope (MOD-04 escape-hatch decision)

- **D-05 (`GET /api/properties` — role-aware filter, no escape hatch):** The public list endpoint returns `status: 'live'` only — for renters, mods, AND admins. There is no `?includeAll=1` flag. Mods + admins access non-live listings exclusively via Phase 3's `/api/moderation/*` endpoints (MOD-17). Cleanest separation: Home / Favorites / RenterListings stay live-only by definition, no client re-filter needed. Eliminates the highest-blast-radius bug class ("pending listing leaked to public feed") at the schema-and-route level.
- **D-06 (`GET /api/properties/:id` — same shape + status field for mods/admins on non-live):** Detail-endpoint deep-link by a mod/admin to a non-live listing returns the full listing payload (same shape as a renter would see for a live listing) WITH the `status` field present. No moderation context payload (`moderationContext`, history, embedded reject reason metadata) — Phase 3 owns moderation actions. PropertyDetailsScreen renders normally with the status pill. Owner viewing their own non-live listing gets the same payload + the rejection banner if `status === 'rejected'`. Non-owner-non-mod gets 404.
- **D-07 (Renter list-screen client filtering — defense in depth):** Even with D-05's server-side filter, Home / Favorites / RenterListings client code keeps a defensive `properties.filter(p => (p.status ?? 'live') === 'live')`. Mirrors Phase 1's belt-and-suspenders posture. Cheap; absorbs any future server regression that loosens the filter.
- **D-08 (Phase 3 forward-fit — strict boundary):** Phase 2 ships ONLY status field, role-aware filter on EXISTING routes, OwnerListings tabs, status pills, deep-link 404 guard, rejection banners, AppState refresh hook. No `/api/moderation/queue` route stub (empty handler or otherwise). No shared TypeScript moderation types. Phase 3 owns the entire moderation surface cleanly from a blank slate.

### OwnerListings 4-tab UX

- **D-09 (Default landing tab — Pending):** Owner navigating to OwnerListings opens on the **Pending** tab by default. Bridges the M1 → M2 mental-model gap: in M1 "post = instantly live" so owners landed on Live and saw what they just submitted; in M2 a freshly-submitted listing now lands in Pending until a moderator approves, so the natural "where did my submission go?" trip lands the owner where the answer is. Tab order in the segmented control: Live / Pending / Rejected / Archived (matches ROADMAP success criteria #2 enumeration order); default selection lands on the second tab.
- **D-10 (HospitalitySection mount — inside each tab as `ListHeaderComponent`):** The Hospitality strip mounts INSIDE each tab's FlatList as `ListHeaderComponent`, filtered to that tab's status (Pending tab shows owner's pending Hospitality cards above pending residential/commercial; Live tab shows live Hospitality above live other-types; etc.). Preserves M1 Phase 6's tour-first info hierarchy per-tab and matches HOSP-01's "tour-first surface on every list screen" anchor. Mirrors the existing `ListHeaderComponent` mount pattern from M1 (the four list screens: Home, Favorites, OwnerListings, RenterListings).
- **D-11 (Per-tab empty-state copy — status-specific + actionable):** Each of the 4 tabs gets its own empty-state copy in EN+RU (8 new locale keys minimum). Recommended copy (planner has discretion on exact wording within this framing):
  - **Live tab empty (EN/RU):** "Nothing live yet — your approved listings will appear here." / «Пока ничего не опубликовано — одобренные объявления появятся здесь.»
  - **Pending tab empty (EN/RU):** "No listings under review." / «Объявлений на модерации нет.»
  - **Rejected tab empty (EN/RU):** "No rejected listings." / «Отклонённых объявлений нет.»
  - **Archived tab empty (EN/RU):** "Nothing archived." / «Снятых объявлений нет.»
  CTA button ("Create listing" / «Создать объявление») renders only on Live + Pending empty states; Rejected + Archived stay text-only (BottomNav 'add' tab is the always-available creation surface).
- **D-12 (Tab-switch behavior — single fetch, client-side filter):** OwnerListings issues ONE `GET /api/properties?ownerUid=<self>` (or equivalent owner-scoped endpoint) on screen mount. The owner-scoped endpoint returns the owner's listings across ALL statuses (`pending` + `live` + `rejected` + `archived`); D-05's renter-side `live`-only filter does NOT apply when the requester is the owner. Client filters in-memory by active tab. Pull-to-refresh refetches the full set. Tabs feel instant; one round-trip per screen entry.

**Server-side endpoint shape consequence:** The owner-scoped fetch path on `GET /api/properties?ownerUid=<self>` (or whatever path the existing OwnerListings consumer uses today) needs a route-side check: if `req.user.uid === ownerUid` (or role ≥ moderator), include all statuses; otherwise apply the live-only filter from D-05. Planner verifies the existing endpoint surface and inserts the role-aware branch.

### Rejection messaging (banners, CTA flow, EN labels)

- **D-13 (PropertyDetailsScreen rejection banner — per-session dismiss, reappear next cold start):** Owner viewing their own `status: 'rejected'` listing sees `<RejectionBanner>` at the top of PropertyDetailsScreen with the localized `reasonCode` + optional `reasonNote` + "Edit & resubmit" / «Исправить» CTA + dismiss "X" button. Tapping X hides the banner for the current React Native process lifetime (in-memory dismiss flag, NOT persisted to AsyncStorage). Banner reappears on next cold start, AppState 'active' transition after a backgrounded > 5min window, OR on the next navigate-to-this-listing within the session (whichever fires first the new render cycle, the banner re-evaluates dismiss state). Banner stops reappearing only when the listing transitions out of `'rejected'` (owner edits + resubmits → status flips to `'pending'`; or owner archives in Phase 4 → `'archived'`). Verbatim REQUIREMENTS.md MOD-08.
- **D-14 (Home persistent rejection banner — auto-dismiss when zero rejected):** Owner on Home screen with `count(myListings where status === 'rejected') > 0` sees a persistent banner: "You have N listing(s) that need edits" / «У вас N объявлений требуют исправления». Tapping navigates to OwnerListings → Rejected tab. Banner auto-dismisses when the last rejected listing transitions out (any of: owner edits + resubmits → `'pending'`; owner archives → `'archived'`; mod un-rejects in Phase 3 if that path exists). No manual dismiss "X" — the banner is informational, not noisy (only ever shows when there's a real issue to act on). Verbatim REQUIREMENTS.md MOD-09.
- **D-15 ("Edit & resubmit" CTA flow — split routing):** The CTA target depends on which banner the owner taps:
  - **PropertyDetailsScreen banner CTA** → opens `CreateListingScreen` in EDIT MODE for that specific listing, pre-filled with the listing's current values (re-uses M1 Phase 5 edit-flow plumbing). On save, the listing's status auto-transitions `'rejected'` → `'pending'` server-side (route-level: `PUT /api/properties/:id` from owner on rejected listing flips status); the banner cleared next render via D-13 trigger.
  - **Home persistent banner CTA** → navigates to OwnerListings → Rejected tab (passing `defaultTab='rejected'` via existing nav-state pattern). Owner picks which rejected listing to edit. Avoids ambiguity ("which rejected listing?") that would arise if Home banner tried to open CreateListingScreen directly.
- **D-16 (EN status-pill labels — short, mirrors Avito RU framing):** The bilingual pill labels lock as follows. RU is anchored to Avito (REQUIREMENTS.md MOD-07 specifies these verbatim); EN is decided here:
  - `'pending'` → EN "Pending review" / RU «На модерации»
  - `'rejected'` → EN "Rejected" / RU «Отклонено»
  - `'archived'` → EN "Unpublished" / RU «Снято с публикации»
  - `'live'` → no pill (live is the implicit default; pill space stays clean)
  4 status-pill keys × 2 locales = 8 new locale keys (some labels reuse keys from D-11 empty states where overlap exists; planner consolidates).

### AppState 'active' role-refresh hook (Phase 1 D-12 deferral)

- **D-17 (AppState listener placement + cooldown):** Phase 1 deferred the `AppState` listener wiring to Phase 2; the `refreshRole()` callable from Phase 1 D-12 is consumed here. Implementation: `useEffect` in `AuthContext.tsx` (or a `useAppStateRoleRefresh()` hook beside it) subscribes to `AppState` `change` events; on `nextAppState === 'active'` the hook calls `AuthContext.refreshRole()`. **Cooldown:** 60-second debounce — if a refresh has run in the last 60s (across either the 403 interceptor in Phase 1 or this hook), skip. Prevents thrashing when the OS rapidly fires foreground/background transitions during multitasking. The 60s window matches ROADMAP success criteria #2 verbatim ("the new role within 60s of their next protected request").

### Claude's Discretion

- **Banner visual design** (color tokens, icon, animation in/out, exact pill border radius / padding) — pick from `useTheme()` semantic palette. `'pending'` pill → `colors.warning` (or `info`); `'rejected'` pill → `colors.error`; `'archived'` pill → `colors.neutral` (or `subtle`). Planner verifies the exact token names exist in the M1 Phase 6 `useTheme()` palette and maps; new tokens added only if a true gap exists.
- **Owner-scoped fetch endpoint path** — discovery time during planning. If the existing OwnerListings consumer hits `GET /api/properties?ownerUid=<self>`, route-side branch is inserted there. If the existing path is different, planner adapts D-12's "single fetch" decision to match.
- **`<RejectionBanner>` component location** — likely `src/components/RejectionBanner.tsx`, follows the M1 component-naming convention. Reusable from PropertyDetailsScreen + future Phase 3 surfaces.
- **`<HomeRejectionBanner>` component vs reusing `<RejectionBanner>`** — separate component is cleaner because the props differ (count + tab-route vs reasonCode + edit-route). Planner decides whether to share an internal primitive.
- **AppState refresh hook unit-test coverage** — Phase 1's CONVENTIONS.md notes "Effectively zero tests"; planner has discretion on whether to add jest tests for the cooldown logic. Not required.
- **Pre-Phase-3 endpoint that owner-scoped fetch hits** — if `GET /api/properties?ownerUid=<self>` doesn't exist as an owner-scoped path today, planner may add it under the existing `propertyRoutes.js` rather than under any moderation-prefixed namespace.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v2.0 M2 "Roles & Moderation"; locked scope; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation); geographic scope (Bishkek/KG launch, Almaty/KZ + Tashkent/UZ planned)
- `.planning/REQUIREMENTS.md` §"Moderation lifecycle (Phase 2 + Phase 3) — status field + queue + mod actions" — MOD-01..MOD-09 acceptance criteria with verbatim banner copy + RU pill labels; Out of Scope hard rules
- `.planning/ROADMAP.md` §"Phase 2: Listing Lifecycle Status Field Absorption" — Goal + Depends on + Requirements list + 5 Success Criteria

### Prior phase context (carries forward)

- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` §Token refresh + role-revocation UX (D-12) — `AuthContext.refreshRole()` callable + 403 interceptor + role-refresh banner mounted in App.tsx; AppState 'active' hook explicitly deferred to Phase 2 (this phase, D-17)
- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` §Hotfix sequencing (D-03, D-04, D-05) — Bearer + socket dual-accept window; legacy `x-firebase-uid` cutover lands in Phase 6, NOT here

### Research outputs (M2)

- `.planning/research/ARCHITECTURE.md` — App.tsx LOC budget enforcement (≤1100 hard / ≤1050 soft per PITFALLS Pitfall 8) — current is 1099, every Phase 2 addition must net into the budget; OVERLAY_FLAGS derived-overlay pattern for any new overlay routes
- `.planning/research/PITFALLS.md` — Pitfalls relevant to Phase 2: #4 (stale role cache → AppState hook addresses), #8 (App.tsx god-file regression → 1099 LOC means net-zero or extract-on-touch), #11 (status enum proliferation), #12 (i18n parity drift on banner copy)
- `.planning/research/FEATURES.md` — Status field + moderation queue classified as table-stakes for the M2 differentiator vs Lalafo/HouseKG

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity required for every new UI string (CI gate `scripts/check-i18n-parity.sh`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; root-level `__tests__/` for app-level smokes, co-located `src/<subdir>/__tests__/` for unit tests; M1 baseline at 365 keys (Phase 4.5 added ~50; Phase 2 adds 8–12 estimated)
- `.planning/codebase/STRUCTURE.md` — `src/screens/OwnerListingsScreen.tsx` (216 LOC pre-Phase-2); `src/components/PropertyCard.tsx` (492 LOC); `src/screens/HomeScreen.tsx` (774 LOC); `App.tsx` (1099 LOC, near soft cap); 5-service network layer
- `.planning/codebase/CONCERNS.md` — Critical: Firebase API key hardcoded in source (deferred to a future phase, NOT Phase 2); High: App.tsx god-file (1099 LOC, near soft cap — every Phase 2 addition is scrutinized); Medium: tab persistence pattern via `display: none` keep-alive

### Backend repo (decision-shaping references)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js:35` — current `status: { enum: ['draft', 'pending', 'live', 'archived'], default: 'draft' }`. D-01 cutover happens here.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — public `GET /api/properties` + `GET /api/properties/:id` routes. D-05 + D-06 + D-12 add role-aware branches here.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/seed.js` + `migrate-roles-m2.js` — sibling-location pattern for D-03's new `migrate-listings-m2.js`.

### Client repo (decision-shaping references)

- `src/types/Property.ts:66` — current `status?: 'draft' | 'live' | 'archived'`. D-01 cutover: type becomes `status: 'pending' | 'live' | 'rejected' | 'archived'` (no longer optional after backfill, but TypeScript may keep `?` until D-02 backfill is verified in production).
- `src/screens/OwnerListingsScreen.tsx` (216 LOC) — adds 4-tab segmented control + per-tab `ListHeaderComponent` Hospitality strip + status-specific empty states. D-09 + D-10 + D-11 land here.
- `src/screens/HomeScreen.tsx` (774 LOC) — Home persistent rejection banner (D-14). D-07 client filter coalesce.
- `src/screens/RenterListingsScreen.tsx` + `src/screens/FavoritesScreen.tsx` — D-07 client filter coalesce.
- `src/screens/PropertyDetailsScreen.tsx` (1680 LOC, largest screen) — `<RejectionBanner>` mount above hero (D-13); status pill display.
- `src/screens/CreateListingScreen.tsx` (1300 LOC) — D-15 edit-mode entry point from PropertyDetailsScreen banner; submit copy still "Submit"/«Опубликовать» (planner verifies whether MOD-03 implies a copy change to "Submit for review"/«Отправить на модерацию» — if yes, +2 locale keys).
- `src/components/PropertyCard.tsx` (492 LOC) — status pill badge for non-live statuses (MOD-07).
- `src/hooks/useRole.ts` — already in place from Phase 1 D-cutover; Phase 2 calls `<Gated>` + `useRole()` consumers but does NOT modify the hook itself.
- `src/context/AuthContext.tsx` — D-17 AppState listener wires up here; `refreshRole()` callable already lands from Phase 1.
- `src/locales/en.json` + `src/locales/ru.json` — bilingual locale files (NOT `.ts` despite a stale CONVENTIONS.md note); Phase 2 adds 8–12 new keys (status pill labels × 2 locales + 4 empty state copies × 2 locales + 1–2 banner copies × 2 locales; consolidation likely shaves a few).
- `App.tsx` (1099 LOC, near 1100 soft cap from PITFALLS.md #8) — no new OVERLAY_FLAGS needed for Phase 2 (no new overlay screens; OwnerListings tabs are in-screen). Banner mounts already cleared in Phase 1.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in RN client
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity proof (uid only); MongoDB = role authority via `userType`
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer (no Railway-team coordination overhead)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ launch scope; avoid Bishkek-only assumptions in copy or pill labels
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired gate; Phase 2 should run code review at minimum, given route-level filter changes are exactly the regression class the verifier missed in Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useRole()` / `<Gated>`** (`src/hooks/useRole.ts`) — already cut over to Mongo-resolved roles in Phase 1. Phase 2 reads `role !== 'guest'` for owner-scoped surfaces; no hook modifications.
- **`AuthContext.refreshRole()`** (`src/context/AuthContext.tsx`) — callable from Phase 1 D-12; consumed by D-17 AppState hook here.
- **`apiClient.ts`** (`src/services/apiClient.ts`) — shared axios instance from Phase 1. All Phase 2 backend calls inherit `Authorization: Bearer` automatically; D-05 + D-12 endpoint changes don't require client header changes.
- **`ListHeaderComponent` Hospitality strip** — M1 Phase 6 mounted `HospitalitySection` via FlatList `ListHeaderComponent` on Home, Favorites, OwnerListings, RenterListings. D-10 reuses this primitive per-tab inside OwnerListings.
- **CreateListingScreen edit-mode plumbing** — M1 Phase 5 decomposed CreateListingScreen + introduced category-aware edit flows; D-15 PropertyDetailsScreen banner CTA reuses this entry point.
- **EmptyState pattern** — already used across list screens; D-11 per-tab empty-state copy follows the existing component shape.
- **Bilingual `t()` translation helper** (`src/locales/index.ts`) — straightforward consumer for D-11 + D-13 + D-14 + D-16 new keys.

### Established Patterns

- **`useTheme()` semantic tokens** — pill colors, banner backgrounds derive from theme palette. No hardcoded colors.
- **Belt-and-suspenders defense in depth** — Phase 1 D-08 + D-10 set the precedent (server filter + client filter); D-02 + D-07 mirror this pattern.
- **One-shot migration scripts under `JayTap-services/src/scripts/`** — Phase 1 D-07 established sibling-to-`seed.js` pattern; D-03 follows.
- **Audit-field "additive only" schema discipline** — Phase 1 D-04 / Phase 4.5 both added Mongo fields without breaking existing reads. MOD-01 audit fields (`submittedAt`, `approvedAt`, etc.) follow this pattern.
- **OVERLAY_FLAGS derived-overlay pattern** (M1 Phase 1) — Phase 2 adds NO new overlays; OwnerListings tabs are in-screen state.
- **AsyncStorage key naming** — Phase 1 added `refreshToken`. Phase 2 adds NO new persisted keys (banner dismiss is in-memory per D-13).

### Integration Points

- **Backend `propertyRoutes.js`** — D-05 (list role-aware filter), D-06 (detail role-aware filter), D-12 (owner-scoped fetch), D-15 (auto-flip `'rejected'` → `'pending'` on owner save). Single file holds all four route changes.
- **Client `OwnerListingsScreen.tsx`** — Largest single change in the phase. 216 LOC → likely ~350 LOC with the 4-tab control + 4 ListHeaderComponent slots + 4 empty states. Planner watches against premature decomposition; the screen is still well within reasonable size.
- **Client `PropertyDetailsScreen.tsx`** (1680 LOC, largest screen) — `<RejectionBanner>` mounts at the top above hero; status pill updates already feed from existing prop chain.
- **Client `HomeScreen.tsx`** — `<HomeRejectionBanner>` mounts (likely below the search bar, above the list); D-07 filter coalesce on the property list response.
- **AppState listener** — `AuthContext.tsx` is the natural mount point (provider tree: `ThemeProvider → LanguageProvider → AuthProvider`); the `useEffect` lives next to existing user-cold-start logic.

</code_context>

<specifics>
## Specific Ideas

- **EN status pill labels — exact strings to ship** (D-16): `'pending'` → "Pending review" / «На модерации»; `'rejected'` → "Rejected" / «Отклонено»; `'archived'` → "Unpublished" / «Снято с публикации»; `'live'` → no pill rendered.
- **Per-tab empty-state copy — recommended strings** (D-11): Live "Nothing live yet — your approved listings will appear here." / «Пока ничего не опубликовано — одобренные объявления появятся здесь.»; Pending "No listings under review." / «Объявлений на модерации нет.»; Rejected "No rejected listings." / «Отклонённых объявлений нет.»; Archived "Nothing archived." / «Снятых объявлений нет.» (planner has discretion on exact copy, framing locked.)
- **Migration verification command** (D-03): `db.properties.countDocuments({status: {$nin: ['pending', 'live', 'rejected', 'archived']}})` returns 0 — verbatim post-condition for `--verify` subcommand.
- **AppState cooldown** (D-17): 60-second window; matches ROADMAP success criteria #2 ("new role within 60s of their next protected request").
- **OwnerListings tab order** (D-09): Live / Pending / Rejected / Archived; default selection lands on Pending (second tab).
- **Submit-button copy on CreateListingScreen** — open question for planner: does MOD-03 ("submit for review, not publish immediately") imply a copy change from "Publish"/«Опубликовать» to "Submit for review"/«Отправить на модерацию»? If yes, +2 locale keys + scope hint.

</specifics>

<deferred>
## Deferred Ideas

- **`serviceAreas` config storage location** — Phase 3 owns this (consumed by MOD-12 `out-of-service-area` reasonCode in the reject modal). Phase 2 does NOT introduce any `serviceAreas` surface.
- **MOD-13 reasonCode → owner-locale translation table location** — Phase 3 owns this (the rejection banner reads from a translated reasonCode that the moderator submitted in their own locale; the translation logic lives server-side or via a shared locale dictionary). Phase 2's `<RejectionBanner>` consumes whatever Phase 3 ships.
- **Deep-link 404 vs 403 framing for owner self-deep-link** — Acceptable today: D-06 says owner gets full payload + status pill on self-deep-link. Mod/admin sees same. Non-owner-non-mod gets 404. No 403-with-status-leak nuance needed.
- **`/api/moderation/queue` endpoint stub** — D-08 explicitly defers to Phase 3.
- **Moderation actions (approve/reject/edit-on-behalf)** — Phase 3 (MOD-10..MOD-18).
- **Archive actions (owner self-archive, mod-archive, restore-to-pending)** — Phase 4 (ARCH-01..ARCH-05). Phase 2 ships the `'archived'` enum value + Archived tab in OwnerListings + status pill, but NO archive-button affordance. The Archived tab in Phase 2 will appear empty for every owner until Phase 4 ships the archive action.
- **5th OwnerListings tab for owner-WIP "draft"** — Rejected via D-01 (no `'draft'` 5th state). Out of M2 scope.
- **CreateListingScreen submit-button copy change** — Flagged as "open question for planner" in `<specifics>`. Could expand to a +2-key locale change if MOD-03 framing demands it.
- **Backend test coverage for new role-aware route branches** — CONVENTIONS.md notes "effectively zero tests"; Phase 1 D-claude-discretion left this open. Phase 2 inherits the same posture; planner has discretion.
- **`AppState 'active'` cooldown unit-test** — D-17 logic is testable; not required by codebase posture.
- **Mod/admin-only "view all statuses" debug surface** — Rejected by D-05 (no `?includeAll=1`). If a future debugging need arises, it lives in Phase 3+ moderation surface.
- **Crash reporting** (CONCERNS.md) — Out of M2 scope; backlog candidate.
- **`react-native-config` / `.env` loader for the RN client** (CONCERNS.md) — Out of M2 scope; backlog candidate.

</deferred>

---

*Phase: 02-listing-lifecycle-status-field-absorption*
*Context gathered: 2026-05-01*

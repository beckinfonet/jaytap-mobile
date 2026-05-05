# Phase 5: Admin Role Management UI — Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Give admins an in-app screen to find users by email substring, change any user's `userType` between `user` / `moderator` / `admin`, and persist an append-only audit row, with two server-side guardrails (last-admin lockout + self-mutation prevention).

**In scope:** RoleManagementScreen as an `App.tsx` overlay; Profile entry-point gated by `<Gated action="manageRoles">`; new `UserService.ts` with `searchUsers` + `setUserRole`; new backend `adminRoutes.js` mounted at `/api/admin/*` with router-level `requireMinRole('admin')`; new `roleChangeLog` audit collection; `roleRevokedAt` bumped on demotion (Phase 1 ROLE-11 invariant honored); EN+RU bilingual parity for every new string; physical-device QA matrix walks deferred to Phase 6 REL-03.

**Out of scope (deferred to M3+):** automated/AI moderation, role-change UI for moderators (admin-only), self-promotion / "apply to be a moderator" path, full audit log UI (data captured, no surface), email/push notifications on role change, multi-region admin scoping, hierarchical permissions, real-estate document verification, formal appeal flow.

</domain>

<decisions>
## Implementation Decisions

### Search & list UX

- **D-01:** Search fires on **debounced typing (300ms)** — no Submit button. Live-feel mirrors iOS Settings; small admin pool keeps API cost negligible.
- **D-02:** Each user row shows: **email (primary), `firstName lastName`, current `userType` pill (color-coded via existing semantic palette tokens), and `roleRevokedAt` timestamp when set** ("Revoked: 2026-04-15"). No avatar (User schema has no avatar field).
- **D-03:** Initial / pre-search state shows **empty list + "Type to search" placeholder hint** — no API call until the admin types. Avoids loading the full user table on mount.
- **D-04:** Pagination uses **`limit=50` with a "Refine your search to see more" hint** when exactly 50 rows return. No cursor pagination, no infinite scroll. Admin scale + email substring search makes this sufficient.

### Role-change interaction

- **D-05:** Role picker is a **3-chip modal forked from `RejectListingModal`** (Phase 4 fork-and-trim discipline; new file `src/components/RoleChangeModal.tsx`). Chips: user / moderator / admin. The user's *current* role chip is presented as visually de-emphasized (selectable but not the recommended action). Submit button commits.
- **D-06:** Role change is **two-tap: pick role → confirm** ("Change John Doe from moderator to admin?" / «Изменить роль John Doe с модератора на администратора?"). Hardens against fat-finger, mirrors Phase 3 Approve flow's `Alert.alert` confirm pattern.
- **D-07:** Success feedback = **inline pill update + 'Role updated' toast** ("Role updated" / «Роль обновлена»). The list stays open so admins can change another user without round-tripping. On 409/403 the modal stays open and surfaces the error inline (D-13 + D-14).
- **D-08:** The role-change modal is **sibling-mounted** to RoleManagementScreen's FlatList (not a sub-screen, not a bottom-sheet). Visibility driven by selected-user state. Matches RejectListingModal/ArchiveListingModal mount pattern from Phases 3 + 4.

### Guardrail error surfacing

- **D-09:** Last-admin lockout surfaces via a **blocking modal alert with full explanation** ("Cannot change role — X is the only admin. Promote another user to admin first." / «Нельзя изменить роль — X единственный администратор. Сначала повысьте другого пользователя до администратора.»). A destructive action stopped at the door deserves visibility; toast-only is too easy to miss.
- **D-10:** Self-mutation handled in the list as a **disabled '(you)' badge row** — self appears in search results but the row is non-tappable with a subtle "(you)" / «(вы)» label next to the email. Audit transparency without the lazy "tap then 403" antipattern.
- **D-11:** Backend error envelope codes follow the Phase 3 ALREADY_MODERATED / Phase 4 ARCHIVE_RACE convention: **`LAST_ADMIN_LOCKOUT` (409)** when a role change would drop the admin count to zero; **`SELF_MUTATION` (403)** when actor uid === target uid (defense-in-depth even though D-10 hides the affordance). Same `{code, message}` envelope.
- **D-12:** EN+RU copy required for: `admin.roles.error.lastAdminLockout` (modal title + body), `admin.roles.error.selfMutation` (toast — defense-in-depth path only), `admin.roles.error.roleAlreadyChanged` (race conflict toast, mirrors Phase 3 `moderation.race.toast`), `admin.roles.error.userNotFound` (404 toast), `admin.roles.error.network` (generic network fallback), `admin.roles.search.noResults` (empty-state copy "No users match '{query}'." / «Пользователи по запросу «{query}» не найдены.»). Plus the obvious base strings: screen title, search placeholder, role chip labels, confirm-modal title/message/buttons, success toast, list pagination hint.

### Claude's Discretion

User explicitly skipped the **Audit log + endpoint shape** gray area; the planner can lock these defaults during research, deviating only if research surfaces a contradiction:

- `roleChangeLog` is a **separate Mongo collection** (NOT merged into `moderationLog`) with shape `{actorUid, targetUid, fromRole, toRole, at}` per ADMIN-05; no `before`/`after` blob (these are tiny enum strings and fully captured by `fromRole`/`toRole`).
- `action` enum is implicit (single-purpose collection); no need for an `action` field. If the planner prefers symmetry with `moderationLog`, a single `action: 'role-change'` value is acceptable.
- New endpoints exactly per ADMIN-07: `GET /api/admin/users?query=<email>&limit=50` returns `{items: User[]}` (or `{items, totalCount}` if the planner finds totalCount cheap); `PATCH /api/admin/users/:uid/role` body `{userType: 'user'|'moderator'|'admin'}`. **PATCH success response = the full updated User doc** (consistent with `GET /api/auth/me` shape from Phase 1; lets the client refresh the row pill from a single response).
- `roleRevokedAt` **bumps on demotion only** (admin→moderator, admin→user, moderator→user). Promotions (user→moderator, moderator→admin, user→admin) do NOT bump `roleRevokedAt` — no security purpose, and bumping would force the promoted user to re-auth without need. Same-tier no-op (e.g., `setUserRole(uid, 'admin')` on an existing admin) is a 200 with no `roleRevokedAt` change.
- The existing `useRole.ts` `Action` union has `promoteToModerator` (M2 forward-compat placeholder, likely zero call sites). Phase 5 **renames `promoteToModerator` → `manageRoles`** atomically (verify zero call sites in research; if any exist, swap them in the same commit). Adds a new test row covering `can('manageRoles')` for admin (true) / moderator (false) / user (false) / guest (false).
- Search server-side: `User.find({ email: { $regex: escapedQuery, $options: 'i' } }).limit(50).select('_id firebaseUid email firstName lastName userType roleRevokedAt')`. `escapedQuery` MUST sanitize regex metacharacters — admin-only doesn't make ReDoS acceptable.
- Pre-flight `Total admins: N` counter on the screen (subtle "N admins, M moderators, K users" footer or header chip) is **NOT in scope** for this phase — defense-in-depth lives in the 409 alert, not in client-side admin-count math.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project memory + decisions
- `.planning/PROJECT.md` — milestone goals, M2 hard rules (no Firebase SDK; Mongo `userType` is role authority; no react-navigation; EN+RU parity), Out of Scope.
- `.planning/REQUIREMENTS.md` §"Admin role management (Phase 5)" — ADMIN-01 through ADMIN-07 acceptance criteria.
- `.planning/ROADMAP.md` lines 125-136 — Phase 5 goal + 4 success criteria + dependency on Phase 1.

### Locked patterns from prior phases
- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` — JWKS middleware (`verifyFirebaseToken`), `requireMinRole('admin')` middleware factory, `apiClient.ts` envelope (Bearer auto-attach + single-flight 401 silent-refresh + 403 role-revoked → `auth.accessChanged` toast), `roleRevokedAt` invariant + token-iat rejection rule, `GET /api/auth/me` response shape.
- `.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` — Overlay-via-`OVERLAY_FLAGS` mount discipline, Profile entry-point + `<Gated>` predicate, race-safe atomic `findOneAndUpdate` + 409 `{code: 'ALREADY_MODERATED'}` envelope (template for `LAST_ADMIN_LOCKOUT`), `actorUid: req.firebaseUid` anti-spoofing rule, `/api/<prefix>/*` route prefix discipline, ModerationLog append idiom (template for RoleChangeLog).
- `.planning/phases/04-archive-lifecycle-owner-mod-admin/04-CONTEXT.md` — Modal-fork-and-trim pattern (RejectListingModal → ArchiveListingModal; basis for RoleChangeModal), `<Gated action>` predicate extension via useRole `canFromUser` switch fall-through, locale-key fork conventions (key NAMES preserved, key VALUES rewritten per Pitfall 3).

### RN client integration points
- `App.tsx` lines 121-127 — `OVERLAY_FLAGS` array shape; lines ~1043-1045 — overlay screen mount block (template for `<RoleManagementScreen>`).
- `src/screens/ModerationQueueScreen.tsx` (~382 LOC) — direct structural analog for `RoleManagementScreen`: SafeAreaView + ChevronLeft header + FlatList + RefreshControl + AppState 60s cooldown + Alert.alert error fallbacks.
- `src/screens/ProfileScreen.tsx` lines ~281-301 — entry-point row template + `<Gated>` row gating + pending-count badge pattern.
- `src/components/RejectListingModal.tsx` (~209 LOC) — fork basis for `src/components/RoleChangeModal.tsx`. 4-edit-diff convention (header docstring + identity rename + 2 t() call swaps + chip-label key choices).
- `src/hooks/useRole.ts` — `Action` union extension site; existing `promoteToModerator` placeholder gets renamed to `manageRoles` (verify zero call sites).
- `src/services/apiClient.ts` + `src/services/PropertyService.ts` — pattern for new `src/services/UserService.ts` (`searchUsers(query) → User[]`, `setUserRole(uid, userType) → User`).
- `src/locales/en.ts` + `src/locales/ru.ts` — flat-key namespace; `admin.roles.*` is unused and clean.
- `scripts/check-i18n-parity.sh` — strict diff CI gate; new keys must land in same commit on both locales.

### Backend integration points (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)
- `src/routes/moderationRoutes.js` — clone basis for `src/routes/adminRoutes.js`. Router-level `router.use(verifyFirebaseToken, requireMinRole('admin'))` + race-safe atomic + audit insert pattern.
- `src/middleware/verifyFirebaseToken.js` — JWKS middleware (Phase 1); honors `roleRevokedAt` token-iat rejection.
- `src/models/User.js` — `userType` enum already `['user','moderator','admin']` (Phase 1 ROLE-01); `roleRevokedAt` field already present (Phase 1 ROLE-11); `email` is unique-indexed (substring search via `{email: {$regex, $options: 'i'}}` is fine for admin scale).
- `src/models/ModerationLog.js` — model template for new `src/models/RoleChangeLog.js`.

### Cross-cutting auto-memory (active for this phase)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — no Firebase SDK in either RN client or backend; backend continues with `jose` JWKS only.
- `~/.claude/projects/.../memory/identity-vs-user-store.md` — Mongo `userType` is role authority; never use Firebase custom claims for role decisions.
- `~/.claude/projects/.../memory/gsd-verifier-misses-regressions.md` — Phase 5 phase-exit gate is paired `/gsd-verify-work 5` + `/gsd-code-review` per established discipline.
- `~/.claude/projects/.../memory/backend-node-version.md` — backend agents must `nvm use 24` before npm/node commands; backend declares `engines.node >=22.12.0`.
- `~/.claude/projects/.../memory/backend-repo-location.md` — backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer as RN client; Phase 5 touches backend directly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ModerationQueueScreen.tsx`** — direct analog. RoleManagementScreen reuses its SafeAreaView + ChevronLeft header + FlatList + RefreshControl + AppState 60s cooldown skeleton; the FlatList just renders user rows instead of property rows.
- **`RejectListingModal.tsx`** — fork basis for `RoleChangeModal.tsx` per Phase 4 fork-and-trim convention (4-edit diff in header docstring).
- **`apiClient.ts`** — automatically attaches Bearer + handles 401 silent-refresh + 403 role-revoked. New `UserService` methods inherit transparently; the role-revoked branch correctly handles the case where the admin demotes themselves between requests (defense-in-depth before D-10 hides the affordance).
- **`useRole.ts` `canFromUser` switch** — `manageRoles` Action lands in the admin block via fall-through (mirrors Phase 4 D-16 `hardDeleteListing` pattern).
- **`ProfileScreen.tsx` entry-point pattern** — `canManageRoles && onOpenRoleManagement && (<TouchableOpacity ...>)` matches Phase 3 ModerationQueue row exactly.
- **`moderationRoutes.js`** — backend clone basis. Atomic `findOneAndUpdate` + 409 `{code}` + audit-row insert + `actorUid: req.firebaseUid` anti-spoofing all directly transferable.
- **`ModerationLog.js`** — Mongoose schema template for `RoleChangeLog.js` (drop `before`/`after`/`reasonCode`/`reasonNote`/`targetType`; keep `actorUid` + `at` + add `targetUid`/`fromRole`/`toRole`).

### Established Patterns
- **Belt-and-suspenders gating** (Phase 1 → Phase 4): client `<Gated>` predicate + `UserService.setUserRole` calls `canFromUser('manageRoles')` before HTTP + backend `requireMinRole('admin')` at router level. All three layers needed; Phase 4 D-15 anti-spoofing grep gate carries over.
- **Race-safe atomic** (Phase 3 D-08, Phase 4 D-04): `User.findOneAndUpdate({_id, userType: {$ne: newRole}}, {$set: {userType, roleRevokedAt?: now}})` with `{new: true}` returns null on race → 409 `ROLE_ALREADY_CHANGED`. Combined with the last-admin pre-flight count + transactional check (or two-step compare-and-swap if Mongo replica set isn't available).
- **Audit-row idiom** (Phase 3 MOD-16): `await RoleChangeLog.create({...})` wrapped in own try/catch; orphan-tolerant (a successful role mutation followed by a failed audit insert logs but does not 500). `actorUid: req.firebaseUid` (NEVER from body — anti-spoofing grep gate).
- **Locale parity** (Phase 3 MOD-18): every new string lands in `en.ts` + `ru.ts` in the same commit; `scripts/check-i18n-parity.sh` is a strict diff. New `admin.roles.*` namespace.
- **App.tsx LOC discipline** (Phase 1 D-19, Phase 4 net-zero target): adding RoleManagementScreen overlay needs ~+30-40 LOC (one OVERLAY_FLAGS entry + state setter + screen mount block + back-handler branch). Plan should budget this and document it in SUMMARY per PATTERN D signal-not-block.

### Integration Points
- **App.tsx OVERLAY_FLAGS array** — append `!!user && isRoleManagementOpen` (admin gating happens at the entry-point row, not at the overlay; the flag itself only checks "is the screen requested to be open"). Mount `<RoleManagementScreen>` sibling to `<ModerationQueueScreen>`.
- **ProfileScreen entry-point** — new row gated by `<Gated action="manageRoles">` (admin-only via Phase 5 useRole rename); navigates to RoleManagementScreen via `onOpenRoleManagement` prop wired in App.tsx.
- **AuthContext.refreshRole()** (Phase 1 ROLE-10) — relevant only if admin demotes themselves out-of-band via a future M3 endpoint; for Phase 5 self-mutation is blocked at D-10/D-11 so this stays untouched.
- **Backend `app.js` route mount** — `app.use('/api/admin', adminRoutes)` registered alongside `app.use('/api/moderation', moderationRoutes)`.

</code_context>

<specifics>
## Specific Ideas

- The screen feels like the moderator queue: dense, action-first, no decorative chrome. Header → search box → list → tap row → modal.
- "(you)" disabled badge is the same visual treatment as a disabled row in iOS Settings — greyed text, no chevron, no hit-target.
- Confirm-modal copy is symmetric across promotion and demotion: "Change John Doe from moderator to admin?" works the same direction either way; no separate "Promote" / "Demote" verbs in the UI (the audit collection records the directional truth via `fromRole`/`toRole`).
- LAST_ADMIN_LOCKOUT modal copy explicitly tells the admin the next step ("Promote another user to admin first") — error messages that name the corrective action are better than ones that only describe the failure.

</specifics>

<deferred>
## Deferred Ideas

- **Total admins / total moderators counter** on RoleManagementScreen header. Was raised in the "more questions" prompt for guardrails; user said skip. The 409 LAST_ADMIN_LOCKOUT modal is sufficient; counter would be M3 polish.
- **Role-provenance hint** ("Promoted by X on 2026-04-10") shown when an admin views another admin row. Data is captured by `roleChangeLog` but no UI surface in M2.
- **Bulk role changes** (multi-select list rows + "Set all to user"). Not needed at admin scale; M3+.
- **Self-promotion path** ("apply to be a moderator"). Already in REQUIREMENTS.md Future Requirements (M3+).
- **Region-scoped admin** (KG admin can only manage KG users; expansion-driven per `geographic-scope.md`). M3+ when KZ/UZ markets warrant.
- **Audit log UI** (read-only screen surfacing `roleChangeLog` + `moderationLog` rows). Already in REQUIREMENTS.md Future Requirements; data is captured, surface deferred.
- **Push/email notifications on role change** ("Your role was changed to moderator"). No push infra in JayTap today; out of scope.
- **`Total admins: N` pre-flight chip** on the change-role modal so the admin knows demotion would be the last admin before tapping submit. Skipped per D-09 — the 409 modal alert is the right safety surface.

</deferred>

---

*Phase: 05-admin-role-management-ui*
*Context gathered: 2026-05-03*

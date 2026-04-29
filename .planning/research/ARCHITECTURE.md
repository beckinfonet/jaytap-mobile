# Architecture Research — M2 "Roles & Moderation" integration into JayTap

**Domain:** React Native 0.84 (New Arch) brownfield real-estate app — adding server-resolved role system + listing moderation lifecycle to an app whose nav is a custom `App.tsx` boolean state machine and whose state lives in nested React Contexts.
**Researched:** 2026-04-29
**Confidence:** HIGH for placement decisions that follow existing M1 patterns (Context tree, OVERLAY_FLAGS, useRole forward-compat shape, PropertyService HTTP shape); MEDIUM for the parts that depend on a Railway endpoint contract Railway has not yet confirmed (see §9 Backend Coordination — every "MEDIUM" in §1 Role Resolution Data Flow collapses to HIGH or invalidates entirely once those answers land).
**Scope:** Five integration concerns — (1) role-resolution data flow + cache invalidation, (2) Context-tree placement, (3) Moderation Queue mount point + OVERLAY_FLAGS interaction, (4) listing lifecycle status migration through existing list screens, (5) owner rejection messaging + edit-on-behalf + owner-archive coexistence with hard-delete. Plus suggested phase order (§8) and explicit Railway questions (§9).

**Hard rules honored throughout:**
- NO Firebase SDK in this repo (Firebase Identity Toolkit REST stays).
- NO react-navigation. Custom `App.tsx` state machine stays.
- M1 Phase 3 forward-compat shape is preserved — `useRole()` / `can(action)` / `<Gated>` call sites do NOT change in M2 (only `deriveRole()` internals + a fetch step change).
- M1 Phase 1 OVERLAY_FLAGS pattern (overlay state derived from current overlay rather than stored) is preserved.
- Three-category taxonomy from M1 Phase 4 + decomposed `CreateListingForm/*` sub-components from M1 Phase 4 are preserved.

---

## Recommended Architecture

High-level: **add one fetch step inside the existing `AuthService.getBackendUser()` flow to populate `user.backendProfile.customClaims.role`, leave `useRole()` consumers untouched, and add three new screens (Moderation Queue + Role Management + Promote User) following the existing overlay-screen pattern.** Add a `status` field to the `Property` type and a single `?status=live` filter helper that all four list screens (Home/Favorites/RenterListings/OwnerListings) call into so the lifecycle is opt-in, not a fan-out edit. Owner-rejection notification is a badge-on-OwnerListings + inline reason banner — no push, no inbox. Edit-on-behalf reuses `CreateListingScreen` with a moderator-context flag set on `App.tsx`.

### Updated Provider Tree (no structural change)

```
SafeAreaProvider
└── KeyboardProvider          (M1 Phase 2 — unchanged)
    └── ThemeProvider          (unchanged)
        └── LanguageProvider   (unchanged)
            └── AuthProvider   (BEHAVIOR EXTENDED — see §1 + §2)
                └── AppContent (App.tsx state machine — extended with 3 new boolean flags + 1 derived flag)
```

**No new Context provider for roles.** `useRole()` continues to derive from `useAuth().user.backendProfile.customClaims.role` (M1 already wrote this branch — see `src/hooks/useRole.ts:50` "Branch 1 (M2): server-verified custom claim. Currently undefined."). M2 just makes that branch return a real value.

### New / modified component inventory

| Component | Status | Purpose | File |
|-----------|--------|---------|------|
| `AuthService.getBackendUser()` | MODIFIED | Already enriches profile via `GET /auth/users/:uid`. Backend response shape gains `userType: 'admin' \| 'moderator' \| 'user'` (M1 already partial). No client-side fetch change in best case (Path A). | `src/services/AuthService.ts` |
| `AuthContext` | MODIFIED — additive | Adds `refreshRole()` callable + bumps `user` reference when called. No new state — `role` stays derived via `useRole()`. | `src/context/AuthContext.tsx` |
| `useRole()` | UNCHANGED externally | Remove the M1 email-allowlist branch (Branch 3) per the TODO comment at `useRole.ts:64`. Delete `src/constants/adminAllowlist.ts`. Internal-only change; call sites do not move. | `src/hooks/useRole.ts` |
| `ModerationQueueScreen` | NEW | Mod/admin queue of `status === 'pending'` listings + actions (approve/reject/flag/edit). Overlay-pattern, `zIndex: 3`-style. | `src/screens/ModerationQueueScreen.tsx` |
| `RoleManagementScreen` | NEW | Admin-only: search users, change `userType`, view current admins/mods. | `src/screens/RoleManagementScreen.tsx` |
| `PromoteUserScreen` | NEW (or modal-on-RoleManagement) | Admin-only: pick a user → promote-to-mod / -admin / -user. May collapse into RoleManagementScreen if scope is tight. | `src/screens/PromoteUserScreen.tsx` (TBD — see §3 + §8) |
| `RejectListingModal` | NEW | Mod/admin: reason picker + free-text. Surfaced from ModerationQueueScreen and from PropertyDetailsScreen when viewed by mod/admin. | `src/components/RejectListingModal.tsx` |
| `ArchiveListingModal` | NEW | Replaces or sits beside `DeleteListingModal`. See §7. | `src/components/ArchiveListingModal.tsx` |
| `PropertyService` | MODIFIED | Adds `submitForReview`, `approveListing`, `rejectListing`, `archiveListing`, `unarchiveListing`, `editAsModerator`, `getModerationQueue`, `getRejectionReason`. All carry `canFromUser` guards mirroring service-layer pattern from M1 Plan 03-04. | `src/services/PropertyService.ts` |
| `UserService` (new) or extend `AuthService` | NEW (recommended new file) | `searchUsers`, `setUserRole(uid, role)`, `getRoleAuditLog(uid)`. Admin-only operations. New file because `AuthService` is already 200+ LOC and these endpoints aren't auth-flow-related. | `src/services/UserService.ts` |
| `propertyStatus.ts` (helper) | NEW | `filterByStatus(props, statuses)`, `groupOwnerListingsByStatus(props)`. Single source of truth so list screens don't each reimplement filter. | `src/utils/propertyStatus.ts` |
| `BottomNavigator` | MODIFIED — conditional 6th tab | Adds a `'moderation'` tab visible only when `useRole().can('approveListings')`. Or: omit from tab bar entirely; surface via Profile screen entry point (see §3 — recommendation). | `src/components/BottomNavigator.tsx` |
| `HomeScreen` | MODIFIED | Filter `properties.filter(p => (p.status ?? 'live') === 'live')` via `filterByStatus` helper. One-line change at the existing filtered-properties `useMemo`. | `src/screens/HomeScreen.tsx` |
| `FavoritesScreen` | MODIFIED | Same `filterByStatus(['live'])` filter — favorites of archived/rejected listings hide. (Cache eviction nuance in §4.) | `src/screens/FavoritesScreen.tsx` |
| `RenterListingsScreen` | MODIFIED | Same `filterByStatus(['live'])` filter. | `src/screens/RenterListingsScreen.tsx` |
| `OwnerListingsScreen` | MODIFIED — heavier | Adds 4-tab segmented control over status (Live / Pending / Rejected / Archived). Rejection-reason banner on rejected cards. Owner-archive action via `PropertyCard.onArchive` callback. | `src/screens/OwnerListingsScreen.tsx` |
| `PropertyCard` | MODIFIED | New `onArchive` callback prop (optional). New `statusBadge` overlay (small chip top-right) for non-`live` statuses on owner-listing context. New `rejectionBanner` slot for rejected cards. | `src/components/PropertyCard.tsx` |
| `CreateListingScreen` | MODIFIED — additive | Reuses M1 Phase 4 sub-components verbatim. Accepts new optional `moderatorContext: { editingOwnerUid: string; reason?: string }` prop. When set, save calls `editAsModerator(propertyId, payload)` instead of `updateProperty`. | `src/screens/CreateListingScreen.tsx` |
| `App.tsx` | MODIFIED — boolean expansion | Adds 3 boolean flags (`isModerationQueueOpen`, `isRoleManagementOpen`, `isPromoteUserOpen` if separate screen) + extends `OVERLAY_FLAGS` array (M1 Phase 1 derived-overlay pattern) so `hideMainStackUnderOverlay` keeps working. Adds matching back-handler branches. | `App.tsx` |
| `Action` union in `useRole.ts` | MODIFIED | Activate the M2-forward-compat actions already declared (`approveListings`, `editAnyListing`, `promoteToModerator`). Add `archiveOwnListing`, `archiveAnyListing`, `submitForReview`, `viewModerationQueue`. | `src/hooks/useRole.ts` |
| `Property` type | MODIFIED | Add `status: 'pending' \| 'live' \| 'rejected' \| 'archived'` (default `'live'` server-side for backward compat). Add `rejectionReason?: string`, `rejectedAt?: string`, `rejectedBy?: string`, `moderatedAt?: string`, `archivedAt?: string`, `archivedBy?: string`. | `src/types/Property.ts` |

---

## §1 — Role-Resolution Data Flow

**Recommendation: Option (b), with `idToken` Bearer auth + soft revalidation.**

Specifically:
- **Cold start:** `AuthService.getBackendUser(uid)` already runs as part of `loadStorageData()` in `AuthContext`. The Railway response shape (post-M2 backend work) includes `userType: 'admin' \| 'moderator' \| 'user'`. **No new fetch.** `useRole()` reads `user.backendProfile.userType` (Branch 2 in `useRole.ts:56`), which already activates the moderator role end-to-end with zero call-site change.
- **Login:** `AuthContext.login()` already calls `getBackendUser` after `signInWithPassword`. Same — no new fetch.
- **Manual refresh:** Add `refreshRole()` to `AuthContext` value. Implementation = `getBackendUser(uid)` + `setUser(prev => ({ ...prev, backendProfile: fresh }))`. Surfaced via Profile screen "Refresh permissions" debug item AND used internally on 401/403 retry.
- **Reactive revalidation on 401/403:** Add an axios response interceptor (one-time install in `App.tsx` startup) that, on 403 with body `{ code: 'E_PERMISSION_DENIED' }`, calls `refreshRole()` and retries the request once. If still 403, surface the existing `PermissionDeniedError` UI path (M1 Plan 03-04 — `t('errors.permissionDenied')`).

**Why not Option (a) (every cold start fetch):** That IS the path — `getBackendUser` already runs at cold start. (a) and (b) collapse to the same code path. The added value of (b) is the **manual** `refreshRole()` callable, which addresses the admin-just-promoted-me-but-app-was-already-open case.

**Why not Option (c) (every protected action):** Chatty (every approve/reject is a roundtrip, not just the action's roundtrip), and the existing user object is already passed into `canFromUser(user, action)` at service-layer guards. The interceptor-on-403 retry achieves the same safety with O(failures) extra calls instead of O(actions).

### Cache invalidation when admin promotes a user

**The "user just got promoted but their open app shows the old role" problem is real but bounded.** Three layers of mitigation, ranked cheapest-first:

1. **Stale-but-soon-fresh (cheapest, recommended for M2):** The promoted user's next cold start, login, or any 403 (because they tap a moderator action and Railway rejects it) refreshes the role. Worst case: user has app open for hours after promotion → action fails → 403 interceptor → role refreshes → retry succeeds. User sees a half-second hiccup, no visible failure. **No infrastructure addition.**

2. **Soft polling (medium effort, defer):** Add a 5-minute polling refresh to `AuthContext` when foregrounded. Couples to existing chat-unread polling pattern (`App.tsx:146-162`). Don't ship in M2 unless layer 1 proves insufficient.

3. **Server push via socket (most effort, defer):** Existing Socket.IO connection (`ChatService.connectSocket`) could carry a `role_changed` event. Backend would push it from the role-management endpoint. Defer to a hardening milestone — adds backend coupling without payoff over layer 1 for the actual UX.

**No force-refresh signal needed in M2.** The 403-retry interceptor IS the force-refresh signal — implicit, demand-driven, free.

### Where role is read at runtime

```
Cold-start / login
  → AuthService.getBackendUser(uid) [HTTP: GET /auth/users/:uid → Authorization: Bearer <idToken>]
  → backend resolves userType from MongoDB (authoritative)
  → response includes userType + customClaims.role (one or both — see §9 Q1)
  → AuthContext.setUser({ ...firebaseUser, backendProfile: response })
  → useRole() derives role from backendProfile (deriveRole() Branch 1 or 2)
  → can(action) returns boolean to call sites

Mod action (approve/reject/promote)
  → service method calls canFromUser(user, action) BEFORE HTTP
  → if false: throw PermissionDeniedError (M1 pattern, unchanged)
  → if true: HTTP call with Authorization: Bearer <idToken>
  → on 403: axios interceptor calls AuthContext.refreshRole() then retries once
  → on 200: success
  → on second 403: rethrow as PermissionDeniedError
```

### Auth-header migration (the GATE-05 path-B closer)

This is the M2 work that closes M1's accepted-risk row in PROJECT.md (D-22 Path B). M2 ships:
- All services switch from `x-firebase-uid: <localId>` header to `Authorization: Bearer <idToken>`. Five service files (`AuthService.ts`, `PropertyService.ts`, `FavoritesService.ts`, `ChatService.ts`, `AppointmentService.ts`) — modify their shared `getHeaders()` (currently duplicated; CONCERNS.md Tech Debt "Duplicated service boilerplate" is the refactor moment).
- `AuthService.getToken()` already exists (`AsyncStorage` key `userToken`). Use it.
- Token refresh: Firebase ID tokens expire after 1 hour. Without firebase-admin SDK on backend OR the firebase JS SDK on client we have no automatic refresh. **This is the open coordination question §9 Q5.** Two viable paths:
  - **Path A (preferred):** Backend verifies via JWKS. Client sends current `idToken`. On 401 token-expired, client calls `signInWithPassword` again (we have stored credentials? — no, we do not store password). Reality: client must re-prompt login on token expiry. Acceptable UX-wise if expiry is 1 hour and the app is a daily-use tool.
  - **Path B:** Implement REST refresh-token flow against Firebase Identity Toolkit `securetoken.googleapis.com/v1/token` with the stored `refreshToken` (which `AuthService.signIn` already returns at `tokens.refreshToken`). Client stores `refreshToken` in AsyncStorage; interceptor on 401 refreshes the `idToken` and retries. **No Firebase SDK needed.**

**Path B is the right call** — Firebase REST refresh exists, we already have the `refreshToken`, and it preserves the no-SDK constraint. Roadmap should treat this as a sub-task of the role-resolution phase, not as a separate phase, because every other phase depends on it.

---

## §2 — Where Role Lives in the Context Tree

**Recommendation: extend `AuthContext` (additive). DO NOT stand up a `RolesContext`.**

### Tradeoff comparison

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Extend `AuthContext`** with `{ refreshRole, isLoadingRole }` | Zero new Provider re-renders. `useRole()` already pulls from `useAuth()`. Refresh is conceptually an auth-session refresh. Maps 1:1 to backend's "userType is on the user record" reality. | Slight grow of `AuthContextType`. | **Recommended.** |
| New `RolesContext` between Auth and app | Separation of concerns ("auth ≠ permissions"). | Adds a 5th nested provider. Re-renders fan out from another root. Reads must traverse two contexts (`useAuth` for user, `useRoles` for role) — easy to drift. Forces `useRole()` to choose: read from Auth (current shape) or RolesContext (new shape) — breaks M1's "no call-site changes" forward-compat promise. | Rejected. |
| Replace `AuthContext.user.backendProfile` with a separate role state | Cleanest separation. | Massive call-site churn (every screen reading `userType` would change). Breaks M1 forward-compat. | Rejected. |

### `AuthContextType` extension (additive)

```typescript
// src/context/AuthContext.tsx — extension only
interface AuthContextType {
  user: AuthUser | null;          // existing — backendProfile now carries authoritative userType
  loading: boolean;                // existing — initial cold-start hydration
  isLoadingRole: boolean;          // NEW — true while refreshRole() is in flight
  login: (...) => Promise<void>;   // existing — internally calls getBackendUser
  signup: (...) => Promise<void>;  // existing
  logout: () => Promise<void>;     // existing
  deleteAccount: () => Promise<void>; // existing
  refreshRole: () => Promise<void>;   // NEW — pulls fresh backendProfile, updates `user`
}
```

`refreshRole()` body is ~10 lines: guarded against concurrent calls via a ref, calls `getBackendUser`, replaces `user.backendProfile`. `isLoadingRole` lets a future "Refreshing permissions…" affordance light up if needed.

### What `useRole()` does NOT change

- Public hook signature: `{ role, isAdmin, isModerator, isAuthenticated, can }` — unchanged.
- `Action` union: extended, not refactored. M1's actions still work; new actions added.
- `<Gated action="…">` — call sites unchanged.
- `canFromUser(user, action)` — unchanged signature; service-layer guards continue to import this and call it pre-HTTP.

This is the M1 → M2 forward-compat promise being cashed in. M2 deletes `src/constants/adminAllowlist.ts` and removes Branch 3 from `deriveRole()` (already TODO-tagged). That's the only `useRole.ts` change beyond extending the `Action` union.

---

## §3 — Moderation Queue Screen Mount Point

**Recommendation: Overlay screen launched from Profile screen, NOT a tab.** Reuse the `RenterListingsScreen` mount pattern (overlay at `zIndex: 3`, opened via Profile's existing entry-point list, dismissed via `onBack`). Add to `OVERLAY_FLAGS` array per M1 Phase 1 derived-overlay pattern.

### Why not a 6th BottomNavigator tab

- `BottomNavigator` is fixed-width 5 tabs (`TabId = 'home' | 'favorites' | 'add' | 'chat' | 'profile'`). Adding a 6th means width recompute on every render of every user. Also forces a conditional tab presence (admins/mods see 6, regular users see 5) — visual inconsistency, plus the 5-vs-6 layout is a flaky touch-target zone.
- Most users will never be moderators. A persistently visible tab is wasted real estate.
- Profile screen already lists multiple admin/owner-only entries (My Listings, Account Settings, etc.) and is the established "admin entry-point shelf" in this app.

### Why not always-mounted with internal empty state

- "Always mounted" implies it's a tab — see above.
- Keep-alive pattern (`display: none`) for screens only mods can see is wasted memory + wasted initial fetch on app boot for non-mods. Empty-state-by-default would still issue the queue fetch at mount.

### Why overlay over modal

- Modal pattern in this app (`AuthPromptModal`, `DeleteListingModal`) is for short, stateful confirmations. The queue is a full screen with sub-actions (open detail, edit-on-behalf opens nested CreateListingScreen, reject opens `RejectListingModal`).
- Overlay-at-`zIndex: 3` is the canonical pattern for full screens (`PropertyDetailsScreen` zIndex 2, `RenterListingsScreen` zIndex 3, `CreateListingScreen` zIndex 3). Use it.

### App.tsx integration sketch

```typescript
// App.tsx — additive state
const [isModerationQueueOpen, setIsModerationQueueOpen] = useState(false);
const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
const [isPromoteUserOpen, setIsPromoteUserOpen] = useState(false); // optional — see below

// Extend OVERLAY_FLAGS array (M1 Phase 1 Key Decisions row 145 — derived overlay pattern)
const OVERLAY_FLAGS = [
  selectedProperty != null,
  isRenterListingsOpen,
  isCreateListingOpen,
  isOwnerListingsOpen,
  isFavoritesOpen,
  isProfileOpen,
  isAccountSettingsOpen,
  isAppointmentsOpen,
  isTour3DOpen,
  // ... all M1 overlays ...
  isModerationQueueOpen,    // NEW
  isRoleManagementOpen,     // NEW
  isPromoteUserOpen,        // NEW (if separate screen)
];
const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);

// Back-handler: extend the existing priority chain with mod/admin overlays
// In the BackHandler effect:
if (isPromoteUserOpen) { setIsPromoteUserOpen(false); return true; }
if (isRoleManagementOpen) { setIsRoleManagementOpen(false); return true; }
if (isModerationQueueOpen) { setIsModerationQueueOpen(false); return true; }
// ... existing branches ...

// Conditional render at the Profile entry point
<ProfileScreen
  // ... existing props ...
  onOpenModerationQueue={() => setIsModerationQueueOpen(true)}   // hidden via <Gated action="viewModerationQueue"> in ProfileScreen
  onOpenRoleManagement={() => setIsRoleManagementOpen(true)}     // hidden via <Gated action="promoteToModerator">
/>

// Overlay mount points (additive, position: absolute, zIndex per overlay-pattern)
<View style={[fullScreenOverlayWrap, { pointerEvents: isModerationQueueOpen ? 'auto' : 'none' }]}>
  {isModerationQueueOpen && (
    <ModerationQueueScreen
      onBack={() => setIsModerationQueueOpen(false)}
      onSelectProperty={setSelectedProperty}
      onEditAsModerator={(p) => {
        setEditingProperty(p);
        setModeratorContext({ editingOwnerUid: p.ownerUid });
        setIsCreateListingOpen(true);
      }}
    />
  )}
</View>
```

### Profile screen entry-point gating

```typescript
// In ProfileScreen.tsx — existing Profile menu list
<Gated action="viewModerationQueue">
  <ProfileMenuItem
    icon={Shield}
    label={t('moderation.queue.entry')}
    onPress={onOpenModerationQueue}
    badge={pendingCount}  // optional — see push-vs-badge in §5
  />
</Gated>

<Gated action="promoteToModerator">
  <ProfileMenuItem
    icon={Users}
    label={t('admin.roleManagement.entry')}
    onPress={onOpenRoleManagement}
  />
</Gated>
```

### Promote-User: separate screen or modal-on-RoleManagement?

**Pick one based on UX scope:**
- If admin lifecycle (search → pick → assign role → see audit) is light (e.g., a list of users with inline role pickers): keep all in `RoleManagementScreen`. **Recommended for M2 v1.** No `PromoteUserScreen`, no `isPromoteUserOpen` flag — drops one App.tsx boolean.
- If it grows (search across thousands of users, audit log, bulk operations): split out `PromoteUserScreen`. Defer to M3 if scope creeps.

**The single-screen path keeps the App.tsx boolean count the same as M1 Phase 1 left it (less +1, not +2 or +3).** Roadmap should plan for this.

### `<Gated>` interaction with OVERLAY_FLAGS

`<Gated action="viewModerationQueue">` in Profile means non-mods cannot launch the overlay. But if a mod's role is revoked while the queue is open, the queue must NOT be navigable into orphan state. Solution: `ModerationQueueScreen` itself checks `useRole().can('viewModerationQueue')` on every render and `onBack()`s itself if false. Cheap defense in depth. (Pattern matches M1 Plan 03-08 D-08 hide-entirely belt-and-suspenders.)

---

## §4 — Listing Data Flow with `status` Field

**Recommendation: filter at the screen layer via a single `propertyStatus.ts` helper. DO NOT push the filter into `PropertyService` as a default.** Backend defaults `status: 'live'` for newly-fetched lists where mods aren't involved (see §9 Q3 for the parameter contract).

### Why screen-layer filter, not service-layer filter

- `PropertyService.getAllProperties()` is shared by `HomeScreen` (wants live), `OwnerListingsScreen` (wants the user's pending+live+rejected+archived), and `ModerationQueueScreen` (wants pending). Pushing one default filter into the service breaks the other two consumers.
- The current service layer is a thin axios wrapper (CONCERNS.md "Duplicated service boilerplate"). It's the wrong place for domain-policy filtering.
- A single helper `filterByStatus(properties, statuses)` consumed by 4 list screens is greppable and testable.

### Helper shape

```typescript
// src/utils/propertyStatus.ts — NEW
import { Property } from '../types/Property';

export type PropertyStatus = 'pending' | 'live' | 'rejected' | 'archived';
export const ALL_STATUSES: PropertyStatus[] = ['pending', 'live', 'rejected', 'archived'];

/** Default filter for renter-facing screens: only `live`. Treats missing status as `live` for backward compat. */
export const filterLive = (props: Property[]): Property[] =>
  props.filter(p => (p.status ?? 'live') === 'live');

export const filterByStatus = (props: Property[], statuses: PropertyStatus[]): Property[] =>
  props.filter(p => statuses.includes((p.status ?? 'live') as PropertyStatus));

/** OwnerListings tab grouping. */
export const groupOwnerListingsByStatus = (props: Property[]): Record<PropertyStatus, Property[]> => {
  const out: Record<PropertyStatus, Property[]> = { pending: [], live: [], rejected: [], archived: [] };
  for (const p of props) {
    const status = (p.status ?? 'live') as PropertyStatus;
    out[status].push(p);
  }
  return out;
};
```

### Screen-by-screen migration

| Screen | New filter | Other change | Effort |
|--------|-----------|--------------|--------|
| `HomeScreen` | `filterLive(properties)` at the existing filtered-properties `useMemo` | None | 2 lines |
| `FavoritesScreen` | `filterLive(properties)` after favorites-fetch | Cache-eviction nuance: when an owner archives or backend rejects a listing the user favorited, that card disappears from Favorites. **Acceptable** — they can rediscover via Search if/when it comes back live. Document this in REJECTION-OWNER-MESSAGING. | 2 lines |
| `RenterListingsScreen` | `filterLive(properties)` | None | 2 lines |
| `OwnerListingsScreen` | `groupOwnerListingsByStatus(properties)` + segmented-control state `[selectedTab: PropertyStatus]` | New segmented control component (or 4 horizontal pill chips). Empty-state per tab. Rejection banner on rejected tab cards. | 1 day |
| `ModerationQueueScreen` (NEW) | `filterByStatus(['pending'])` from `getModerationQueue()` endpoint OR client-side filter from `getAllProperties` if the queue endpoint isn't ready (§9 Q4) | — | New screen; 1-2 days |

### Backward-compat default

Backend should default `status: 'live'` for all existing-but-unmoderated listings AND for any listing where the field is missing (this is the §9 Q2 confirmation). On the client, `(p.status ?? 'live')` belt-and-suspenders against a missing field. PROJECT.md confirms "no production listings exist (clean slate)" so the only existing data are mock — but the migration policy needs to be explicit anyway because Railway holds dev-environment listings.

### What about filter performance?

PropertyService loads the entire catalog client-side (CONCERNS.md "getAllProperties loads entire list up front"). Status filtering is O(N) on top of an already-O(N) load. Negligible at 100s of listings. Server-side filtering is a CONCERNS.md scaling concern — defer to a dedicated milestone. M2 should not bake server-side `?status=` into the contract beyond what's needed for the moderation queue.

### Race: owner just submitted; status changes from pending → live

When a moderator approves while the owner has OwnerListings open:
- Owner's pending tab still shows the listing until OwnerListings refreshes.
- Pull-to-refresh OR the role-refresh interceptor (which doesn't fire here because there was no 403) will not pick this up automatically.
- **Acceptable** — same staleness profile as M1's "another user just deleted a listing" edge case. Document in PITFALLS.

---

## §5 — Owner-Side Rejection Messaging

**Recommendation: in-screen banner + tab badge + toast on first-open. No push, no inbox.**

Lowest-effort path that doesn't require new infrastructure:
1. **Owner opens app or returns to OwnerListings:** the screen fetches the user's listings (existing flow). Rejected listings carry `rejectionReason` + `rejectedAt` in the response (added in §9 Q2 schema).
2. **Tab badge on Profile menu's "My Listings" entry:** `pendingCount + rejectedCount` shown when > 0. Reuses existing chat-unread-badge pattern from `BottomNavigator`. **Visible whenever Profile menu is open.**
3. **OwnerListings tab badge on the "Rejected" tab:** count of rejected listings.
4. **Per-card rejection banner:** in the Rejected tab, each card carries an inline yellow/red banner "Rejected: \<reason\>. Edit and resubmit." with an "Edit" button that opens `CreateListingScreen` in normal owner mode (NOT moderator mode), where save = `submitForReview` → status flips back to pending.
5. **First-open toast (optional, M2 stretch):** on app foreground, if any listing transitioned `pending → rejected` since last check (`lastSeenRejectionAt` in AsyncStorage), show a one-shot toast "1 listing was rejected". Uses existing `Alert.alert` pattern. Defer if scope tight.

### Why not push notifications

- App has zero push-notification infrastructure (CONCERNS.md "No push notifications" — Medium-severity gap).
- Adding push = APNS cert + FCM project + `@react-native-firebase/messaging` (FORBIDDEN — no Firebase SDK rule) OR `expo-notifications` (not Expo) OR `react-native-push-notification` (third-party, ages-old, mixed New-Arch support).
- Push notifications belong in a dedicated milestone alongside chat re-engagement, appointment reminders, and other lifecycle re-engagement. Putting them in M2 inflates scope by weeks.

### Why not an in-app inbox

- We have `ChatScreen` but no message-FROM-SYSTEM concept. Building one means: backend system-user, system-message rendering branch, unread tracking for system messages, etc.
- The OwnerListings rejected tab IS the inbox for rejection messages. It's contextual (the message lives next to the listing it's about), persistent (it stays until the listing is fixed and resubmitted), and zero-infra.

### Localization

```typescript
// src/locales/en.json — additions
{
  "moderation.rejection.banner.title": "Listing rejected",
  "moderation.rejection.banner.body": "Reason: {reason}",
  "moderation.rejection.banner.cta": "Edit and resubmit",
  "moderation.queue.entry": "Moderation queue",
  "moderation.queue.empty": "Nothing to review.",
  "moderation.action.approve": "Approve",
  "moderation.action.reject": "Reject",
  "moderation.action.flag": "Flag",
  "moderation.action.editOnBehalf": "Edit listing"
}
// Mirror in ru.json. Conventions require parity.
```

### Edge case: owner archives a rejected listing

If a rejected listing is archived (by owner or admin), the rejection banner suppresses (it lives on the rejected-tab card; archived listings are on the archived tab). Resubmit-from-archive flow: archived → owner unarchives → status back to `pending` (or to its prior status? — see §9 Q7).

---

## §6 — Edit-on-Behalf-of-Owner

**Recommendation: reuse `CreateListingScreen` with a `moderatorContext` prop.** Do NOT build an inline editor in the Moderation Queue.

### Why reuse vs. inline

- M1 Phase 4 decomposed `CreateListingScreen` from 1404 → 871 LOC into `CreateListingForm/` sub-components: `BasicInfoSection`, `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `MediaSection`, `VerificationSection`, `PriceSection`. **All seven are reusable.** Building an inline editor duplicates this work and creates a second-class form (likely to drift, missing newer fields).
- Form validation is in M1 Phase 5's `validateByCategory()` — already category-aware. A moderator editing a Hostel must validate against hospitality rules, not residential. Reuse gets this for free.
- M1's `useRole()` Action `editAnyListing` is already wired. A `<Gated action="editAnyListing">` around the moderator-context CTAs in CreateListingScreen suffices.

### `moderatorContext` shape

```typescript
// src/screens/CreateListingScreen.tsx — props extension
interface CreateListingScreenProps {
  // ... existing props ...
  editingProperty?: Property | null;  // existing — used for owner-edits-own-listing
  moderatorContext?: {
    editingOwnerUid: string;          // the listing's owner — preserves on save (must NOT be mutated to mod's uid)
    reason?: string;                  // optional: why mod is editing (audit trail)
  };
}
```

### Save dispatch in `handleSubmit`

```typescript
// In CreateListingScreen.tsx handleSubmit
if (moderatorContext) {
  await PropertyService.editAsModerator(
    editingProperty.id,
    payload,
    moderatorContext.editingOwnerUid,
    moderatorContext.reason,
  );
} else if (editingProperty) {
  await PropertyService.updateProperty(editingProperty.id, payload);
} else {
  await PropertyService.createProperty(payload, /* submit for review = true */);
}
```

`PropertyService.editAsModerator` calls a new endpoint (§9 Q6) that explicitly does NOT change `ownerUid` and writes a moderator-audit row server-side.

### UI affordance

Banner at top of `CreateListingScreen` when `moderatorContext != null`:

> **Editing on behalf of \<owner display name\>.** Changes will not transfer ownership. _Reason: \<reason\>_

Renders `null` for normal owner edits.

### Why not inline editor

- Code duplication: form validation, image upload, category branching, i18n, all duplicated.
- Maintenance: future field additions to listings would have to land in two places.
- UX: moderators editing on behalf of owners benefit from seeing the same form the owner sees — they can spot-check what the owner _should_ have submitted.

### Save flow → status transition

When a moderator edits-on-behalf and saves: status stays `pending` (it was pending — they were reviewing it) UNLESS the moderator explicitly approves via the queue's Approve action after saving. Save → updates fields → returns to queue → mod taps Approve → status flips to `live`. Two-step (edit, then approve) keeps actions atomic and auditable.

### App.tsx wiring

```typescript
// App.tsx — additive state
const [moderatorContext, setModeratorContext] = useState<{ editingOwnerUid: string; reason?: string } | null>(null);

// When ModerationQueueScreen calls onEditAsModerator(property):
const onEditAsModerator = (property: Property) => {
  setEditingProperty(property);
  setModeratorContext({ editingOwnerUid: property.ownerUid });
  setIsCreateListingOpen(true);
  setIsModerationQueueOpen(false); // pop the queue under the editor (overlay stack)
};

// On CreateListingScreen close:
const onCreateListingClose = () => {
  setIsCreateListingOpen(false);
  setEditingProperty(null);
  if (moderatorContext) {
    setModeratorContext(null);
    setIsModerationQueueOpen(true); // restore queue
  }
};
```

This reuses the OVERLAY_FLAGS pattern correctly — only one overlay at a time per the M1 Phase 1 Key Decisions row 145.

---

## §7 — Owner-Side Archive

**Recommendation: archive replaces hard-delete for owners. Hard-delete remains admin-only. PropertyCard menu surfaces "Archive listing" (owner) or "Delete listing" (admin). Mods can archive; only admins can hard-delete.**

### Tradeoff comparison

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Archive replaces delete (owners)** | Reversible, preserves data for audit, mirrors industry norm (Airbnb, Zillow, etc.) | Owners lose ability to truly remove their data — may run afoul of GDPR-style data deletion requests | **Recommended** with a caveat: account-deletion flow already exists (`AuthService.deleteAccount`); deleting account triggers archive→hard-delete cascade server-side |
| B. Archive coexists with delete (owners can do both) | Owner choice | Confusing UI ("which one do I want?"); gives owners a footgun (accidental hard-delete) | Rejected for default UX; but admin-only hard-delete is fine |
| C. Archive only via mod/admin; owners can only delete | Simplest | Robs owners of the legitimate "I'll relist this in 6 months" use case | Rejected |

### Where the action surfaces

| Surface | Owner action | Mod/admin action |
|---------|--------------|------------------|
| `PropertyCard` menu (3-dot kebab) on `OwnerListingsScreen` | "Archive listing" | (Mods/admins don't see their own owner-listings as moderators — they see them as owners. Mod actions are in the queue.) |
| `PropertyCard` menu on `ModerationQueueScreen` | n/a | "Archive (force)" — admin-only via `<Gated action="archiveAnyListing">` |
| `PropertyDetailsScreen` | "Archive this listing" CTA in owner-context footer (when `viewer.uid === property.ownerUid`) | "Archive (admin)" — admin-only |
| `OwnerListingsScreen` Archived tab | "Restore" → status flips back to `pending` (re-enters moderation) — owner action | "Restore" — admin can also do this |

### Archive vs. delete UX delineation

```typescript
// PropertyCard.tsx — menu items
const menuItems = [];
if (isOwner) {
  menuItems.push({ label: t('listing.action.archive'), onPress: onArchive });
}
if (can('hardDeleteListing')) {  // admin-only via useRole
  menuItems.push({ label: t('listing.action.delete'), onPress: onDelete, destructive: true });
}
```

### `ArchiveListingModal` (NEW)

Mirrors `DeleteListingModal` (M1 component pattern) — confirms the action with a 2-line explanation: "Archived listings are hidden from search but visible in your archive. You can restore them anytime."

`DeleteListingModal` stays for admin hard-delete (existing component, scoped to `hardDeleteListing` action).

### `useRole.ts` Action additions

```typescript
// Extend Action union
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'         // M1 forward-compat — activate in M2
  | 'approveListings'        // M1 forward-compat — activate in M2
  | 'promoteToModerator'     // M1 forward-compat — activate in M2
  | 'submitForReview'        // M2 NEW — every authenticated user
  | 'archiveOwnListing'      // M2 NEW — owner of the listing only (resource-scoped check)
  | 'archiveAnyListing'      // M2 NEW — moderator + admin
  | 'hardDeleteListing'      // M2 NEW — admin only
  | 'rejectListing'          // M2 NEW — moderator + admin
  | 'flagListing'            // M2 NEW — moderator + admin
  | 'viewModerationQueue';   // M2 NEW — moderator + admin
```

`archiveOwnListing` is **resource-scoped** — `canFromUser(user, 'archiveOwnListing', property)` needs a `property` argument. Two ways:
- Add resource arg to `canFromUser` (adds optional `resource?: { ownerUid: string }`). Existing call sites (M1 Plan 03-04 service guard + UI Gated) don't pass resource — they continue to work for resource-agnostic actions.
- Or: handle owner-of-listing checks inline at PropertyCard render: `if (isOwner) showArchive`. **Recommended** — keeps `canFromUser` clean; M1 contract preserved.

### Status transition table

| From | To | Trigger | Allowed by |
|------|-----|---------|-----------|
| `pending` | `live` | Mod approves | mod, admin |
| `pending` | `rejected` | Mod rejects | mod, admin |
| `pending` | `archived` | Owner archives (or admin force-archives) | owner, mod, admin |
| `live` | `archived` | Owner archives (or admin force-archives) | owner, mod, admin |
| `rejected` | `pending` | Owner edits + resubmits | owner |
| `rejected` | `archived` | Owner gives up + archives | owner, mod, admin |
| `archived` | `pending` | Owner restores → re-enters moderation | owner, admin |
| `archived` | (deleted) | Admin hard-delete | admin |

§9 Q7 must confirm "restore from archived → goes to pending" vs "→ goes to its prior status". The UX-correct answer is `pending` because we don't trust the archive's age (could be a year old; prior approval could be stale).

---

## §8 — Suggested Phase Order

Build order is load-bearing — same lesson as M1 (Nav → Keyboard → Roles → Form → Hospitality → Alignment → Release). M2 has its own dependency graph.

**Critical insight: backend must lead.** Every UI phase below depends on backend endpoint shape. Phase 0 (a Wave-0 sub-phase, not a numbered phase) is "Railway team confirms §9 questions". If Railway is slow, phases 1-2 can prep with assumptions documented but cannot land code that calls non-existent endpoints. Lesson from M1 GATE-05 D-22 Path B: do NOT proceed past phase 1 without confirmation, because every later phase compounds the risk.

### Phase 1 — Backend role-resolution + axios auth migration (FOUNDATION)
**Scope:**
- Switch all 5 services from `x-firebase-uid` header to `Authorization: Bearer <idToken>`. Consolidate `getHeaders()` into a shared `apiClient.ts` (CONCERNS.md "Duplicated service boilerplate" — this is the moment).
- Implement Firebase REST refresh-token flow in `AuthService` (`securetoken.googleapis.com/v1/token`). Store `refreshToken` in AsyncStorage.
- Add axios response interceptor: 401 → refresh idToken + retry; 403 + `E_PERMISSION_DENIED` → `refreshRole()` + retry once.
- Extend `AuthContext` with `refreshRole()` + `isLoadingRole`.
- Backend (Railway team) verifies idToken via JWKS (no firebase-admin SDK). Confirms `userType` is the role authority.
- Closes M1 GATE-05 D-22 Path B accepted-risk row.
- Delete `src/constants/adminAllowlist.ts` and remove Branch 3 from `useRole.ts:65` per the existing TODO.

**Why first:** Every M2 phase needs working server-resolved roles. If this lands wrong, every other phase needs rework. Also the smallest reversible change set — pure infrastructure migration; no UI.

**Dependencies:** §9 Q1 + Q5 confirmed.

### Phase 2 — Listing lifecycle status field (CLIENT-SIDE ABSORPTION)
**Scope:**
- Extend `Property` type with `status` + rejection/moderation timestamps.
- Add `propertyStatus.ts` helper.
- Modify `HomeScreen`, `FavoritesScreen`, `RenterListingsScreen` to filter to `live` (3 × 2-line edits).
- Modify `OwnerListingsScreen` with 4-tab segmented control + per-tab empty states + rejection banner component.
- Modify `PropertyCard` for status badge + rejection banner slot.
- Backend (Railway team) ensures `status` field on all property responses with `'live'` default for backward compat. Confirms moderation transitions endpoints (§9 Q3 + Q4).

**Why second:** Pure client-side rendering migration. Doesn't need the moderation queue UI yet. Owner-side rejection messaging reads naturally once OwnerListings supports the tab grouping. Sets the stage for phase 3 to consume the same data.

**Dependencies:** §9 Q2 + Q3 confirmed; Phase 1 shipped (so role-aware endpoints work).

### Phase 3 — Moderation Queue + actions (NEW UI MASS)
**Scope:**
- New `ModerationQueueScreen` — overlay-pattern, `pendingCount` badge wiring, list of pending listings.
- `RejectListingModal` (reason picker + free-text).
- `PropertyService` additions: `getModerationQueue`, `approveListing`, `rejectListing`, `flagListing`. All with `canFromUser` guards mirroring M1 Plan 03-04 pattern.
- `BottomNavigator`/Profile entry-point for moderation queue, gated by `<Gated action="viewModerationQueue">`.
- App.tsx OVERLAY_FLAGS extension + back-handler branch + state.
- Edit-on-behalf wiring: `moderatorContext` prop on CreateListingScreen + queue-pop + queue-restore on close.
- `Action` union extended with M2 actions (`approveListings`, `rejectListing`, `flagListing`, `viewModerationQueue`, `editAnyListing`).

**Why third:** Largest UI net-add. Depends on Phase 2's status field landing.

**Dependencies:** §9 Q3 + Q4 + Q6 confirmed; Phase 2 shipped.

### Phase 4 — Archive lifecycle (OWNER + ADMIN)
**Scope:**
- New `ArchiveListingModal` — confirm with reversibility note.
- `PropertyService.archiveListing`, `unarchiveListing`. Owner self-archive vs. admin force-archive variants.
- `PropertyCard` menu adds Archive (owner-context) + Restore (archived-tab-context).
- `PropertyDetailsScreen` adds Archive CTA in owner-footer.
- Hard-delete `Action: 'hardDeleteListing'` — gated to admin only. `DeleteListingModal` stays but is admin-only entry now.
- `useRole.ts` adds `archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing`.
- OwnerListingsScreen Archived tab + Restore action.

**Why fourth:** Builds on phase 2's status field + phase 3's moderation actions endpoint patterns. Fully optional from a "does the moderation flow work" standpoint — owners could ship without archive (they have hard-delete today) — but PROJECT.md explicitly scopes it into M2.

**Dependencies:** §9 Q7 + Q8 confirmed; Phases 2 + 3 shipped.

### Phase 5 — Role management (ADMIN UIs)
**Scope:**
- New `RoleManagementScreen` — list/search users, change `userType`, view current role.
- `UserService` (new file): `searchUsers`, `setUserRole`, `getRoleAuditLog`.
- Profile entry-point gated by `<Gated action="promoteToModerator">`.
- `Action: 'promoteToModerator'` activated.
- App.tsx flag + OVERLAY_FLAGS extension.
- (Stretch) `getRoleAuditLog` viewer — defer to M3 if scope creeps.

**Why fifth:** Useful but not blocking. Roles can be assigned via direct DB writes by Railway team for the first wave of moderators (analogous to M1's hardcoded allowlist mechanism — 1-2 moderators, hand-promoted server-side). Scaling moderation requires this UI eventually. Lowest risk because it doesn't gate any other phase.

**Dependencies:** §9 Q9 + Q10 confirmed; Phase 1 shipped.

### Phase 6 — Hardening + manual QA + release
**Scope:**
- 401/403 interceptor stress-tests.
- Mod-revoked-mid-session UX (queue auto-pops back).
- Owner-edits-rejected → resubmits → mod approves end-to-end on physical iOS + Android.
- Admin promotes a mod → mod's open app picks up new role on next 403.
- Edge cases: archived → restore → re-enters pending; rejected listing edit-on-behalf.
- Release version bumps. **Apply M1 D-02 lesson: query Play Console + TestFlight for highest-accepted versionCode BEFORE setting baseline** (PROJECT.md Key Decisions row added 2026-04-28).

**Why last:** Standard release-prep phase. Mirrors M1 Phase 8.

### Phase order critical-path summary

```
[Wave 0: Railway confirms §9]
        |
[Phase 1: Backend role + axios auth] ←——————————————————┐
        |                                                |
[Phase 2: Status field absorption] ——————————————┐       |
        |                                         |       |
[Phase 3: Moderation Queue + actions] —————┐      |       |
        |                                   |     |       |
[Phase 4: Archive lifecycle] ————————┐      |     |       |
        |                             |     |     |       |
[Phase 5: Role management] ——————┐    |     |     |       |
                                  |   |     |     |       |
                                  ↓   ↓     ↓     ↓       ↓
                          [Phase 6: Hardening + manual QA + release]
```

Phases 4 and 5 can parallel (different surface areas, different services) once Phase 3 ships. Phase 5 can _start_ once Phase 1 ships (it doesn't need the lifecycle work). But since this is a small team, recommend serial execution to keep test surface bounded.

### Skipped from the M1 build order

- **Nav reliability** — already shipped in M1 Phase 1. M2 just needs to extend `OVERLAY_FLAGS` for new overlays (10-line edits).
- **Keyboard handling** — already shipped in M1 Phase 2. Reuse for any new screens with inputs (RoleManagement search box, RejectListing textarea).
- **Form taxonomy + validation** — already shipped in M1 Phases 4+5. Edit-on-behalf reuses verbatim.
- **Hospitality rendering** — orthogonal to M2.
- **Alignment pass** — only run if QA surfaces issues (M1 Phase 7 was SKIPPED for the same reason).

---

## §9 — Backend Coordination Dependency

**These questions MUST be confirmed by the Railway team BEFORE the M2 plan can solidify.** Route via the existing `03-BACKEND-COORDINATION.md` channel that GATE-05 D-22 deferred. Same channel; updated questions.

This is the gating dependency. M1 closed Path B with no response; M2 cannot. Phase 1 of M2 is dead-on-arrival without Q1, Q2, Q5. Other phases pile up similarly.

### Q1 — Role authority + customClaims contract

> The M2 client expects `GET /auth/users/:uid` to return a profile shape that includes:
> ```json
> {
>   "userType": "user" | "moderator" | "admin",
>   "customClaims": { "role": "user" | "moderator" | "admin" }
> }
> ```
> Will Railway populate **both fields** (so the M1 `useRole()` Branch 1 + Branch 2 both resolve), or only one? If only one, which?
>
> Context: M1 Phase 3 wired `useRole.ts:50` to read `customClaims.role` first, falling back to `userType`. Either works; we just need to know which is authoritative.
>
> Specifically: when an admin promotes a user via `PUT /users/:uid/role`, which field does Railway write? Both? Just `userType`?

### Q2 — `Property.status` schema + defaults

> What is the exact wire-format shape for the moderation lifecycle? The client expects:
> ```json
> {
>   "status": "pending" | "live" | "rejected" | "archived",
>   "rejectionReason": "string | null",
>   "rejectedAt": "ISO 8601 | null",
>   "rejectedBy": "firebaseUid | null",
>   "moderatedAt": "ISO 8601 | null",
>   "moderatedBy": "firebaseUid | null",
>   "archivedAt": "ISO 8601 | null",
>   "archivedBy": "firebaseUid | null"
> }
> ```
>
> 1. Is this the right shape? Field names?
> 2. For existing dev-environment listings without `status`: does `GET /properties` default `status: 'live'` server-side, or does the client need to default `(p.status ?? 'live')` defensively?
> 3. Are `rejectedBy` / `archivedBy` exposed to the listing owner, or admin-only views? (Privacy concern: owner should see "rejected" but maybe not "by whom".)

### Q3 — `POST /properties` becomes "submit for review"

> M1 today: `POST /properties` creates a listing instantly visible. M2 target: same endpoint creates with `status: 'pending'` and the listing is invisible to non-owners until approved.
>
> 1. Confirm: backend will set `status: 'pending'` on `POST /properties` going forward?
> 2. Will `GET /properties` (no params) return only `status: 'live'` to renter callers and the moderation queue's full set to mod/admin callers? Or does the client need to send `?status=live` explicitly?
> 3. Does `GET /properties/user/:firebaseUid` (owner's listings) return all statuses for that owner, or also default-filter? (Owner needs all statuses to populate the 4-tab segmented control.)

### Q4 — Moderation Queue endpoint

> Two options for the moderation queue:
> - **Option A:** `GET /properties?status=pending` — reuses existing endpoint with a filter.
> - **Option B:** `GET /moderation/queue` — dedicated endpoint, can carry pagination + sort + flag-state metadata.
>
> Preference? Either works client-side. Option B is cleaner if the queue grows beyond simple filtering (priority sort, "flagged-only" sub-views, etc.).
>
> If A: confirm `?status=pending` is supported and respects role-gating (only mod/admin can request `?status=pending` and get non-empty results).

### Q5 — idToken refresh + token expiry contract

> M2 ships `Authorization: Bearer <idToken>` in place of the M1 `x-firebase-uid` header. Two questions:
>
> 1. Will Railway verify the idToken via JWKS (Firebase public x509 endpoint) **without** firebase-admin SDK? (Required: NO Firebase SDK in any part of the stack we control on the mobile-app side; backend can use whatever, but we want to know if the constraint is symmetric.)
> 2. ID tokens expire after 1 hour. Client plans to use Firebase Identity Toolkit REST `securetoken.googleapis.com/v1/token` to refresh via stored `refreshToken`. **Confirm Railway accepts a freshly refreshed idToken** without additional handshake. (Standard JWT semantics suggest yes; flagging because we want zero coupling to specific Firebase JWKS rotation timing.)
> 3. Token-expiry error contract: when Railway receives an expired idToken, does it respond `401` (client refreshes + retries) or `403` (semantic mismatch — would require client to distinguish "expired" from "denied")? Recommended: 401 for expiry, 403 for permission-denied.

### Q6 — Edit-on-behalf-of-owner endpoint

> M2 client wants to call something like `PUT /properties/:id` with a moderator-context flag in the request OR a dedicated `PUT /moderation/listings/:id` endpoint that:
> 1. Allows mod/admin to edit any listing's fields.
> 2. Does **NOT** mutate `ownerUid`.
> 3. Writes a server-side audit row recording (moderatorUid, propertyId, timestamp, optional reason, what fields changed).
>
> Preference: dedicated endpoint or shared with header/flag? Either works client-side; clarity favors dedicated.

### Q7 — Archive transitions

> Status transitions client-side wants to call:
> - `POST /properties/:id/archive` — owner archives own; mod/admin archives any.
> - `POST /properties/:id/unarchive` (or `restore`) — owner restores own; admin restores any.
>
> 1. Confirm endpoint shape (or alternative).
> 2. **Critical UX question:** when a listing transitions `archived → unarchived`, does it return to `pending` (must be re-moderated) or to its prior status (`live` or `rejected`)? Recommended: always to `pending` — archived listings are stale-by-default; trust must be re-earned. But this is a product call, not a tech call.
> 3. Hard-delete: `DELETE /properties/:id` is admin-only post-M2, correct? (Owners use archive instead.)

### Q8 — Audit trail visibility

> Each role-change and moderation action ideally logs:
> - Who did it (moderator/admin firebaseUid)
> - What changed (status from→to, role from→to)
> - When
> - Why (optional reason text)
>
> 1. Will Railway expose audit log endpoints for admin viewing? E.g., `GET /admin/audit?type=role_change&uid=:uid` and `GET /admin/audit?type=moderation&propertyId=:id`?
> 2. Or is audit visible only via DB inspection? (M2 stretch: client UI for audit log; ship without if scope tight.)

### Q9 — User search for role management

> `RoleManagementScreen` needs to search/list users to assign roles to. Endpoint shape preference:
> - `GET /admin/users?query=email_or_name&limit=50` — search.
> - `GET /admin/users?role=moderator` — list current mods.
> - `PUT /admin/users/:uid/role` body `{ role: 'admin' | 'moderator' | 'user' }` — change role.
>
> 1. Are admin-only endpoints fine prefixed `/admin/*`? Or should they live under `/users/*` with role-check?
> 2. What's the cap on user count for the foreseeable future? (Affects whether we need infinite scroll + pagination on RoleManagementScreen, or a simple search-and-show-50 is sufficient.)

### Q10 — Rate limits + abuse prevention

> Moderation actions (approve/reject/archive) and role changes are admin-privileged but UI-driven, meaning a stuck-finger or buggy retry can hammer endpoints.
>
> 1. Are there server-side rate limits per uid we should respect (e.g., max 100 approvals/min)? If yes, what's the response shape (`429`?) so client can backoff gracefully?
> 2. Is there server-side dedup for same-action-same-property within N seconds, or does the client need to debounce?

### Q11 — Notification of role change to affected user

> When admin promotes user X from `user` → `moderator`, user X's app may have an open session. We discussed (§1) the 403-retry interceptor as the implicit notification. **Backend should NOT need to push** — confirm Railway has no plans to add socket-pushed `role_changed` events that the client would need to listen for.
>
> If Railway does want to push: we have an existing Socket.IO connection (`ChatService.connectSocket`); piggyback on the same socket would be cheap. Defer to a later milestone if not in M2 scope.

### Q12 — Migration of existing dev-environment listings

> PROJECT.md says "no production listings exist (clean slate)". But Railway dev environment has mock listings. M2 introduces `status` field.
>
> 1. Does Railway plan a one-time migration script setting `status: 'live'` on all existing listings? (Recommended.)
> 2. Or does the backend default missing-status to `'live'` at read-time? (Acceptable as a fallback.)
> 3. The client's `(p.status ?? 'live')` belt-and-suspenders works either way, but Railway should confirm which approach so testing matches.

---

## Patterns to Follow

### Pattern 1: Service-layer guards mirror UI gating

Established in M1 Plan 03-04 — `PropertyService.patchPlatformVerifications` calls `canFromUser(userData, 'editVerifications')` BEFORE the HTTP request. Throws `PermissionDeniedError` if false. The same pattern extends to every new mod/admin service method:

```typescript
// PropertyService.ts — M2 additions
approveListing: async (propertyId: string) => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'approveListings')) {
    throw new PermissionDeniedError();
  }
  return axiosInstance.post(`/properties/${propertyId}/approve`, {});
},
```

This is defense-in-depth, not the primary gate — backend enforcement is. But it catches bugs in the UI gating layer before they hit the wire.

### Pattern 2: OVERLAY_FLAGS is the single source of overlay-stack truth

M1 Phase 1 Key Decisions row 145 — overlay state is **derived** from OVERLAY_FLAGS, not stored. Every new M2 overlay (ModerationQueueScreen, RoleManagementScreen, optional PromoteUserScreen) MUST:
1. Be added to `OVERLAY_FLAGS` array.
2. Have a back-handler branch in priority order (highest-zIndex first).
3. Use the `pointerEvents` belt-and-suspenders pattern from CONVENTIONS.md "Keep-alive and overlay screens".

### Pattern 3: `<Gated action="…">` for declarative UI gating

Already established M1. Every new M2 admin/mod CTA goes inside `<Gated>`:

```tsx
<Gated action="approveListings">
  <Button onPress={onApprove}>{t('moderation.action.approve')}</Button>
</Gated>
```

Greppable: `rg "<Gated action" src/` lists every gated UI in the app. Maintained as an invariant.

### Pattern 4: `(p.status ?? 'live')` defensive default

Until Railway confirms migration approach, every status read normalizes:

```typescript
const status = (property.status ?? 'live') as PropertyStatus;
```

Belt-and-suspenders against missing field. Drop the `?? 'live'` only after §9 Q2 + Q12 confirm server-side default.

### Pattern 5: Owner-of-listing checks inline at PropertyCard (NOT in `canFromUser`)

`canFromUser(user, action)` stays resource-agnostic. Owner-of-listing checks happen at the render site:

```tsx
const isOwner = user?.localId === property.ownerUid;
if (isOwner) {
  // show archive button
}
```

This avoids extending `canFromUser` with optional resource args, which would change the M1 contract that services + UI both depend on.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Stand up a `RolesContext` between Auth and app

**Why bad:** Adds a 5th nested provider. Re-renders fan out. Forces `useRole()` to choose a different read path than M1's `useAuth()`-only path — breaks the "no call-site changes" forward-compat promise. Already covered in §2.
**Instead:** Extend `AuthContext` additively with `refreshRole()` + `isLoadingRole`.

### Anti-Pattern 2: Tab in BottomNavigator for Moderation

**Why bad:** 5-tab → 6-tab layout shift. Visible to non-mods (or conditional, which is worse). Tab presence implies frequency-of-use; moderation is not a frequent task even for moderators.
**Instead:** Profile entry-point → overlay screen. Already covered in §3.

### Anti-Pattern 3: Per-screen status filter implementation

**Why bad:** 4 list screens each implementing `properties.filter(p => p.status === 'live')` means 4 places to break when the contract changes. Cluster failures during refactors.
**Instead:** `propertyStatus.ts` helper. One source of truth. Already covered in §4.

### Anti-Pattern 4: Build an inline editor in the Moderation Queue

**Why bad:** Duplicates 871 LOC of M1's decomposed CreateListingScreen sub-components. Drifts. Loses category-aware validation (`validateByCategory`). Loses image upload UX. Loses i18n.
**Instead:** Reuse `CreateListingScreen` with `moderatorContext` prop. Already covered in §6.

### Anti-Pattern 5: Push notification or in-app inbox for rejection messages

**Why bad:** Push requires APNS/FCM cert + library (Firebase SDK forbidden) + cold-start side effects. Inbox requires a system-message concept the chat layer doesn't have. Both are weeks of work. PROJECT.md scopes M2 to listings; chat moderation is out of scope; therefore notification infrastructure is also out of scope.
**Instead:** Tab badge + per-card banner on OwnerListings. Already covered in §5.

### Anti-Pattern 6: Polling in Phase 1 to refresh role

**Why bad:** Battery drain (CONCERNS.md "Chat unread count polled every 60 seconds" pattern is already a known offender). Server load. False sense of "always fresh" — a 30-second stale window is no better than a 60-minute stale window if the user is mid-action.
**Instead:** 403 interceptor → demand-driven refresh. Already covered in §1.

### Anti-Pattern 7: Allow archive AND delete simultaneously for owners

**Why bad:** Footgun (accidental hard-delete). Confusing UI ("which one do I want?"). Robs reversibility benefit of archive.
**Instead:** Archive replaces delete for owners. Hard-delete is admin-only. Already covered in §7.

### Anti-Pattern 8: New Context provider for `moderatorContext` on CreateListingScreen

**Why bad:** Cross-screen ephemeral state for a single workflow. The state lives across exactly 2 screens (Queue → CreateListing → back to Queue) and dies when the workflow completes. Putting it in a Provider creates re-render fan-out for 0 readers when the workflow isn't active.
**Instead:** State on `App.tsx`, props down to `CreateListingScreen`. Already covered in §6.

### Anti-Pattern 9: Bumping Android versionCode based on local `build.gradle`

**Why bad:** M1 D-02 lesson — Play Console rejected versionCode 25 because it had already accepted 25. Local file is not the version-code authority.
**Instead:** Phase 6 / M2 release-prep MUST query Play Console history before setting baseline. Same for TestFlight.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Railway backend | `axiosInstance.post('/properties/:id/approve')` etc. via shared `apiClient.ts`. `Authorization: Bearer <idToken>`. | Phase 1 axios refactor. M1 GATE-05 D-22 closer. |
| Firebase Identity Toolkit REST | `securetoken.googleapis.com/v1/token` for refresh-token flow. Existing `:signInWithPassword` etc. unchanged. | NO Firebase SDK. NO firebase-admin SDK. |
| Socket.IO server | Unchanged for M2. Future stretch: `role_changed` event. | Defer push-of-role to a later milestone. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `useRole()` ↔ `AuthContext` | Direct `useAuth()` read. No new Provider. | M1 contract preserved. |
| `canFromUser()` ↔ `PropertyService` / `UserService` | Direct import. Pre-HTTP service-layer guard. | M1 Plan 03-04 pattern; M2 extends. |
| `App.tsx` ↔ `ModerationQueueScreen` ↔ `CreateListingScreen` | Props (`onEditAsModerator`, `moderatorContext`). State on App.tsx. | Existing state-machine pattern. |
| `propertyStatus.ts` ↔ list screens | Pure function import. | One helper, four consumers. |
| Profile entry-points ↔ admin/mod screens | `<Gated action="…">` wrapper. | Greppable; defense in depth. |

---

## Scaling Considerations

| Concern | At 10 mods + 100 pending | At 100 mods + 10K pending | At 1K mods + 100K pending |
|---------|--------------------------|---------------------------|---------------------------|
| Moderation Queue list virtualization | Trivial — `FlatList` defaults work | Add server pagination (`?limit=50&before=cursor`) — same pattern as CONCERNS.md infinite-scroll concern | Backend-side priority sort + per-mod assignment + queue partitioning |
| Role refresh storm on 403 | One refresh per failed action; bounded | Same | Same — 403s are by-user, not by-action |
| Role-management user search | Search + 50-result list works | Pagination needed | Defer to admin web app; mobile is wrong surface |
| `getAllProperties` + client-side filter | Existing CONCERNS.md scaling concern unchanged | Server-side `?status=` becomes mandatory | Already past mobile's reasonable scale |
| RoleManagementScreen audit log | Inline list works | Paginated viewer | Defer to admin web app |

None of these reach problematic scale in M2's first 6 months. Defer server-side pagination + admin web app to a dedicated CONCERNS.md sweep milestone.

---

## Confidence Assessment

| Area | Confidence | Why |
|------|------------|-----|
| Extend `AuthContext` over new `RolesContext` | HIGH | M1 contract preserved; canonical React pattern; zero call-site churn |
| 403-retry interceptor over polling for role staleness | HIGH | Demand-driven; bounded; matches existing axios patterns |
| Moderation Queue as overlay, not tab | HIGH | Mirrors RenterListingsScreen / CreateListingScreen patterns; 5→6 tab churn rejected |
| `propertyStatus.ts` helper over per-screen filter | HIGH | Standard DRY; one helper, four consumers; matches `formatPrice.ts` pattern |
| Reuse `CreateListingScreen` for edit-on-behalf | HIGH | 871 LOC of decomposed sub-components reused; M1 Phase 4+5 work amortized |
| Tab-badge-and-banner over push notifs | HIGH | Lowest-effort viable path; PROJECT.md push-notification-infra is out of M2 scope |
| Archive replaces delete for owners | MEDIUM | Industry pattern; account-deletion-cascades-to-hard-delete handles GDPR concern; final UX call is product's |
| Profile entry-point for RoleManagement (vs. dedicated tab) | HIGH | Same rationale as Moderation Queue; not a frequent task |
| idToken refresh-token via Firebase REST | MEDIUM | Documented Firebase REST capability; no SDK rule honored. Confirmation in §9 Q5 collapses this to HIGH |
| Phase order (Phase 1 = backend role + axios) | HIGH | Build-order discipline lesson from M1; foundation-first |
| Status default `'live'` for missing field | MEDIUM | Pending §9 Q2 + Q12 confirmation from Railway |
| `archiveOwnListing` resource-scope inline at PropertyCard (not in `canFromUser`) | MEDIUM | Avoids extending the M1 `canFromUser` signature; tradeoff is "owner check" gets duplicated at 3-4 sites — acceptable, matches existing patterns |
| Restore-from-archive → goes to `pending` | MEDIUM | Recommended for trust hygiene; final UX call is product's (§9 Q7) |

---

## Sources

- `.planning/PROJECT.md` (M2 milestone scope, hard rules)
- `.planning/codebase/ARCHITECTURE.md` (Provider tree, screen layer, service layer, App.tsx state machine)
- `.planning/codebase/STRUCTURE.md` (file paths, naming conventions, where-to-add-new-code patterns)
- `.planning/codebase/INTEGRATIONS.md` (Railway endpoint inventory, auth header pattern, AsyncStorage keys, Firebase REST endpoints)
- `.planning/codebase/CONCERNS.md` (App.tsx god-file, duplicated service boilerplate, x-firebase-uid security gap, no push infra, no inbox, hardcoded API key, FavoritesService swallowed errors, Stale closure back-handler)
- `.planning/codebase/CONVENTIONS.md` (Theme/i18n/state conventions, OVERLAY_FLAGS pattern, no-form-library rule)
- `src/hooks/useRole.ts` (M1 Phase 3 forward-compat shape — actions union, deriveRole branches, canFromUser)
- `src/components/Gated.tsx` (M1 Phase 3 declarative UI guard)
- `.planning/milestones/v1.0.4-phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (M1 GATE-05 D-22 unconfirmed status; same channel + question style for M2)
- React Native [BackHandler docs](https://reactnative.dev/docs/backhandler)
- Firebase Identity Toolkit [securetoken refresh endpoint](https://firebase.google.com/docs/reference/rest/auth#section-refresh-token) (REST — no SDK)
- Industry RBAC patterns referenced in M1 ARCHITECTURE.md (rohitnandi.com, permit.io)

---

*Research scope: M2 "Roles & Moderation" — integration shape only. Backend contract questions parked in §9; client-side scope locked here. — 2026-04-29*

# Phase 5: Admin Role Management UI — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 05-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 05-admin-role-management-ui
**Areas discussed:** Search & list UX, Role-change interaction, Guardrail error surfacing
**Areas deferred:** Audit log + endpoint shape (recorded under Claude's Discretion in CONTEXT.md)

---

## Search & list UX

### Q1: How should the search fire?

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced typing (300ms) | GET fires automatically as the admin types, after a short pause; live like iOS Settings. | ✓ |
| Submit button only | Admin types then taps Search (or hits return). Cheaper API. | |
| onSubmitEditing only | Search fires only on keyboard return; no button. | |

**User's choice:** Debounced typing (300ms)
**Notes:** Live-feel preferred; small admin pool keeps API cost negligible.

### Q2: What should each user row show? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Email (primary) | Always shown as primary identifier. | ✓ |
| First + last name | Display name when present. | ✓ |
| Current userType pill | Color-coded chip via existing semantic palette. | ✓ |
| roleRevokedAt timestamp | "Revoked: 2026-04-15" line; audit transparency. | ✓ |

**User's choice:** All four selected
**Notes:** No avatar field on User schema; not added.

### Q3: What should the screen show before any search query is entered?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty + 'Type to search' hint | Clean slate; no API call until typing. | ✓ |
| Recent role changes (last 50) | GET ?recentChanges=1; audit-at-a-glance view. | |
| All non-user accounts | Pre-loads moderators + admins; "who has elevated access" view. | |

**User's choice:** Empty + 'Type to search' hint
**Notes:** Mirrors LinkedIn / iOS Mail; avoids loading the full user table.

### Q4: How should results beyond the first page be reached?

| Option | Description | Selected |
|--------|-------------|----------|
| limit=50 + 'refine search' hint | Cap at 50; if exactly 50 returned, show "Refine your search to see more." | ✓ |
| Cursor pagination + 'Load more' button | Backend returns {items, nextCursor}; client appends. | |
| Infinite scroll (FlatList onEndReached) | Auto-loads next page on scroll-to-end. | |

**User's choice:** limit=50 + 'refine search' hint
**Notes:** Simplest backend; pushes admin to type more characters. Sufficient for admin scale.

---

## Role-change interaction

### Q5: How should the admin pick a new role for a user?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal: 3 chips + Submit | Fork RoleChangeModal from RejectListingModal (Phase 4 pattern). | ✓ |
| Alert.alert with 3 buttons | Native iOS-Android alert; cramped on Android with 4 buttons. | |
| ActionSheet (iOS) + Android polyfill | Bottom-up sheet; needs cross-platform component not in repo. | |
| Inline expand on row tap | Tap row reveals 3 chips inline; harder to add confirm step. | |

**User's choice:** Modal: 3 chips + Submit
**Notes:** Reuses Phase 4 fork-and-trim discipline; consistent with moderation/archive surfaces.

### Q6: Should the role change require a confirmation step?

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tap: pick role then confirm | Pick chip → "Change X from moderator to admin?" confirm. | ✓ |
| Single-tap commit | Tap chip → fire PATCH immediately. | |
| Two-tap with optional note | Confirm modal also accepts free-text note → audit reasonNote. | |

**User's choice:** Two-tap: pick role then confirm
**Notes:** Hardens against fat-finger; matches Phase 3 Approve flow's Alert.alert confirm pattern.

### Q7: What feedback does the admin get after a successful role change?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline pill update + toast | Row's pill flips immediately; brief "Role updated" toast; list stays open. | ✓ |
| Toast only, refetch row | Refetch the affected user, replace row, fire toast. | |
| Optimistic + reconcile on response | Update pill instantly; revert + surface error on 409/403. | |

**User's choice:** Inline pill update + toast
**Notes:** List stays open so admins can change another user without round-tripping.

### Q8: Where should the role-picker mount on the screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Sibling-mounted modal (RoleChangeModal) | Sibling to FlatList; visibility from selected-user state; matches Phase 3/4 modals. | ✓ |
| Detail sub-screen on row tap | Navigate to UserDetailScreen overlay; adds a second overlay flag. | |
| Bottom-sheet on row tap | Slides up over list; needs new dep (@gorhom/bottom-sheet). | |

**User's choice:** Sibling-mounted modal (RoleChangeModal)
**Notes:** No new dependency; matches RejectListingModal/ArchiveListingModal mount discipline.

---

## Guardrail error surfacing

### Q9: How should the last-admin lockout error surface in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal alert with explanation | Blocking modal: "Cannot change role — X is the only admin. Promote another user first." | ✓ |
| Toast + row stays unchanged | Brief toast; modal closes; pill stays at admin. | |
| Inline error in the modal | Red helper text in modal; admin can retry. | |

**User's choice:** Modal alert with explanation
**Notes:** A destructive action stopped at the door deserves visibility; toast-only is too easy to miss. Copy names the corrective action.

### Q10: How should self-mutation be handled in the user list?

| Option | Description | Selected |
|--------|-------------|----------|
| Show with disabled '(you)' badge | Self appears non-tappable with "(you)" label. | ✓ |
| Hide self from search results | Server-side filter omits requester's own uid. | |
| Allow tap, surface 403 on submit | Lazy guardrail — relies on backend 403. | |

**User's choice:** Show with disabled '(you)' badge
**Notes:** Audit transparency without the lazy "tap then 403" antipattern. Backend SELF_MUTATION 403 stays as defense-in-depth.

### Q11: What error envelope codes should the backend return?

| Option | Description | Selected |
|--------|-------------|----------|
| LAST_ADMIN_LOCKOUT + SELF_MUTATION | 409 + 403 with distinct codes; matches Phase 3 ALREADY_MODERATED naming. | ✓ |
| ROLE_CHANGE_BLOCKED (single code) | One 409 code; client parses message — brittle. | |
| LAST_ADMIN + SELF_ROLE_CHANGE | Shorter codes; same shape, different naming. | |

**User's choice:** LAST_ADMIN_LOCKOUT + SELF_MUTATION
**Notes:** Distinct codes per error class; preserves the Phase 3 / Phase 4 envelope-naming convention.

### Q12: Beyond LAST_ADMIN_LOCKOUT and SELF_MUTATION, which errors need bilingual EN+RU copy in this phase? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Race conflict (409 ROLE_ALREADY_CHANGED) | Two admins act simultaneously; mirrors Phase 3 ALREADY_MODERATED. | ✓ |
| User not found (404) | PATCH on a uid that no longer exists. | ✓ |
| Generic network error fallback | Catches 5xx / timeout. | ✓ |
| Search returned no results | Empty-state for the search list. | ✓ |

**User's choice:** All four selected
**Notes:** Full EN+RU copy budget for the phase: ~10-12 base strings + 6 error/empty-state strings ≈ 16-20 new keys × 2 locales.

---

## Claude's Discretion

User explicitly skipped the **Audit log + endpoint shape** gray area; defaults captured in CONTEXT.md `<decisions>` Claude's Discretion subsection:

- `roleChangeLog` separate Mongo collection; shape `{actorUid, targetUid, fromRole, toRole, at}`.
- No `action` enum field (single-purpose collection).
- `GET /api/admin/users?query=&limit=50` returns `{items}` (totalCount optional if cheap).
- `PATCH /api/admin/users/:uid/role` body `{userType}` → 200 with full updated User doc.
- `roleRevokedAt` bumps on **demotion only**; promotions and same-tier no-ops do not bump.
- `useRole` `Action` union: rename existing `promoteToModerator` → `manageRoles` atomically (verify zero call sites).
- Server-side regex search: escape regex metacharacters (no ReDoS even at admin scale).
- Total-admins counter on the screen: NOT in scope (deferred).

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:
- Total admins / moderators counter on screen header
- Role-provenance hint when viewing another admin row
- Bulk role changes (multi-select)
- Self-promotion path
- Region-scoped admin (KG/KZ/UZ)
- Audit log read-only UI surface
- Push/email notifications on role change
- Pre-flight "Total admins: N" chip on the change modal

---
status: complete
phase: 05-admin-role-management-ui
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md]
started: 2026-05-03T20:32:14Z
updated: 2026-05-03T20:46:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Profile shows "Manage Roles" entry-point row
expected: As admin, Profile shows a "Manage Roles" row with UserCog icon. Tapping opens the Role Management overlay (bottom tab bar hides — overlays do that by design).
result: pass
note: User confirmed label renders as "Role Management"; tap navigates to a page with an input search.

### 2. Role Management screen empty-state prompt
expected: On opening, the screen shows the "Type to search" empty-state hint (admin.roles.search.prompt). No list rendered until you type.
result: pass

### 3. Search returns users with role pills (debounced 300ms)
expected: Type a partial email (e.g. "beck" or another known user). After ~300ms a list appears. Each row shows the user's email and a colored pill for userType (admin / moderator / user).
result: pass

### 4. Self-row shows "(you)" badge and is non-tappable
expected: Your own admin row appears in the results with a "(you)" badge (admin.roles.selfBadge), reduced opacity (~0.6), and tapping it does nothing (the row is rendered as a View, not TouchableOpacity).
result: pass

### 5. RoleChangeModal opens with current-role chip de-emphasized
expected: Tap any non-self user row. A modal slides up with 3 chips (user / moderator / admin). The chip matching the user's current role is de-emphasized and shows a "(current)" suffix (admin.roles.currentSuffix).
result: pass

### 6. Promote a user (EN locale) — success path
expected: Pick a higher-role chip, tap submit. Modal closes, the row's pill updates to the new role, and a success toast appears. The promoted user is NOT forced to sign in again (roleRevokedAt is not bumped on promotion — Pitfall 3).
result: pass

### 7. RU locale renders correctly across the flow
expected: Switch app language to Russian. Walk Profile → Manage Roles → search → modal → submit. All admin.roles.* strings render in Russian (no missing-key fallbacks, no English text mixed in).
result: pass

### 8. Demote a user — success path forces re-login
expected: Pick a non-self admin or moderator, demote them (e.g. admin → user). Modal closes, pill updates, success toast appears. The demoted user (if signed in elsewhere) is forced to sign in again because roleRevokedAt is bumped on demotion.
result: pass

### 9. Pitfall 7: chip-deselection clears pendingRole
expected: Open the modal, tap a chip to select it (submit becomes enabled). Tap that same chip again — selection clears, submit becomes disabled. Re-pick a chip → submit re-enables.
result: pass

### 10. Moderator account hides "Manage Roles" row
expected: Sign out, sign in as a moderator account. Open Profile. The "Manage Roles" row is HIDDEN (canFromUser('manageRoles') returns false for moderators per Plan 02 useRole gate).
result: pass

### 11. LAST_ADMIN_LOCKOUT shows blocking Alert.alert
expected: With only 2 admin accounts in the system, sign in as one and try to demote the other. The PATCH returns 409 LAST_ADMIN_LOCKOUT and the app shows a native blocking Alert.alert (NOT the inline modal error row). The other admin remains an admin.
result: issue
reported: "it demoted"
severity: major
ambiguity: User did not state how many admin accounts existed at test time. Two interpretations: (a) ≥3 admins existed → backend correctly allowed demotion (no lockout) → false-positive issue; (b) exactly 2 admins existed → backend LAST_ADMIN_LOCKOUT guard failed → security-critical regression. Diagnosis must check Mongo admin count snapshot before/after the test.

### 12. 50-row footer "Refine your search" hint
expected: Run a search broad enough to return 50+ matching users (e.g. very short query). The list footer shows the "Refine your search" hint (admin.roles.search.refineHint) signaling pagination cap.
result: skipped
reason: "User reported: skip — not enough seed users (dev DB has fewer than 50 matches for any query)"

## Summary

total: 12
passed: 10
issues: 1
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "Demoting one admin out of exactly two admins is blocked by LAST_ADMIN_LOCKOUT (409) and surfaced as a native Alert.alert; the targeted admin remains an admin."
  status: failed
  reason: "User reported: it demoted"
  severity: major
  test: 11
  ambiguity: "User did not confirm admin count at test time. If ≥3 admins existed, demotion was correctly allowed (no lockout fires) and this is a false-positive. If exactly 2 admins existed, the backend LAST_ADMIN_LOCKOUT pre-flight check (adminRoutes.js Step 6) and/or post-write rollback (Step 8) failed — security-critical regression because the system is now one demotion away from zero-admin lockout."
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
  diagnosis_must_check:
    - "Snapshot of User collection admin count immediately before and after the test (db.users.countDocuments({userType:'admin'}))."
    - "RoleChangeLog entries for the demotion (actorUid, fromRole, toRole, ts) — confirms which admin demoted whom."
    - "Backend logs for evt: 'last_admin_lockout_rollback' and evt: 'role_change_audit_orphan' around the test timestamp."
    - "Whether Plan 03 supertest case 'demoting one of two admins leaves exactly one admin (boundary state)' still passes against current backend HEAD."
    - "If admin count was 2 and demotion succeeded, isolate which guard bypassed: pre-flight countDocuments query (Step 6) vs. post-write rollback (Step 8)."

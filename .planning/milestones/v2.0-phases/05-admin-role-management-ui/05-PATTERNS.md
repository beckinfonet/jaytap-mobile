# Phase 5: Admin Role Management UI — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 12 (3 NEW client + 6 MODIFY client + 3 NEW backend + 1 MODIFY backend) — locked baselines (`wc -l` 2026-05-03)
**Analogs found:** 12 / 12 (every Phase 5 file has a strong existing analog inside the JayTap RN repo or `JayTap-services` backend repo)

**Drift note vs. RESEARCH.md:** RESEARCH.md and UI-SPEC.md cite line numbers consistent with Phase 4's close (App.tsx 1191, ProfileScreen.tsx ~466, ModerationQueueScreen.tsx 382, RejectListingModal.tsx 209, PropertyService.ts 469). All confirmed by `wc -l` and `grep` on 2026-05-03. Two important corrections vs. the prompt:
- **User schema field is `uid`, NOT `firebaseUid`.** RESEARCH.md Example 3 uses `User.findOne({ uid: targetUid })` correctly, but RESEARCH.md §"Standard Stack" select-list says `'_id firebaseUid email firstName lastName userType roleRevokedAt'` — that should read `uid` (or both `_id uid email …`) per `JayTap-services/src/models/User.js:4-8`. The planner must enforce `uid`.
- **moderationRoutes.js current size is 641 LOC, not 447.** Phase 4 added the mod-archive + mod-restore handlers; LOC drift is expected. Pattern shapes still match.

---

## File Classification

| New / Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|------|-----------|----------------|---------------|
| `src/screens/RoleManagementScreen.tsx` (NEW) | client | screen | request-response (search debounce + list) + event-driven (row tap → modal) | `src/screens/ModerationQueueScreen.tsx` (382 LOC) | exact (SafeAreaView + ChevronLeft header + FlatList + RefreshControl + AppState 60s cooldown all transfer; FlatList renders user rows instead of property rows; sibling-mounted modal pattern transfers) |
| `src/components/RoleChangeModal.tsx` (NEW) | client | component | event-driven (parent-owns-HTTP) | `src/components/RejectListingModal.tsx` (209 LOC) | partial (chip row + Cancel/Submit row + KeyboardAvoidingView + ScrollView verbatim; +6-8 edits for 2-tap confirm step + currentRole de-emphasis + inline error row per RESEARCH §Pattern 5) |
| `src/services/UserService.ts` (NEW) | client | service | request-response | `src/services/PropertyService.ts:381-420` (approveListing/rejectListing) | exact (apiClient + canFromUser belt-and-suspenders + PermissionDeniedError throw + try/catch + console.error pattern) |
| `JayTap-services/src/routes/adminRoutes.js` (NEW) | backend | route | request-response (search GET + atomic role mutation PATCH + audit-row insert) | `JayTap-services/src/routes/moderationRoutes.js:50, 87-126, 143-206` | exact (router-level `verifyFirebaseToken + requireMinRole` mount + race-safe `findOneAndUpdate` + 409 envelope + audit-row insert in try/catch + `actorUid: req.firebaseUid` discipline) |
| `JayTap-services/src/models/RoleChangeLog.js` (NEW) | backend | model | n/a (schema definition) | `JayTap-services/src/models/ModerationLog.js` (31 LOC) | exact (drop `action`/`targetType`/`targetId`/`before`/`after`/`reasonCode`/`reasonNote`; keep `actorUid` + `at`; add `targetUid` + `fromRole` + `toRole`) |
| `JayTap-services/src/__tests__/adminRoutes.test.js` (NEW) | backend | test | n/a | `JayTap-services/src/__tests__/moderationRoutes.test.js` (531 LOC) | exact (env-setup + jest.mock firebase + supertest harness + makeApp + beforeEach user/listing seeding + race-condition Promise.all assertion + actorUid anti-spoofing test + role-gating per-endpoint test) |
| `App.tsx` (MODIFY) | client | screen-wiring | event-driven | `App.tsx:65, 121-128, 327-330, 1043-1067` (existing ModerationQueue overlay shape) | exact (sibling overlay flag + state + back-handler branch + mount block; ProfileScreen prop wiring at 739 → add new `onOpenRoleManagement` prop) |
| `src/screens/ProfileScreen.tsx` (MODIFY) | client | screen | event-driven | `src/screens/ProfileScreen.tsx:281-303` (existing canViewModerationQueue row) | exact (additive — copy the row, swap predicate + callback + label key + drop badge per UI-SPEC) |
| `src/hooks/useRole.ts` (MODIFY) | client | hook | n/a (pure function) | `src/hooks/useRole.ts:14-26, 80-92` (existing union + switch fall-through) | exact (1-line union member rename + 1-line switch case rename + admin-only block already correct) |
| `src/hooks/__tests__/useRole.test.ts` (MODIFY) | client | test | n/a | `src/hooks/__tests__/useRole.test.ts:97, 127-136` (existing `promoteToModerator` block) | exact (rename 5 string literals + 1 test description + add new top-level `describe('manageRoles')` row per CONTEXT D-Discretion) |
| `src/locales/en.ts` + `src/locales/ru.ts` (MODIFY) | client | config | n/a (string table) | `src/locales/en.ts:589-616`, `src/locales/ru.ts:592-619` (existing `moderation.queue.entryPoint` + `moderation.race.toast` block) | exact (locale-parity gate covers; `admin.roles.*` namespace clean per RESEARCH §Standard Stack — 0 hits) |
| `JayTap-services/index.js` (MODIFY) | backend | mount | n/a (boot wiring) | `JayTap-services/index.js:122-123` (existing moderationRoutes mount) | exact (add 1-line `app.use('/api/admin', require('./src/routes/adminRoutes').router)` directly below the moderationRoutes mount at line 123) |

**LOC baselines locked at PATTERN-MAP time (2026-05-03 `wc -l`):**

| File | Actual LOC | RESEARCH.md cited LOC | Drift |
|------|-----------|----------------------|-------|
| `App.tsx` | 1191 | 1191 | 0 ✓ |
| `src/screens/ModerationQueueScreen.tsx` | 382 | ~382 | 0 ✓ |
| `src/components/RejectListingModal.tsx` | 209 | ~209 | 0 ✓ |
| `src/services/PropertyService.ts` | 469 | (n/a) | n/a |
| `src/services/apiClient.ts` | 181 | (n/a) | n/a |
| `src/screens/ProfileScreen.tsx` | 466 | ~466 | 0 ✓ |
| `src/hooks/useRole.ts` | 135 | (n/a) | n/a |
| `src/hooks/__tests__/useRole.test.ts` | 229 | (n/a) | n/a |
| `src/locales/en.ts` | 621 | (n/a) | n/a |
| `src/locales/ru.ts` | 622 | (n/a) | n/a |
| `JayTap-services/src/routes/moderationRoutes.js` | 641 | ~447 | +194 (Phase 4 archive/restore handlers) |
| `JayTap-services/src/models/ModerationLog.js` | 31 | 31 | 0 ✓ |
| `JayTap-services/src/__tests__/moderationRoutes.test.js` | 531 | (n/a) | n/a |
| `JayTap-services/index.js` | 160 | (n/a) | n/a — mount line confirmed at line 123 |

**App.tsx LOC pressure for Phase 5:** 1191 → 1221-1231 (+30-40 LOC budget per RESEARCH §Pattern B). Soft cap 1100 + hard ceiling 1180 are already exceeded post-Phase-4. Phase 5 is signal-not-block under PATTERN D (Phase 2 precedent inherited by Phase 4) — planner SHOULD document drift in SUMMARY but NOT block on it.

---

## Pattern Assignments

### 1. `src/screens/RoleManagementScreen.tsx` (NEW — screen, request-response + event-driven)

**Analog:** `src/screens/ModerationQueueScreen.tsx`

**Why this analog:** Same data flow (FIFO list + per-row action + sibling-mounted modal + AppState refetch); same overlay-flag mount; same SafeAreaView + ChevronLeft header geometry. RESEARCH §Pattern B + UI-SPEC §"RoleManagementScreen geometry" lock this.

**Imports skeleton (lines 25-47 — copy and trim):**
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  StatusBar,
  TextInput,                        // NEW for Phase 5 (search input)
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserService } from '../services/UserService';                     // SWAPPED from PropertyService
import RoleChangeModal, { UserRole } from '../components/RoleChangeModal';  // SWAPPED from RejectListingModal
import { PermissionDeniedError } from '../hooks/useRole';
```

**Per-screen AppState cooldown ref skeleton (lines 55-58, 76, 109-122):**
```tsx
const REFRESH_COOLDOWN_MS = 60_000;
// ...
const lastRefreshAt = useRef<number | null>(null);
// ...
useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt.current && now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshAt.current = now;
    load();
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [load]);
```

**Header skeleton (lines 266-283 — copy verbatim, swap title key):**
```tsx
<View style={[styles.header, { borderBottomColor: colors.border }]}>
  <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.7}>
    <ChevronLeft size={24} color={colors.text} />
  </TouchableOpacity>
  <Text style={[styles.headerTitle, { color: colors.text }]}>
    {t('admin.roles.title')}                                        {/* WAS: moderation.queue.title */}
  </Text>
  <View style={{ width: 40 }} />
</View>
```

**Permission-denied + load error pattern (lines 82-99):**
```tsx
} catch (err: any) {
  console.error('Failed to load …', err);
  if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
    Alert.alert(t('common.error'), t('errors.permissionDenied'));
    onBack();
    return;
  }
  Alert.alert(
    t('common.error'),
    err?.response?.data?.message || err?.message || t('common.errorGeneric'),
  );
}
```

**Phase 5 ADDITIONS not in analog (Pitfall 5 — RESEARCH §Common Pitfalls):**
- 300ms debounced search (no Submit button per D-01) using `setTimeout` + `clearTimeout` in a `useEffect` keyed on `query`.
- Pitfall 5 stale-response guard: `requestIdRef = useRef(0)`; each search increments; on response, drop if `myId !== requestIdRef.current`.
- Pre-search state (D-03): when `query.trim() === ''`, render the "Type to search" hint (`t('admin.roles.search.prompt')`) — no API call.
- Pagination hint (D-04): when `items.length === 50`, render the footer "Refine your search…" (`t('admin.roles.search.refineHint')`).
- Self-row variant (D-10): when `item.uid === currentUser.firebaseUid`, render `<View>` (not `<TouchableOpacity>`) with `(you)` badge.

**Sibling-mounted modal pattern (mirror lines 168-195 of analog → handleRejectSubmit):**
The modal is controlled by `selectedUser` state (truthy → mounted; null → unmounted) per D-08. `<RoleChangeModal user={selectedUser} onClose={() => setSelectedUser(null)} onSubmit={handleRoleSubmit} />`. The 409 LAST_ADMIN_LOCKOUT branch uses `Alert.alert` (D-09 blocking modal); the 403/404/network branches set `inlineErrorCode` state passed to the modal.

---

### 2. `src/components/RoleChangeModal.tsx` (NEW — component, event-driven)

**Analog:** `src/components/RejectListingModal.tsx` (entire file, 209 LOC)

**Why this analog:** Phase 4 D-08 fork-and-trim convention; CONTEXT D-05 explicit. Modal scrim + KeyboardAvoidingView + ScrollView + card geometry + chip row + button row all transfer verbatim. Phase 5 stretches the single-action shape into 2-tap confirm — RESEARCH §Pattern 5 documents the diff is 6-8 edits, not the canonical 4.

**Imports + props skeleton (lines 16-48 — copy, swap):**
```tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
// NOTE: drop TextInput import (no reasonNote in role change)
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export type UserRole = 'user' | 'moderator' | 'admin';      // WAS: RejectReasonCode union
const ROLE_TYPES: UserRole[] = ['user', 'moderator', 'admin'];   // WAS: REJECT_CODES

interface RoleChangeModalProps {
  visible: boolean;                       // OR replace with parent-controlled `user: User | null`
  currentRole: UserRole;                  // NEW — drives current-chip de-emphasis (D-05)
  displayName: string;                    // NEW — for confirm-prompt + subtitle interpolation
  email: string;                          // NEW — for subtitle interpolation
  onClose: () => void;
  onSubmit: (params: { userType: UserRole }) => Promise<void>;
  submitting?: boolean;
  errorCode?: 'SELF_MUTATION' | 'ROLE_ALREADY_CHANGED' | 'USER_NOT_FOUND' | 'NETWORK' | null;  // NEW — inline error row mapping (D-07 + D-11)
}
```

**Chip-row pattern (lines 88-120 — copy, fork the styling):**
```tsx
{ROLE_TYPES.map((role) => {
  const selected = pendingRole === role;          // WAS: rejectCode === code
  const isCurrent = role === currentRole;          // NEW — D-05 de-emphasis
  const selectedTextColor = isDark ? '#121212' : '#FFFFFF';   // INHERIT VERBATIM line 94
  return (
    <TouchableOpacity
      key={role}
      onPress={() => setPendingRole(role)}
      disabled={submitting}
      style={[
        styles.codeChip,
        {
          backgroundColor: selected ? colors.primary : colors.inputBackground,
          borderColor: selected ? colors.primary : colors.border,
          opacity: isCurrent && !selected ? 0.6 : 1.0,           // NEW — D-05 de-emphasis
        },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.codeChipText, { color: selected ? selectedTextColor : colors.text }]}>
        {t(`admin.roles.label.${role}` as any)}
        {isCurrent ? ` ${t('admin.roles.currentSuffix')}` : ''}    {/* NEW — D-05 "(current)" suffix */}
      </Text>
    </TouchableOpacity>
  );
})}
```

**Style sheet pattern (lines 174-207 — copy verbatim with overlay/scrollContent/card/codeChip/codeChipText/button/buttonText):**
The `styles.overlay/scrollWrap/scrollContent/card/title/codesGroup/codeChip/codeChipText/buttonRow/button/buttonText` blocks transfer **verbatim** — Phase 5 reuses 12px paddings + 20px card padding + 14px borderRadius + 8px gap per UI-SPEC §"Spacing Exceptions" (brownfield reuse, not new).

**Action row swap (lines 141-166):**
```tsx
<TouchableOpacity                                               {/* CANCEL — copy verbatim */}
  style={[styles.button, { backgroundColor: colors.inputBackground }]}
  onPress={onClose}
  disabled={submitting}
  activeOpacity={0.7}
>
  <Text style={[styles.buttonText, { color: colors.text }]}>
    {t('common.cancel')}
  </Text>
</TouchableOpacity>
<TouchableOpacity                                               {/* SUBMIT — fork colors + label */}
  style={[styles.button, { backgroundColor: colors.primary }]}    {/* WAS: colors.error (red destructive) */}
  onPress={handleSubmit}
  disabled={submitting || pendingRole === null || pendingRole === currentRole}    {/* NEW disabled gate */}
  activeOpacity={0.7}
>
  {submitting ? (
    <ActivityIndicator color={isDark ? '#121212' : '#FFFFFF'} size="small" />     {/* INHERIT — submit disabled-state contrast */}
  ) : (
    <Text style={[styles.buttonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
      {t('admin.roles.modal.submit')}                              {/* WAS: moderation.reject.submit */}
    </Text>
  )}
</TouchableOpacity>
```

**Phase 5 ADDITIONS not in analog (Pitfall 7 — RESEARCH §Common Pitfalls):**
- `pendingRole` state INDEPENDENT of `step` (Pitfall 7): tap-chip sets `pendingRole`, never wiped by step transitions; tap-cancel-from-step-2 resets `step` but preserves `pendingRole`.
- `confirmStep` local state gates the second tap (chip-pick → confirm); shows confirm-message JSX between chip row and button row.
- Inline error row (D-07): mounts only when `errorCode` prop is truthy; renders `t('admin.roles.error.${errorCode}')` in `colors.error` 13/400 with `marginBottom: 12`. Above the button row.

**CRITICAL invariant (planner gate):**
- `grep -c "<Gated" src/components/RoleChangeModal.tsx` MUST return `0`. `<Gated>` belongs to the entry-point (ProfileScreen) and the overlay mount (App.tsx), NOT inside the modal. The modal trusts the parent's gate.

---

### 3. `src/services/UserService.ts` (NEW — service, request-response)

**Analog:** `src/services/PropertyService.ts:381-420` (approveListing + rejectListing) — and lines 1-3 for imports

**Why this analog:** Same shape — apiClient call + canFromUser belt-and-suspenders + PermissionDeniedError + try/catch + structured console.error. RESEARCH §Pattern F locks this.

**Imports skeleton (lines 1-3 — copy verbatim):**
```ts
import { apiClient } from './apiClient';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';
```

**Method skeleton (lines 381-395 — fork for searchUsers + setUserRole):**
```ts
export const UserService = {
  /**
   * Admin: search users by email substring (ADMIN-01). Backend caps at limit=50
   * and shape returns {items: User[]}. Pre-search state (D-03) — caller passes
   * empty query; backend returns items=[] without an unindexed scan.
   */
  searchUsers: async (query: string): Promise<{ items: any[] }> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'manageRoles')) {
        console.error('[UserService.searchUsers] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.get('/admin/users', { params: { query, limit: 50 } });
      return { items: response.data.items || [] };
    } catch (error: any) {
      if (error instanceof PermissionDeniedError) throw error;
      console.error('Error searching users:', error?.message);
      throw error;
    }
  },

  /**
   * Admin: change a user's userType (ADMIN-02..ADMIN-04 + ADMIN-07).
   * Backend uses race-safe atomic findOneAndUpdate; 409 LAST_ADMIN_LOCKOUT /
   * ROLE_ALREADY_CHANGED + 403 SELF_MUTATION + 404 USER_NOT_FOUND envelopes
   * bubble up; UI consumer (RoleChangeModal) maps {error.response.data.code}
   * to localized strings.
   *
   * Same race-safe + 409 contract as approveListing/rejectListing (Phase 3).
   */
  setUserRole: async (uid: string, userType: 'user' | 'moderator' | 'admin'): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'manageRoles')) {
        console.error('[UserService.setUserRole] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.patch(`/admin/users/${uid}/role`, { userType });
      return response.data;
    } catch (error: any) {
      if (error instanceof PermissionDeniedError) throw error;
      // 409 LAST_ADMIN_LOCKOUT / ROLE_ALREADY_CHANGED + 403 SELF_MUTATION + 404 USER_NOT_FOUND bubble up.
      console.error('Error setting user role:', error?.message);
      throw error;
    }
  },
};
```

**apiClient inheritance (apiClient.ts:31-40 — read-only confirmation, no edits):**
The Bearer auto-attach (line 35-37) and 401 silent-refresh + 403 role-revoked retry interceptors already cover UserService. No per-call header work.

---

### 4. `JayTap-services/src/routes/adminRoutes.js` (NEW — route, request-response)

**Analog:** `JayTap-services/src/routes/moderationRoutes.js:1-13, 50, 87-126, 143-206`

**Why this analog:** Same router-level role gate; same race-safe atomic; same 409 envelope; same audit-row idiom. RESEARCH §Pattern 1, 2, 4 + Code Examples 1-3 lock this. Phase 4 added handlers but the foundational shape is intact.

**File header + imports skeleton (lines 1-13 of moderationRoutes.js — fork):**
```js
// JayTap-services/src/routes/adminRoutes.js
// Phase 5 — Admin role management endpoints (ADMIN-01..ADMIN-07).
// All endpoints under this router require role >= admin (no inheritance — admin only).
//
// Anti-pattern grep gate (carry-forward from Phase 3 MOD-16 + Phase 4 ARCH-05):
// `actorUid: req.body` and `actorUid: req.headers` MUST return 0 in this file.
// Audit row's actorUid sources from req.firebaseUid (JWKS-verified token sub) ONLY.

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const RoleChangeLog = require('../models/RoleChangeLog');
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');
```

**Router-level mount (line 50 of moderationRoutes.js — verbatim swap `'moderator'` → `'admin'`):**
```js
// Belt-and-suspenders router-level mount: every endpoint below inherits
// JWKS-verified Bearer + admin-only gate. Admin role = ROLE_RANK 2 ≥ 2.
router.use(verifyFirebaseToken, requireMinRole('admin'));
```

**Inline regex-escape pattern (RESEARCH §Pattern 3 + Pitfall 6 — no ESM dep):**
```js
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VALID_USER_TYPES = ['user', 'moderator', 'admin'];
```

**Race-safe atomic + 409 envelope analog (lines 87-126 of moderationRoutes.js):**
```js
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({
        code: 'ALREADY_MODERATED',
        message: 'This listing was already reviewed by another moderator.',
      });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,                 // PATTERN: JWKS-verified sub, NEVER req.body
        action: 'approve',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid },
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'approve', targetId: String(result._id),
        actorUid: req.firebaseUid, err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }
    return res.json(result);
  } catch (err) {
    console.error('Error approving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

**Phase 5 PATCH handler diffs from approve analog:** see RESEARCH §Code Example 3 — full handler combines:
1. Self-mutation pre-check (Pattern 4 — fastest reject path; cheaper than count).
2. Validate `userType ∈ VALID_USER_TYPES` → 400.
3. Lookup target via `await User.findOne({ uid: targetUid }).lean()` — **`uid` not `firebaseUid`** per User model.
4. Same-tier no-op fast path (200, no roleRevokedAt change) per CONTEXT D-Discretion.
5. Demotion detection: `(fromRole === 'admin' && newRole !== 'admin') || (fromRole === 'moderator' && newRole === 'user')`.
6. Last-admin pre-flight count: `User.countDocuments({ userType: 'admin', _id: { $ne: target._id } }) < 1` → 409 LAST_ADMIN_LOCKOUT (Pitfall 1).
7. Race-safe atomic: `User.findOneAndUpdate({ uid: targetUid, userType: fromRole }, { $set })` with conditional `roleRevokedAt = new Date()` ONLY on demotion (Pitfall 3) → null result → 409 ROLE_ALREADY_CHANGED.
8. Audit-row insert in own try/catch (Pattern E) → orphan-tolerant; `actorUid: req.firebaseUid` (NEVER body).
9. Return full updated User doc (CONTEXT D-Discretion) with `__v` stripped.

**CRITICAL invariants (planner checker gates):**
- `grep -nE "actorUid: req\.(body|headers)" src/routes/adminRoutes.js` MUST return 0 matches (verbatim Phase 3 grep gate; Phase 3 baseline confirmed: `moderationRoutes.js` has 10× `actorUid: req.firebaseUid` and 0× `req.body|headers`).
- `grep -c "actorUid: req.firebaseUid" src/routes/adminRoutes.js` MUST be ≥ 1 (audit-row write present).
- `grep -nE "User\.findOne\(\s*\{\s*firebaseUid:" src/routes/adminRoutes.js` MUST return 0 — User schema field is `uid` not `firebaseUid` (drift call-out — see header).

---

### 5. `JayTap-services/src/models/RoleChangeLog.js` (NEW — model, schema)

**Analog:** `JayTap-services/src/models/ModerationLog.js` (entire 31 LOC)

**Why this analog:** RESEARCH §"Architecture Patterns" Component Responsibilities + Code Example 4. Sibling pattern explicitly cited. Drop fields specific to property moderation; keep the additive-only audit collection discipline.

**Full analog (lines 1-31 — fork-and-trim verbatim):**
```js
const mongoose = require('mongoose');

// Phase 3 — Append-only audit log for moderation actions on listings (MOD-16).
// ...comments...
const ModerationLogSchema = new mongoose.Schema({
  actorUid:   { type: String, required: true, index: true }, // JWKS-verified token sub — NEVER client-supplied
  action:     { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete'], required: true },
  targetType: { type: String, enum: ['property'], default: 'property', required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  before:     { type: mongoose.Schema.Types.Mixed },
  after:      { type: mongoose.Schema.Types.Mixed },
  reasonCode: { type: String, default: null },
  reasonNote: { type: String, default: null },
  at:         { type: Date, default: Date.now, required: true },
}, {
  collection: 'moderation_log',
});

module.exports = mongoose.model('ModerationLog', ModerationLogSchema);
```

**Phase 5 RoleChangeLog diffs from analog:**

| Line in analog | Replace with | Why |
|----------------|--------------|-----|
| `// Phase 3 — Append-only audit log for moderation actions...` | `// Phase 5 — Append-only audit log for admin role changes (ADMIN-05).` | identity rename |
| `action`, `targetType`, `targetId`, `before`, `after`, `reasonCode`, `reasonNote` | (drop all 7) | role change has no reasonCode + the `fromRole`/`toRole` fields fully capture the diff per CONTEXT D-Discretion |
| (new) | `targetUid: { type: String, required: true, index: true }` | who got role-changed (Mongo User.uid) |
| (new) | `fromRole: { type: String, enum: ['user','moderator','admin'], required: true }` | per CONTEXT D-Discretion ADMIN-05 schema |
| (new) | `toRole: { type: String, enum: ['user','moderator','admin'], required: true }` | per CONTEXT D-Discretion ADMIN-05 schema |
| `collection: 'moderation_log'` | `collection: 'role_change_log'` | new collection |
| `module.exports = mongoose.model('ModerationLog', …)` | `module.exports = mongoose.model('RoleChangeLog', RoleChangeLogSchema)` | new model name |

---

### 6. `JayTap-services/src/__tests__/adminRoutes.test.js` (NEW — test)

**Analog:** `JayTap-services/src/__tests__/moderationRoutes.test.js` (531 LOC)

**Why this analog:** Same env-setup + same firebase mock + same supertest harness + same role-gating per-endpoint pattern + same Promise.all race-condition primitive. RESEARCH §"Validation Architecture" implicit; the Phase 3 test file IS the canonical pattern.

**Env-setup skeleton (lines 25-44 — copy verbatim):**
```js
// CRITICAL: set env BEFORE requiring anything that loads adminRoutes.
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
// (AWS env vars not needed for adminRoutes — no multer-s3 — but set defensively.)

jest.mock('../config/firebase', () => {
  const { importJWK } = require('jose');
  const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens');
  const JWKS = async () => {
    const { publicJwk } = await getKeys();
    return await importJWK(publicJwk, 'RS256');
  };
  return { JWKS, ISSUER: TEST_ISSUER, FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID };
});

const request = require('supertest');
const express = require('express');
const { router: adminRouter } = require('../routes/adminRoutes');
const User = require('../models/User');
const RoleChangeLog = require('../models/RoleChangeLog');
const { buildToken } = require('./fixtures/jwks-tokens');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
}
```

**Per-test seeding (lines 65-81 of analog — fork):**
```js
beforeEach(async () => {
  app = makeApp();
  await User.create({ uid: 'admin-a-uid',  email: 'admin-a@x.com',  userType: 'admin' });
  await User.create({ uid: 'admin-b-uid',  email: 'admin-b@x.com',  userType: 'admin' });
  await User.create({ uid: 'mod-uid',      email: 'mod@x.com',       userType: 'moderator' });
  await User.create({ uid: 'plain-uid',    email: 'plain@x.com',     userType: 'user' });
});
```

**Race-condition test (lines 89-112 of analog — fork to demote-the-last-but-one-admin scenario per Pitfall 1):**
```js
describe('ADMIN-03 + Pitfall 1: last-admin-lockout race', () => {
  test('two concurrent demotes of last-but-one admin: exactly one returns 409 LAST_ADMIN_LOCKOUT', async () => {
    // Setup: two admins (A, B). Two other admins (X, Y) try to demote them simultaneously.
    // Pre-flight count must catch one of them to prevent zero-admin lockout.
    const tokenX = await buildToken({ sub: 'admin-x-uid', role: 'admin', kind: 'valid' });
    // ... see RESEARCH §Pitfall 1 for the full setup
    const [resA, resB] = await Promise.all([
      request(app).patch(`/api/admin/users/admin-a-uid/role`).send({ userType: 'user' }).set('Authorization', `Bearer ${tokenX}`),
      request(app).patch(`/api/admin/users/admin-b-uid/role`).send({ userType: 'user' }).set('Authorization', `Bearer ${tokenX}`),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = resA.status === 409 ? resA : resB;
    expect(loser.body.code).toBe('LAST_ADMIN_LOCKOUT');
  });
});
```

**Anti-spoofing test (lines 157-180 of analog — fork verbatim shape, swap action):**
```js
describe('ADMIN-05 + Pitfall 4: actorUid token-derivation', () => {
  test('actorUid CANNOT be spoofed via request body', async () => {
    const token = await buildToken({ sub: 'admin-a-uid', role: 'admin', kind: 'valid' });
    await request(app)
      .patch(`/api/admin/users/mod-uid/role`)
      .send({ userType: 'admin', actorUid: 'victim-admin-uid' })   // attempt spoof
      .set('Authorization', `Bearer ${token}`);
    const log = await RoleChangeLog.findOne({ targetUid: 'mod-uid' });
    expect(log.actorUid).toBe('admin-a-uid');                       // JWKS sub wins
  });
});
```

**Test sections to author (RESEARCH §"Validation Architecture" implied):**
1. ADMIN-01 — search returns 50-cap, regex escape, empty query → empty items
2. ADMIN-02 — happy-path PATCH (3 cases: user→mod, mod→admin, admin→user with roleRevokedAt bump)
3. ADMIN-03 — last-admin lockout (Promise.all race + sequential demote)
4. ADMIN-04 — self-mutation 403 (req.firebaseUid === req.params.uid)
5. ADMIN-05 — RoleChangeLog row written with correct shape; actorUid anti-spoof
6. ADMIN-06 — admin-only enforcement: moderator/user/guest get 403 from `requireMinRole('admin')` on both endpoints
7. ADMIN-07 — endpoint shape matches contract (404 USER_NOT_FOUND on missing uid; 400 invalid userType)
8. Pitfall 3 — promotion does NOT bump roleRevokedAt (admin-only test)
9. Pitfall 5 (client-only — N/A for backend test file)

---

### 7. `App.tsx` (MODIFY — screen-wiring, event-driven)

**Analog (sites within same file):** `App.tsx:65, 121-128, 327-330, 380-400, 528-537, 730-741, 1043-1067` — the existing `isModerationQueueOpen` overlay shape.

**Why this analog:** RESEARCH §Pattern B locks this. Phase 5 adds a sibling overlay flag with identical structure. Net +30-40 LOC.

**Insertion site 1 — state cluster (line 65, sibling addition):**
```tsx
// Read first: lines 60-67 to see the moderation cluster
const [isModerationQueueOpen, setIsModerationQueueOpen] = useState(false);    // existing line 65
// ADD AFTER:
const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);      // Phase 5 — admin role management overlay
```

**Insertion site 2 — OVERLAY_FLAGS array (lines 121-128, append entry):**
```tsx
// Read first: lines 115-128
const OVERLAY_FLAGS = [
  !!selectedProperty,
  isRenterListingsOpen,
  !!user && isCreateListingOpen,
  !!activeTourUrl,
  !!activePhotosUrl,
  !!user && isModerationQueueOpen, // Phase 3 Plan 06 — moderation queue overlay
  !!user && isRoleManagementOpen,  // Phase 5 — admin role management overlay   {/* NEW */}
];
```

**Insertion site 3 — back-handler branch (lines 327-330, sibling):**
```tsx
// Read first: lines 320-335
// Phase 3 Plan 06 — moderation queue (sibling to landlord-app queue).
if (isModerationQueueOpen) {
  setIsModerationQueueOpen(false);
  return true;
}
// Phase 5 — admin role management overlay   {/* NEW */}
if (isRoleManagementOpen) {
  setIsRoleManagementOpen(false);
  return true;
}
```

**Insertion site 4 — back-handler deps array (line 394):**
```tsx
// Read first: lines 380-405
// Append `isRoleManagementOpen` to the useEffect deps array (sibling to line 394).
```

**Insertion site 5 — Profile dispatcher callback (lines 532-537, sibling):**
```tsx
// Read first: lines 528-540
// Phase 3 Plan 06 Task 04 — Profile entry-point dispatcher for the moderation queue overlay.
const onProfileReviewModerationQueue = useCallback(() => {
  setIsProfileOpen(false);
  setIsModerationQueueOpen(true);
}, []);
// Phase 5 — Profile entry-point dispatcher for role management overlay   {/* NEW */}
const onProfileOpenRoleManagement = useCallback(() => {
  setIsProfileOpen(false);
  setIsRoleManagementOpen(true);
}, []);
```

**Insertion site 6 — ProfileScreen prop wiring (line 739, sibling):**
```tsx
// Read first: lines 730-742
<ProfileScreen
  ...
  onReviewModerationQueue={canViewModerationQueue ? onProfileReviewModerationQueue : undefined}
  moderationCountRefreshKey={moderationCountRefreshKey}
  // ADD:
  onOpenRoleManagement={canManageRoles ? onProfileOpenRoleManagement : undefined}    {/* NEW */}
/>
```

(Also: derive `const canManageRoles = canFromUser(user, 'manageRoles');` near line 137 — sibling to existing `canViewModerationQueue`.)

**Insertion site 7 — overlay mount block (lines 1043-1067, sibling):**
```tsx
// Read first: lines 1040-1070
{/* Phase 3 Plan 06 — Moderation queue overlay (sibling to landlord-app queue). */}
{!!user && isModerationQueueOpen && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <ModerationQueueScreen
      onBack={() => { ... }}
      onOpenPropertyDetails={...}
      onEditOnBehalf={(p) => { ... }}
    />
  </View>
)}
{/* Phase 5 — Admin role management overlay (sibling to moderation queue). */}    {/* NEW */}
{!!user && isRoleManagementOpen && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <RoleManagementScreen
      onBack={() => setIsRoleManagementOpen(false)}
    />
  </View>
)}
```

**Import at top of file (line 37 sibling — read first lines 30-45):**
```tsx
import ModerationQueueScreen from './src/screens/ModerationQueueScreen';   // existing line 37
// ADD:
import RoleManagementScreen from './src/screens/RoleManagementScreen';
```

---

### 8. `src/screens/ProfileScreen.tsx` (MODIFY — entry-point row)

**Analog (within same file):** `src/screens/ProfileScreen.tsx:281-303` (existing `canViewModerationQueue` block, lines 281-303)

**Why this analog:** UI-SPEC §"Profile entry-point geometry" + RESEARCH §Pattern A explicit. Phase 5's row sits directly below the Moderation Queue row; same `<>` fragment + menuDivider + TouchableOpacity + icon + Text + ChevronRight pattern, but DROP the badge sibling (no pending-count semantic per UI-SPEC).

**Read first: lines 278-305 (full Moderation Queue block + the closing `</View>` it sits inside).**

**Existing block (lines 281-303):**
```tsx
{canViewModerationQueue && onReviewModerationQueue && (
    <>
        <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
        <TouchableOpacity
            style={styles.menuRow}
            onPress={onReviewModerationQueue}
            activeOpacity={0.7}
            accessibilityLabel={`${t('moderation.queue.entryPoint')}: ${t('moderation.queue.entryPoint.a11yPending').replace('{count}', String(displayCount))}`}
        >
            <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
            <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
                {t('moderation.queue.entryPoint')}
            </Text>
            {displayCount > 0 && (                                          {/* DROP badge in Phase 5 row */}
                <View style={[styles.pendingBadge, { backgroundColor: themeStyles.accent }]}>
                    <Text style={styles.pendingBadgeText}>{displayCount}</Text>
                </View>
            )}
            <ChevronRight size={20} color={themeStyles.textSecondary} />
        </TouchableOpacity>
    </>
)}
```

**Phase 5 ADD (insert AFTER line 303, before line 304's closing `</View>`):**
```tsx
{/* Phase 5 — Admin role management entry-point. Mirrors moderation row above; drops pending-count badge. */}
{canManageRoles && onOpenRoleManagement && (
    <>
        <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
        <TouchableOpacity
            style={styles.menuRow}
            onPress={onOpenRoleManagement}
            activeOpacity={0.7}
            accessibilityLabel={t('admin.roles.entryPoint')}
        >
            <UserCog size={22} color={themeStyles.accent} strokeWidth={1.5} />    {/* OR Users — planner picks per UI-SPEC */}
            <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
                {t('admin.roles.entryPoint')}
            </Text>
            <ChevronRight size={20} color={themeStyles.textSecondary} />
        </TouchableOpacity>
    </>
)}
```

**Other diffs in ProfileScreen.tsx:**
- Add `canManageRoles = can('manageRoles')` near line 51 (sibling to existing `canViewModerationQueue = can('viewModerationQueue')`).
- Add `onOpenRoleManagement?: () => void` to ProfileScreenProps (line 30 sibling).
- Add `onOpenRoleManagement` to function-arg destructure (line 34).
- Add `UserCog` (or `Users`) to lucide-react-native import block (search for existing `Inbox` import).

---

### 9. `src/hooks/useRole.ts` (MODIFY — Action union rename)

**Analog (within same file):** `src/hooks/useRole.ts:14-26` (Action union) + `:80-92` (canFromUser switch admin block)

**Why this analog:** RESEARCH §Pattern G explicit. Mechanical rename; admin-only block is already correct (line 84 `case 'promoteToModerator':` is already inside the admin-only fall-through).

**Edit 1 — Action union member (line 21):**
```tsx
// Current line 21:
| 'promoteToModerator'             // M2 forward-compat — admin only

// Change to:
| 'manageRoles'                    // M2 Phase 5 (ADMIN-02 / D-Discretion) — admin only (renamed from promoteToModerator)
```

**Edit 2 — canFromUser switch case (line 84):**
```tsx
// Current lines 80-87:
switch (action) {
  case 'editVerifications':
  case 'editMatterportUrl':
  case 'editPanoramicUrl':
  case 'promoteToModerator':              // line 84
  case 'reviewLandlordApplications':
  case 'hardDeleteListing':
    return role === 'admin';

// Change line 84 to:
  case 'manageRoles':
```

(The admin-only block is already correct — falls through to `return role === 'admin'`.)

---

### 10. `src/hooks/__tests__/useRole.test.ts` (MODIFY — rename + new test row)

**Analog (within same file):** `src/hooks/__tests__/useRole.test.ts:127-136` (existing `promoteToModerator` test block) + `:97` (single-line ref inside another test)

**Why this analog:** RESEARCH §Pattern G + CONTEXT D-Discretion explicit (4 test references + new test row).

**Edit 1 — line 97 (single string-literal swap):**
```tsx
expect(canFromUser(moderator, 'promoteToModerator')).toBe(false);
// →
expect(canFromUser(moderator, 'manageRoles')).toBe(false);
```

**Edit 2 — lines 127-136 (full test block rename, 5 string-literal swaps + 1 description swap):**
```tsx
test('promoteToModerator is admin-only (no moderator self-promotion + no allowlist bypass)', () => {
  expect(canFromUser(admin, 'promoteToModerator')).toBe(true);
  expect(canFromUser(moderator, 'promoteToModerator')).toBe(false);
  expect(canFromUser(plainUser, 'promoteToModerator')).toBe(false);
  const formerlyAllowlisted = {
    email: 'beckprograms@gmail.com',
    backendProfile: { userType: 'user' },
  };
  expect(canFromUser(formerlyAllowlisted, 'promoteToModerator')).toBe(false);
});
// →
test('manageRoles is admin-only (no moderator self-promotion + no allowlist bypass)', () => {
  expect(canFromUser(admin, 'manageRoles')).toBe(true);
  expect(canFromUser(moderator, 'manageRoles')).toBe(false);
  expect(canFromUser(plainUser, 'manageRoles')).toBe(false);
  const formerlyAllowlisted = {
    email: 'beckprograms@gmail.com',
    backendProfile: { userType: 'user' },
  };
  expect(canFromUser(formerlyAllowlisted, 'manageRoles')).toBe(false);
});
```

**Edit 3 — ADD new top-level describe block (after line 158, sibling to `viewModerationQueue` block per CONTEXT D-Discretion + UI-SPEC §"`useRole.ts` Action union RENAME"):**
```tsx
// Phase 5 — manageRoles action gate tests
describe('manageRoles (Phase 5 / ADMIN-02 / D-Discretion)', () => {
  test('admin can manageRoles', () => {
    const user = { backendProfile: { userType: 'admin' } };
    expect(canFromUser(user, 'manageRoles')).toBe(true);
  });
  test('moderator CANNOT manageRoles (admin-exclusive privilege)', () => {
    const user = { backendProfile: { userType: 'moderator' } };
    expect(canFromUser(user, 'manageRoles')).toBe(false);
  });
  test('plain user CANNOT manageRoles', () => {
    const user = { backendProfile: { userType: 'user' } };
    expect(canFromUser(user, 'manageRoles')).toBe(false);
  });
  test('guest CANNOT manageRoles', () => {
    expect(canFromUser(null, 'manageRoles')).toBe(false);
  });
});
```

**CRITICAL invariant (planner gate):** post-rename, `grep -rn "promoteToModerator" src App.tsx` MUST return 0 matches. Atomic single-commit per RESEARCH §Pattern G.

---

### 11. `src/locales/en.ts` + `src/locales/ru.ts` (MODIFY — append namespace)

**Analog (within same file):** `src/locales/en.ts:589-616` + `src/locales/ru.ts:592-619` (existing `moderation.queue.entryPoint` + `moderation.race.toast` + `moderation.queue.entryPoint.a11yPending` block)

**Why this analog:** UI-SPEC §"Copywriting Contract" enumerates all 22-26 keys × 2 locales. `admin.roles.*` namespace is clean (0 hits per RESEARCH §"Standard Stack" verification). `common.cancel` already exists (en.ts:4, ru.ts:6) and is REUSED — do NOT duplicate.

**Insertion site:** Append to the end of the existing `admin.*` cluster OR add fresh after the moderation block (~line 616 en, ~line 619 ru). Read first: en.ts:589-621 and ru.ts:592-622 to find the right insertion site.

**Locale keys to add per UI-SPEC §"Copywriting Contract" tables (verbatim — DO NOT improvise):**

| Key | EN | RU |
|-----|----|----|
| `admin.roles.entryPoint` | Role Management | Управление ролями |
| `admin.roles.title` | Role Management | Управление ролями |
| `admin.roles.search.placeholder` | Search by email | Поиск по email |
| `admin.roles.search.prompt` | Type to search | Введите запрос для поиска |
| `admin.roles.search.noResults` | No users match '{query}'. | Пользователи по запросу «{query}» не найдены. |
| `admin.roles.search.refineHint` | Refine your search to see more results. | Уточните запрос, чтобы увидеть больше результатов. |
| `admin.roles.label.user` | User | Пользователь |
| `admin.roles.label.moderator` | Moderator | Модератор |
| `admin.roles.label.admin` | Admin | Администратор |
| `admin.roles.currentSuffix` | (current) | (текущая) |
| `admin.roles.selfBadge` | (you) | (вы) |
| `admin.roles.revokedAt` | Revoked: {date} | Отозвано: {date} |
| `admin.roles.modal.title` | Change role | Изменить роль |
| `admin.roles.modal.targetIdentity` | {displayName} — {email} | {displayName} — {email} |
| `admin.roles.modal.confirmPrompt` | Change {displayName} from {fromRole} to {toRole}? | Изменить роль {displayName} с {fromRole} на {toRole}? |
| `admin.roles.modal.submit` | Update Role | Обновить роль |
| `admin.roles.success.toast` | Role updated | Роль обновлена |
| `admin.roles.error.lastAdminLockout.title` | Cannot change role | Нельзя изменить роль |
| `admin.roles.error.lastAdminLockout.body` | {displayName} is the only admin. Promote another user to admin first. | {displayName} единственный администратор. Сначала повысьте другого пользователя до администратора. |
| `admin.roles.error.selfMutation` | You cannot change your own role. | Вы не можете изменить свою роль. |
| `admin.roles.error.roleAlreadyChanged` | Another admin already updated this user. | Другой администратор уже изменил роль этого пользователя. |
| `admin.roles.error.userNotFound` | This user no longer exists. | Этот пользователь больше не существует. |
| `admin.roles.error.network` | Network error. Please try again. | Ошибка сети. Попробуйте ещё раз. |

**Total: 23 new keys × 2 locales = 46 lines added per file** (within UI-SPEC's 22-26 budget).

**CRITICAL invariant (planner gate):** `bash scripts/check-i18n-parity.sh` MUST exit 0 after every commit touching either file. Strict diff — keys must land in both en.ts AND ru.ts in the SAME commit.

---

### 12. `JayTap-services/index.js` (MODIFY — route mount)

**Analog (within same file):** `JayTap-services/index.js:122-123` (existing moderationRoutes mount)

**Why this analog:** RESEARCH §"Component Responsibilities" explicit. Single-line addition directly below the moderationRoutes mount.

**Read first: lines 113-125.**

**Existing block (lines 113-123):**
```js
// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/favorites', require('./src/routes/favoriteRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/appointments', require('./src/routes/appointmentRoutes'));
// Phase 4.5 — Landlord application workflow.
app.use('/api/landlord-applications', require('./src/routes/landlordApplicationRoutes'));
// Phase 3 — Moderation queue + actions (MOD-10..MOD-18). All endpoints require role >= moderator.
app.use('/api/moderation', require('./src/routes/moderationRoutes').router);
```

**Phase 5 ADD after line 123:**
```js
// Phase 5 — Admin role management (ADMIN-01..ADMIN-07). All endpoints require role === admin.
app.use('/api/admin', require('./src/routes/adminRoutes').router);
```

(The `.router` extraction matches moderationRoutes.js's `module.exports = { router, VALID_REJECT_CODES }` shape; adminRoutes.js will export `{ router, VALID_USER_TYPES }` per RESEARCH §Code Example 1.)

---

## Shared Patterns

### A. Belt-and-suspenders gating (3-layer enforcement)

**Source:** RESEARCH §"Established Patterns" — Phase 1 → Phase 4 carry-forward; ROADMAP success criterion.

**Apply to:** Every PHASE 5 file that touches the role-management capability.

**The 3 layers:**
1. **Client `<Gated>` predicate** — UX layer hiding affordances. Sites: `App.tsx` (`canManageRoles && ...`), `ProfileScreen.tsx` (`canManageRoles && onOpenRoleManagement && (<TouchableOpacity ...>)`).
2. **Service `canFromUser` belt-and-suspenders** — pre-HTTP guard. Sites: `UserService.searchUsers` + `UserService.setUserRole` (both call `canFromUser(userData, 'manageRoles')` and throw `PermissionDeniedError` if false).
3. **Backend `requireMinRole('admin')` middleware** — security boundary. Site: `adminRoutes.js:50` router-level mount.

```ts
// Layer 2 service-side guard — copy verbatim per Phase 3/4 precedent
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';
const userData = await AuthService.getUserData();
if (!canFromUser(userData, 'manageRoles')) {
  console.error('[UserService.setUserRole] permission denied', { userId: userData?.localId });
  throw new PermissionDeniedError();
}
```

```js
// Layer 3 backend gate — copy verbatim from moderationRoutes.js:50
router.use(verifyFirebaseToken, requireMinRole('admin'));
```

### B. `actorUid: req.firebaseUid` anti-spoofing rule

**Source:** Phase 3 MOD-16 + Phase 4 ARCH-05 (auto-memory: `phase45-landlord-application-uid-mismatch-bug.md`).

**Apply to:** `JayTap-services/src/routes/adminRoutes.js` (every audit-row insert).

**The rule:** `actorUid` MUST come from `req.firebaseUid` (the JWKS-verified token sub claim set by `verifyFirebaseToken` middleware). NEVER from `req.body.*` or `req.headers.*`.

**Checker gate (planner MUST embed in tasks):**
```bash
grep -nE "actorUid: req\.(body|headers)" src/routes/adminRoutes.js
# Expected: 0 matches
grep -c "actorUid: req.firebaseUid" src/routes/adminRoutes.js
# Expected: ≥ 1 match (audit-row insert present)
```

**Backend supertest case (port from Phase 3 lines 157-180):**
```js
test('actorUid CANNOT be spoofed via request body', async () => {
  await request(app).patch(...).send({ userType: 'admin', actorUid: 'victim-uid' }).set(...);
  const log = await RoleChangeLog.findOne({ targetUid: '...' });
  expect(log.actorUid).toBe('admin-a-uid');  // JWKS sub wins
});
```

### C. Race-safe atomic + 409 envelope idiom

**Source:** `JayTap-services/src/routes/moderationRoutes.js:87-100` (approve handler) + `:143-175` (reject handler) — Phase 3 D-08, Phase 4 D-04.

**Apply to:** `adminRoutes.js` PATCH `/users/:uid/role` handler.

**The pattern:** `findOneAndUpdate({_id, userType: oldRole}, ...)` filter doubles as the lock primitive. Null result → 409 with `{code, message}` envelope.

```js
const result = await User.findOneAndUpdate(
  { uid: targetUid, userType: fromRole },        // race-safety filter — note `uid` not `_id`
  { $set },                                       // $set includes conditional roleRevokedAt
  { new: true }
);
if (!result) {
  return res.status(409).json({
    code: 'ROLE_ALREADY_CHANGED',
    message: 'This user\'s role was already changed by another admin.',
  });
}
```

### D. Audit-row write — orphan-tolerant idiom

**Source:** `JayTap-services/src/routes/moderationRoutes.js:101-120` (approve audit) — Phase 3 D-10, Phase 4 D-18.

**Apply to:** `adminRoutes.js` PATCH handler — RoleChangeLog insert.

**The pattern:** Wrap `await Log.create(...)` in its OWN try/catch. A successful role mutation followed by a failed audit insert logs `JSON.stringify({evt: 'role_change_audit_orphan', ...})` and STILL returns 200 (the role mutation IS load-bearing; the audit row is forward-fit observability).

```js
try {
  await RoleChangeLog.create({
    actorUid: req.firebaseUid,
    targetUid: targetUid,
    fromRole, toRole: newRole,
    at: new Date(),
  });
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'role_change_audit_orphan',
    targetUid, actorUid: req.firebaseUid,
    fromRole, toRole: newRole,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}
```

### E. Locale parity — `scripts/check-i18n-parity.sh` strict-diff CI gate

**Source:** Phase 3 MOD-18 + Phase 4 D-17.

**Apply to:** Every commit touching `src/locales/en.ts` OR `src/locales/ru.ts`.

**Checker gate (planner MUST embed in tasks):**
```bash
bash scripts/check-i18n-parity.sh
# Expected: exit 0 (no key drift between EN and RU)
```

23 new keys per CONTEXT D-12 + UI-SPEC §"Copywriting Contract" — they MUST all land in both files in the SAME commit.

### F. AppState 60s per-screen `useRef` cooldown

**Source:** `src/screens/ModerationQueueScreen.tsx:55-58, 76, 109-122` — Phase 3 PATTERNS §E.

**Apply to:** `src/screens/RoleManagementScreen.tsx` AppState 'active' refetch.

**The rule:** Per-SCREEN `useRef`, NOT module-scope. Module-scope leaks across open/close cycles. Each AppState consumer (Auth refresh-role + ModerationQueue refetch + RoleManagement refetch) uses its OWN cooldown ref because each fires DIFFERENT work.

### G. Backend test `nvm use 24` precondition

**Source:** Auto-memory `backend-node-version.md` — `JayTap-services/package.json` declares `engines.node >=22.12.0`; default shell is v20.

**Apply to:** Every backend command in Phase 5 task fixtures.

**Checker gate (planner MUST embed in tasks):**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test -- adminRoutes.test.js
```

### H. tsc baseline — preserve 2 ThemeContext errors, add zero new ones

**Source:** Phase 4 verifier baseline (auto-memory `gsd-verifier-misses-regressions.md`).

**Apply to:** Every commit touching client TypeScript.

**Checker gate:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx tsc --noEmit 2>&1 | grep -c 'error TS' 
# Expected: 2 (the existing ThemeContext baseline). Phase 5 must NOT regress this.
```

---

## No Analog Found

All 12 files have strong analogs in-repo. **Zero "no analog" rows for Phase 5.**

The closest thing to a novel surface is the **two-phase compare-and-swap for last-admin lockout** (RESEARCH §Pitfall 1) — Mongo's `findOneAndUpdate` cannot embed a "still-≥1-admin" check in the filter, so the planner uses a pre-flight `countDocuments({userType:'admin', _id: {$ne: target._id}})` BEFORE the atomic update. Code shape is in RESEARCH §Code Example 3 — direct copy from the research doc, no new analog needed.

---

## Critical Invariants (Checker Gates for the Planner)

The planner MUST embed these as task-level checker gates:

1. **Anti-spoofing grep gate** (carry-forward Phase 3): `grep -nE "actorUid: req\.(body|headers)" src/routes/adminRoutes.js` returns 0 matches.
2. **`<Gated>` placement gate**: `grep -c "<Gated" src/components/RoleChangeModal.tsx` returns 0 (Gated belongs to caller / overlay mount, not modal).
3. **Locale parity gate**: `bash scripts/check-i18n-parity.sh` exits 0 after every commit touching en.ts or ru.ts.
4. **tsc baseline gate**: `npx tsc --noEmit 2>&1 | grep -c 'error TS'` returns 2 (preserve existing ThemeContext baseline; do not regress).
5. **Backend Node-version gate**: `nvm use 24` before any `npm test` / `npm start` in JayTap-services.
6. **Rename atomicity gate**: `grep -rn "promoteToModerator" src App.tsx` returns 0 matches AFTER the rename commit.
7. **User schema field gate**: `grep -nE "User\.findOne\(\s*\{\s*firebaseUid:" src/routes/adminRoutes.js` returns 0 — User schema field is `uid` not `firebaseUid`.
8. **App.tsx LOC drift documented**: SUMMARY notes `1191 → 1221-1231` (signal-not-block per PATTERN D).

---

## Metadata

**Analog search scope:**
- RN client: `/Users/beckmaldinVL/development/mobileApps/JayTap/src/{screens,components,services,hooks,locales}/` + `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx`
- Backend: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/{routes,models,middleware,__tests__}/` + `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js`

**Files scanned (read by Read tool):** 13 (analog files for excerpts) + 5 upstream artifacts (CONTEXT.md, RESEARCH.md, UI-SPEC.md, CLAUDE.md, Phase 4 PATTERNS.md)

**Pattern extraction date:** 2026-05-03

**Phase 4 PATTERNS.md shape match:** confirmed — same `## File Classification` table → `## Pattern Assignments` per-file → `## Shared Patterns` lettered idioms → `## Critical Invariants` checker gates structure.

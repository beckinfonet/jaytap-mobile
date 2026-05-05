# Phase 3: Moderation Queue + Actions + Edit-on-Behalf — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 14 (5 NEW, 9 MODIFIED) across 2 repos
**Analogs found:** 14 / 14 (every file has at least one strong sibling-pattern in this codebase)

> Phase 3 is a near-perfect "sibling pattern reuse" phase. Every new file maps 1:1 to an existing Phase 4.5 file (queue screen, audit log, route file, status banner) or a Phase 1/2 module (apiClient, useRole, RejectionBanner). The only invariant the planner MUST diverge from precedent on is the **race-condition-safe atomic `findOneAndUpdate`** (Phase 4.5's load-then-check pattern is explicitly the wrong template for Phase 3 — see Pattern §B below).

---

## File Classification

### NEW files

| New file | Repo | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|------|-----------|----------------|---------------|
| `src/screens/ModerationQueueScreen.tsx` | client | screen (overlay) | request-response + pull-to-refresh | `src/screens/LandlordApplicationQueueScreen.tsx` | **exact** (FIFO admin queue + Approve/Reject + RefreshControl) |
| `src/components/RejectListingModal.tsx` | client | component (modal) | request-response | `src/screens/LandlordApplicationQueueScreen.tsx` lines 207-275 (inline reject modal) | **exact** (chip row + reasonNote TextInput + Submit/Cancel) |
| `src/config/serviceAreas.js` | backend | config | static const | `src/config/db.js`, `src/config/firebase.js` (sibling const-export style) | role-match (no prior service-area config exists) |
| `src/models/ModerationLog.js` | backend | model (Mongoose) | append-only insert | `src/models/LandlordApplicationAuditLog.js` | **exact** (audit-only, append-only, Mixed before/after) |
| `src/routes/moderationRoutes.js` | backend | route (Express) | request-response (CRUD + state-flip) | `src/routes/landlordApplicationRoutes.js` | **exact** (admin-queue + decide endpoint with reject reasons + audit insert) |

### MODIFIED files

| Modified file | Repo | Role | Data Flow | Pattern Source | Match Quality |
|---------------|------|------|-----------|----------------|---------------|
| `App.tsx` | client | orchestrator (overlay state machine) | event-driven (UI nav state) | self-pattern: `isLandlordApplicationQueueOpen` + OVERLAY_FLAGS | **exact** (mirror the existing 4.5 mount block + back-handler + reset hook) |
| `src/screens/ProfileScreen.tsx` | client | screen (menu) | request-response (count fetch) | self-pattern: `canReviewLandlordApplications && onReviewLandlordApplications && (...)` (lines 210-219) | **exact** |
| `src/screens/PropertyDetailsScreen.tsx` | client | screen (detail) | request-response | adds an inline action footer; no exact analog — uses Phase 4.5 actionBtn shape (LandlordApplicationQueueScreen.tsx lines 309-321) | role-match |
| `src/screens/CreateListingScreen.tsx` | client | screen (form) | request-response (CRUD) | self-pattern: `propertyToEdit` prop plumbing (already supports edit-mode) | role-match (extend with `moderatorContext`) |
| `src/hooks/useRole.ts` | client | hook (selector) | pure (no IO) | self-pattern: existing `Action` union + `canFromUser` switch | **exact** (additive — new union member + new case) |
| `src/services/PropertyService.ts` | client | service (HTTP) | request-response | self-pattern: existing `archiveProperty` / `unarchiveProperty` PropertyService methods + `LandlordApplicationService` admin methods | **exact** |
| `src/components/RejectionBanner.tsx` | client | component (presentation) | pure (props → JSX) | self-pattern: line 37 `codeLabel` resolution; only -1/+1 LOC change for D-09 i18n lookup | minimal patch |
| `src/locales/en.ts` + `src/locales/ru.ts` | client | locales (i18n) | static const | self-pattern: existing `landlordApp.rejectReason.{code}` namespace at en.ts:570-573 | **exact** |
| `index.js` (backend root) or `app.js` | backend | bootstrap | static (mount) | self-pattern: existing `app.use('/api/landlord-applications', ...)` mount block | **exact** (one new line) |

---

## Pattern Assignments

### NEW — `src/routes/moderationRoutes.js` (backend, route, request-response)

**Analog:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js`

**Imports + auth pattern** (analog lines 12-20, 47-59):

```javascript
const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const ModerationLog = require('../models/ModerationLog');
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');

// Mount auth at the router level — every endpoint inherits both middlewares,
// no per-route repetition. (Phase 4.5 mounts per-route; Phase 3 can router.use(...)
// because every endpoint is moderator+ gated.)
router.use(verifyFirebaseToken, requireMinRole('moderator'));

const VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];
```

**Reject-code validation pattern** (analog line 46 — copy verbatim, swap the enum values):

```javascript
// landlordApplicationRoutes.js line 46:
const VALID_REJECT_CODES = ['incomplete-info', 'invalid-id', 'duplicate', 'other'];

// Phase 3 — same shape, different domain enum:
const VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];
```

**Audit-log follow-up insert pattern** (analog lines 135-142, 261-268):

```javascript
// After the state flip succeeds, insert audit row. If audit insert fails,
// log loudly but DO NOT rollback the state flip (D-10: orphan-tolerant).
await LandlordApplicationAuditLog.create({
  applicationId: app._id,
  applicantUid: app.uid,
  actorUid: req.firebaseUid,        // <-- always from JWKS-verified token
  action: 'approve',
  before,
  after: { status: 'approved' },
});
```

**Reject endpoint reasonCode + reasonNote pattern** (analog lines 280-289):

```javascript
await LandlordApplicationAuditLog.create({
  applicationId: app._id,
  applicantUid: app.uid,
  actorUid: req.firebaseUid,
  action: 'reject',
  before,
  after: { status: 'rejected' },
  reasonCode,
  reasonNote: reasonNote || null,
});
```

**Queue endpoint pattern** (analog lines 211-222 — admin queue):

```javascript
router.get('/admin/queue', verifyFirebaseToken, requireMinRole('admin'), async (req, res) => {
  try {
    const status = req.query.status || 'submitted';
    const filter = status === 'all' ? {} : { status };
    const apps = await LandlordApplication.find(filter).sort({ submittedAt: 1 });
    res.json(apps);
  } catch (error) {
    console.error('Error fetching admin queue:', error);
    res.status(500).json({ message: error.message });
  }
});
```

Phase 3 queue endpoint differs in two ways:
1. Filter is locked: `{ status: 'pending' }` (Phase 3 doesn't support `?status=all` per CONTEXT D-04 — only pending list).
2. Response shape: `{ items, totalCount }` per RESEARCH §"Code Examples" line 628 (D-03 piggyback to avoid a 5th endpoint).

> **CRITICAL DEVIATION FROM ANALOG:** The analog uses a **load-then-check** race pattern (lines 238-246: `if (app.status !== 'submitted') return 409`). This is **NOT race-safe** for Phase 3's higher-frequency listing queue. See "Shared Patterns §B — Atomic state transitions" below.

---

### NEW — `src/models/ModerationLog.js` (backend, model, append-only insert)

**Analog:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplicationAuditLog.js`

**Schema pattern** (full analog file — lines 1-25):

```javascript
const mongoose = require('mongoose');

const LandlordApplicationAuditLogSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordApplication', required: true, index: true },
  applicantUid: { type: String, required: true, index: true },
  actorUid: { type: String, required: true },           // who performed the action
  action: {
    type: String,
    enum: ['submit', 'approve', 'reject', 'withdraw'],
    required: true,
  },
  before: { type: mongoose.Schema.Types.Mixed },         // pre-action snapshot
  after: { type: mongoose.Schema.Types.Mixed },          // post-action snapshot
  reasonCode: { type: String, default: null },
  reasonNote: { type: String, default: null },
  at: { type: Date, default: Date.now, required: true },
}, {
  collection: 'landlord_application_audit_log',
});

module.exports = mongoose.model('LandlordApplicationAuditLog', LandlordApplicationAuditLogSchema);
```

**Phase 3 adaptations** (per RESEARCH §"Backend: New Mongoose audit model" lines 723-749):

- Drop `applicationId` + `applicantUid` (Phase 3 audits properties, not applications).
- Add `targetType: { enum: ['property'], default: 'property' }` for forward-compat with Phase 4 archive audits.
- Add `targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }` (the Property `_id`).
- Action enum becomes `['approve', 'reject', 'edit-on-behalf']`.
- Collection name: `'moderation_log'`.

---

### NEW — `src/config/serviceAreas.js` (backend, config, static const)

**Analog:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/config/db.js` (sibling structure — `module.exports = { ... }` const file in `src/config/`)

No Phase 4.5 analog because no prior config of this shape exists. Pattern is from RESEARCH §"Pattern 7: serviceAreas config forward-fit" (lines 464-487):

```javascript
// JayTap-services/src/config/serviceAreas.js
// M2 default: Bishkek launch market only.
// M3+ TODO: Almaty (KZ), Tashkent (UZ), and smaller cities across all three countries.
// M3+ admin UI for editing this list is OUT OF SCOPE for M2.
module.exports = {
  serviceAreas: [
    { name: 'Bishkek', country: 'KG' },
  ],
};

// Optional helper (not strictly needed in M2 — `out-of-service-area` reasonCode is
// a free moderator choice, NOT server-validated against the listing's location):
module.exports.isInServiceArea = (city, country) =>
  module.exports.serviceAreas.some(a =>
    a.name.toLowerCase() === (city || '').toLowerCase() &&
    a.country.toUpperCase() === (country || 'KG').toUpperCase()
  );
```

> **Note:** The `serviceAreas` list is NOT enforced server-side in Phase 3. The reasonCode chip is a free moderator choice; the list informs M3+ admin UX. Phase 3 ships only the storage location.

---

### NEW — `src/screens/ModerationQueueScreen.tsx` (client, screen overlay, request-response + pull-to-refresh)

**Analog:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/LandlordApplicationQueueScreen.tsx` (379 LOC — verbatim structural template)

**Imports pattern** (analog lines 4-30):

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator,
  Alert, FlatList, Modal, TextInput, RefreshControl, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
```

Phase 3 swaps `LandlordApplicationService` → `PropertyService` (with new methods per §PropertyService below) and the row import from inline-card-jsx → `PropertyCard` (per CONTEXT D-01 — reuse the existing component).

**Loader + refresh state pattern** (analog lines 42-66):

```typescript
const [items, setItems] = useState<LandlordApplication[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [decidingId, setDecidingId] = useState<string | null>(null);

// reject modal state
const [rejectTarget, setRejectTarget] = useState<LandlordApplication | null>(null);
const [rejectCode, setRejectCode] = useState<RejectionReasonCode>('incomplete-info');
const [rejectNote, setRejectNote] = useState('');

const load = useCallback(async () => {
  try {
    const data = await LandlordApplicationService.getAdminQueue('submitted');
    setItems(data);
  } catch (error: any) {
    console.error('Failed to load queue:', error);
    Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.adminLoadFailed'));
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [t]);

useEffect(() => { load(); }, [load]);
```

**Approve handler with native Alert.alert confirm** (analog lines 68-90 — copy verbatim, swap service call):

```typescript
const handleApprove = async (app: LandlordApplication) => {
  Alert.alert(
    t('landlordApp.approveConfirmTitle'),
    t('landlordApp.approveConfirmMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('landlordApp.approve'),
        onPress: async () => {
          setDecidingId(app._id);
          try {
            await LandlordApplicationService.approve(app._id);
            setItems((prev) => prev.filter((i) => i._id !== app._id));
          } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.adminApproveFailed'));
          } finally {
            setDecidingId(null);
          }
        },
      },
    ]
  );
};
```

Phase 3 adds 409 detection inside the catch (see "Shared Patterns §C — 409 race-condition UX"). Locale keys swap to `moderation.approve.confirmTitle` / `moderation.approve.confirmMessage`.

**FlatList + RefreshControl + empty-state pattern** (analog lines 180-203):

```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item._id}
  renderItem={renderItem}
  contentContainerStyle={styles.listContent}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  }
  ListEmptyComponent={
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('landlordApp.adminQueueEmpty')}
      </Text>
    </View>
  }
/>
```

**Header pattern** (analog lines 167-173):

```typescript
<View style={[styles.header, { borderBottomColor: colors.border }]}>
  <TouchableOpacity onPress={onBack} style={styles.iconButton}>
    <ChevronLeft size={24} color={colors.text} />
  </TouchableOpacity>
  <Text style={[styles.headerTitle, { color: colors.text }]}>{t('landlordApp.adminQueueTitle')}</Text>
  <View style={{ width: 40 }} />
</View>
```

> **Phase 3 deviates** on `headerTitle` font weight: 4.5's `fontWeight: '700'` (analog line 291) → Phase 3's `'600'` per UI-SPEC §"Typography" (4-size 2-weight cap; see Typography revision note in 03-UI-SPEC.md).

---

### NEW — `src/components/RejectListingModal.tsx` (client, modal component, request-response)

**Analog:** `LandlordApplicationQueueScreen.tsx` lines 207-275 (inline `<Modal>` block — Phase 3 extracts this to a reusable component because the modal needs to mount in TWO places: queue + PropertyDetailsScreen action footer).

**Modal shell pattern** (analog lines 207-218):

```typescript
<Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
  <KeyboardAvoidingView
    style={styles.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <ScrollView
      style={styles.modalScrollWrap}
      contentContainerStyle={styles.modalScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('landlordApp.rejectModalTitle')}</Text>
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{t('landlordApp.rejectModalSubtitle')}</Text>
```

**Chip row pattern** (analog lines 222-245):

```typescript
<View style={styles.codesGroup}>
  {REJECT_CODES.map((code) => {
    const selected = rejectCode === code;
    const selectedTextColor = isDark ? '#121212' : '#FFFFFF';
    return (
      <TouchableOpacity
        key={code}
        onPress={() => setRejectCode(code)}
        style={[
          styles.codeChip,
          {
            backgroundColor: selected ? colors.primary : colors.inputBackground,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
      >
        <Text style={[styles.codeChipText, { color: selected ? selectedTextColor : colors.text }]}>
          {t(`landlordApp.rejectReason.${code}` as any)}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

**TextInput pattern** (analog lines 247-255):

```typescript
<TextInput
  style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
  placeholder={t('landlordApp.rejectNotePlaceholder')}
  placeholderTextColor={colors.textSecondary}
  multiline
  numberOfLines={3}
  value={rejectNote}
  onChangeText={setRejectNote}
/>
```

**Cancel + Submit button row pattern** (analog lines 257-271):

```typescript
<View style={styles.modalButtonRow}>
  <TouchableOpacity
    style={[styles.modalButton, { backgroundColor: colors.inputBackground }]}
    onPress={() => setRejectTarget(null)}
  >
    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.modalButton, styles.rejectBtn]}
    onPress={submitReject}
    disabled={!!decidingId}
  >
    {decidingId ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.modalButtonText, { color: '#FFF' }]}>{t('landlordApp.rejectConfirm')}</Text>}
  </TouchableOpacity>
</View>
```

**StyleSheet to copy verbatim** (analog lines 324-352 — `modalOverlay`, `modalScrollWrap`, `modalScrollContent`, `modalCard`, `modalTitle`, `modalSubtitle`, `codesGroup`, `codeChip`, `codeChipText`, `modalInput`, `modalButtonRow`, `modalButton`, `modalButtonText`, `rejectBtn`).

> **Phase 3 deviation:** the analog has `modalTitle: { fontSize: 18, fontWeight: '700' }` (line 328); Phase 3 uses `'600'` per UI-SPEC §"Typography". Submit button label key changes from `landlordApp.rejectConfirm` → `moderation.reject.submit` ("Reject Listing" / «Отклонить объявление» per UI-SPEC).

---

### MODIFIED — `App.tsx` (client, orchestrator, event-driven)

**Analog:** itself — Phase 4.5's `isLandlordApplicationQueueOpen` is the verbatim mount-block pattern. Read App.tsx lines 50, 104-110, 286-300, 993-1008 BEFORE editing.

**State + setter (analog line 50):**

```typescript
const [isLandlordApplicationQueueOpen, setIsLandlordApplicationQueueOpen] = useState(false);
```

**OVERLAY_FLAGS array (analog lines 104-110) — code-review checklist:**

```typescript
// Single source of truth for "is the main stack currently eclipsed by a full-screen overlay?"
// Adding a new overlay = add its flag here. Code-review checklist: if you added a new
// full-screen overlay state, did you add it to OVERLAY_FLAGS?
const OVERLAY_FLAGS = [
  !!selectedProperty,
  isRenterListingsOpen,
  !!user && isCreateListingOpen,
  !!activeTourUrl,
  !!activePhotosUrl,
];
const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);
```

> Phase 3 MUST add `!!user && isModerationQueueOpen` to this array (line ~110) per RESEARCH §"Anti-Patterns to Avoid": "Adding `isModerationQueueOpen` MUST happen in App.tsx itself, in the OVERLAY_FLAGS array, with a code-review checklist confirmation."

**Mount block pattern (analog lines 993-1008) — copy verbatim, swap service:**

```typescript
{!!user && isLandlordApplicationQueueOpen && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <LandlordApplicationQueueScreen
      onBack={() => {
        setIsLandlordApplicationQueueOpen(false);
        // Phase 4.5 nav fix: hop back to Profile (queue is only opened
        // from Profile today; flag stays correct even if a future
        // entry-point clears it explicitly).
        if (returnToProfileAfterLandlordApplicationQueue) {
          setIsProfileOpen(true);
          setReturnToProfileAfterLandlordApplicationQueue(false);
        }
      }}
    />
  </View>
)}
```

**Back-handler branch pattern (analog lines 293-300):**

```typescript
if (isLandlordApplicationQueueOpen) {
  setIsLandlordApplicationQueueOpen(false);
  if (returnToProfileAfterLandlordApplicationQueue) {
    setIsProfileOpen(true);
    setReturnToProfileAfterLandlordApplicationQueue(false);
  }
  return true;
}
```

> Phase 3 mirror adds `isModerationQueueOpen` branch in the same hardware-back-handler `useEffect` and adds `isModerationQueueOpen` to its deps array (analog lines 360-362).

**Edit-on-behalf nav callback (new):** Phase 3 adds an `onEditOnBehalf` callback that sets `propertyToEdit + moderatorContext` state and opens `isCreateListingOpen`. The `propertyToEdit` plumbing already exists from M1 Phase 5; only the `moderatorContext` state is new (3-4 LOC).

> **LOC pressure (D-15 carry-forward):** Current App.tsx is 1132 LOC; Phase 3 minimum adds +30-45 LOC. Per RESEARCH Pattern 4 the recommended mitigation is to extract the `selectedProperty` PropertyDetailsScreen overlay (App.tsx:837-913, 77 LOC) into `<PropertyDetailsHost>`. Net result: < 1100 LOC.

---

### MODIFIED — `src/screens/ProfileScreen.tsx` (client, screen, request-response)

**Analog:** itself — the existing `canReviewLandlordApplications && onReviewLandlordApplications && (...)` block is the verbatim entry-point pattern.

**Imports pattern** (already in place at lines 1-11; `Inbox` icon already imported line 4):

```typescript
import { Heart, Calendar, ClipboardList, Plus, ChevronRight, LogOut, Inbox } from 'lucide-react-native';
import { useRole } from '../hooks/useRole';
```

**Props extension pattern** (analog lines 13-22 — add 2 new optional props):

```typescript
interface ProfileScreenProps {
  onBack: () => void;
  onCreateListing?: () => void;
  onViewListings?: () => void;
  onViewFavorites?: () => void;
  onViewAppointments?: () => void;
  onViewAccountSettings?: () => void;
  onApplyLandlord?: () => void;
  onReviewLandlordApplications?: () => void;
  // Phase 3 additions:
  onReviewModerationQueue?: () => void;
  pendingModerationCount?: number;          // optional; if provided, Profile renders the badge
}
```

**Capability flag pattern** (analog line 39):

```typescript
const canReviewLandlordApplications = can('reviewLandlordApplications');
// Phase 3 mirror:
const canViewModerationQueue = can('viewModerationQueue');
```

**Entry-point row pattern** (analog lines 210-219 — copy verbatim, change icon/label/handler + add badge):

```typescript
{canReviewLandlordApplications && onReviewLandlordApplications && (
  <>
    <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
    <TouchableOpacity style={styles.menuRow} onPress={onReviewLandlordApplications} activeOpacity={0.7}>
      <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
      <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>{t('landlordApp.adminQueueTitle')}</Text>
      <ChevronRight size={20} color={themeStyles.textSecondary} />
    </TouchableOpacity>
  </>
)}
```

**Phase 3 Moderation Queue row** mirrors the above structurally; the difference is a pending-count badge between the label and the chevron. UI-SPEC §"Profile entry-point geometry" specifies:
- Badge: `borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20`
- Badge typography: `fontSize: 11, fontWeight: '600', lineHeight: 14` (matches existing StatusPill from Phase 2)
- Badge bg: `colors.accent` (the M1 accent token); text: white
- Hidden when `pendingModerationCount === 0` or undefined

The pending count is fetched on Profile mount via `PropertyService.getModerationQueueCount()` AND on AppState 'active' (D-04) — see "Shared Patterns §E" below.

---

### MODIFIED — `src/screens/PropertyDetailsScreen.tsx` (client, screen, request-response)

**Role:** Add a moderation-action footer (3-button row: Approve / Reject / Edit on behalf) that mounts when `role >= moderator AND status === 'pending'`.

**Analog:** No exact analog. The closest visual is `LandlordApplicationQueueScreen.tsx` lines 141-158 (the `actionsRow` in each card). Reuse the StyleSheet definitions (analog lines 309-321):

```typescript
actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
actionBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  borderRadius: 10,
  gap: 8,
},
actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
approveBtn: { backgroundColor: '#059669' },
rejectBtn: { backgroundColor: '#DC2626' },
```

> **Phase 3 deviation per UI-SPEC §Color:** use `colors.success` (theme token) instead of literal `#059669`; use `colors.error` instead of `#DC2626`. The Edit-on-behalf button uses `colors.surface + borderColor: colors.border` (neutral). Action labels are verb-noun pairs ("Approve Listing" / "Reject Listing" / "Edit on behalf" — UI-SPEC revised).

**Approve handler — `Alert.alert` confirm + 409 detection** (mirror `LandlordApplicationQueueScreen.handleApprove` lines 68-90):

```typescript
// On approve tap:
Alert.alert(
  t('moderation.approve.confirmTitle'),
  t('moderation.approve.confirmMessage'),
  [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('moderation.action.approve'), onPress: async () => {
      try {
        await PropertyService.approveListing(property.id);
        // Refresh detail screen payload — status pill auto re-evaluates;
        // action footer auto-hides because status !== 'pending'.
        await refetchProperty();
      } catch (e: any) {
        if (e?.response?.status === 409) {
          Alert.alert('', t('moderation.race.toast'));
          await refetchProperty();
          return;
        }
        Alert.alert(t('common.error'), e?.response?.data?.message || e?.message);
      }
    }},
  ]
);
```

**Render condition** (mount-condition for the footer):

```typescript
{can('approveListings') && property.status === 'pending' && (
  <View style={[styles.modActionFooter, { borderTopColor: colors.border }]}>
    {/* Approve / Reject / Edit-on-behalf buttons */}
  </View>
)}
```

---

### MODIFIED — `src/screens/CreateListingScreen.tsx` (client, screen, CRUD)

**Role:** Extend with `moderatorContext?: { editingOwnerUid: string; reason?: string; ownerEmail?: string }` prop. When set, mount the mod-context banner ABOVE the form, suppress the existing `<RejectionBanner>`, and dispatch `editAsModerator` instead of `updateProperty` on save.

**Analog (self):** CreateListingScreen already supports edit-mode via `propertyToEdit` (line 49 + the rehydrate `useEffect` at lines 239-301). Phase 3 layers the moderator-context on top.

**Props extension pattern** (existing interface at lines 46-54 — add one optional prop):

```typescript
interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  propertyToEdit?: Property;
  verificationOnly?: boolean;
  onNavigateToAccountSettings?: () => void;
  // Phase 3 addition:
  moderatorContext?: { editingOwnerUid: string; reason?: string; ownerEmail?: string };
}
```

**Conditional banner render — copy `RejectionBanner` shell shape** (analog `RejectionBanner.tsx` lines 41-69, applied in CreateListingScreen at the top of the form, ABOVE all sections):

```typescript
{moderatorContext && (
  <View style={[styles.modContextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.accentBar, { backgroundColor: colors.warning }]} />
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('moderation.editOnBehalf.banner').replace('{ownerEmail}', moderatorContext.ownerEmail || moderatorContext.editingOwnerUid)}
      </Text>
      {moderatorContext.reason && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={3}>
          {moderatorContext.reason}
        </Text>
      )}
    </View>
  </View>
)}
```

> **Visual:** matches `RejectionBanner` body shell (`borderRadius: 14, borderWidth: 1, padding: 12, paddingHorizontal: 16, marginBottom: 16`) BUT swaps the left-stripe color from `colors.error` → `colors.warning` (UI-SPEC §"Mod-context banner geometry").

**Suppress RejectionBanner pattern** (CONTEXT D-12 sub-decision):

```typescript
// Where RejectionBanner is currently mounted inside CreateListingScreen:
{!moderatorContext && propertyToEdit?.status === 'rejected' && (
  <RejectionBanner ... />
)}
```

**Save dispatcher branch pattern** (extend the existing handleSubmit):

```typescript
// Existing edit branch (for owner self-edit) → dispatches updateProperty.
// Phase 3 adds a SECOND branch: when moderatorContext is set, dispatch editAsModerator
// (new method on PropertyService — see §PropertyService below).
if (moderatorContext) {
  await PropertyService.editAsModerator(propertyToEdit!.id, payload, selectedImages, moderatorContext.reason);
} else if (propertyToEdit) {
  await PropertyService.updateProperty(propertyToEdit.id, payload, selectedImages);
} else {
  await PropertyService.createProperty(payload, selectedImages);
}
```

---

### MODIFIED — `src/hooks/useRole.ts` (client, hook, pure)

**Analog:** itself — the existing `Action` union + `canFromUser` switch is the verbatim extension pattern.

**Action union extension** (analog lines 14-22 — add one new member):

```typescript
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue';        // <-- Phase 3 addition (D-03)
```

**`canFromUser` switch case** (analog lines 74-95 — add one case + verify existing M2-forward-compat cases for `editAnyListing` + `approveListings` resolve correctly):

```typescript
case 'editAnyListing':
case 'approveListings':
  return role === 'admin' || role === 'moderator';        // (already in place — verify)

// Phase 3 addition:
case 'viewModerationQueue':
  return role === 'admin' || role === 'moderator';
```

> **NB:** The existing `canFromUser` switch at lines 76-95 already handles `editAnyListing` and `approveListings` per the analog. Planner verifies that grouping (lines 83-85) survives Phase 3 edit; do not regress.

---

### MODIFIED — `src/services/PropertyService.ts` (client, service, request-response)

**Analog:** itself + `src/services/LandlordApplicationService.ts` (admin queue + decide methods at lines 64-89).

**New method shape pattern** (LandlordApplicationService lines 64-89 — copy structure, change endpoints):

```typescript
/** Admin queue. Defaults to status='submitted' (FIFO by submittedAt). */
getAdminQueue: async (status: LandlordApplicationStatus | 'all' = 'submitted'): Promise<LandlordApplication[]> => {
  const response = await apiClient.get('/landlord-applications/admin/queue', { params: { status } });
  return response.data;
},

/** Admin: approve. Flips applicant's User.canListProperties=true server-side. */
approve: async (applicationId: string): Promise<LandlordApplication> => {
  const response = await apiClient.post(`/landlord-applications/admin/${applicationId}/decide`, {
    decision: 'approve',
  });
  return response.data;
},

/** Admin: reject. reasonCode required; reasonNote optional. */
reject: async (
  applicationId: string,
  reasonCode: RejectionReasonCode,
  reasonNote?: string
): Promise<LandlordApplication> => {
  const response = await apiClient.post(`/landlord-applications/admin/${applicationId}/decide`, {
    decision: 'reject',
    reasonCode,
    reasonNote,
  });
  return response.data;
},
```

**Permission-guard pattern** (PropertyService line 205-208 — Phase 1 ROLE-12 belt-and-suspenders):

```typescript
const userData = await AuthService.getUserData();
if (!canFromUser(userData, 'editVerifications')) {
  console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
  throw new PermissionDeniedError();
}
```

**Phase 3 method skeletons** (per RESEARCH §"Code Examples" lines 859-940):

```typescript
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

// inside PropertyService object literal:

getModerationQueue: async (): Promise<{ items: Property[]; totalCount: number }> => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'approveListings')) throw new PermissionDeniedError();
  const response = await apiClient.get('/moderation/queue');
  return {
    items: response.data.items.map((p: any) => ({ ...p, id: p._id })),
    totalCount: response.data.totalCount,
  };
},

getModerationQueueCount: async (): Promise<number> => {
  // D-03 planner-pick: dedicated endpoint OR piggyback on /queue. RESEARCH recommends piggyback.
  const { totalCount } = await PropertyService.getModerationQueue();
  return totalCount;
},

approveListing: async (propertyId: string): Promise<Property> => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'approveListings')) throw new PermissionDeniedError();
  const response = await apiClient.post(`/moderation/properties/${propertyId}/approve`);
  return { ...response.data, id: response.data._id };
},

rejectListing: async (
  propertyId: string,
  reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
  reasonNote?: string,
): Promise<Property> => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'approveListings')) throw new PermissionDeniedError();
  const body: any = { reasonCode };
  if (reasonNote) body.reasonNote = reasonNote;
  const response = await apiClient.post(`/moderation/properties/${propertyId}/reject`, body);
  return { ...response.data, id: response.data._id };
},

editAsModerator: async (propertyId: string, propertyData: any, images: any[] = [], reason?: string): Promise<Property> => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'editAnyListing')) throw new PermissionDeniedError();
  // Mirror updateProperty's formData.append() block — strip ownerUid + status defensively.
  // Backend strips defensively too (MOD-14).
  const formData = new FormData();
  // ... (same field plumbing as updateProperty) ...
  if (reason) formData.append('reason', reason);
  const response = await apiClient.put(`/moderation/listings/${propertyId}`, formData);
  return { ...response.data, id: response.data._id };
},
```

> **Authorization is auto-attached:** `apiClient` (Phase 1 Plan 10) already adds the `Authorization: Bearer` header per call. No per-method auth header work.

---

### MODIFIED — `src/components/RejectionBanner.tsx` (client, presentation, pure)

**Patch:** D-09 client-side i18n lookup. -1/+1 LOC change at line 37.

**Before** (current line 37):

```typescript
const codeLabel = reasonCode || 'incomplete-info';
```

**After (Phase 3):**

```typescript
const reasonKey = `moderation.reject.reason.${reasonCode || 'incomplete-info'}` as const;
const codeLabel = t(reasonKey as any) as string;
```

The body assembly logic at line 39 (`reasonNote ? \`${codeLabel} — ${reasonNote}\` : fallback`) stays unchanged — `codeLabel` now resolves to a localized phrase ("Incomplete information" / "Неполная информация") instead of a raw enum.

> The owner's app's active language drives `t()`, so the banner reads in the OWNER's locale automatically (MOD-13 satisfied without backend `Accept-Language` plumbing).

---

### MODIFIED — `src/locales/en.ts` + `src/locales/ru.ts` (client, locales, static)

**Analog:** existing `landlordApp.rejectReason.{code}` namespace at en.ts:570-573:

```typescript
'landlordApp.rejectReason.incomplete-info': 'Incomplete information',
'landlordApp.rejectReason.invalid-id': 'Invalid or unclear ID photo',
'landlordApp.rejectReason.duplicate': 'Duplicate application',
'landlordApp.rejectReason.other': 'Other',
```

**Phase 3 keys to add (~18-22 keys per UI-SPEC §"Copywriting Contract"):** see RESEARCH lines 1018-1061 for the full table. Land all keys in BOTH `en.ts` and `ru.ts` in the SAME commit (CI gate `scripts/check-i18n-parity.sh`).

> **UI-SPEC override:** `moderation.reject.submit` ships as "Reject Listing" / «Отклонить объявление» (NOT "Submit" / «Отправить» as RESEARCH suggested). Verb-noun labels per UI-SPEC revision 2026-05-01.

---

### MODIFIED — `index.js` (backend bootstrap)

**Analog:** existing route mounts at lines ~113-121 (per RESEARCH §"Backend: Mounting in index.js"):

```javascript
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/favorites', require('./src/routes/favoriteRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/appointments', require('./src/routes/appointmentRoutes'));
app.use('/api/landlord-applications', require('./src/routes/landlordApplicationRoutes'));
// Phase 3 addition:
app.use('/api/moderation', require('./src/routes/moderationRoutes'));
```

---

## Shared Patterns

> Cross-cutting patterns that apply to multiple Phase 3 files. Extract these once at the planner level so plans stay DRY.

### §A — Belt-and-suspenders role gating

**Source:** `src/middleware/verifyFirebaseToken.js` lines 105-113 + `src/hooks/useRole.ts` lines 74-95
**Apply to:** Every Phase 3 backend route + every Phase 3 client UI surface that exposes mod actions

**Server side** (`requireMinRole` from `verifyFirebaseToken.js`):

```javascript
const ROLE_RANK = { user: 0, moderator: 1, admin: 2 };

function requireMinRole(minRole) {
  return (req, res, next) => {
    const userType = (req.user && req.user.userType) || 'user';
    if (ROLE_RANK[userType] >= ROLE_RANK[minRole]) {
      return next();
    }
    return res.status(403).json({ code: 'insufficient-role', message: 'Insufficient permissions' });
  };
}
```

Mount as `router.use(verifyFirebaseToken, requireMinRole('moderator'))` at the top of `moderationRoutes.js` so every endpoint inherits — NO per-route repetition.

**Client side** (`<Gated>` component + `useRole().can(...)`):

```typescript
const canViewModerationQueue = can('viewModerationQueue');     // Profile entry-point gate
const canApproveListings = can('approveListings');             // Approve/Reject buttons
const canEditAnyListing = can('editAnyListing');               // Edit-on-behalf entry
```

Don't trust the client-only check; the server is the security boundary, the client is the UX layer.

---

### §B — Atomic state transitions (race-condition-safe — MOD-15)

**Source:** RESEARCH §"Pattern 2" lines 312-378 — VERIFIED PROVENANCE: PITFALLS Pitfall 5 + 14
**Apply to:** `POST /api/moderation/properties/:id/approve` AND `POST /api/moderation/properties/:id/reject`

**Use:**

```javascript
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },     // <-- CRITICAL: status precondition in the filter
  { $set: {
      status: 'live',                              // (or 'rejected' for the reject endpoint)
      approvedAt: now,
      approvedByUid: req.firebaseUid,              // <-- always req.firebaseUid, never req.body
  } },
  { new: true }                                    // return the updated doc
);

if (!result) {
  return res.status(409).json({
    code: 'ALREADY_MODERATED',
    message: 'This listing was already reviewed by another moderator.',
  });
}
```

**DO NOT use** the analog Phase 4.5 `landlordApplicationRoutes.js:238-246` pattern (`findById` then `if (status !== 'submitted') return 409`). That is **load-then-check** and has a race window. Phase 4.5 ships it because that queue's throughput is tiny; Phase 3's listing queue is high-frequency and the race window is real.

**Validation contract:** the supertest race test (RESEARCH §"Backend: Race-condition supertest pattern" lines 767-856) MUST assert that `Promise.all([approveA, approveB])` returns exactly one 200 and one 409 — NOT just that the doc ends up live (false-positive: the first call could have already flipped it before the second tries). See `03-VALIDATION.md` task `MOD-15` (mandatory).

---

### §C — 409 race-condition UX (client side)

**Source:** UI-SPEC §"Interaction Contracts > 409 handling" + CONTEXT.md D-08
**Apply to:** every client surface that calls approve/reject (queue PropertyCard inline action, PropertyDetailsScreen action footer, RejectListingModal submit)

```typescript
try {
  await PropertyService.approveListing(propertyId);
  // Success path — refetch / dismiss / etc.
} catch (e: any) {
  if (e?.response?.status === 409) {
    // Close any open modal FIRST, THEN fire the toast (UX: no overlapping surfaces).
    setRejectTarget(null);  // if reject modal was open
    Alert.alert('', t('moderation.race.toast'));
    // Refetch — listing is no longer pending; row disappears OR action footer auto-hides.
    await load();           // queue refetch
    return;
  }
  // Generic error path:
  Alert.alert(t('common.error'), e?.response?.data?.message || e?.message);
}
```

The toast copy is verbatim from REQUIREMENTS MOD-15 (locked): "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» — no rewording allowed.

---

### §D — actorUid provenance (audit log integrity — MOD-16)

**Source:** RESEARCH §"Pattern 3" lines 380-386 + auto-memory `phase45-landlord-application-uid-mismatch-bug.md`
**Apply to:** every `ModerationLog.create({ actorUid: ... })` insert site

**Always:**

```javascript
actorUid: req.firebaseUid,    // <-- from JWKS-verified verifyFirebaseToken middleware
```

**Never:**

```javascript
actorUid: req.body.actorUid,             // ❌ client-supplied — spoofable
actorUid: req.body.firebaseUid,          // ❌ client-supplied — spoofable (Phase 4.5 had this bug)
actorUid: req.headers['x-firebase-uid'], // ❌ legacy header path — accepted in dual-window but unauthenticated
```

**Code-review checklist for Phase 3:** grep `moderationRoutes.js` for `actorUid:` and confirm every occurrence reads from `req.firebaseUid`.

---

### §E — AppState 'active' refresh coordination (D-04)

**Source:** `src/context/AuthContext.tsx` lines 28-37 (module-scope cooldown) + lines 231-252 (subscription)
**Apply to:** `ModerationQueueScreen` queue-refresh + `ProfileScreen` pending-count refresh

**Existing pattern:**

```typescript
// Module-scope (lives outside component for re-render survival)
let lastRefreshAt: number | null = null;
const REFRESH_COOLDOWN_MS = 60_000;

useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt && now - lastRefreshAt < REFRESH_COOLDOWN_MS) return;
    if (!user?.localId) return;
    lastRefreshAt = now;
    refreshRole().catch(() => {});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [refreshRole, user?.localId]);
```

> **D-04 planner pick:** EXTEND this hook to also call `loadModerationQueue()` and `loadPendingCount()` (one subscription, three refetch consumers) OR add a sibling hook with a SHARED `lastRefreshAt` cooldown registry. Do NOT add a second uncoordinated `AppState.addEventListener('change', ...)` subscription — that breaks the cooldown contract.

**No `setInterval` polling.** D-04 explicitly rejected polling.

---

### §F — Owner-locale i18n via client-side keys (D-09 / Pattern 6)

**Source:** RESEARCH §"Pattern 6" lines 439-462 + existing `landlordApp.rejectReason.{code}` namespace at en.ts:570-573
**Apply to:** `RejectListingModal` chip labels (moderator-facing) AND `RejectionBanner` body translation (owner-facing)

**Same i18n key serves both surfaces:**

```typescript
// Moderator viewing reject modal (in moderator's app locale):
{t(`moderation.reject.reason.${code}` as any)}

// Owner viewing rejection banner (in owner's app locale):
const reasonKey = `moderation.reject.reason.${reasonCode || 'incomplete-info'}` as const;
const codeLabel = t(reasonKey as any) as string;
```

Server stores raw `reasonCode` enum on `Property.rejectionReasonCode`. Client `t()` resolves to the viewer's active locale. Owner-locale invariant satisfied without `Accept-Language` plumbing.

`reasonNote` (free-text) is verbatim per MOD-13 — never translated.

---

### §G — Audit-log follow-up insert (D-10 — orphan-tolerant)

**Source:** RESEARCH §"Pattern 2" lines 344-363 + Phase 4.5 precedent at `landlordApplicationRoutes.js:135-142, 261-268`
**Apply to:** every approve/reject/edit-on-behalf endpoint AFTER the state flip succeeds

```javascript
try {
  await ModerationLog.create({
    actorUid: req.firebaseUid,
    action: 'approve',
    targetType: 'property',
    targetId: result._id,
    before: { status: 'pending' },
    after: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid },
    at: now,
  });
} catch (auditErr) {
  // State flip already committed; we accept a rare orphan and log loudly.
  // Audit log is forward-fit for M3+ UI, NOT load-bearing for live mod actions.
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',
    action: 'approve',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}
```

> **No transactions.** D-10 recommendation: follow-up insert with structured logging on failure. Mongo Atlas supports transactions, but the orphan tolerance + audit-not-load-bearing tradeoff favors the lighter pattern (matches Phase 4.5).

---

### §H — Property edit-on-behalf safe-mutation (MOD-14)

**Source:** existing `propertyRoutes.js` PUT handler at lines 338-526 + RESEARCH §"Anti-Patterns to Avoid"
**Apply to:** `PUT /api/moderation/listings/:id` (edit-on-behalf endpoint)

**Reuse the existing PUT handler shape** but layer in:

1. **Strip `ownerUid` from `updateData`** — never mutate (MOD-14 hard rule):
   ```javascript
   delete updateData.ownerUid;        // never mutate ownerUid (defensive)
   ```
2. **Strip `status` from `updateData`** then **set status='live' explicitly** (D-12 sub-decision recommendation):
   ```javascript
   delete updateData.status;
   updateData.status = 'live';
   updateData.approvedAt = new Date();
   updateData.approvedByUid = req.firebaseUid;
   // Clear all rejection metadata since the mod has FIXED the issue
   updateData.rejectionReasonCode = null;
   updateData.rejectionReasonNote = null;
   updateData.rejectedAt = null;
   updateData.rejectedByUid = null;
   ```
3. **Race-safe atomic update** (mirror §B):
   ```javascript
   const result = await Property.findOneAndUpdate(
     { _id: req.params.id, status: { $in: ['pending', 'rejected'] } },
     { $set: updateData },
     { new: true }
   );
   if (!result) return res.status(409).json({ code: 'ALREADY_MODERATED', message: '...' });
   ```
4. **Audit row with full diff** (per §G):
   ```javascript
   await ModerationLog.create({
     actorUid: req.firebaseUid,
     action: 'edit-on-behalf',
     targetType: 'property',
     targetId: result._id,
     before: { /* changed-fields-only snapshot */ },
     after: updateData,
     reasonNote: req.body.reason || null,
     at: now,
   });
   ```

The Phase 2 D-22 sanitizer pattern (`propertyRoutes.js:399-403`) is the precedent for stripping body-supplied status from non-admins; Phase 3 inverts the pattern (mod sets status='live' deliberately). The Phase 2 D-15 auto-flip (`propertyRoutes.js:408-415`) is the precedent for clearing rejection metadata.

---

### §I — Race-condition supertest test infrastructure (MOD-15 mandatory)

**Source:** existing `JayTap-services/src/__tests__/propertyRoutes.test.js` lines 1-52 (jest.mock + AWS env + buildToken fixtures) + RESEARCH §"Backend: Race-condition supertest pattern" lines 767-856
**Apply to:** new `JayTap-services/src/__tests__/moderationRoutes.test.js`

**Reusable harness (copy verbatim from `propertyRoutes.test.js`):**

```javascript
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'jaytap-test-bucket';

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
const moderationRoutes = require('../routes/moderationRoutes');
const Property = require('../models/Property');
const ModerationLog = require('../models/ModerationLog');
const User = require('../models/User');
const { buildToken } = require('./fixtures/jwks-tokens');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/moderation', moderationRoutes);
  return app;
}
```

**Race-condition test pattern (full sample at RESEARCH lines 790-809):**

```javascript
test('two concurrent approves: one returns 200, the other returns 409 ALREADY_MODERATED', async () => {
  const tokenA = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const tokenB = await buildToken({ sub: 'mod-b-uid', role: 'moderator', kind: 'valid' });

  const [resA, resB] = await Promise.all([
    request(app).post(`/api/moderation/properties/${pending._id}/approve`).set('Authorization', `Bearer ${tokenA}`),
    request(app).post(`/api/moderation/properties/${pending._id}/approve`).set('Authorization', `Bearer ${tokenB}`),
  ]);

  const statuses = [resA.status, resB.status].sort();
  expect(statuses).toEqual([200, 409]);

  const loser = resA.status === 409 ? resA : resB;
  expect(loser.body.code).toBe('ALREADY_MODERATED');

  const finalDoc = await Property.findById(pending._id);
  expect(finalDoc.status).toBe('live');
});
```

> **MANDATORY** per `gsd-verifier-misses-regressions.md` auto-memory + 03-VALIDATION.md MOD-15 task. Without this test the verifier will likely false-positive on a non-atomic implementation.

---

## No Analog Found

None. Every Phase 3 file has a strong sibling-pattern in this codebase. The only file without a 1:1 file-level analog is `src/config/serviceAreas.js` (no prior service-area config exists), but the const-export shape is consistent with `src/config/db.js` and `src/config/firebase.js` style.

---

## Metadata

**Analog search scope:**
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/{screens,components,hooks,services,context,locales,theme}/`
- `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/{routes,models,middleware,config,__tests__}/`
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/03-moderation-queue-actions-edit-on-behalf/{03-CONTEXT.md, 03-RESEARCH.md, 03-UI-SPEC.md, 03-VALIDATION.md}`

**Files scanned (read in full or targeted ranges):** 17 source/config/test files + 4 phase-planning docs

**Pattern extraction date:** 2026-05-02

**Key insight:** Phase 3 is the rare phase where "use existing patterns" maps almost 1:1 to "use existing FILES". The Phase 4.5 sibling-pattern reuse is both a design accelerator AND a prior-incident safety net — Phase 3 starts with the lessons learned baked in (uid-mismatch from `phase45-landlord-application-uid-mismatch-bug.md`, atomic-state-transitions divergence from Phase 4.5's load-then-check). The single "reverse-precedent" — where Phase 3 must NOT copy the analog — is the race-safety pattern in §B.

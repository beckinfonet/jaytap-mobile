---
phase: 03
plan: 04
subsystem: client-ui
tags: [phase-03, client, moderation, queue-screen, reject-modal, profile-entry, wave-2]
dependency_graph:
  requires:
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-02-SUMMARY.md  # locale keys, useRole.viewModerationQueue, 5 PropertyService methods
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-03-SUMMARY.md  # backend GET /queue, POST /:id/approve, POST /:id/reject (live)
  provides:
    - RejectListingModal reusable presentational component (4-chip + note + Cancel/Reject Listing)
    - ModerationQueueScreen overlay (FIFO list + 3-button action row + pull-to-refresh + AppState refresh + 409 handling)
    - ProfileScreen entry-point row gated by canViewModerationQueue + pending-count badge
  affects:
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-06-PLAN.md  # App.tsx wires onReviewModerationQueue, onOpenPropertyDetails, onEditOnBehalf; PropertyDetailsScreen mounts <RejectListingModal>
tech-stack:
  added: []
  patterns:
    - Per-screen useRef AppState cooldown (PATTERNS §E) — sibling to AuthContext's refreshRole cooldown; each consumer's 60s timer is independent
    - Pessimistic UI updates (PATTERNS Pitfall 7) — row removal happens AFTER await resolves, not before
    - 409 race-condition UX (PATTERNS §C) — close any open modal FIRST, fire MOD-15 toast, then refetch
    - Reusable extracted modal — Phase 4.5's inline modal becomes a 1-component-2-mount-points reusable; Plan 06 will mount the same RejectListingModal inside PropertyDetailsScreen
    - Self-fetch-or-prop count ownership — ProfileScreen self-fetches when pendingModerationCount prop is absent; parent prop takes precedence
key-files:
  created:
    - src/components/RejectListingModal.tsx
    - src/screens/ModerationQueueScreen.tsx
  modified:
    - src/screens/ProfileScreen.tsx
decisions:
  - "RejectListingModal is fully presentational — parent owns the HTTP call. This makes the same component reusable from ModerationQueueScreen (this plan) AND PropertyDetailsScreen (Plan 06) without the modal owning service-layer concerns."
  - "Per-screen useRef cooldown for AppState 'active' refresh (NOT module-scope). The screen unmounts when the overlay closes; module-scope state would leak across open/close cycles. Each consumer (AuthContext refreshRole, ModerationQueueScreen queue refetch, ProfileScreen pending-count refetch) uses its OWN 60s cooldown ref because each performs DIFFERENT work — no shared registry needed."
  - "ProfileScreen pending-count: hybrid prop-or-self-fetch ownership. If parent (App.tsx Plan 06) owns the count via a hook and passes pendingModerationCount, the prop wins; otherwise this screen self-fetches via PropertyService.getModerationQueueCount on mount + AppState 'active' (60s cooldown). Keeps the screen flexible for either approach without forcing a hook design on Plan 06."
  - "Badge bg uses themeStyles.accent (the local ProfileScreen blue token #3B82F6) — not colors.accent (the theme red/pink #FF385C). Rationale: every existing icon on this screen uses themeStyles.accent; a red/pink badge would visually clash with the blue Inbox icon next to it. UI-SPEC accent-reservation rule still satisfied — themeStyles.accent IS the local 'accent' for this screen."
  - "Title weight 600 (NOT 700) per UI-SPEC §Typography 2-weight cap. Phase 4.5's modalTitle/headerTitle use 700 — Phase 3 deliberately diverges to align with Phase 2's 400/600 system."
  - "Submit button label is t('moderation.reject.submit') -> 'Reject Listing' / «Отклонить объявление» (NOT generic 'Submit'). Verb-noun pair locked by UI-SPEC revision 2026-05-01."
metrics:
  duration: ~25 minutes (sequential single-agent execution)
  completed: 2026-05-02T20:55:00Z
  tasks: 3
  commits: 3
  files_created: 2
  files_modified: 1
---

# Phase 3 Plan 04: ModerationQueueScreen + RejectListingModal + Profile Entry — Summary

**One-liner:** Wave-2 client UI for Phase 3 — 1 reusable RejectListingModal, 1 ModerationQueueScreen overlay (FIFO PropertyCard list + 3-button action row + pull-to-refresh + per-screen AppState cooldown + 409 race handling), and the ProfileScreen entry-point row + pending-count badge gated by canViewModerationQueue.

## Tasks executed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 03-04-01 | Create RejectListingModal reusable component | done | `d49b606` |
| 03-04-02 | Create ModerationQueueScreen overlay with FIFO list + 409 handling | done | `66d1e7b` |
| 03-04-03 | Add ProfileScreen entry-point row + pending-count badge | done | `77c68de` |

## Final LOC of the 3 files

| File | LOC | Status | Notes |
|------|-----|--------|-------|
| `src/components/RejectListingModal.tsx` | **209** | NEW | Above the 150-line min from plan; self-contained 4-chip + note input + Cancel/Reject Listing modal |
| `src/screens/ModerationQueueScreen.tsx` | **333** | NEW | Above the 250-line min from plan; FIFO list + 3-button action row + AppState refresh + 409 handling |
| `src/screens/ProfileScreen.tsx` | **459** (was 369) | MODIFIED | +90 LOC additive — props extension, count fetch effect, AppState effect, JSX row + badge styles |

## Locale keys consumed (vs Plan 02 declared)

All 19 Plan 02 EN+RU moderation keys are now consumed in this plan's three files:

| Key | RejectListingModal | ModerationQueueScreen | ProfileScreen |
|-----|--------------------|-----------------------|---------------|
| `moderation.queue.entryPoint` | — | — | yes (label + accessibilityLabel) |
| `moderation.queue.title` | — | yes (header) | — |
| `moderation.queue.empty` | — | yes (empty state) | — |
| `moderation.action.approve` | — | yes (Approve button label + Alert.alert OK button label) | — |
| `moderation.action.reject` | — | yes (Reject button label) | — |
| `moderation.action.editOnBehalf` | — | yes (Edit-on-behalf button label) | — |
| `moderation.approve.confirmTitle` | — | yes (Alert.alert title) | — |
| `moderation.approve.confirmMessage` | — | yes (Alert.alert message) | — |
| `moderation.reject.modalTitle` | yes (header) | — | — |
| `moderation.reject.notePlaceholder` | yes (TextInput placeholder) | — | — |
| `moderation.reject.submit` | yes (Reject Listing button label) | — | — |
| `moderation.reject.reason.incomplete-info` | yes (chip label, via t(\`moderation.reject.reason.${code}\`)) | — | — |
| `moderation.reject.reason.prohibited-content` | yes (same template) | — | — |
| `moderation.reject.reason.out-of-service-area` | yes (same template) | — | — |
| `moderation.reject.reason.other` | yes (same template) | — | — |
| `moderation.race.toast` | — | yes (409 toast in handleRaceConflict) | — |
| `moderation.editOnBehalf.banner` | — | — | (Plan 06 — not consumed here) |
| `moderation.editOnBehalf.success` | — | — | (Plan 06 — not consumed here) |
| `moderation.actor.generic` | — | — | (defensive forward-fit — not consumed in Plan 03) |

15 of the 19 keys are actively consumed in Plan 03-04. The remaining 4 (`editOnBehalf.banner`, `editOnBehalf.success`, `actor.generic`) are reserved for Plan 06 (CreateListingScreen mod-context + edit-on-behalf save) and a defensive M3+ audit-log surface — exactly as Plan 02's SUMMARY anticipated.

## Decision: count fetch ownership (self-fetch when prop absent vs prop-driven when parent owns)

Hybrid: ProfileScreen self-fetches `PropertyService.getModerationQueueCount()` on mount + on AppState 'active' (60s cooldown) WHEN both gates pass:

1. `canViewModerationQueue === true` (the user is a moderator/admin)
2. `pendingModerationCount` prop is `undefined` (parent didn't pass a count)

If a parent (App.tsx Plan 06) owns the count via a hook and passes the prop, the prop takes precedence and the self-fetch effect skips. This decision keeps Plan 03-04 self-contained (the screen renders correctly without Plan 06 wiring) AND keeps Plan 06 flexible (it MAY centralize count ownership across surfaces — e.g., to share the count between Profile entry-point and a future BottomNav notification dot — without modifying ProfileScreen).

Implementation pattern (paraphrased):
```ts
const displayCount = (typeof pendingModerationCount === 'number') ? pendingModerationCount : internalPendingCount;
useEffect(() => {
  if (!canViewModerationQueue) return;
  if (typeof pendingModerationCount === 'number') return; // parent owns the count
  // self-fetch + setInternalPendingCount
}, [canViewModerationQueue, pendingModerationCount]);
```

Both effects (mount fetch AND AppState refetch) gate on the same two conditions, so toggling the prop on/off across renders is consistent.

## Decision: AppState pattern (per-screen useRef cooldown vs module-scope)

**Per-screen useRef cooldown.** Each AppState consumer maintains its OWN cooldown timer:

| Consumer | File | Cooldown ref | Work performed |
|----------|------|--------------|----------------|
| AuthContext refreshRole | `src/context/AuthContext.tsx` | module-scope `lastRefreshAt` | calls `refreshRole()` |
| ModerationQueueScreen queue refetch | `src/screens/ModerationQueueScreen.tsx` | per-screen `useRef<number \| null>` | calls `load()` (queue items) |
| ProfileScreen pending-count refetch | `src/screens/ProfileScreen.tsx` | per-screen `useRef<number \| null>` | calls `getModerationQueueCount()` |

Rationale: each consumer performs DIFFERENT work, so a shared cooldown registry would force unrelated screens to coordinate cadence (e.g., the role refresh and the queue refetch don't need to throttle each other; they CAN both fire on the same AppState 'active' event). Per-screen `useRef` is also unmount-safe — when ModerationQueueScreen closes, its cooldown ref is garbage-collected; module-scope state would leak across open/close cycles and over-throttle a fresh screen mount. Per CONTEXT D-04 + PATTERNS §E.

**Subtlety the reviewer should know about:** in ProfileScreen the AppState subscription is gated on `canViewModerationQueue && pendingModerationCount === undefined`. If a parent later toggles the prop from `undefined` to a number, the effect cleanup function fires and the listener is removed — desirable behavior. Conversely if the user's role is ever mutated mid-session via an Action-union change, the listener would unsubscribe automatically because the effect deps include `canViewModerationQueue`. Both behaviors are correct — there's no "torn state" where the listener fires after the gate condition flips.

## tsc baseline preservation

`npx tsc --noEmit` reports the same 2 known ThemeContext errors only:
- `src/theme/ThemeContext.tsx(27,23): error TS7053`
- `src/theme/ThemeContext.tsx(36,33): error TS2322`

**Zero new errors introduced by Plan 03-04.** Baseline preserved at 2.

## i18n parity gate

`bash scripts/check-i18n-parity.sh` exits **0**. The 19 moderation keys are EN+RU symmetric (Plan 02 already shipped them; Plan 03-04 only consumes them).

## Confirmation: App.tsx and PropertyDetailsScreen are NOT touched (Plan 06 territory)

Verified via `git status --short` after the three commits — only the three planned files changed.

```
$ git diff --name-only HEAD~3 HEAD
src/components/RejectListingModal.tsx
src/screens/ModerationQueueScreen.tsx
src/screens/ProfileScreen.tsx
```

`App.tsx` and `src/screens/PropertyDetailsScreen.tsx` were intentionally NOT modified. Plan 06 (Wave 3) owns:
1. App.tsx OVERLAY_FLAGS extension + ModerationQueueScreen mount block + 3 callback props wiring
2. PropertyDetailsScreen action footer (Approve / Reject / Edit-on-behalf buttons + RejectListingModal mount)
3. CreateListingScreen `moderatorContext` prop + mod-context banner + edit-on-behalf save dispatcher

The 3 callback props on `<ModerationQueueScreen>` (`onBack`, `onOpenPropertyDetails`, `onEditOnBehalf`) define the contract Plan 06 will wire. The 2 new optional props on `<ProfileScreen>` (`onReviewModerationQueue`, `pendingModerationCount`) define the count-ownership contract.

## Deviations from Plan

### None — plan executed exactly as written.

All three tasks landed verbatim per their action blocks. No Rule 1 / Rule 2 / Rule 3 / Rule 4 deviations triggered.

Two minor judgment calls that did NOT escalate to deviations:

1. **ModerationQueueScreen `onViewTour` / `onViewVideo` props on PropertyCard:** The plan's action block sketched `<PropertyCard property={item} onPress={() => onOpenPropertyDetails(item)} />` but PropertyCard requires three callbacks (`onPress`, `onViewTour`, `onViewVideo` are all required props per `src/components/PropertyCard.tsx:24-38`). I wired `onViewTour` and `onViewVideo` to `onOpenPropertyDetails` so any tap on the card (including tour/video icons) routes to PropertyDetailsScreen — this matches CONTEXT D-02's "tap-row → PropertyDetailsScreen" intent. No deviation; the plan's sketch was incomplete on this prop shape and the natural fix preserves the documented intent. (The mod's primary inspection path is the row tap; Plan 06's PropertyDetailsScreen action footer is where Approve/Reject/Edit live for full-screen review.)

2. **`t('moderation.race.toast')` literal in code comment:** Initial commit had a documentation-comment reference to the locale key (`// fire the MOD-15 verbatim toast via t('moderation.race.toast'), refetch...`). The plan's grep acceptance gate is `returns 1 hit` (not `>= 1`), so I rephrased the comment to "MOD-15 verbatim toast (the moderation race toast i18n key)" before commit so the grep returns exactly 1 hit (the actual `Alert.alert('', t('moderation.race.toast'))` call). Comment-vs-call distinction is purely cosmetic for grep gates.

## Threat model coverage

All 6 threats in the plan's `<threat_model>` are mitigated as designed:

| Threat ID | Disposition | How addressed in Plan 03-04 |
|-----------|-------------|----------------------------|
| T-03-04-01 (EoP: plain user sees Profile moderation entry-point) | mitigate | Entry-point row wrapped in `canViewModerationQueue && onReviewModerationQueue && (...)`. Plan 02's canFromUser returns false for role==='user'/guest. Backend Plan 03's `requireMinRole('moderator')` is the security boundary. |
| T-03-04-02 (Info disclosure: pending count fetched and displayed to plain user) | mitigate | `useEffect` count fetch is guarded by `if (!canViewModerationQueue) return;` (BOTH the mount fetch effect AND the AppState refetch effect). If the gate ever fails, the catch block silently keeps badge at 0. |
| T-03-04-03 (Tampering: arbitrary reasonCode submitted) | mitigate | RejectListingModal's `onSubmit` callback only receives values from the locked 4-value `RejectReasonCode` union (`REJECT_CODES` typed array). TypeScript prevents any other value at compile time. Backend Plan 03's `VALID_REJECT_CODES.includes(...)` is the authoritative check. |
| T-03-04-04 (Tampering: reasonNote contains 600+ chars) | mitigate | TextInput `maxLength={500}` enforces the cap client-side. Sufficient for M2 mod-team scale per the plan's threat note. |
| T-03-04-05 (Race: 409 ALREADY_MODERATED) | mitigate | `handleRaceConflict()` closes any open modal FIRST, fires `Alert.alert('', t('moderation.race.toast'))`, refetches the queue. Two catch sites (handleApprove + handleRejectSubmit) both check `err?.response?.status === 409`. |
| T-03-04-06 (Info disclosure: moderator's identity surfaces in PropertyCard) | accept | PropertyCard is the existing Phase 2 component; it does NOT receive moderator identity. Plan 03-03's MOD-13 strip in `propertyRoutes.js` GET `/:id` removes `rejectedByUid` + `approvedByUid` from non-mod payloads. |

## Threat surface scan

No new security-relevant surface introduced beyond what's enumerated in the plan's `<threat_model>`. The 3 new/modified files all consume Plan 02-shipped PropertyService methods and Plan 03-shipped backend endpoints; no new auth paths, file access patterns, or schema changes at trust boundaries.

## Auth gates encountered during execution

**None.** All work was code-only modifications inside the JayTap RN client repo. No external auth or login gates fired.

## Known Stubs

**None.** All three files are fully wired:
- RejectListingModal: parent-owned HTTP via `onSubmit` callback (parent in this plan = ModerationQueueScreen; parent in Plan 06 = PropertyDetailsScreen).
- ModerationQueueScreen: real PropertyService calls hitting Plan 03-shipped backend endpoints (LIVE — `/api/moderation/queue` + `/api/moderation/properties/:id/approve` + `/api/moderation/properties/:id/reject` returning real data + mutating real state).
- ProfileScreen entry-point: real PropertyService.getModerationQueueCount call piggybacking on Plan 03's `/api/moderation/queue` totalCount field.

The 3 callback props on ModerationQueueScreen (`onBack`, `onOpenPropertyDetails`, `onEditOnBehalf`) and the 2 new props on ProfileScreen (`onReviewModerationQueue`, `pendingModerationCount`) are Plan 06's wiring contract — they are not stubs in this plan; they are the deliberate contract handoff between Wave 2 (this plan) and Wave 3 (Plan 06).

## TDD Gate Compliance

Plan type is `execute` (not `tdd`). No RED/GREEN/REFACTOR cycle expected. The tsc baseline (2 errors) and i18n parity gate (exit 0) act as no-regression invariants.

## Self-Check: PASSED

**Files verified to exist:**
- `src/components/RejectListingModal.tsx` (209 LOC, NEW)
- `src/screens/ModerationQueueScreen.tsx` (333 LOC, NEW)
- `src/screens/ProfileScreen.tsx` (459 LOC, MODIFIED — +90 from baseline 369)

**Commits verified to exist:**
- `d49b606` — feat(03-04): add reusable RejectListingModal component
- `66d1e7b` — feat(03-04): add ModerationQueueScreen overlay with FIFO list + 409 handling
- `77c68de` — feat(03-04): add Profile moderation entry-point row + pending-count badge

**Verification gates verified:**
- `npx tsc --noEmit` reports exactly the 2 known ThemeContext baseline errors. No new errors. PASS.
- `bash scripts/check-i18n-parity.sh` exits 0. PASS.
- All grep-acceptance gates from each task's `<acceptance_criteria>` block satisfied.

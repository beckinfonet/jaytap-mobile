# Phase 3: Moderation Queue + Actions + Edit-on-Behalf - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 03-moderation-queue-actions-edit-on-behalf
**Areas discussed:** Queue UX & entry-point, Approve/Reject mechanics
**Areas deferred to planner / Claude's Discretion:** Edit-on-behalf flow, Backend shape (audit log + reasonCode i18n + serviceAreas)

---

## Gray Area Selection (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Queue UX & entry-point | List density (PropertyCard vs compact row vs hybrid), tap-row behavior, Profile pending-count badge, refresh strategy | ✓ |
| Approve/Reject mechanics | Approve single-tap vs two-tap, Reject reasonCode chips vs dropdown, reasonNote visibility, 409 race-lost UX | ✓ |
| Edit-on-behalf flow | Entry points, mod-context banner, status-after-save, optional reason field rendering | |
| Backend shape: audit log + i18n + serviceAreas | reasonCode → owner-locale translation location, moderationLog granularity + atomicity, serviceAreas storage | |

**User's choice:** Queue UX & entry-point + Approve/Reject mechanics. The two deferred areas flow into Claude's Discretion in CONTEXT.md (D-09 through D-15) so the planner has explicit recommendations + options to pick from.

---

## Queue UX & entry-point

### Q1: How should each row in the Moderation Queue be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse PropertyCard | Each row is the existing `PropertyCard` component. StatusPill from Phase 2 D-19 already renders «На модерации». Mod sees the renter view exactly. (Recommended) | ✓ |
| Compact moderation row | 2-line custom row + thumbnail + 3 inline action buttons. Higher information density (8-10 listings/screen) but mods can't see full visual. | |
| PropertyCard preview + action sheet | PropertyCard with overlay action footer (Approve/Reject/Edit). Mid-density compromise. | |

**User's choice:** Reuse PropertyCard.
**Notes:** Captured in CONTEXT.md D-01.

### Q2: What happens when a moderator taps a queue row (not an action button)?

| Option | Description | Selected |
|--------|-------------|----------|
| Open PropertyDetailsScreen | Reuses Phase 2 D-06 role-aware payload + adds moderation action footer to detail screen. (Recommended) | ✓ |
| Inline action sheet (no detail screen route) | Tap row → bottom sheet with action buttons. Faster but mods can't deeply inspect listing. | |
| Expand row in-place | Tap row expands inline. Avoids screen transition but adds custom expand/collapse plumbing. | |

**User's choice:** Open PropertyDetailsScreen.
**Notes:** Captured in CONTEXT.md D-02.

### Q3: How should the Profile entry-point display pending count?

| Option | Description | Selected |
|--------|-------------|----------|
| Badge with count | "Moderation Queue (3)" with count pill on the right. Workload at a glance. (Recommended) | ✓ |
| Static label only | Just "Moderation Queue", no count. Zero extra fetches; mod doesn't know workload until opening. | |
| Static label + visual dot when non-zero | Lightweight unread-style dot, no number. | |

**User's choice:** Badge with count.
**Notes:** Captured in CONTEXT.md D-03. Count fetch endpoint shape (dedicated vs piggybacked) deferred to planner.

### Q4: How should the queue refresh?

| Option | Description | Selected |
|--------|-------------|----------|
| Pull-to-refresh + AppState 'active' | Mirrors Phase 2 D-17 60s cooldown pattern. Auto-refetch after own action. No polling. (Recommended) | ✓ |
| Above + 30s polling on screen-open | Adds setInterval polling. Useful only for multi-mod simultaneity; adds backend load. | |
| Pull-to-refresh only | Simplest, no AppState hook. Stale by default. | |

**User's choice:** Pull-to-refresh + AppState 'active'.
**Notes:** Captured in CONTEXT.md D-04. Planner verifies whether existing AuthContext AppState hook (Phase 2 D-17) can be extended or a sibling hook with shared cooldown registry is needed.

---

## Approve/Reject mechanics

### Q1: How should Approve work?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-tap with native Alert.alert confirm | RN native `Alert.alert` with EN+RU title + Cancel/Approve. Matches ROADMAP "confirmed single-tap". Zero new modal component. (Recommended) | ✓ |
| Single-tap with custom themed sheet | Themed bottom sheet matching Reject modal visual treatment. Heavier (new component) but visually unified. | |
| Two-tap (button changes state) | Tap once → button changes to "Confirm approve" + 3s timeout to revert. No modal pop-up. Easy to mis-tap. | |

**User's choice:** Single-tap with native Alert.alert confirm.
**Notes:** Captured in CONTEXT.md D-05.

### Q2: How should the 4 reasonCode chips render in the Reject modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline horizontal chips | Matches Phase 4.5 LandlordApplicationQueueScreen reject pattern exactly. Single-select; tap to highlight. (Recommended) | ✓ |
| Vertical radio list | More accessible but more vertical space; modal scrollier on small screens. | |
| Dropdown / picker | Saves space but adds taps; reasonCodes are fixed at 4 — picker overkill. | |

**User's choice:** Inline horizontal chips.
**Notes:** Captured in CONTEXT.md D-06.

### Q3: How should the optional `reasonNote` free-text field render?

| Option | Description | Selected |
|--------|-------------|----------|
| Always-visible TextInput below chips | Multi-line input labeled "(optional)". Discoverable; no extra tap to clarify. (Recommended) | ✓ |
| Expand-on-tap (collapsed by default) | "Add a note (optional)" link that expands on tap. Cleaner default state but adds friction. | |
| Always-visible but only when 'Other' selected | TextInput appears only for `reasonCode === 'other'`. Forces specificity but loses clarification option. | |

**User's choice:** Always-visible TextInput below chips.
**Notes:** Captured in CONTEXT.md D-07.

### Q4: On 409 Conflict (race lost), where should the moderator land?

| Option | Description | Selected |
|--------|-------------|----------|
| Dismiss + refetch queue, stay on current screen | Toast + queue refetch; mod stays where they are. Detail screen status-pill re-evaluates from refreshed payload. (Recommended) | ✓ |
| Toast + bounce back to queue | Force-route back to ModerationQueueScreen, close any open modal/detail. Cleaner mental model but disruptive. | |
| Toast only — no automatic refetch | Manual pull-to-refresh. Stale UI; mod might tap Approve again. (Contradicts MOD-15 "queue refetches automatically".) | |

**User's choice:** Dismiss + refetch queue, stay on current screen.
**Notes:** Captured in CONTEXT.md D-08. 409 toast copy locked verbatim from REQUIREMENTS.md MOD-15.

---

## Claude's Discretion

The user explicitly deferred these areas to research + planning. Decisions captured as recommendations + alternatives in CONTEXT.md `<decisions>` section under D-09 through D-15:

- **D-09** reasonCode → owner-locale translation location (server-side dict vs client-side i18n keys vs hybrid). Recommended: client-side i18n keys.
- **D-10** moderationLog Mongoose model schema, before/after granularity (snapshot vs diff), atomicity (transaction vs follow-up insert).
- **D-11** serviceAreas config storage (static const file vs Mongo collection vs env var). Recommended: static const file with TODO(M3) marker; M2 default `['Bishkek']`.
- **D-12** Edit-on-behalf flow specifics (entry points, mod-context banner, status-after-save semantics, optional reason field rendering, RejectionBanner suppression).
- **D-13** Backend route block — new `moderationRoutes.js` file vs extension of `propertyRoutes.js`.
- **D-14** Test coverage strategy (supertest for 4 new endpoints + race-condition test vs zero tests + manual QA matrix).
- **D-15** Visual specifics (action footer mount, Reject modal positioning, edit-on-behalf banner color tokens, pending-count badge styling).

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights:

- Edit-on-behalf flow specifics — D-12 captures recommendations + open sub-decisions.
- Backend shape — D-09 + D-10 + D-11 capture recommendations + planner-picks-among-options.
- Bulk multi-select moderation, push notifications, lease-based locking, self-promotion path, M3+ audit log UI, M3+ admin UI for serviceAreas, hierarchical permission inheritance, material-edit re-queues to pending rule, in-app mod-owner messaging — all REQUIREMENTS.md Future §; out of M2 scope.
- Polling on the queue screen — explicitly rejected in D-04.

## Plan-Phase Confirmations (2026-05-02)

Decisions confirmed during /gsd-plan-phase 3 (after plan-checker B-2 surfaced contract drift):

- **D-12 status-after-save = `'live'`** — User implicitly accepted the recommendation (mod editing on behalf combines edit + approval in one step; moderationLog action `'edit-on-behalf'` is the audit trail). Locked in 03-05-PLAN.md + 03-06-PLAN.md.
- **MOD-17 endpoint URL prefix** — User chose `/api/moderation/*` prefix-consistent paths over the bare `/api/properties/:id/approve` listed in REQUIREMENTS.md verbatim. REQUIREMENTS.md MOD-17 + ROADMAP success criterion #5 amended to match. RESEARCH.md §Open Questions Q5 records the binding decision.
- **MOD-17 endpoint count = 4 (not 5)** — `POST /api/moderation/listings/:id/submit` dropped per RESEARCH §Open Questions Q1 — Phase 2 D-22 auto-flip + dropped draft state make it vestigial. REQUIREMENTS.md MOD-17 amended.

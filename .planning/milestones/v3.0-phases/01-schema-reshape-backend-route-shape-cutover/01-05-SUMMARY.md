---
phase: 01-schema-reshape-backend-route-shape-cutover
plan: 05
subsystem: rn-client-types-stub-and-operator-runbook
tags: [typescript, type-stub, runbook, atlas, m3, rollback, brownfield, schema-05, phase-1-close]
requirements: [SCHEMA-05]
dependency-graph:
  requires:
    - JayTap/src/types/Property.ts (M2 baseline at SHA 3ded56b — flat-shape Property + Tour + PlatformVerifications interfaces, 91 LOC)
    - JayTap/src/utils/hospitalityAmenities.ts (HospitalityAmenity import — UNTOUCHED; consumer preserved per D-09)
    - JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md (Plan 01-04 baseline; this plan APPENDS §Rollback before footer)
    - JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-RESEARCH.md §"Code Example 7" (verbatim drop-in TARGET shape) + §Pitfall 5/6/7 + §"Code Example 6" (mongodump fallback)
    - Plans 01-01 (b16223e + 50728bd), 01-02 (c05ac79 + 03ea882 + 53d025c), 01-03 (6f815f5 + c4bf01d), 01-04 (6097b50 + f8197ba) — backend repo state at f8197ba (cited verbatim in runbook §"Step 6 — Cutover commit deploy")
  provides:
    - Full M3 nested-shape Property TypeScript interface (compile-time consumer for Phase 2 PR drafts)
    - Operator-facing copy-paste runbook (D-17 — single source of truth in .planning/, NOT a standalone 01-RUNBOOK.md and NOT in backend repo's scripts/)
    - Atlas-tier-aware rollback path (M10+ on-demand UI / Flex daily / M0 mongodump fallback)
    - Tester comms template (Pitfall 7) ready to copy-paste BEFORE cutover deploy
    - Smoke-test curl command set (3 routes — anonymous list, anonymous deep-link, mod-token queue) with jq acceptance check
  affects:
    - Phase 2 (RN client cutover) — every screen rewrite can now `import type { Property } from '../types/Property'` and write nested-shape consumers against this canonical type. D-01 atomic-break boundary respected (no screen rewrites in Phase 1).
    - Operator (manual cutover deploy) — runbook is now copy-pasteable; Atlas tier confirmation + dry-run + verify=PASS + smoke-test sequence is the deploy gate per ROADMAP SC #4.
    - Phase 1 close — Plans 01-01..01-05 ship the artifacts; the runbook tells the operator how to deploy them.
tech-stack:
  added: []
  patterns:
    - Claude's Discretion #3 honored — full nested type, NOT a `LegacyFlat | NestedShape` union (researcher RECOMMENDED rationale: union forces every consumer to discriminate, but M2 client is already broken per D-01 — union just preserves a half-broken state with extra type-narrowing burden)
    - Claude's Discretion #5 honored — `schemaVersion?: 'm3-nested-v1'` literal-string union present (mirrors backend Property.js schema default from Plan 01-01)
    - D-09 hospitality preserve — `maxGuests?: number` + `amenities?: HospitalityAmenity[]` stay TOP LEVEL (consumed by M1 HOSP-05 read paths; Phase 2 will rewrite the screens)
    - D-10 keep set — `PlatformVerifications` interface preserved verbatim; `verificationUpdatedAt` + `verificationUpdatedByUid` top-level
    - D-12 collapse — `Tour` interface DELETED; replaced by single `media.tourUrl?: string` on the `media` nested object
    - SCHEMA-04 client-side enforcement — all 11 audit fields at TOP LEVEL of `Property`; never under `terms.*` (Pitfall 4 defense at the type layer)
    - D-17 inline-runbook — §Rollback appended to 01-CONTEXT.md (single source of truth in .planning/); NOT a standalone 01-RUNBOOK.md file; NOT in the backend repo's scripts/ directory
    - Atlas tier branching pattern — runbook handles M10+ / Flex / M0 (free) tiers with per-tier snapshot procedure (RESEARCH Pitfall 5)
    - Pitfall 6 retry/backoff — smoke-test loop has 5 attempts × 30s sleep to absorb Railway redeploy timing window
    - Pitfall 7 tester comms — copy-paste template included BEFORE cutover so internal testers know M2 builds (TestFlight 27 / Play Internal 30) will degrade for ~N days
key-files:
  created:
    - /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-05-SUMMARY.md
  modified:
    - /Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts
    - /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md
decisions:
  - Full nested type, NOT a `LegacyFlat | NestedShape` union (Claude's Discretion #3, researcher RECOMMENDED)
  - schemaVersion?: 'm3-nested-v1' literal-string union present (Claude's Discretion #5, researcher RECOMMENDED)
  - `Tour` interface DELETED entirely (D-12 — single string media.tourUrl supersedes; multi-tour preservation rejected per <deferred>)
  - `PlatformVerifications` interface PRESERVED VERBATIM (D-10 keep set)
  - `import type { HospitalityAmenity } from '../utils/hospitalityAmenities'` PRESERVED (D-09 hospitality consumer)
  - Per-screen TypeScript errors in src/screens/*.tsx + src/components/PropertyCard.tsx are EXPECTED (D-01 atomic break) — Phase 2's screen rewrites resolve them; isolated tsc on Property.ts exits 0 in scope
  - All 11 audit fields + status enum at TOP LEVEL of `Property` (SCHEMA-03/04 client-side enforcement — same posture as Plan 01-01 backend schema)
  - Runbook is OPERATOR-FACING copy-paste material (D-17) — verbatim accuracy preserved (no paraphrasing)
  - Runbook references Plan 03 (`c4bf01d`) + Plan 04 (`f8197ba`) cutover SHAs at §"Step 6 — Cutover commit deploy" so the operator has the canonical "what is the cutover commit?" answer in the document itself
  - Optional second-tier smoke-test check added: POST flat-shape body asserts response code `M3_NESTED_BODY_REQUIRED` (Plan 03 atomic-break sentinel) — confirms route layer is on the cutover commit, not stale
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  insertions: 275
  deletions: 66
  loc_property_ts_post: 126
  loc_context_md_post: 438
  completed_date: 2026-05-05
jaytap_repo_pre_sha: 3ded56be8efcf277b64e7d3922ef69303a5cf0ab
jaytap_repo_post_sha: 38e3c81
backend_repo_pre_sha: f8197babdf8ba28acc56f0585e7c317b2b5afd2f
backend_repo_post_sha: f8197babdf8ba28acc56f0585e7c317b2b5afd2f  # UNCHANGED — Plan 05 is JayTap-repo-only
---

# Phase 1 Plan 05: RN Client Type Stub + Operator Runbook (Phase 1 Close) Summary

Closed out Phase 1 with two deliverables in the JayTap repo (no backend repo writes):

1. **Replaced `src/types/Property.ts`** flat-shape interface with the full M3 nested-shape interface per CONTEXT.md D-04..D-15 + RESEARCH §"Code Example 7" verbatim. Per Claude's Discretion #3 (researcher RECOMMENDED): the file ships a single nested `interface Property { ... }` with all-optional nested objects (`location?`, `basics?`, `conditionAndAmenities?`, `content?`, `terms?`, `media?`), NOT a `LegacyFlat | NestedShape` union. The union was rejected because the M2 client is already broken per D-01 atomic-break — preserving a half-broken state with extra type-narrowing burden adds no value to Phase 2's nested-aware screen rewrites. The `Tour` interface is DELETED (D-12 — single `media.tourUrl?: string` supersedes); the `PlatformVerifications` interface is preserved verbatim (D-10 keep set); the `HospitalityAmenity` import is preserved (D-09 hospitality consumer). All 11 M2 + M2-Phase-4 audit fields + the 4-state status enum (`'pending' | 'live' | 'rejected' | 'archived'`) stay at the TOP LEVEL of `Property` (SCHEMA-03/04 client-side enforcement — Pitfall 4 defense at the type layer).

2. **Appended §Rollback subsection to `01-CONTEXT.md`** per D-17 verbatim. The runbook is OPERATOR-FACING copy-paste material covering: (a) Atlas tier confirmation checklist with three-way branch (M10+ on-demand UI / Flex daily-snapshot timestamp / M0 free-tier mongodump fallback per Pitfall 5), (b) the mongodump fallback verbatim from RESEARCH §"Code Example 6", (c) pre-cutover tester comms template (Pitfall 7), (d) D-02 operator command sequence (Atlas snapshot → `nvm use 24` → `--dry-run` with sample-preview inspection → live → `--verify=PASS` exit-code gate → `git push` cutover commit → smoke-test retry loop), (e) reverse-rollback procedure (`git revert` + Atlas restore / `mongorestore --drop`), (f) smoke-test curl commands verbatim (3 routes asserting nested response shape via jq), (g) operator-fillable slots for Atlas tier + snapshot timestamp + cutover commit SHA + push timestamp.

This plan does NOT execute the production migration. It ships the artifacts the operator needs to execute it. The actual production deploy is a manual operator action that happens between phases (or, in the GSD workflow, between commits — the cutover commit is the last commit of Phase 1 from the operator's perspective).

## Diff Stats

```
 .../01-CONTEXT.md                                  | 174 +++++++++++++++++++++
 src/types/Property.ts                              | 167 ++++++++++++--------
 2 files changed, 275 insertions(+), 66 deletions(-)
```

(Computed against JayTap pre-execution SHA `3ded56b` via `git diff --stat 3ded56b..HEAD`.)

`Property.ts` net delta: 91 LOC → 126 LOC (+35 LOC) — the new file is larger than the old because it adds the 6 nested subtree blocks (`location?`, `basics?`, `conditionAndAmenities?`, `content?`, `terms?`, `media?`), the `dealType` + `propertyType` typed unions, and the explicit 11-field audit set at top level. The deletions concentrate in: `title`/`price`/`currency`/`address`/`city`/`latitude`/`longitude`/`description`/`specs`/`features`/`imageUrl`/`videoUrl`/`agent`/`is3DTourAvailable`/`tours`/`type`/`matterportUrl`/`panoramicPhotosUrl`/`rooms` flat fields (D-04..D-15) plus the `Tour` interface (D-12).

`01-CONTEXT.md` net delta: 264 LOC → 438 LOC (+174 LOC) — purely additive at the bottom (new `<rollback>...</rollback>` section between `</deferred>` and the footer, plus the third footer line marking when the runbook was added).

## Commits

| # | Hash | Type | Subject | Repo |
|---|------|------|---------|------|
| 1 | `2d6f671` | feat | replace Property.ts flat-shape interface with full M3 nested shape | JayTap (RN client) |
| 2 | `38e3c81` | docs | append §Rollback subsection to 01-CONTEXT.md (D-17 operator runbook) | JayTap (RN client) |

The closing `docs(01-05)` SUMMARY commit lands in the JayTap planning repo (this file). NO backend repo commits — Plan 05 is JayTap-repo-only.

## Type Stub — What's KEPT vs DELETED

| Symbol | M2 baseline | M3 Plan 05 | Rationale |
|--------|-------------|------------|-----------|
| `import type { HospitalityAmenity } from '../utils/hospitalityAmenities'` | present | **PRESERVED** | D-09 hospitality consumer (M1 HOSP-05) — `Property.amenities?: HospitalityAmenity[]` |
| `export interface PlatformVerifications` | present (3 fields) | **PRESERVED VERBATIM** | D-10 keep set — admin trust signals consumed by `<Gated>` admin checks |
| `export interface Tour` | present (4 fields) | **DELETED** | D-12 — single string `media.tourUrl?: string` supersedes; tour metadata (id/title/thumbnailUrl) dropped |
| `export interface Property` | flat shape (~30 top-level fields) | **REPLACED** with full nested shape | D-01..D-15 — see field map below |

## `Property` Interface — Field-Level Map (M2 → M3)

### Top-level KEEP (D-09 / D-10 / Discretion #5)

| Field | M2 type | M3 type | Decision |
|-------|---------|---------|----------|
| `id` | `string` | unchanged | core identity |
| `listingId?` | `string` | unchanged | web-app cross-reference |
| `ownerUid?` | `string` | unchanged | D-10 keep set |
| `instagramUrl?` | `string` | unchanged | D-10 keep set (owner contact) |
| `availableDate?` | `string` | unchanged | D-10 keep set |
| `features?` | `string[]` | unchanged | D-10 keep set |
| `maxGuests?` | `number` | unchanged | D-09 hospitality preserve (M1 HOSP-05) |
| `amenities?` | `HospitalityAmenity[]` | unchanged | D-09 hospitality preserve (M1 HOSP-05) |
| `propertyType?` | `string` (loose) | `'apartment' \| 'house' \| 'office' \| 'commercial' \| 'hotel' \| 'hostel'` | M1 9-type 3-category preserved per CLAUDE.md hard rule (apartment/house = Residential, office/commercial = Commercial, hotel/hostel = Hospitality) |
| `status?` | `'pending' \| 'live' \| 'rejected' \| 'archived'` | unchanged | SCHEMA-03 hard rule — VERBATIM at TOP LEVEL |
| 11 audit fields (`submittedAt` … `archivedReasonNote`) | top-level | unchanged top-level | SCHEMA-04 hard rule — NEVER under `terms.*` |
| `platformVerifications?` | `PlatformVerifications` | unchanged | D-10 keep set |
| `verificationUpdatedAt?` / `verificationUpdatedByUid?` | top-level | unchanged | D-10 keep set |
| `owner?` (uid/email/phone/whatsapp/telegram/firstName/lastName) | top-level | unchanged | server-side enrichment from GET /:id |

### Top-level ADD

| Field | New type | Source decision |
|-------|----------|-----------------|
| `dealType?` | `'sale' \| 'rent_long' \| 'rent_daily'` | D-04 — M2 `type: 'rent' \| 'sale'` lifted to nested-aware enum |
| `schemaVersion?` | `'m3-nested-v1'` literal-string | Claude's Discretion #5 — researcher RECOMMENDED (mirrors backend Property.js schema default from Plan 01-01) |

### Top-level DROP (M2 flat fields gone — Phase 2 owns the screen rewrite)

| M2 field | Disposition | Decision |
|----------|-------------|----------|
| `title` | → `content.title` | D-15-adjacent (nested move) |
| `price`, `currency` (top-level) | → `basics.price`, `basics.currency` | nested move |
| `period` | DROPPED | D-10 (deal type implies the period) |
| `address` | DROPPED | D-05 — SPEC has no exact-address string field |
| `city` | → `location.city` | nested move |
| `latitude`, `longitude` | → `location.coordinates.{lat, lng}` | nested move |
| `description` | → `content.description` | nested move |
| `specs: { beds, baths, sqft }` | DROPPED | D-08 — bedrooms/bathrooms gone; `basics.areaSqm` is canonical |
| `imageUrl` | DROPPED | D-15 (derived from `media.photos[0]` at render) |
| `images?` | → `media.photos` | D-15 |
| `videoUrl?` | → `media.videos[0]` (single-element array if non-empty) | D-14 |
| `agent?` | DROPPED | D-10 (dead field, never populated meaningfully) |
| `is3DTourAvailable` | DROPPED | D-10 (derive from `media.tourUrl !== undefined` at read time) |
| `tours: Tour[]` | → `media.tourUrl?: string` (single — first non-empty per D-12) | D-12 — Tour interface deleted |
| `type: 'rent' \| 'sale'` | → `dealType` | D-04 |
| `matterportUrl?` | DROPPED | legacy alias (Tour interface gone) |
| `panoramicPhotosUrl?` | DROPPED | D-13 (no SPEC slot; mod re-attaches via Phase 3 if needed) |
| `rooms?: number` (top-level Phase 6 hospitality) | → `basics.rooms: '1' \| '2' \| '3' \| '4+'` OR `basics.hotelRooms` (string enum) | D-07 numeric→string conversion (conditional destination by `propertyType`) |

### New Nested Subtrees (per anchor SPEC §"Suggested Data Shape")

```typescript
location?: { city?, district?, coordinates?: { lat, lng }, showExactAddress? }
basics?:   { areaSqm?, price?, currency?, rooms?, bathroom?, kitchen?, hotelRooms?, hotelClass? }
conditionAndAmenities?: { condition?, furnished? }
content?:  { title?, description?, language? }
terms?:    { negotiable?, deposit?: { amount, currency }, prepaymentMonths?, minTerm? }
media?:    { photos: string[], videos: string[], tourUrl? }
```

Enum values verbatim from RESEARCH §"Code Example 7":
- `basics.currency` / `basics.deposit.currency` (under `terms`): `'KGS' | 'USD' | 'EUR'`
- `basics.rooms` / `basics.hotelRooms`: `'1' | '2' | '3' | '4+'`
- `basics.bathroom` / `basics.kitchen`: `'private' | 'none' | 'shared'`
- `basics.hotelClass`: `'economy' | 'standard' | 'comfort' | 'premium'`
- `conditionAndAmenities.condition`: `'rough' | 'whitebox' | 'good' | 'euro'`
- `content.language`: `'ru' | 'en'`
- `terms.minTerm`: `'1_day' | '1_month' | '3_months'`
- `dealType` (top-level): `'sale' | 'rent_long' | 'rent_daily'`

## Operator Runbook — 7 Components Added to §Rollback

| # | Component | Source decision | Operator action |
|---|-----------|-----------------|-----------------|
| 1 | Atlas tier confirmation checklist | RESEARCH Pitfall 5 — Atlas free-tier (M0) does NOT support snapshot UI | Log into Atlas console; record tier (M10+ / Flex / M0); record snapshot timestamp OR mongodump archive path |
| 2 | Atlas M0 fallback — `mongodump` | RESEARCH §"Code Example 6" verbatim | If M0: `mongodump --uri "$MONGO_URI" --out "./mongodump-pre-m3-${TIMESTAMP}"` + tar archive + `mongorestore --drop` for rollback path |
| 3 | Pre-cutover tester comms template | RESEARCH Pitfall 7 — Tester impact window calculation drives comms timing | Copy-paste Subject + Body to internal testers (TestFlight build 27 / Play Internal versionCode 30) BEFORE cutover deploy so they don't file bug reports about blank Home/Favorites/RenterListings/OwnerListings/PropertyDetails |
| 4 | D-02 operator command sequence | M2 Plan 02-02 D-03 verbatim adapted to M3 | 7 steps: pre-flight `MONGO_URI` check → snapshot → `--dry-run` + visual sample-preview inspection → live → `--verify=PASS` exit-code gate → `git push` cutover → smoke-test |
| 5 | Reverse-rollback procedure | D-16 — Atlas snapshot is the rollback mechanism, NOT a reverse migration script | `git revert <CUTOVER_SHA>` + push (Railway redeploys with M2 routes) → Atlas UI restore (M10+) OR mongorestore --drop (M0) → countDocuments({address: {$exists: true}}) > 0 verification → post-rollback tester comms |
| 6 | Smoke-test curl commands (3 routes) | RESEARCH Pitfall 6 — Railway redeploy timing window | `curl https://${RAILWAY_PROD_URL}/api/properties` (anonymous list) + `/api/properties/<listing-id>` (anonymous deep-link) + `/api/moderation/queue` with mod token; jq acceptance check `.location.city != null and .address == null`; retry loop 5 attempts × 30s sleep |
| 7 | Operator-fillable slots | D-17 — explicit slots so the document IS the audit trail | Atlas tier; snapshot timestamp / mongodump archive path; captured-at-UTC; cutover commit SHA; pushed-at-UTC |

The runbook explicitly cites Plans 03/04 cutover SHAs at §"Step 6 — Cutover commit deploy":
- Plan 03 propertyRoutes cutover lands at `c4bf01d`
- Plan 04 moderationRoutes cutover lands at `f8197ba`
- Combined post-Plan-04 backend SHA `f8197ba` is the cutover head

so the operator has the canonical "what is the cutover commit?" answer in the document itself.

Optional second-tier smoke check added: POST a flat-shape body and assert response code `M3_NESTED_BODY_REQUIRED` (Plan 03 atomic-break sentinel) — confirms route layer is on the cutover commit, not stale.

## Phase 2 Hand-Off — Per-Screen TypeScript Errors are EXPECTED (D-01)

Per CONTEXT.md D-01 atomic-break: the M2 client (TestFlight build 27 / Play Internal versionCode 30) screens that consume the OLD flat shape are ALREADY broken at runtime — Phase 1 does NOT touch them. Phase 2 will rewrite them.

Files that will surface TypeScript errors against the new `Property.ts` (out-of-scope for Phase 1; Phase 2 inputs):
- `src/screens/HomeScreen.tsx`
- `src/screens/FavoritesScreen.tsx`
- `src/screens/RenterListingsScreen.tsx`
- `src/screens/OwnerListingsScreen.tsx`
- `src/screens/PropertyDetailsScreen.tsx`
- `src/components/PropertyCard.tsx`
- Possibly `src/components/HospitalitySection.tsx` and `src/components/HospitalityCard.tsx` (D-09 amenities consumer — likely still compiles since `amenities?: HospitalityAmenity[]` is preserved)
- Other consumers reading `p.title`, `p.address`, `p.price`, `p.bedrooms`, `p.bathrooms`, `p.specs.beds`, `p.tours[0].url`, `p.is3DTourAvailable`

Per the plan's `<dependency_anchor>` block: the strict policy is "**Property.ts compiles in isolation**; per-screen TypeScript errors elsewhere in the project are EXPECTED and tracked as Phase 2 inputs". The plan's tsc gate is scoped: `npx tsc --noEmit --skipLibCheck src/types/Property.ts` exits 0. Whole-project tsc may emit per-screen errors — that is by design, not a regression.

## Phase 1 Close — ROADMAP Success Criteria

Plan 05 is the FINAL plan in Phase 1. With all 5 plans shipped, the 5 ROADMAP success criteria for Phase 1 are check-marked:

| # | Criterion | Plan(s) that delivered it |
|---|-----------|---------------------------|
| 1 | `migrate-listings-m3` dry-run + verify=PASS + `countDocuments({location:$exists:false})===0` acceptance | ✅ **Plan 01-02** (`migrate-listings-m3.js` ships --dry-run / live / --verify=PASS subcommands; SCHEMA-02 acceptance gate built in) |
| 2 | M1+M2 listings + `media.photos[]` survive migration verbatim | ✅ **Plan 01-02** (idempotency + audit-field preservation tests; `D-15: images: [String] → media.photos: [String]` mapping verbatim; D-09 hospitality `maxGuests` + `amenities` UNTOUCHED passthrough) |
| 3 | Status enum + 11 audit fields stay TOP LEVEL | ✅ **Plan 01-01** (schema invariant — `Property.schema.path('terms.submittedAt')` undefined for all 11) + **Plan 01-02** (migration `$set/$unset` invariants — buildNestedShape NEVER emits audit/status keys; LEGACY_FLAT_FIELDS_TO_UNSET excludes all 11 by enumeration) + **Plans 01-03/01-04** (route-layer body-status sanitizer at PUT propertyRoutes + 21-key mass-assignment strip at moderationRoutes) |
| 4 | Backend routes return nested shape exclusively after cutover; cutover AFTER migration | ✅ **Plans 01-03 + 01-04** (route cutover at SHAs `c4bf01d` + `f8197ba`) + **Plan 01-05 §Rollback** (operator runbook enforcing the order: Atlas snapshot → migration → verify=PASS → THEN cutover commit deploy) |
| 5 | Rollback procedure documented + validatable against Atlas restore-snapshot | ✅ **Plan 01-05 §Rollback** (D-17 inline; M10+ on-demand UI / Flex daily / M0 mongodump fallback all documented; `git revert <CUTOVER_SHA>` reverse-rollback procedure with verification step) |

## Downstream Readiness

Phase 2 can be planned next (`/gsd-plan-phase 2`). The contract Phase 2 consumes:

- `import type { Property } from '../types/Property'` — full M3 nested-shape interface ready.
- `import type { PlatformVerifications } from '../types/Property'` — admin trust-signal type ready.
- Backend route surface (Plans 03 + 04 already cut over — `c4bf01d` + `f8197ba`) returns nested-shape on every read path: `GET /api/properties` + `GET /api/properties/:id` + `GET /api/properties/user/:firebaseUid` + `GET /api/moderation/queue` + `POST /:id/approve` + `POST /:id/reject` + `POST /:id/archive` + `POST /:id/restore` + `PUT /:id` + `PATCH /:id/verifications` + `POST /:id/archive` + `POST /:id/unarchive` + `DELETE /:id`.
- Backend route write surface accepts nested-shape body on POST /api/properties + PUT (both `/api/properties/:id` and `/api/moderation/listings/:id`); flat-shape body returns 400 with code `M3_NESTED_BODY_REQUIRED` (Plan 03 atomic-break sentinel).
- Phase 2 owns the entire `<ContextualListingFlow>` 6-step rewrite + `validateStep()` + +80–120 EN+RU keys (FLOW-01..FLOW-16) and the screen rewrites (HomeScreen / FavoritesScreen / RenterListings / OwnerListings / PropertyDetails / PropertyCard).

Operator can deploy Phase 1 cutover whenever ready by following the §Rollback runbook in `01-CONTEXT.md`. No additional planner action required to deploy.

## Deviations from Plan

### Auto-fixed Issues

None. Both tasks shipped without auto-fix Rule 1/2/3 deviations. The plan's `<interfaces>` TARGET shape (RESEARCH §"Code Example 7" verbatim) was complete enough to drop in directly; the §Rollback append text was specified verbatim in the plan's `<action>` block.

Minor refinements (NOT deviations — explicit plan acceptance compliance):

1. **Comment text "Phase 2 PR drafts" preserved in Property.ts header.** Plan `<verification>` cross-phase check requires `grep -F "Phase 2 PR drafts" src/types/Property.ts` ≥ 1 line. The header comment block from RESEARCH §"Code Example 7" mentions "Phase 2 PR drafts compile against it" verbatim; this was preserved (line 3: "This file ships the canonical NESTED shape so Phase 2 PR drafts compile against it.") plus an additional reference in the audit-field-set comment block (line 93: "Phase 2 PR drafts read submittedAt + rejectionReasonCode + rejectionReasonNote at minimum.").

2. **Backend cutover SHAs cited in runbook §"Step 6".** Plan `<action>` Step 6 has the runbook reference "Plan 03 + Plan 04 commits land at this push" but doesn't specify the exact SHAs. Cited explicitly: `c4bf01d` (Plan 03 propertyRoutes) + `f8197ba` (Plan 04 moderationRoutes) — matches the SHA chain documented in Plans 01-03 and 01-04 SUMMARY files. This is operator-facing material; explicit SHAs reduce friction at deploy time.

3. **Optional second-tier smoke check added.** Plan `<acceptance_criteria>` notes `M3_NESTED_BODY_REQUIRED` is OPTIONAL. Added as a one-line note at the end of §"Step 7 — Smoke test" ("POST a flat-shape body to `/api/properties` and assert the response code is `M3_NESTED_BODY_REQUIRED`") — confirms route layer is on the cutover commit, not stale. NOT a deviation; documented as plan-permitted.

4. **Runbook §"Operator visually inspects" includes pipe-stdout-private warning.** Plan `<threat_model>` T-01-05-Information-Disclosure-01 requires the runbook to note "operator must pipe stdout to a private terminal session, not a shared Slack/screen-share." Added inline at §"Step 3 — Dry-run" — preserves the threat-model mitigation discipline at the runbook layer where the operator actually reads it. NOT a deviation; threat-model carry-forward.

### Discretionary Calls Documented (NOT deviations)

These are CONTEXT.md "Claude's Discretion" items — researcher/planner explicitly delegated to executor:

- **Discretion #3 (full nested type vs union):** Shipped FULL nested type per researcher RECOMMENDED. The `interface Property` is a single nested-shape definition; NOT `type Property = LegacyFlat | NestedShape`. Rationale documented in the file's header comment block (lines 4-9).
- **Discretion #5 (schemaVersion marker):** PRESENT — `schemaVersion?: 'm3-nested-v1'` literal-string union (line 119). Mirrors backend Property.js schema default from Plan 01-01.

### Auth gates encountered

None. This plan ships compile-time artifacts (TypeScript type definition) + a planning-document append (§Rollback in 01-CONTEXT.md). No production auth path exercised.

### CLAUDE.md compliance

- No new npm dependencies added (PROJECT.md hard rule for Phase 1).
- No `firebase` / `@react-native-firebase/*` packages — RN client repo rule per auto-memory `no-firebase-sdk.md` (verified by grep — neither file mentions Firebase SDK; runbook references Firebase Identity Toolkit REST only via the `verifyFirebaseToken` middleware path, which is server-side JWKS verification per `identity-vs-user-store.md`).
- `nvm use 24` referenced in runbook for backend operations (auto-memory `backend-node-version.md`); RN client uses default Node v20 — Property.ts compile uses the project's tsc.
- No `react-navigation` migration touched (CLAUDE.md hard rule — out of scope).
- Geographic scope (KG/KZ/UZ) preserved — `content.language` enum is `'ru' | 'en'` (Bishkek launch market default; auto-memory `geographic-scope.md` carry-forward).
- 9-type 3-category taxonomy preserved — `propertyType` typed union has exactly 6 values (`apartment`, `house`, `office`, `commercial`, `hotel`, `hostel`) mapping to the 3 categories per `src/utils/propertyCategory.ts`.
- Hospitality showcase-only invariant preserved — `maxGuests?: number` + `amenities?: HospitalityAmenity[]` are TOP LEVEL (D-09); no per-night pricing or booking calendar fields introduced.

## Threat Flags

None. Plan 05 ships a TypeScript type definition (compile-time only — TypeScript types don't execute) plus an additive planning-document append. No new HTTP routes, no new auth paths, no new IAM permissions, no new file-access patterns. The threat register from PLAN.md `<threat_model>` is fully addressed:

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-01-05-Tampering-01 (operator runs migration against staging instead of production) | mitigate | Runbook §"Step 1 — Pre-flight" prints `MONGO_URI` prefix so operator visually verifies. §"Step 3 — Dry-run" prints doc count — anomalous numbers are a second sanity gate. |
| T-01-05-Tampering-02 (snapshot captured AFTER migration starts) | mitigate | Runbook §"Step 2" explicitly orders snapshot BEFORE Step 3 (dry-run). Operator-fillable timestamp slot enforces capture-and-record discipline. |
| T-01-05-Information-Disclosure-01 (sample preview output shared in non-private channels leaking ownerUid / instagramUrl) | mitigate | Runbook §"Step 3 — Dry-run" comment notes "operator must pipe stdout to a private terminal session, not a shared Slack/screen-share." M1+M2 mock data is non-PII so impact is limited; the warning is forward-looking. |
| T-01-05-Information-Disclosure-02 (RAILWAY_PROD_URL / MOD_TOKEN env vars committed to runbook) | mitigate | Runbook uses `${RAILWAY_PROD_URL}` / `${MOD_TOKEN}` placeholders — operator exports these in their shell, NEVER commits to .planning/. CONTEXT.md is git-tracked but contains no secrets. |
| T-01-05-Repudiation-01 (no record of who ran the cutover or when) | mitigate | Runbook has explicit operator-fillable slots for Atlas tier, snapshot timestamp, cutover commit SHA, and "pushed at" timestamp. The git commit SHA is the canonical change record (paired-gate posture per `gsd-verifier-misses-regressions.md`). |
| T-01-05-DoS-01 (smoke test floods Railway with rapid-fire curl) | accept | Runbook smoke-test loop has `sleep 30` between attempts (max 5 attempts = 2.5min total). Railway can handle this load trivially. |
| Type stub threat (Task 1) | N/A — compile-time only | TypeScript types don't execute — no runtime threat surface. Per planner: "Type stub (01-05): No runtime threat — TypeScript types don't execute. No threat model needed." |

## Self-Check: PASSED

Verification commands (run from `/Users/beckmaldinVL/development/mobileApps/JayTap`):

1. **Scope:** `git diff --name-only 3ded56b..HEAD` returns EXACTLY 2 files:
   ```
   .planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md
   src/types/Property.ts
   ```
   FOUND: no scope creep. Plan 05 is JayTap-repo-only (no `01-05-SUMMARY.md` yet at the time of this self-check; the summary commit lands AFTER self-check).

2. **Backend repo unchanged:** `git -C /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services rev-parse HEAD` returns `f8197babdf8ba28acc56f0585e7c317b2b5afd2f` — UNCHANGED from pre-execution (Plan 04 head).

3. **Isolated tsc gate (Property.ts compiles in isolation):** `npx tsc --noEmit --skipLibCheck src/types/Property.ts` exits 0. The HospitalityAmenity import resolves; all enum/union literals parse; nested object types check.

4. **§Rollback subsection structure:** `grep -nE "## Rollback|## Atlas|## Operator runbook|## Tester comms|## Reverse" 01-CONTEXT.md` finds:
   - line 92: `### Rollback strategy` (existing M2 carry-forward in `<decisions>`)
   - line 262: `## Rollback (D-17 operator runbook)` (NEW — the H2 we appended)
   - line 266: `### Atlas tier confirmation (Wave 0 of execute-phase — RESEARCH Pitfall 5)`
   - line 281: `### Atlas M0 fallback — \`mongodump\``
   - line 400: `### Reverse-rollback procedure (D-16 — Atlas snapshot is the rollback mechanism, NOT a reverse migration script)`

5. **Smoke-test curl commands present:** `grep -nE "curl.*api/properties|curl.*api/moderation/queue" 01-CONTEXT.md` finds 4 lines (line 220 — pre-existing reference in `<specifics>`; lines 381 + 383 + 385 — the 3 new curl commands in §"Step 7 — Smoke test").

6. **Nested-shape interface fields:** `grep -nE "location\?:|basics\?:|media\?:" src/types/Property.ts` finds all three nested subtree entries (lines 38, 46, 79).

7. **Migration npm script verbatim references in runbook:** `grep -nE "npm run migrate:listings-m3|--dry-run|--verify=PASS" 01-CONTEXT.md` finds all three patterns.

8. **Phase 2 PR drafts comment preserved:** `grep -F "Phase 2 PR drafts" src/types/Property.ts` returns 2 matches (line 3 in header comment + line 93 in audit-field-set comment block).

9. **Commit chain:** `git -C /Users/beckmaldinVL/development/mobileApps/JayTap log --oneline 3ded56b..HEAD`:
   ```
   38e3c81 docs(01-05): append §Rollback subsection to 01-CONTEXT.md (D-17 operator runbook)
   2d6f671 feat(01-05): replace Property.ts flat-shape interface with full M3 nested shape
   ```

10. **No file deletions in commits:** `git log --diff-filter=D --name-only 3ded56b..HEAD` returns no output.

All claims verified. JayTap repo at `38e3c81` (post-Plan-01-05 task commits, pre-SUMMARY commit). Phase 1 ships its final compile-time + operator-runbook artifacts; the operator can now execute the cutover deploy by following 01-CONTEXT.md §Rollback verbatim.

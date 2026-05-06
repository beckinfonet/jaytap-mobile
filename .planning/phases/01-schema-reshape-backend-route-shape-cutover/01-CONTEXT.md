# Phase 1: Schema Reshape + Backend Route Shape Cutover - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Reshape the `Property` Mongoose schema in `JayTap-services` from M2's flat shape to the SPEC's nested shape (`location.*` / `basics.*` / `conditionAndAmenities.*` / `content.*` / `terms.*` / `media.*`) via an operator-supervised one-shot migration (`migrate-listings-m3.js`), then cut backend read/write routes (`GET /api/properties` + `GET /api/properties/:id` + `GET /api/moderation/queue` + `POST /api/properties` + `PUT /api/properties/:id` + `PATCH /api/properties/:id/verifications`) over to the nested shape — with the migration running strictly BEFORE the route cutover commit, with the M2 status enum (`pending | live | rejected | archived`) and all M2/M2-Phase-4 audit fields kept top-level (NEVER nested under `terms.*`), and with rollback documented against an Atlas restore-snapshot timestamp captured pre-migration.

**Touches both repos:**
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — `src/models/Property.js` (schema reshape), `src/scripts/migrate-listings-m3.js` (NEW — sibling of M2's `migrate-listings-m2.js`), `src/routes/propertyRoutes.js` (cutover), `src/routes/moderationRoutes.js` (cutover), backend test suites (test scope deferred to Claude's discretion in plan-phase).
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — `src/types/Property.ts` lightweight stub update only (Phase 2 owns the full client cutover; Phase 1 does NOT touch screens).

**Requirements covered:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05 (5 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- 6-step contextual flow `<ContextualListingFlow>` — Phase 2 (FLOW-01..FLOW-16)
- Media flow inversion (mod media-curation view + `POST /api/moderation/listings/:id/media` + S3 IAM update + `MEDIA_REQUIRED` invariant) — Phase 3 (MEDIA-01..MEDIA-09)
- ROLE-11 frontend mid-action 403 popup-recovery — Phase 4 (CARRY-01)
- Phase 4.5 landlord-application uid-mismatch fix — Phase 4 (CARRY-02)
- v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission — Phase 5 (REL-01..REL-06)
- RN client screen reads (`HomeScreen` / `FavoritesScreen` / `RenterListingsScreen` / `OwnerListingsScreen` / `PropertyDetailsScreen` / `PropertyCard`) — Phase 2 owns the entire client cutover. Phase 1 ships only the `src/types/Property.ts` type-stub update so Phase 2 can compile against the new shape. Per **D-01 (atomic break)**, the in-flight M2 client (TestFlight build 27 + Play Internal versionCode 30) WILL break against the new backend until Phase 2 ships — accepted because testers are dev-team only and M1+M2 listings are mock data.
- AWS S3 IAM policy changes — Phase 3 owns the IAM rotation (admin/mod gain upload rights, user upload rights revoked). Phase 1 does NOT touch IAM.

</domain>

<decisions>
## Implementation Decisions

### Cutover atomicity & deploy sequence

- **D-01 (Atomic-break cutover — no compat window):** Backend routes cut to nested-only shape at the cutover commit. The M2 client (TestFlight build 27 + Play Internal versionCode 30) reads flat shape on `Home` / `Favorites` / `RenterListingsScreen` / `OwnerListingsScreen` / `PropertyDetailsScreen` / `PropertyCard` — those screens WILL break against the new backend until Phase 2 ships nested-aware reads. Accepted because: (a) testers are dev-team-only on both stores' Internal Testing tracks (no public users); (b) M1+M2 listings are mock data per `PROJECT.md §Out of Scope` ("Migration tooling for existing listings — No production listings exist"); (c) this matches the M1+M2 atomic-cutover precedent (no dual-flow window). **SC #2 reframing:** "existing M1+M2 listings remain visible end-to-end in M2 screens" is read as "DATA survives migration verbatim and becomes visible in Phase 2 client" — NOT "M2 client keeps rendering during the gap." Backend transformer (dual-shape window) and Phase 1 client defensive-reads (interim v2.0.1) are both REJECTED. Phase 1's `Property.ts` type stub update is a compile-time consumer for Phase 2; nothing in `src/screens/` or `src/components/` is touched in Phase 1.

- **D-02 (Operational deploy sequence — M2 Plan 02-02 verbatim):** Same operator-supervised flow that shipped successfully in M2 Phase 2:
  1. **Atlas snapshot** — Operator captures pre-migration MongoDB Atlas snapshot via the Atlas UI; timestamp recorded in `01-CONTEXT.md §Rollback`.
  2. **Dry-run** — Operator runs `npm run migrate:listings-m3 -- --dry-run` against production `MONGO_URI`. Reviews count output + 3-doc before/after sample preview (per D-18). Aborts if numbers/sample look wrong.
  3. **Live migration** — Operator runs `npm run migrate:listings-m3` (live writes). Migration uses idempotent skip-already-migrated filters (per D-03).
  4. **Verify gate** — Operator runs `npm run migrate:listings-m3 -- --verify=PASS`. Acceptance: `db.properties.countDocuments({location: {$exists: false}})` returns 0. Exit 0 = PASS, exit 1 = FAIL.
  5. **Cutover commit deploy** — Operator `git push` to Railway. Railway redeploys backend with the route-shape cutover commit (the FIRST commit after the migration runs successfully, per ROADMAP SC #4).
  6. **Smoke test** — Operator hits `GET /api/properties` (anonymous), `GET /api/properties/:id` (deep-link), `GET /api/moderation/queue` (mod-token) and confirms each returns `{location: {city, district, coordinates}, basics: {...}, ...}` shape exclusively (no top-level `address` / `latitude` / `bedrooms` / `bathrooms` / `type`). Smoke-test commands enumerated in `01-CONTEXT.md §Rollback` runbook.
  Pattern source: `JayTap-services/src/scripts/migrate-listings-m2.js` + `.planning/milestones/v2.0-phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md §D-03`.

- **D-03 (Migration idempotency — skip-already-migrated filters):** Each migration operation's filter excludes already-migrated rows. Concrete: the top-level "needs migration" filter is `{location: {$exists: false}}`. Re-running on a partially-migrated dataset modifies 0 already-nested rows. No `_m3migrated:true` marker field, no pure-`$set` overwrite. Matches M2 Plan 02-02 D-03 idempotency posture.

### Schema field mapping policy (legacy flat → nested)

- **D-04 (Deal type backfill — `type:'rent'` → `dealType:'rent_long'`):** Legacy `type:'rent'` rows migrate to `dealType:'rent_long'`. Legacy `type:'sale'` rows migrate to `dealType:'sale'`. No conditional by `propertyType` (e.g., hospitality `type:'rent'` rows become `rent_long`, NOT `rent_daily`). Owners can edit to `rent_daily` via Phase 2 flow once shipped. Matches M1's "monthly rent" baseline; SPEC §"Decisions Log" #1 ("All combinations of deal type × property type are allowed") permits hospitality + rent_long.

- **D-05 (Address policy — DROP legacy free-form `address` string):** SPEC §"Step 2 — Location" has no exact-address string field — only `location.{city, district, coordinates:{lat,lng}, showExactAddress:bool}`. The current `address: String, required: true` field is dropped in migration; the `required` constraint is also removed (replaced by `location.coordinates` required-via-Mongoose). M1+M2 listings are mock data; loss of free-form address strings is acceptable. Matches SPEC's privacy-by-default posture (200–300m radius unless toggle on).

- **D-06 (District backfill — empty string for all legacy rows):** `location.district = ''` for every migrated legacy row. Phase 2 client renders a placeholder when district is empty (planner discretion on placeholder copy — recommend EN "District not set" / RU «Район не указан»). Owners populate district via Phase 2 flow on next edit. No hardcoded "Unknown" / «Неизвестно» literal — those would be fake data.

- **D-07 (Rooms numeric→string conversion):** Migration translates `rooms: Number` → `basics.rooms: '1' | '2' | '3' | '4+'` per:
  - `rooms === 1` → `'1'`
  - `rooms === 2` → `'2'`
  - `rooms === 3` → `'3'`
  - `rooms >= 4` → `'4+'`
  - `rooms === 0 || rooms == null` → omit `basics.rooms` (undefined)
  Same logic applied to `hotelRooms` for hospitality types (hotel/hostel) — except the source field is the same legacy `rooms: Number` (M1 hospitality stores room count under `rooms`). Per SPEC §"Conditional sub-fields", the destination differs by propertyType:
  - `propertyType ∈ {apartment, house, office, commercial}` → `basics.rooms`
  - `propertyType ∈ {hotel, hostel}` → `basics.hotelRooms` (and `basics.rooms` undefined for hospitality)

- **D-08 (Drop legacy `bedrooms` and `bathrooms` numeric counts):** Both fields dropped in migration. Reasoning: SPEC's `basics.rooms` is the canonical room count (now string-enum); SPEC's `basics.bathroom` is `'private' | 'none' | 'shared'` (an availability enum, NOT a count) and applies only to office/commercial — bathroom counts have no SPEC home. M1+M2 mock data — no information loss in production. Reduces field count.

- **D-09 (M1 Hospitality `maxGuests` and `amenities[]` — preserve top-level):** `maxGuests: Number` and `amenities: [String]` (M1 Phase 6 HOSP-05 12-amenity multi-select) stay at the top level of every migrated doc. Reasoning: M1 Phase 6 read paths (`HospitalityCard.tsx`, `PropertyDetailsScreen` Hospitality branch, `HospitalitySection`) consume these fields; SPEC §3 is silent on amenities for hotel/hostel (no contradiction); preserving keeps M1 hospitality showcase rendering intact when Phase 2 client lands. NOT moved under `basics.hospitality:{...}` because that would require a Phase 1 client patch (rejected per D-01 atomic break). NOT dropped because that regresses M1 HOSP-05.

- **D-10 (Orphan top-level fields — selective preservation):** Default policy: keep top-level for fields that represent operational/admin/contact metadata; drop fields that become redundant under the new shape. Concrete rules:
  - **Keep top-level (preserved verbatim):**
    - `instagramUrl` — owner contact metadata, NOT user-flow content. Stays alongside `ownerUid`.
    - `availableDate` — move-in availability metadata; SPEC has no analog. Stays top-level until Phase 2+ decides if it's worth nesting.
    - `listingId` — web-app cross-reference (M1 legacy).
    - `platformVerifications: {ownershipDocuments, ownerIdentityVerified, stateIssuedDocumentsVerified}` + `verificationUpdatedAt` + `verificationUpdatedByUid` — admin trust signals. Read by `<Gated>` admin checks (M2 ADMIN-* + M1 GATE-*); critical to preserve at top level.
  - **Drop in migration:**
    - `period` (e.g., `'month'`) — deal type now implies the period (`rent_long` → month, `rent_daily` → day, `sale` → no period). Redundant.
    - `is3DTourAvailable` — derive at read time from `media.tourUrl` (Phase 2 client + Phase 3 mod queue). Stale if not derived.
    - `agent: {name, rating, reviews, imageUrl}` — never populated meaningfully in M1+M2 (dead field).
  - **Note on M2 audit fields:** All M2 audit fields (`submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`) STAY top-level per SCHEMA-04 (REQUIREMENTS.md hard rule) — never nested under `terms.*`.

- **D-11 (`content.language` backfill — 'ru' default for all legacy rows):** Migration sets `content.language = 'ru'` on every legacy row. Bishkek launch market is RU-primary; M1+M2 mock content is mostly Russian-language. Owners can edit via Phase 2 flow if their listing is actually English-authored. No Cyrillic-vs-Latin heuristic detection (rejected for over-engineering on mock data).

### Media coalescing strategy

- **D-12 (`tours[]` → single `media.tourUrl` — first non-empty `tours[i].url`):** Migration sets `media.tourUrl = tours.find(t => t.url && t.url.length > 0)?.url`. If no non-empty entry exists or `tours` is empty/undefined, `media.tourUrl` is undefined. Tour metadata (`id`, `title`, `thumbnailUrl`) is dropped — SPEC's single-string `tourUrl` shape doesn't accommodate it. Loses multi-tour rendering for any legacy listing that had >1 tour (mock data — minimal impact).

- **D-13 (`panoramicPhotosUrl` — DROP in migration):** SPEC's `media:{photos[], videos[], tourUrl?}` has no panoramic-photos slot. Phase 3 mod-curation owns media post-migration; if a legacy listing had panoramic photos, the mod re-attaches via Phase 3 mod queue. Aligns with media-inversion direction. NOT coalesced into `tourUrl` (semantic mismatch — panoramic-photo URLs render differently than 3D-tour URLs).

- **D-14 (`videoUrl: String` → `media.videos: [videoUrl]`):** Migration wraps the legacy single video URL into a single-element array if non-empty: `media.videos = videoUrl ? [videoUrl] : []`. Empty string / null / undefined → empty array. Preserves legacy video data verbatim under the new array shape.

- **D-15 (`images: [String]` → `media.photos`; drop derived `imageUrl`):** Migration sets `media.photos = images || []`. The legacy derived `imageUrl` field (which was `images[0]` anyway) is dropped — callers compute primary image from `media.photos[0]` at render time. Satisfies ROADMAP SC #2 ("user-uploaded media.photos[] survive verbatim") since `media.photos` IS the original `images[]` array.

### Rollback strategy

- **D-16 (Atlas snapshot is the rollback mechanism — no reverse migration script):** Operator captures Atlas snapshot timestamp BEFORE running migration. Documented runbook: rollback procedure = (a) `git revert <route-cutover-commit-SHA>` to restore flat-shape route reads, (b) restore MongoDB from the captured Atlas snapshot via the Atlas UI to restore flat-shape data. Loses any data written between snapshot capture and rollback execution (acceptable: M1+M2 listings are mock; tester writes during the cutover window are accepted-loss). NO `_legacyFlat:{...}` per-doc snapshot field. NO `migrate-listings-m3.js --reverse` script. Simplest; no reverse-mapping logic to maintain (lossy reverse mappings like `'4+' → 4 number` and dropped fields like `address` cannot be reconstructed regardless).

- **D-17 (Rollback runbook — inline in `01-CONTEXT.md §Rollback`):** Atlas snapshot timestamp + step-by-step rollback procedure (revert SHA discovery + Atlas restore UI walkthrough + post-rollback smoke test) documented inline in this CONTEXT.md under a §Rollback subsection added by the planner. Cross-referenced from PLAN.md tasks. Matches M2 Plan 02-02 D-03 runbook pattern (sequencing inline in phase context). NOT a standalone `01-RUNBOOK.md` file. NOT in the backend repo's `scripts/` directory.

- **D-18 (Pre-migration verification — `--dry-run` prints counts + 3-doc sample preview):** Operator's `--dry-run` invocation prints (a) per-operation count of docs that will migrate, (b) 3 randomly-selected docs in before-flat / after-nested JSON shape for visual inspection. If counts or sample look wrong, operator aborts before running live. Sample size 3 chosen to keep stdout reasonable while giving enough signal across propertyTypes/dealTypes. Migration script also prints pre-condition assertion: total docs == docs needing migration (matches SCHEMA-02 idempotency posture from D-03).

### Claude's Discretion

- **Phase 1 backend test update scope** — researcher/planner decides during plan-phase based on cost/coverage balance. Default expectation: backend test suites that touch `Property` shape (`Property.test.js`, `propertyRoutes.test.js`, `moderationRoutes.test.js`, possibly `adminRoutes.test.js`) are updated to nested-shape assertions inside Phase 1, on the atomic-cutover principle (tests cut over with code). Researcher/planner has discretion to defer one or more suites to Phase 5 hardening if scope grows; if so, those suites are explicitly skipped (`describe.skip` or `it.skip`) with a TODO comment referencing this CONTEXT.md, and a Phase 1 verification gate ensures the new `migrate-listings-m3.test.js` + happy-path nested-shape tests are added regardless.

- **Mongoose schema strict mode policy** — researcher/planner decides whether the new nested schema uses `strict: true` (reject extras), `strict: 'throw'` (throw on extras), or `strict: false` (allow extras). M2 Property.js is strict by default. Recommend: keep `strict: true` to prevent legacy flat-shape data from silently sneaking into new writes.

- **`Property.ts` type stub shape on the RN client** — researcher/planner decides whether Phase 1 ships a full nested type definition or a `Property = LegacyFlatShape | NestedShape` union for the gap window. Phase 2 owns the canonical client type; Phase 1's update is a compile-time enabler for Phase 2 PR drafts.

- **Migration sample-preview doc selection** — D-18 says 3 randomly-selected docs. Researcher/planner decides whether to bias the sample toward propertyType diversity (e.g., 1 apartment + 1 commercial + 1 hotel) for stronger before/after signal across the conditional sub-field branches (D-07).

- **Schema versioning marker** — researcher/planner decides whether to add a `schemaVersion: 'm3-nested-v1'` field on every doc post-migration. Optional; D-03 idempotency works on `{location: {$exists: false}}` without it. Adds explicit traceability if future migrations need it.

- **Mongoose virtual `specs` (current `Property.virtual('specs').get`)** — currently maps `bedrooms`/`bathrooms`/`areaSqm` to client-readable shape. Under D-08 (drop bedrooms/bathrooms), the virtual breaks. Researcher/planner decides whether to delete the virtual entirely or rewrite it to read from `basics.{rooms, areaSqm}` for backward-compat. Phase 2 client doesn't need it; M2 client (already breaking per D-01) won't render the virtual either.

- **`tour.thumbnailUrl` data fate** — Per D-12, all tour metadata (id, title, thumbnailUrl) is dropped. If researcher/planner finds any legacy listing actually populates thumbnailUrl meaningfully, escalate before migration runs.

- **S3 URL format checks during migration** — researcher/planner decides whether the migration validates that `images[]` URLs match the expected S3 prefix (`https://*.s3.*.amazonaws.com/properties/`) before passing them through to `media.photos[]`. Cheap pre-flight check; skips invalid/legacy URLs gracefully.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v3.0 M3 "Contextual Forms"; locked scope; hard rules (no Firebase SDK in either repo, MongoDB role authority, no react-navigation, no per-night pricing for hospitality, M1's 9-type 3-category taxonomy preserved); geographic scope (KG/KZ/UZ launch); backend repo location (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)
- `.planning/REQUIREMENTS.md` §"Schema (Phase 1) — Mongo migration + nested shape" — SCHEMA-01..SCHEMA-05 acceptance criteria with verbatim acceptance assertion (`db.properties.countDocuments({location: {$exists: false}}) === 0`); REQ hard rule that status enum + audit fields stay top-level
- `.planning/ROADMAP.md` §"Phase 1: Schema Reshape + Backend Route Shape Cutover" — Goal + Depends on (foundation, M2 backend baseline at SHA `2fb5639`) + Requirements list + 5 Success Criteria

### Anchor SPEC

- `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` Version 2 — anchor SPEC. Specific load-bearing sections for Phase 1:
  - §"Suggested Data Shape" — target nested Mongo doc shape (verbatim source for D-04..D-15 mapping decisions)
  - §"Step 2 — Location" — `showExactAddress` semantics (forced true for hotel/hostel)
  - §"Step 3 — Basic Information" — `basics.rooms` enum values + conditional sub-fields per propertyType (D-07 source)
  - §"Validation Rules" — per-step required fields (Phase 2 will consume; Phase 1's schema must permit them)
  - §"Decisions Log" — Decisions #1 (all combinations allowed — D-04 source) + #6/#7 (photos/3D tour from user flow — Phase 3 owns)

### Prior milestone references (carries forward as patterns)

- `.planning/milestones/v2.0-phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-03 (migration mechanism — dry-run / verify / sibling-to-seed.js location), §D-21 (audit-field "additive only" schema discipline — Phase 1 carries this) — pattern source for `migrate-listings-m3.js`
- `.planning/milestones/v2.0-phases/02-listing-lifecycle-status-field-absorption/02-PLAN.md` (M2 Plan 02 task structure) — sequencing precedent: schema cutover → migration → route changes → verification
- `.planning/milestones/v2.0-phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` §HF-03 (anti-spoofing grep gate — `grep -nE "uid:\\s*req\\.(body|headers)"`) — Phase 4 (CARRY-02) reuses this; Phase 1 does NOT but the grep-gate pattern is referenced in deferred ideas

### Backend repo files (decision-shaping)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — current flat schema baseline (94 LOC). All 30+ top-level fields enumerated in `<code_context>` below. D-01..D-15 reshape this file.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m2.js` (99 LOC) — pattern source for `migrate-listings-m3.js`. Sibling-to-`seed.js` location at `src/scripts/`. `--dry-run` + `--verify` posture.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (735 LOC) — `GET /` (line 44, D-05/M2 live filter), `GET /user/:firebaseUid` (line 58, D-12/M2 owner-scoped), `GET /:id` (line 296, D-06/M2 deep-link 404), `POST /` (line 105, multer + verifyFirebaseToken + requireListingCapability), `PUT /:id` (line 354, D-22/M2 owner-edit + rejected→pending auto-flip), `PATCH /:id/verifications` (line 265, admin trust signals). Cutover affects every route's read/write shape.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` (641 LOC) — `GET /api/moderation/queue` per ROADMAP SC #4 (cutover affects nested shape returns); other moderation routes (`POST /:id/approve`, `POST /:id/reject`, `PATCH /:id/edit-on-behalf`, archive lifecycle) also touched.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — `engines.node >= 22.12.0`; `nvm use 24` required for backend npm/node operations (per memory `backend-node-version.md`). Migration runbook in §Rollback must include `nvm use 24` step before `npm run migrate:listings-m3`.
- Backend test suites: `src/__tests__/Property.test.js`, `src/__tests__/propertyRoutes.test.js`, `src/__tests__/moderationRoutes.test.js`, `src/__tests__/adminRoutes.test.js`, `src/__tests__/User.test.js`, `src/__tests__/verifyFirebaseToken.test.js`, `src/__tests__/authRoutes.test.js`, `src/__tests__/setup.js` — Phase 1 update scope at researcher/planner discretion (Claude's Discretion above).

### RN client repo files (decision-shaping)

- `src/types/Property.ts` (current 91 LOC) — flat-shape Property + Tour + PlatformVerifications types. Phase 1 ships a lightweight nested-shape stub here (Phase 2 owns the full client cutover; per D-01 atomic break, screens are NOT touched in Phase 1). Researcher/planner decides between full nested type vs `LegacyFlat | Nested` union for the gap window.
- `src/screens/HomeScreen.tsx`, `src/screens/FavoritesScreen.tsx`, `src/screens/RenterListingsScreen.tsx` (369 LOC), `src/screens/OwnerListingsScreen.tsx` (216 LOC), `src/screens/PropertyDetailsScreen.tsx` (1680 LOC), `src/components/PropertyCard.tsx` (492 LOC) — NOT touched in Phase 1 per D-01. Phase 2 rewrites the entire flow.

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity (CI gate `scripts/check-i18n-parity.sh`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; root-level `__tests__/` for app-level smokes, co-located `src/<subdir>/__tests__/` for unit tests; M2 baseline at ~415 keys (M1 365 + M2 ~50). Phase 1 has minimal i18n surface (D-06 placeholder copy is the only RN-side string addition; backend has no RU surface).
- `.planning/codebase/STRUCTURE.md` — `src/types/Property.ts` (91 LOC); `src/screens/PropertyDetailsScreen.tsx` (1680 LOC, largest screen); 5-service network layer (RN client side, NOT touched in Phase 1).
- `.planning/codebase/CONCERNS.md` — Critical: Firebase API key hardcoded in source (NOT Phase 1 scope); Medium: tab persistence pattern via `display: none` keep-alive (NOT Phase 1 scope). App.tsx LOC budget: Phase 1 adds ZERO RN client LOC, so the 1099-line near-soft-cap concern is unchanged.
- `.planning/codebase/STACK.md` — React Native 0.84 New Architecture (Hermes + Fabric); Mongoose for Mongo schemas; Node 22+ for backend; jose@6 ESM-only for JWKS; axios for HTTP.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in either repo. Phase 1 schema reshape touches NO auth-adjacent code; the rule is preserved by inaction.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity-proof; MongoDB = role authority. Phase 1 doesn't touch the User schema; rule preserved.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer (no Railway-team coordination overhead). Phase 1 deploy is operator-self.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-node-version.md` — Backend Node ≥22.12 (`nvm use 24`); RN client uses default v20. Migration runbook MUST include `nvm use 24` before any backend `npm run` step.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/m2-shipped-2026-05-05.md` — M2 v2.0 baseline at SHA `2fb5639`. Phase 1's cutover commit is the next backend SHA after `2fb5639`.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired-gate posture. Phase 1 ships a route-shape cutover (exactly the regression class the verifier missed in M2 Phase 1) — code review is mandatory after `gsd-execute-phase`.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/aws-iam-jaytap-prod-s3.md` — `jaytap-prod-s3` IAM user owns JayTap S3 access. Phase 1 does NOT touch IAM (Phase 3 owns the IAM rotation per MEDIA-05).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ launch scope. D-11 'ru' default for `content.language` aligns with Bishkek launch market.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geocoder-nominatim-hang-axios-network-error.md` — `geocodeAddress` hangs cause AxiosError "Network Error" on create-listing. Phase 1's reshape doesn't change geocoder logic, but the migration script SHOULD NOT call `geocodeAddress` for legacy rows (their `latitude`/`longitude` already exist; just remap to `location.coordinates`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`migrate-listings-m2.js` pattern** (`JayTap-services/src/scripts/migrate-listings-m2.js`, 99 LOC) — full template for `migrate-listings-m3.js`. Same `--dry-run` / live / `--verify` flag handling; same `mongoose.connect` + `mongoose.disconnect` lifecycle; same `process.exit(0|1)` semantics.
- **`migrate-roles-m2.js` pattern** (`JayTap-services/src/scripts/migrate-roles-m2.js`) — sibling pattern; demonstrates the operator-supervised one-shot posture used elsewhere in the codebase.
- **`seed.js`** (`JayTap-services/src/scripts/seed.js`) — sibling location for the new migration script; demonstrates Mongoose model loading + dotenv init for scripts.
- **`connectDB`** (`JayTap-services/src/config/db.js`) — standard Mongo connection helper; reused verbatim in `migrate-listings-m3.js`.
- **Mongoose schema patterns** — `Property.js` already uses Mongoose nested schemas for `platformVerifications` and `tours[]`. The M3 nested shape extends this pattern (more nested objects, same Mongoose mechanism).

### Established Patterns

- **One-shot migration scripts under `JayTap-services/src/scripts/`** — Phase 1's migration follows the M2 Phase 2 D-03 + Phase 1 D-08 precedent (sibling-to-`seed.js`, dry-run + verify flags).
- **Atomic schema cutover commit** — Phase 1's cutover commit is the FIRST commit after migration runs successfully (per ROADMAP SC #4). Same atomic-deploy posture as M1 D-02 atomic version-bump.
- **Audit-field "additive only" schema discipline** (M2 Phase 1 D-04 / Phase 4.5 / M2 Phase 2 D-21) — Phase 1 KEEPS all M2 audit fields top-level (per D-10's note + REQ SCHEMA-04). Mongoose allows nullable Date/String fields to coexist with new nested fields — additive on top of the reshape.
- **Belt-and-suspenders defense in depth** (M2 Phase 1 D-08 + D-10 + M2 Phase 2 D-02) — Phase 1's atomic-break stance (D-01) departs from this; the precedent is acknowledged but the M3 audience (testers, mock data) doesn't justify the dual-shape tax.
- **Mongoose `Schema.Types.Mixed`** — used in current Property.js for `price` (number-or-string). The new schema may keep this for `basics.price` to absorb the same flexibility, OR planner may tighten to `Number` since SPEC §3 says `price: number`.

### Integration Points

- **Backend `Property.js`** — single file holds the entire schema reshape (D-04..D-15). Mongoose model name `'Property'` and collection `'listings'` (current line 76) stay unchanged.
- **Backend `propertyRoutes.js`** — every route's destructured `req.body` shape changes (POST takes nested `location:{...}, basics:{...}, ...`); every route's `Property.find()` / `Property.findById()` response shape changes (returns nested). PUT's body-status sanitizer (line 414-418) and rejected→pending auto-flip (M2 D-22) keep working — they touch top-level `status` only.
- **Backend `moderationRoutes.js`** — same: every queue/approve/reject/edit-on-behalf endpoint's response shape changes.
- **Backend `__tests__/Property.test.js`** — Mongoose schema validation tests; will fail against new nested shape. Update inside Phase 1 per default test scope expectation.
- **Backend `__tests__/propertyRoutes.test.js` + `__tests__/moderationRoutes.test.js` + `__tests__/adminRoutes.test.js`** — supertest cases against route shapes; will fail. Researcher/planner decides update scope.
- **Atlas snapshot capture** — operator-side action via Atlas UI; not code-integrated. Timestamp recorded in `01-CONTEXT.md §Rollback` runbook (D-17).
- **Railway deploy hook** — `Procfile` is unchanged; cutover is a normal `git push` deploy.

</code_context>

<specifics>
## Specific Ideas

- **Migration filename — `migrate-listings-m3.js`** (per ROADMAP Phase 1 description + REQUIREMENTS.md SCHEMA-02 verbatim wording). Lives at `JayTap-services/src/scripts/migrate-listings-m3.js`. npm-script registered as `migrate:listings-m3` in backend `package.json` (matches M2 `migrate:listings-m2` pattern).
- **Verification command (REQUIREMENTS.md SCHEMA-02 acceptance verbatim):** `db.properties.countDocuments({location: {$exists: false}})` returns 0 post-migration. Migration script's `--verify=PASS` subcommand asserts exactly this; exit 0 = PASS, exit 1 = FAIL.
- **Pattern source:** M2 Plan 02-02 (`migrate-listings-m2.js`) — sibling-to-`seed.js` location; `--dry-run` + `--verify` posture; idempotent skip-already-migrated filters.
- **Dry-run sample preview:** 3 randomly-selected docs showing before-flat / after-nested JSON shape. Researcher/planner has discretion to bias sample toward propertyType diversity (1 apartment + 1 commercial + 1 hotel for stronger before/after signal across D-07's conditional branches).
- **Order of operations (D-02 verbatim):** Atlas snapshot → `nvm use 24` (per memory `backend-node-version.md`) → `npm run migrate:listings-m3 -- --dry-run` (review) → `npm run migrate:listings-m3` (live) → `npm run migrate:listings-m3 -- --verify=PASS` (acceptance gate) → `git push` cutover commit (Railway redeploys) → smoke test routes return nested shape.
- **Smoke-test commands** (added by planner to §Rollback runbook): `curl https://<railway-prod-url>/api/properties` (anonymous, expect nested shape array), `curl https://<railway-prod-url>/api/properties/<seed-listing-id>` (anonymous, expect nested shape obj), `curl -H "Authorization: Bearer <mod-token>" https://<railway-prod-url>/api/moderation/queue` (mod, expect nested shape array). Planner verifies seed-listing-id exists post-migration via `--verify` output.
- **Backend Node version gate:** `nvm use 24` MUST appear in the operator runbook before any `npm run` invocation. The default shell `node` is v20 (RN client compatible) but backend requires ≥22.12 for `jose@6`. Migration script will fail to load if run on v20.
- **Atomic-break tester impact window:** Phase 1 cutover SHA → Phase 2 nested-aware client SHA → tester install. During this window, M2 client (TestFlight build 27 / Play Internal versionCode 30) renders broken Home/Favorites/RenterListings/OwnerListings/PropertyDetails. Tester comms: maintainer sends Slack/email to internal testers BEFORE Phase 1 cutover saying "expect Home to break for ~N days; install Phase 2 build when notified." Window length depends on Phase 2 ship velocity (planner estimates after Phase 2 plan-phase).
- **Top-level audit field preservation pattern (REQ SCHEMA-04):** All M2 + M2-Phase-4 audit fields stay at the top level of every Property doc — `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`. NEVER nested under `terms.*`. The migration script DOES NOT TOUCH these fields (skip-them-entirely posture); the cutover commit's Mongoose schema keeps them at top level adjacent to the new nested objects.
- **Status enum unchanged (REQ SCHEMA-03):** `status: { type: String, enum: ['pending', 'live', 'rejected', 'archived'], default: 'pending' }` line preserved verbatim in the new schema. SPEC §"Suggested Data Shape" wording (`'draft' | 'pending_moderation' | 'published' | 'rejected'`) is reframed 1:1 cosmetically — does NOT introduce new enum values. Migration does NOT touch `status` field.

</specifics>

<deferred>
## Deferred Ideas

- **Backend transformer / dual-shape window during Phase 1→2 gap** — Rejected via D-01 (atomic break locked). M2 client breaks; testers wait for Phase 2 build.
- **Phase 1 defensive client patches (interim v2.0.1)** — Rejected via D-01.
- **Per-doc `_legacyFlat:{...}` snapshot field for local reverse migration** — Rejected via D-16 (Atlas snapshot is the rollback mechanism).
- **`migrate-listings-m3.js --reverse` script** — Rejected via D-16.
- **Heuristic Cyrillic-vs-Latin language detection for `content.language` backfill** — Rejected via D-11 ('ru' default suffices for mock data).
- **Pre-migration migration via Railway deploy hook** — Rejected via D-02 (operator-supervised one-shot, NOT auto-deploy).
- **Conditional `dealType` mapping by `propertyType` (e.g., hospitality → rent_daily)** — Rejected via D-04 (universal `'rent' → 'rent_long'` mapping; owners edit via Phase 2).
- **`location.exactAddress: string` extra-to-SPEC field for legacy address preservation** — Rejected via D-05 (drop legacy address; SPEC has no exact-address string field).
- **`maxGuests` and `amenities[]` move under `basics.hospitality:{...}`** — Rejected via D-09 (preserve top-level; M1 Phase 6 read paths intact).
- **Drop `instagramUrl` / `availableDate` / `listingId` / `platformVerifications`** — Rejected via D-10 (keep operational/admin/contact metadata top-level).
- **`is3DTourAvailable` preserved at top level** — Rejected via D-10 (derive at read time from `media.tourUrl`).
- **`panoramicPhotosUrl` coalesced into `media.tourUrl`** — Rejected via D-13 (drop; semantic mismatch).
- **Multi-tour preservation in `media.tourUrl[]`** — Rejected via D-12 (SPEC's single-string `tourUrl` shape; first non-empty `tours[i].url` wins).
- **Atlas snapshot + reverse-script combination (D-16 option C)** — Rejected via D-16 (snapshot-only).
- **Standalone `01-RUNBOOK.md` file** — Rejected via D-17 (inline in CONTEXT.md).
- **Top-level `scripts/migrate-listings-m3.md` operator doc in backend repo** — Rejected via D-17 (single source of truth in `.planning/`).
- **Sample-preview disabled for `--dry-run`** — Rejected via D-18 (sample preview is the operational guard).
- **Phase 4.5 landlord-application uid-mismatch fix** — Phase 4 owns this (CARRY-02). The M2 Phase 1 HF-03 anti-spoofing grep-gate pattern (`grep -nE "uid:\\s*req\\.(body|headers)"`) carries forward to Phase 4.
- **ROLE-11 frontend mid-action 403 popup-recovery** — Phase 4 owns this (CARRY-01).
- **Mod media-curation view + `POST /api/moderation/listings/:id/media`** — Phase 3 owns this (MEDIA-01..MEDIA-09).
- **AWS S3 IAM policy update (admin/mod gain upload rights, user revoked)** — Phase 3 owns this (MEDIA-05).
- **6-step `<ContextualListingFlow>` + `validateStep()` + +80–120 EN+RU keys** — Phase 2 owns this (FLOW-01..FLOW-16).
- **v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission** — Phase 5 owns this (REL-01..REL-06).
- **EN+RU placeholder copy for `location.district === ''`** — Phase 2 client owns the user-facing rendering decision; D-06 only commits to the migration backfill being empty string.
- **Race-cell test rig (M2 carry-forward)** — M4+ per `phase06-m3-carry-forward.md` memory; NOT Phase 1 scope.
- **Android `gradlew clean bundleRelease` reanimated build doc** — M4+ per `android-reanimated-clean-prefab-gotcha.md` memory; NOT Phase 1 scope.
- **AWS IAM cross-project residual** — Re-open condition unchanged; NOT Phase 1 scope.

</deferred>

<rollback>
## Rollback (D-17 operator runbook)

**Status:** drafted by `/gsd-plan-phase 1` (Plan 05 Task 2). The Atlas snapshot timestamp + cutover commit SHA are filled in by the operator at deploy time.

### Atlas tier confirmation (Wave 0 of execute-phase — RESEARCH Pitfall 5)

Before running ANY migration command, the operator must confirm the JayTap MongoDB Atlas tier so the snapshot path is known:

1. Log into Atlas console (https://cloud.mongodb.com) → JayTap cluster.
2. Read the cluster's tier from the cluster card. Branch:
   - **M10+ paid tier:** ✅ On-demand snapshot UI is available. Capture via Atlas UI → Backup → "Take a snapshot now". Record timestamp below.
   - **Flex (Serverless) tier:** ⚠️ Atlas takes daily snapshots automatically; cannot trigger on-demand. Note the timestamp of the most-recent automatic snapshot. Record below.
   - **M0 free tier:** ❌ Snapshot UI is NOT available. MUST use `mongodump` fallback (see §"Atlas M0 fallback" below). Record `mongodump` archive path below.
3. Record the chosen path:

> **Atlas tier (operator fills in):** ___________________________
> **Snapshot timestamp OR mongodump archive path:** ___________________________
> **Captured at (UTC):** ___________________________

### Atlas M0 fallback — `mongodump`

If Atlas tier is M0 (free), use `mongodump` to capture a local backup BEFORE migration. Source: RESEARCH §"Code Example 6".

```bash
# 1. Dump full DB to ./mongodump-pre-m3-{timestamp}/
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
mongodump --uri "$MONGO_URI" --out "./mongodump-pre-m3-${TIMESTAMP}"

# 2. Tar + compress for archival
tar -czf "mongodump-pre-m3-${TIMESTAMP}.tar.gz" "./mongodump-pre-m3-${TIMESTAMP}"

# 3. Verify archive integrity
tar -tzf "mongodump-pre-m3-${TIMESTAMP}.tar.gz" | head -5
```

**Restore command (rollback path — keep handy):**
```bash
mongorestore --uri "$MONGO_URI" --drop "./mongodump-pre-m3-${TIMESTAMP}"
# --drop wipes the existing collection before restore; without it, mongorestore appends.
```

### Pre-cutover tester comms (RESEARCH Pitfall 7)

Send to internal testers (TestFlight build 27 / Play Internal versionCode 30) BEFORE the cutover commit deploys. Copy-paste template:

> **Subject:** JayTap M3 Phase 1 cutover — temporary client breakage expected ({YYYY-MM-DD})
>
> **Body:**
> Hi team,
>
> Heads-up: backend cutover lands on **{date}** for the M3 schema reshape (flat→nested). Expect the M2 builds (TestFlight build 27 / Play Internal versionCode 30) to show blank lists or errors on Home, Favorites, RenterListings, OwnerListings, PropertyDetails — this is by design (atomic-break per Phase 1 D-01; no transformer / no compat window).
>
> Phase 2 client build (TestFlight ~28 / Play Internal ~31) ships **{date+N}** with nested-aware reads — install when notified. Until then, no need to file bug reports about list screens; we know.
>
> Action items: nothing on your end. Just don't be surprised by blank lists for ~{N} days.
>
> Cheers,
> {operator name}

### Operator command sequence (D-02 verbatim — M2 Plan 02-02 adapted)

**Step 1 — Pre-flight: confirm MONGO_URI is exported in operator's shell:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
node -e "console.log('MONGO_URI present:', !!process.env.MONGO_URI, 'starts with:', (process.env.MONGO_URI || '').slice(0, 25))"
# If MONGO_URI is missing OR points at staging/localhost: ABORT. Set MONGO_URI=mongodb+srv://... per HF-02 secret-rotation runbook.
```

**Step 2 — Atlas snapshot (or mongodump fallback per tier above) captured. Timestamp recorded.**

**Step 3 — Dry-run:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && \
  npm run migrate:listings-m3 -- --dry-run 2>&1 | tee /tmp/jaytap-migrate-listings-m3-dryrun.log
```

**Operator visually inspects the dry-run output** (operator must pipe stdout to a private terminal session, not a shared Slack/screen-share — sample preview may include ownerUid / instagramUrl from real docs):
- `Docs needing migration: <N>` — does N match expectations? M1+M2 mock data is ~dozens-to-low-hundreds.
- 3 propertyType-biased sample blocks (apartment + commercial + hotel) — do BEFORE/AFTER JSON shapes look correct?
  - apartment sample: `BEFORE` has flat `address`/`bedrooms`/`rooms` (numeric); `AFTER` has nested `location.{city, district, coordinates}`, `basics.rooms` ('1'/'2'/'3'/'4+').
  - commercial sample: similar shape; `basics.rooms` populated.
  - hotel sample: `basics.hotelRooms` populated (NOT `basics.rooms`); `location.showExactAddress: true`.
- If any sample looks wrong (e.g., `dealType: undefined` for legacy `type:'rent'` row, missing `media.photos[0]` when legacy `images[0]` had a value), ABORT and investigate.

**Step 4 — Live migration (operator approval required between Step 3 and Step 4):**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && \
  npm run migrate:listings-m3 2>&1 | tee /tmp/jaytap-migrate-listings-m3-live.log
```
Acceptance line in stdout: `ACCEPTANCE MET (SCHEMA-02): db.properties.countDocuments({location:{$exists:false}}) === 0`.

**Step 5 — Verify gate (REQUIREMENTS.md SCHEMA-02 verbatim):**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && \
  npm run migrate:listings-m3 -- --verify=PASS 2>&1 | tee /tmp/jaytap-migrate-listings-m3-verify.log; \
  echo "VERIFY EXIT CODE: $?"
```
Exit code 0 = PASS. Exit code 1 = FAIL (stragglers exist; investigate). Exit code 2 = misuse (re-run with `=PASS` suffix).

**Step 6 — Cutover commit deploy:**
```bash
# In the BACKEND repo:
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
git push  # Railway pulls + redeploys (Plan 03 + Plan 04 commits land at this push)
```
The cutover commit SHA is the FIRST commit after the migration runs successfully (ROADMAP SC #4). Plan 03 propertyRoutes cutover lands at `c4bf01d`; Plan 04 moderationRoutes cutover lands at `f8197ba` — combined post-Plan-04 backend SHA `f8197ba` is the cutover head. Record below:

> **Cutover commit SHA (operator fills in):** ___________________________
> **Pushed at (UTC):** ___________________________

**Step 7 — Smoke test (RESEARCH Pitfall 6 — retry/backoff for Railway redeploy timing window):**
```bash
# Retry loop — Railway redeploy may take 30s-3min; first 502 is not a failure
for i in 1 2 3 4 5; do
  echo "--- Smoke test attempt $i ---"
  # Anonymous list — expect array of nested-shape docs
  curl -s "https://${RAILWAY_PROD_URL}/api/properties" | jq '.[0] | {location, basics, content, address}' | tee /tmp/smoke-list-attempt-$i.json
  # Anonymous deep-link (replace <listing-id> with seed-listing-id from --verify output)
  curl -s "https://${RAILWAY_PROD_URL}/api/properties/<listing-id>" | jq '{location, basics, owner, address}' | tee /tmp/smoke-detail-attempt-$i.json
  # Mod-token queue
  curl -s -H "Authorization: Bearer ${MOD_TOKEN}" "https://${RAILWAY_PROD_URL}/api/moderation/queue" | jq '.items[0] | {location, basics, address}' | tee /tmp/smoke-queue-attempt-$i.json

  # Acceptance check: each response has .location.city defined AND .address undefined
  if jq -e '.location.city != null and .address == null' /tmp/smoke-list-attempt-$i.json && \
     jq -e '.location.city != null and .address == null' /tmp/smoke-detail-attempt-$i.json && \
     jq -e '.location.city != null and .address == null' /tmp/smoke-queue-attempt-$i.json; then
    echo "SMOKE TEST PASS on attempt $i"
    break
  fi
  sleep 30
done
```

Acceptance: each response has `.location.city` populated AND `.address` undefined (no flat-shape leakage). Optional second-tier check: POST a flat-shape body to `/api/properties` and assert the response code is `M3_NESTED_BODY_REQUIRED` (Plan 03 atomic-break sentinel) — confirms route layer is on the cutover commit, not stale.

### Reverse-rollback procedure (D-16 — Atlas snapshot is the rollback mechanism, NOT a reverse migration script)

If smoke test fails OR a downstream issue surfaces post-cutover:

1. **Revert the cutover commit on the backend repo:**
   ```bash
   cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
   git revert <CUTOVER_COMMIT_SHA>
   git push  # Railway redeploys with M2 flat-shape route reads
   ```

2. **Restore the Mongo data from snapshot:**
   - **M10+ tier:** Atlas UI → Backup → "Restore" → select the snapshot timestamp recorded above → confirm.
   - **Flex tier:** Atlas UI → Backup → select most-recent automatic snapshot → restore.
   - **M0 free tier:** `mongorestore --uri "$MONGO_URI" --drop "./mongodump-pre-m3-${TIMESTAMP}"` (with `--drop` flag — wipes nested-shape data, restores flat).

3. **Verify rollback:**
   ```bash
   cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && \
     node -e "const M = require('./src/models/Property'); M.countDocuments({address: {\$exists: true}}).then(c => console.log('Flat-shape docs (address top-level):', c)); process.exit(0);"
   # Should return > 0 (flat shape restored).
   ```

4. **Tester comms (post-rollback):** Send a follow-up to internal testers — "Phase 1 cutover rolled back; M2 builds work again; investigating; new ETA TBD."

**Loss profile:** Any data written between the snapshot capture (Step 2) and the rollback execution is LOST. Acceptable per CONTEXT.md D-16: M1+M2 listings are mock data; tester writes during the cutover window are accepted-loss.

**What this runbook does NOT cover (out of scope per CONTEXT.md Deferred Ideas):**
- Per-doc `_legacyFlat:{...}` snapshot field for local reverse migration — REJECTED via D-16.
- `migrate-listings-m3.js --reverse` script — REJECTED via D-16.
- Standalone `01-RUNBOOK.md` file — REJECTED via D-17 (this section IS the runbook).
- Auto-deploy migration via Railway hook — REJECTED via D-02 (operator-supervised one-shot).
</rollback>

---

*Phase: 01-schema-reshape-backend-route-shape-cutover*
*Context gathered: 2026-05-05*
*Rollback runbook appended: 2026-05-05 (Plan 05 Task 2)*

# Phase 6: Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new optional fields to the `Property` Mongoose schema in `JayTap-services` — `basics.bedrooms` (integer 0–10, residential-only) and `basics.bathroomCount` (0.5-step 0–10, applicable to apartment/house/hotel/hostel/office/commercial) — plus the matching RN client `src/types/Property.ts` type stub additions. Backend write routes (POST `/api/properties`, PUT `/api/properties/:id`, PUT `/api/moderation/listings/:id`) silently strip `basics.bedrooms` from incoming bodies when top-level `propertyType ∈ {hotel, hostel, office, commercial}` (M3 D-13 strip-wins precedent). No migration script (fields are optional; existing M3 listings remain valid documents). No client UI, no display surfaces — those land in Phases 7 + 8.

**Touches both repos:**
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — `src/models/Property.js` (two new fields under `basics`), `src/utils/stripResidentialOnlyFields.js` (NEW shared helper), `src/routes/propertyRoutes.js` (call helper from POST + PUT + add bathroomCount step-0.5 route-layer 400), `src/routes/moderationRoutes.js` (call helper from PUT moderation/listings + add bathroomCount step-0.5 route-layer 400). Test additions inside `src/__tests__/`.
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — `src/types/Property.ts` adds `bedrooms?: number` + `bathroomCount?: number` to the `basics?` shape. No screens, no components, no flow files touched in Phase 6.

**Requirements covered:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04 (4 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- `<StepperInput>` component + ContextualListingFlow Step 3 conditional rows — Phase 7 (FORM-01..FORM-05).
- PropertyCard / HospitalityCard / PropertyDetailsScreen specs-row display + EN/RU label keys (`property.specs.bedrooms` / `property.specs.bathrooms` / `property.specs.rooms`) — Phase 8 (DISP-01..DISP-05).
- i18n audit + sentinel + `propertyType.*` / `propertyCategory.*` / `dealType.*` namespaces — Phase 9 (I18N-01..I18N-07).
- v4.0.0 atomic bump + manual physical-device QA matrix + dual-store submission — Phase 10 (REL-01..REL-06).
- `basics.rooms` and `basics.hotelRooms` are NOT touched — both M3 fields survive verbatim alongside the new ones (per REQUIREMENTS Out of Scope §"Replacing `basics.rooms` with `basics.bedrooms`").
- `basics.bathroom` enum (`'private' | 'none' | 'shared'`) for office/commercial is NOT touched — captures bathroom TYPE, not count; both fields coexist (per REQUIREMENTS Out of Scope §"Migrating existing `basics.bathroom` enum…").

</domain>

<decisions>
## Implementation Decisions

### Taxonomy & strip-rule source-of-truth

- **D-01 (Strip rule reads top-level `propertyType`):** The silent body-strip validator reads `req.body.propertyType` (top-level), NOT `req.body.basics.propertyType`. The latter wording in REQUIREMENTS.md SCHEMA-01/SCHEMA-04 is a doc-bug — the actual schema (Property.js line 26) keeps `propertyType` at the top level alongside `dealType`, and the M3 ContextualListingFlow FormBag (`src/components/ContextualListingFlow/types.ts:11`) declares `propertyType` as a flat field. Phase 6 fixes the REQUIREMENTS.md wording inline as part of the schema commit (no separate cleanup task).

- **D-02 (Strip set is the M3 6-type set — no `land`):** The strip set is `{hotel, hostel, office, commercial}`. REQUIREMENTS.md SCHEMA-04 mentions `land` as a 7th strip type — also a doc-bug. The M3 6-type taxonomy (`apartment | house | hotel | hostel | office | commercial`) is canonical per `Property.ts:29` and `FormBag.propertyType` and the M1 hard rule preserved through M2+M3. `land` was removed in M1 and is not part of the current schema. Fix the REQUIREMENTS.md wording in Phase 6 alongside D-01.

- **D-03 (Apply-set for bathroomCount mirrors the docs):** `basics.bathroomCount` is allowed on `propertyType ∈ {apartment, house, hotel, hostel, office, commercial}` — i.e. every type in the 6-type set. No strip rule for bathroomCount (residential + hospitality + commercial all use it). Mongoose `min: 0, max: 10` clamps; route-layer 0.5-step check rejects non-half values.

- **D-04 (Apply-set for bedrooms is residential-only):** `basics.bedrooms` is allowed only when `propertyType ∈ {apartment, house}`. Strip set is the inverse-minus-irrelevant: `{hotel, hostel, office, commercial}`. Hospitality uses the existing `basics.hotelRooms` for its rentable-units count; commercial doesn't have bedrooms semantically.

### Deploy posture

- **D-05 (Plain `git push` to Railway — no operator runbook):** Phase 6 is purely additive (two optional fields; no migration; existing M3 listings unaffected because Mongoose ignores absent fields when `required: false`). Operator-supervised pattern from M3 Phase 1 is NOT carried forward here — that was justified by data-reshape risk; Phase 6 has none. Backend commit lands → `git push` → Railway auto-deploys → operator runs a short post-deploy smoke check (1 anonymous `GET /api/properties`, 1 anonymous `GET /api/properties/:id` for an existing M3 listing) to confirm existing listings still load. No Atlas snapshot, no dry-run, no verify-gate, no retry-loop smoke script. If smoke fails, normal `git revert` undoes the schema commit safely (fields are additive — no orphan data to clean up because no migration ran).

### Validator placement

- **D-06 (0.5-step validator is defense-in-depth — both route layer AND schema):** Mirrors M3 Phase 3's `tourUrl` https-only pattern (validated at BOTH the Mongoose schema level AND the route handler).
  - **Route layer (primary, frontend-friendly):** POST + PUT + moderation PUT each check `basics.bathroomCount` and `basics.bedrooms` before calling the strip helper. If `bathroomCount` is present and fails `Number.isInteger(v * 2) && v >= 0 && v <= 10`, respond 400 with `{ message: '...', code: 'M4_BATHROOM_STEP_INVALID' }`. If `bedrooms` is present and fails `Number.isInteger(v) && v >= 0 && v <= 10`, respond 400 with `{ message: '...', code: 'M4_BEDROOMS_INVALID' }`. The code constants are load-bearing — Phase 7 RN-client error handling will discriminate on them.
  - **Schema layer (defensive backstop):** Mongoose `validate: { validator: v => Number.isInteger(v * 2) && v >= 0 && v <= 10, message: 'basics.bathroomCount must be a 0.5-step multiple in [0, 10]' }` on `bathroomCount`; Mongoose `validate: { validator: Number.isInteger, message: '...' }` plus `min: 0, max: 10` on `bedrooms`. Catches direct DB writes, migration scripts, future endpoints, and the `--verify` paths that bypass the route layer.
  - **Float-precision note:** `Number.isInteger(v * 2)` is float-safe for inputs in `[0, 10]` step 0.5 (JS doubles represent these values exactly). No `Math.abs(v*2 - Math.round(v*2)) < 1e-9` epsilon dance needed.
  - **Mongoose `findOneAndUpdate` caveat:** Mongoose validators do NOT run on `findOneAndUpdate` by default. The two PUT routes already use `.save()` (propertyRoutes.js:518) or `findOneAndUpdate` with `{ runValidators: true }` (moderation route — planner verifies). Helper-validator inside the strip-and-validate utility ALSO covers this gap on a Mongoose layer no-op.

### Strip-validator implementation pattern

- **D-07 (Shared helper, NOT inline duplication):** The strip logic lives in a new utility `src/utils/stripResidentialOnlyFields.js` in the BACKEND repo, exported as a pure function:
  ```js
  function stripResidentialOnlyFields(body) {
    const STRIP_TYPES = new Set(['hotel', 'hostel', 'office', 'commercial']);
    if (STRIP_TYPES.has(body?.propertyType) && body?.basics?.bedrooms !== undefined) {
      delete body.basics.bedrooms;
    }
    return body; // mutates and returns for chainability
  }
  ```
  Called from POST `/api/properties` (after destructure, before `new Property(propertyData)`), PUT `/api/properties/:id` (after JSON-string parse of nested subtrees, before nested deep-merge), PUT `/api/moderation/listings/:id` (same point as PUT `/api/properties/:id` — after JSON-string parse, before deep-merge). Located at `src/utils/` (sibling of `src/utils/listingCapability.js` and other backend utils). Three import lines, three call sites — cheaper to maintain than three inline blocks; easier to unit-test in isolation.

- **D-08 (Strip is silent — no log, no 400):** When the helper drops `basics.bedrooms` on a hospitality/commercial submission, NO 400 is raised and NO log line is emitted. Matches M3 D-13 "strip-wins" precedent (per `propertyRoutes.js:117` comment "`media` is INTENTIONALLY ABSENT from this destructure — any client-supplied media body keys are silently ignored"). The helper performs `delete body.basics.bedrooms` and returns. SC #3 from ROADMAP is satisfied: "backend response shows no `basics.bedrooms` on the persisted document, no 400 raised, no log noise."

- **D-09 (Strip operates on the merged body PRIOR to nested deep-merge in PUT routes):** For the two PUT routes that use the partial-subtree deep-merge pattern (Phase 1 Plan 06 review CR-02 — propertyRoutes.js:490, moderationRoutes.js:893), the strip helper runs AFTER the multipart JSON-string parse but BEFORE the nested subtree merge. This is important: the merge would otherwise re-introduce a stale `basics.bedrooms` from the existing doc if the moderator's body strips it. Strip → then merge → then save means a hotel that previously (incorrectly) had a `basics.bedrooms` in the DB has it dropped on the next edit pass through the helper. Acceptable cleanup posture (M3 listings shouldn't have it; no production data exists).

### Test scope (locked)

- **D-10 (Minimum 5 new test cases — schema + route body-strip + step-0.5):** Locked per discussion. Planner can expand if they spot gaps.
  - **Schema-level (Property.test.js — 2 cases minimum):**
    1. Saving a property with `basics.bedrooms: 2.5` triggers a Mongoose ValidationError (non-integer rejected by `validate: Number.isInteger`).
    2. Saving a property with `basics.bathroomCount: 1.3` triggers a Mongoose ValidationError (non-0.5-step rejected by `validate: Number.isInteger(v * 2)`).
  - **Route body-strip (propertyRoutes.test.js + moderationRoutes.test.js — 3 cases minimum):**
    3. POST `/api/properties` with `propertyType: 'hotel'` + `basics.bedrooms: 3` in the body → response 201; `response.body.basics.bedrooms` is undefined (stripped); no `basics.bedrooms` in the persisted doc.
    4. PUT `/api/properties/:id` (existing apartment listing, owner edit) with `propertyType: 'apartment'` + `basics.bedrooms: 2` + `basics.bathroomCount: 1.5` → response 200; both fields persist and round-trip.
    5. PUT `/api/moderation/listings/:id` (mod edit-on-behalf, existing hotel listing) with `basics.bedrooms: 4` → response 200; `basics.bedrooms` is stripped from the persisted doc.
  - Planner discretion: additional cases for the route-layer 400 + step-0.5 (e.g., POST with `bathroomCount: 1.3` → 400 + `M4_BATHROOM_STEP_INVALID`); additional happy-path round-trip for `basics.bathroomCount` on commercial; additional unit tests for `stripResidentialOnlyFields.js` in isolation.

### Error code constants (locked)

- **D-11 (Error codes follow M3 `M3_NESTED_BODY_REQUIRED` pattern):**
  - `M4_BATHROOM_STEP_INVALID` — bathroomCount present but not a 0.5-step multiple in [0, 10].
  - `M4_BEDROOMS_INVALID` — bedrooms present but not an integer in [0, 10].
  - Both surface as 400 from POST + PUT + moderation PUT routes. Phase 7 RN-client error handling will discriminate on these codes to show localized error toasts.

### Claude's Discretion

- **`default: undefined` vs schema-absent for the two new fields** — Mongoose treats `default: undefined` the same as omitting the default. Planner picks the cleanest form (REQUIREMENTS specifies `default: undefined` but the Mongoose convention is to simply omit `default` when no default is desired; `required: false` is already the default for Mongoose paths). Outcome must be: when the field is absent from the body, it does NOT appear in the persisted document (no `null`, no zero, no key at all).
- **Test framework version + supertest patterns** — Planner inherits whatever the existing backend test suite uses (`jest` + `supertest`); no new dev-dep additions.
- **Express middleware vs helper-in-handler call** — D-07 says shared helper. Planner can promote it to a middleware (`app.use(stripResidentialOnlyFields)` or per-route `router.post('/', stripResidentialOnlyMiddleware, verifyFirebaseToken, ...)`) if they think that's cleaner. The "shared, not inline" constraint is what's locked; the express-mount form is at planner discretion.
- **Whether to also drop `basics.hotelRooms` on residential submissions** — REQUIREMENTS doesn't say. M3 schema allows `basics.hotelRooms` on any propertyType (it's just `enum: ['1', '2', '3', '4+']` with no propertyType constraint). Phase 6 is scoped to bedrooms-strip only; the inverse strip (drop `hotelRooms` on residential) is NOT in scope but planner can note it as a future cleanup candidate.
- **REQUIREMENTS.md wording fix commit boundary** — D-01/D-02 say fix the `basics.propertyType` wording and the `land` mention inline as part of Phase 6. Planner decides if that's a standalone "docs cleanup" commit at the front of the plan or folded into the schema commit's prose updates.
- **Whether to verify the existing PUT moderationRoutes.js uses `runValidators`** — Planner reads `moderationRoutes.js` for the findOneAndUpdate `runValidators` flag during plan-phase; if absent, plan-phase decides whether to add it (defense in depth) or rely solely on the helper-validator + route-layer 400 (per D-06 outcome).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level scope & requirements

- `.planning/PROJECT.md` — JayTap core value; backend repo location (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`); hard rules (no Firebase SDK in either repo, MongoDB role authority, no react-navigation, M1's 9-type 3-category taxonomy preserved); EN+RU bilingual parity gate.
- `.planning/REQUIREMENTS.md` §"Schema — backend Mongoose extension + RN type stub" — SCHEMA-01..SCHEMA-04 acceptance criteria. **Note:** Phase 6 fixes the `basics.propertyType` wording (should be top-level `propertyType`) and removes the `land` mention from SCHEMA-04 — both are doc-bugs per D-01/D-02.
- `.planning/ROADMAP.md` §"Phase 6: Schema Extension" — Goal + 5 Success Criteria.

### Anchor — M3 nested schema baseline

- `.planning/milestones/v3.0-phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` — M3 Phase 1 decisions (D-04..D-15) for the nested schema reshape. Most relevant to Phase 6:
  - §D-10 (orphan top-level fields — `propertyType` and `dealType` stay top-level alongside `ownerUid`, `instagramUrl`, etc. — confirms D-01 above)
  - §D-13 (`panoramicPhotosUrl` drop) and `propertyRoutes.js:115` `media` destructure-omit pattern — the "strip-wins" precedent for D-08 silent-strip
- `.planning/milestones/v3.0-phases/01-schema-reshape-backend-route-shape-cutover/01-PLAN.md` — Plan task structure for the M3 schema cutover (test sequencing precedent).

### Backend repo — files Phase 6 touches

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` (154 LOC) — M3 nested schema baseline. Lines 44–53 are the `basics:{...}` block where Phase 6 adds two new fields (alongside `areaSqm`, `price`, `currency`, `rooms`, `bathroom`, `kitchen`, `hotelRooms`, `hotelClass`). M3 Phase 3 D-08-style Mongoose validator on `media.tourUrl` (lines 91–105) is the pattern source for the schema-level 0.5-step + integer validators on the two new fields.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (735 LOC) — POST `/` (line 105: nested-body destructure includes `basics`; line 133–141 route-layer required-field check + `M3_NESTED_BODY_REQUIRED` 400 — pattern source for the new `M4_BATHROOM_STEP_INVALID` / `M4_BEDROOMS_INVALID` 400s); PUT `/:id` (line 354: M2 owner-edit; lines 480–514 partial-subtree deep-merge — strip helper call site).
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` (641+ LOC) — PUT `/api/moderation/listings/:id` (lines 880–910: nested subtree JSON-string parse + partial deep-merge — strip helper call site for edit-on-behalf).
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/utils/` — destination directory for new `stripResidentialOnlyFields.js` helper.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js` — schema-level validation test additions per D-10.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js` — POST + PUT body-strip / route-layer 400 test additions per D-10.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` — moderation PUT body-strip test additions per D-10.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — `engines.node >= 22.12.0`; `nvm use 24` required before running any backend `npm run` / `node` command (per memory `backend-node-version.md`).

### RN client repo — files Phase 6 touches

- `src/types/Property.ts` (127 LOC) — Add `bedrooms?: number` + `bathroomCount?: number` to the `basics?:{...}` block (lines 46–55). NO other line changes. NO consumer code changes — Phase 7 + 8 will read these fields.

### RN client repo — files Phase 6 does NOT touch (boundary anchors)

- `src/components/ContextualListingFlow/Step3BasicInfo.tsx` — Phase 7 owns (FORM-02 stepper rows).
- `src/components/ContextualListingFlow/types.ts` — Phase 7 may add `bedrooms?: number` + `bathroomCount?: number` to `FormBag.basics` if the stepper writes via FormBag.
- `src/components/ContextualListingFlow/adapters.ts` — Phase 7 may extend the FormBag↔Property conversion.
- `src/components/PropertyCard.tsx`, `src/components/HospitalityCard.tsx`, `src/screens/PropertyDetailsScreen.tsx` — Phase 8 owns (DISP-01..DISP-04 specs cells).
- `src/locales/en.json`, `src/locales/ru.json` — Phase 8 owns (`property.specs.bedrooms`, `property.specs.bathrooms`, `property.specs.rooms` keys); Phase 9 owns the broader i18n audit.

### Codebase analysis (relevant subsets)

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity (Phase 6 has zero new RN-client strings — type stub only); root-level `__tests__/` for app-level smokes, co-located `src/<subdir>/__tests__/` for unit tests; backend uses `src/__tests__/` flat layout.
- `.planning/codebase/STACK.md` — React Native 0.84 New Architecture; Mongoose for Mongo schemas; Node 22+ for backend; jose@6 ESM-only for JWKS; axios for HTTP. No new dev-deps in Phase 6.
- `.planning/codebase/CONCERNS.md` — Phase 6 adds zero RN-client LOC, so the App.tsx 1099-line near-soft-cap concern is unchanged. Backend adds one ~15-LOC utility file + ~20 LOC of schema validator config + ~10 LOC per route handler — no architectural concerns introduced.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer (no Railway-team coordination overhead). Phase 6 deploy is operator-self.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-node-version.md` — `nvm use 24` required before any backend `npm run` step. RN client uses default v20 (unchanged).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no Firebase SDK in either repo. Phase 6 schema extension touches NO auth-adjacent code; rule preserved by inaction.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/central-asia-rooms-vs-bedrooms-convention.md` — Background context for WHY this milestone exists: Central Asian listings need BOTH room count (existing `basics.rooms` / `basics.hotelRooms`) AND bedroom count (new `basics.bedrooms`). Phase 6 implements the schema half of the gap.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired-gate posture. Phase 6 adds validation surface (exactly the regression class the verifier missed in M2 Phase 1) — code review is mandatory after `gsd-execute-phase`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **M3 `media.tourUrl` Mongoose validator pattern** (`Property.js:91–105`) — Template for the schema-level 0.5-step validator on `bathroomCount` and integer validator on `bedrooms`. Same `validate: { validator, message }` form; same "empty/undefined returns true" optionality posture; same belt-and-suspenders comment block.
- **M3 `M3_NESTED_BODY_REQUIRED` 400 pattern** (`propertyRoutes.js:133–141`) — Template for the new route-layer `M4_BATHROOM_STEP_INVALID` + `M4_BEDROOMS_INVALID` 400s. Same response shape `{ message, code }`; same per-field check sequence.
- **M3 `media` destructure-omit silent-strip pattern** (`propertyRoutes.js:113–116`) — Conceptual precedent for D-08 silent strip; Phase 6's `stripResidentialOnlyFields.js` is a generalization (operates on already-destructured body, not destructure-time omission).
- **M3 partial-subtree deep-merge pattern** (`propertyRoutes.js:490–513`, `moderationRoutes.js:893–910`) — Phase 6's strip helper must run BEFORE this merge so the existing-doc `basics.bedrooms` doesn't re-leak into a hospitality update (D-09).
- **Backend test setup** (`src/__tests__/setup.js`) — Existing jest + supertest harness; Phase 6 tests slot in alongside existing Property + propertyRoutes + moderationRoutes suites.
- **`src/utils/listingCapability.js` (and siblings)** — Sibling location convention for the new `stripResidentialOnlyFields.js` utility.

### Established Patterns

- **Strict Mongoose schema mode (v9.x default)** — Unknown keys are silently dropped on `.save()`. The strip helper is BELT (frontend-friendly) over Mongoose's SUSPENDERS (silent drop of unknown keys). Even without the helper, `basics.bedrooms` wouldn't reach the DB on hospitality submissions IF the schema only declared bedrooms under residential — but Mongoose nested schemas can't propertyType-condition a field's existence at the schema layer. So the helper is the right place.
- **Belt-and-suspenders defense in depth** (M3 Phase 3 D-08 `tourUrl` https-only; M2 Phase 1 D-08/D-10) — D-06 carries this pattern: route-layer 400 (clear codes) PLUS schema-level Mongoose `validate` (catches direct DB writes, migration scripts, future endpoints).
- **`runValidators` flag for `findOneAndUpdate`** — Mongoose validators don't fire on `findOneAndUpdate` by default. Planner verifies moderationRoutes.js passes `{ runValidators: true }` to its atomic findOneAndUpdate; if not, the route-layer 400 from D-06 carries the load.
- **Top-level audit fields preserved verbatim** (M2 Phase 1 D-04 + M3 Phase 1 D-10 + REQ SCHEMA-04 from M2/M3) — Phase 6 adds NO audit fields; the 11 audit fields stay top-level untouched.

### Integration Points

- **Backend `Property.js`** — Single file holds the schema additions (D-06 schema-level validators). Mongoose model name `'Property'` and collection `'listings'` unchanged.
- **Backend `propertyRoutes.js`** — POST `/` body-strip call site + route-layer 400; PUT `/:id` body-strip call site + route-layer 400.
- **Backend `moderationRoutes.js`** — PUT `/api/moderation/listings/:id` body-strip call site + route-layer 400.
- **Backend `src/utils/stripResidentialOnlyFields.js`** — NEW file; pure function; imported into the two route files.
- **Backend `__tests__/Property.test.js` + `propertyRoutes.test.js` + `moderationRoutes.test.js`** — test additions per D-10 (locked minimum 5; planner can expand).
- **RN client `src/types/Property.ts`** — two new optional fields in the `basics?:{...}` block. No screens/components/locales touched.
- **Railway deploy** — `git push` triggers normal Railway redeploy. No operator runbook. Quick post-deploy smoke check (1 anonymous list GET + 1 anonymous detail GET against an existing M3 listing) confirms existing reads still work.

</code_context>

<specifics>
## Specific Ideas

- **New shared helper filename:** `src/utils/stripResidentialOnlyFields.js` (sibling of `src/utils/listingCapability.js` in the backend repo). Pure CommonJS function; default export not used; named export `stripResidentialOnlyFields(body)`. Mutates and returns for chainability.
- **Strip set as a `Set` literal:** `const STRIP_TYPES = new Set(['hotel', 'hostel', 'office', 'commercial'])`. Constant scoped inside the helper file (not exported); avoids constructing a new Set per call.
- **Error code constants:** `M4_BATHROOM_STEP_INVALID` (bathroomCount step-0.5 failure) and `M4_BEDROOMS_INVALID` (bedrooms non-integer / out-of-range failure). Returned as the `code` field of the 400 response body, mirroring `M3_NESTED_BODY_REQUIRED`. RN client error handling will discriminate on these in Phase 7.
- **Validator form:** `validate: { validator: v => v === undefined || (Number.isInteger(v * 2) && v >= 0 && v <= 10), message: 'basics.bathroomCount must be a 0.5-step multiple in [0, 10]' }` for bathroomCount. `validate: { validator: v => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 10), message: 'basics.bedrooms must be an integer in [0, 10]' }` for bedrooms. Both pass on `undefined` per the optionality posture (matches M3 tourUrl precedent).
- **Mongoose `min: 0, max: 10` separately:** Used in addition to `validate`. Belt-and-suspenders on bounds (Mongoose's `min`/`max` produce a clear error path even if `validate` is bypassed).
- **REQUIREMENTS.md doc-bug fixes (in scope for Phase 6):** Edit SCHEMA-01 to read "only applicable when `propertyType ∈ {apartment, house}`" (drop `basics.`). Edit SCHEMA-04 to read "silently strips `basics.bedrooms` from request body when `propertyType ∈ {hotel, hostel, office, commercial}`" (drop `basics.` and `land`). Two surgical edits; either standalone commit at the front of the plan or folded into the schema commit's prose.
- **Smoke check commands (post-deploy):** `curl https://<railway-prod-url>/api/properties | jq '.[0] | {propertyType, basics}'` (expect existing M3 nested shape; existing listings have no `bedrooms` / `bathroomCount` fields — that's correct). `curl https://<railway-prod-url>/api/properties/<seed-listing-id> | jq '{propertyType, basics}'` (expect single listing; same shape). Both should return 200 + nested shape without the two new fields present. Then a hand-test POST (operator-side) with a real apartment + `basics.bedrooms: 2 + basics.bathroomCount: 1.5` to confirm the happy path persists + round-trips through GET. Three commands total — no retry loop, no operator runbook formality.

</specifics>

<deferred>
## Deferred Ideas

- **Inverse-strip: drop `basics.hotelRooms` on residential submissions** — Not in Phase 6 scope. M3 schema currently allows `basics.hotelRooms` on any propertyType (no constraint). Phase 6 only strips bedrooms-on-hospitality. Future cleanup candidate; could fold into Phase 9 i18n audit's wider taxonomy-tightening pass, OR M5+ as a standalone consistency fix.
- **Inverse-strip: drop `basics.bathroom` enum on residential submissions** — Similarly not in scope. The enum is intended only for office/commercial bathroom TYPE; Phase 6 doesn't enforce that. Same deferral basis.
- **Express middleware wrapping for the strip helper** — D-07 says "shared helper, called from each route handler"; promoting to a per-route middleware (`router.post('/', stripResidentialOnlyMiddleware, ...)`) is at planner discretion but not load-bearing. The helper-in-handler call is simpler and easier to test in isolation.
- **`1½` Unicode glyph rendering for half-bathrooms** — Already deferred in REQUIREMENTS Future Requirements section (M5+). Phase 6 stores the number; rendering is Phase 8 territory and ships as `1.5` decimal.
- **Long-press accelerated increment on `<StepperInput>`** — Phase 7 scope; deferred to M5+ per REQUIREMENTS Future Requirements.
- **Schema versioning bump from `m3-nested-v1` to `m4-nested-v1`** — Not in scope. The `schemaVersion: 'm3-nested-v1'` marker (Claude's Discretion #5 from M3 Phase 1) doesn't need to bump because the schema shape isn't reshaped — it's extended additively. Existing M3 listings keep `m3-nested-v1` and the absence of two optional fields is semantically valid.
- **Migration script for backfilling `bedrooms` / `bathroomCount` from existing `basics.rooms` / `basics.bathroom`** — Out of scope per REQUIREMENTS Out of Scope §"`migrate-listings-m4.js` script" and §"Migrating existing `basics.bathroom` enum to `basics.bathroomCount`". M3 mock data and KG launch data are sparse enough that owners can backfill via the Phase 7 stepper UI on next edit.
- **Race-cell test rig (M2 carry-forward)** — M4+ candidate per memory `phase06-m3-carry-forward.md`; NOT Phase 6 scope (different feature surface).
- **Android `gradlew clean bundleRelease` reanimated build doc** — M4+ candidate; Phase 10 release territory if it surfaces during archive, NOT Phase 6.
- **AWS IAM cross-project residual** — Re-open condition unchanged; NOT Phase 6 scope.
- **i18n audit + property-type sentinel** — Phase 9 owns this in full. The `HomeScreen.tsx:514` raw-English chip label is the original 260525-ggp finding; Phase 6 doesn't touch any RN UI.
- **EN/RU label key additions (`property.specs.bedrooms`, `property.specs.bathrooms`, `property.specs.rooms`)** — Phase 8 owns these (DISP-05).
- **`<StepperInput>` component + Step 3 conditional rows** — Phase 7 owns (FORM-01..FORM-05).
- **Verifier + reviewer paired-gate enforcement at execute-phase** — Carried forward per memory `gsd-verifier-misses-regressions.md`. Code review after `gsd-execute-phase` is MANDATORY for Phase 6 (validation surface = regression class verifier missed in M2 Phase 1).

</deferred>

---

*Phase: 06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va*
*Context gathered: 2026-05-25*

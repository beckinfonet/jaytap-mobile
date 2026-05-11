# Phase 1: Schema Reshape + Backend Route Shape Cutover - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 01-schema-reshape-backend-route-shape-cutover
**Areas discussed:** Cutover atomicity vs M2-client compat window, Schema field mapping policy (legacy → nested), Media coalescing strategy (array → single), Rollback strategy + Atlas snapshot capture

---

## Gray-area selection

**Question:** Phase 1 reshapes the Property schema from flat to nested and cuts backend routes over. Which gray areas do you want to discuss before I send to research?

| Option | Description | Selected |
|--------|-------------|----------|
| Cutover atomicity vs M2-client compat window | Atomic break vs transformer vs Phase 1 client patches | ✓ |
| Schema field mapping policy (legacy → nested) | Multiple sub-decisions: dealType default, address fate, district backfill, rooms conversion, bed/bath fate, hospitality fields, orphan top-level fields, content.language backfill | ✓ |
| Media coalescing strategy (array → single) | tours[]→tourUrl, panoramicPhotosUrl fate, videoUrl wrap, images→photos | ✓ |
| Rollback strategy + Atlas snapshot capture | Snapshot-only vs reverse script vs `_legacyFlat` snapshot field vs accept-risk | ✓ |

**User's choice:** All 4 areas.

---

## Cutover

### Q1: How should Phase 1 handle the M2 client during the route-shape cutover?

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic break (Recommended) | Routes cut to nested-only; M2 client breaks until Phase 2 ships. SC #2 reframed: data survives migration, visible after Phase 2. | ✓ |
| Backend transformer (dual-shape window) | Routes return BOTH flat AND nested fields during Phase 1→2 gap. Adds transformer logic; weakens SC #4. | |
| Phase 1 defensive client patches | Phase 1 patches M2 client screens with defensive `p.location?.city ?? p.city` reads; ships v2.0.1 alongside backend cutover. | |

**User's choice:** Atomic break (D-01).

### Q2: How should the migration + cutover deploy be sequenced operationally?

| Option | Description | Selected |
|--------|-------------|----------|
| M2 Plan 02-02 pattern verbatim (Recommended) | Atlas snapshot → dry-run → live → verify=PASS → git push cutover → smoke test. Operator-supervised. | ✓ |
| Single-PR atomic deploy | Migration + cutover in same commit chain; Railway runs migration on release. Auto-rollback semantics murkier. | |
| Pre-deploy migration + delayed cutover | Migration N days before cutover. Routes break immediately on nested data. Wrong choice. | |

**User's choice:** M2 Plan 02-02 verbatim (D-02).

### Q3: How aggressive should the migration's idempotency check be?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip rows already migrated (Recommended) | Filter excludes `{location: {$exists: true}}` rows. Re-run modifies 0 rows. M2 precedent. | ✓ |
| Per-doc `_m3migrated:true` flag | Migration sets marker; re-runs check it. Adds dead field. | |
| Pure $set overwrite (no idempotency) | Re-run does N writes every time. Wasteful. | |

**User's choice:** Skip-already-migrated (D-03).

---

## Schema mapping

### Q4: Legacy `type:'rent'|'sale'` → SPEC's `dealType:'sale'|'rent_long'|'rent_daily'`. What should legacy 'rent' rows become?

| Option | Description | Selected |
|--------|-------------|----------|
| rent → rent_long (Recommended) | All legacy 'rent' rows default to rent_long; sale → sale. Universal mapping. Owners edit via Phase 2. | ✓ |
| rent → rent_long but hospitality → rent_daily | Conditional by propertyType. M1 hospitality is showcase-only — rent_daily semantics may not fit. | |
| Mark as null and require admin re-set | Honest about ambiguity but creates operational toil before Phase 2. | |

**User's choice:** rent → rent_long (D-04).

### Q5: Legacy `address:string` (free-form) — fate?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop — SPEC has no exact-address string field (Recommended) | M1+M2 mock data; loss acceptable. Matches SPEC's privacy-by-default posture. | ✓ |
| Preserve under `location.exactAddress:string` | Adds extra-to-SPEC field. Phase 2 client would need to render. | |
| Coalesce into `location.district` if district missing | Hacky — addresses aren't districts. | |

**User's choice:** Drop (D-05).

### Q6: `location.district` backfill default for legacy rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty string (Recommended) | `location.district = ''`. Phase 2 client renders placeholder. Owners edit when they update. | ✓ |
| Mongoose default to undefined | Schema field optional; legacy rows omit it. Functionally equivalent. | |
| Hardcoded 'Unknown' / 'Неизвестно' default | Creates fake data. | |

**User's choice:** Empty string (D-06).

### Q7: `rooms:Number` → `basics.rooms:'1'|'2'|'3'|'4+'` conversion rule?

| Option | Description | Selected |
|--------|-------------|----------|
| 1→3 → '1'/'2'/'3'; 4+ → '4+'; 0 → undefined (Recommended) | Number-to-string with 4+ collapse. 0 = unset, omit. Same logic for hotelRooms. | ✓ |
| 1→3 → '1'/'2'/'3'; 4+ → '4+'; 0 → '1' default | Forces non-zero default. Introduces fake data. | |
| Drop `rooms` for non-residential types | Different mapping per propertyType. More complex. | |

**User's choice:** 1→3 / 4+ / undefined (D-07).

### Q8: Legacy `bedrooms`/`bathrooms` (numeric) — fate?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop both — superseded by `basics.rooms` (Recommended) | Both fields don't map to SPEC nested shape. M1+M2 mock data. | ✓ |
| Keep top-level for backward compat | Useful only if Phase 2 wants legacy bed/bath counts. Probably not. | |
| Move to `basics._legacy:{bedrooms,bathrooms}` for archival | Burys dead weight. | |

**User's choice:** Drop both (D-08).

### Q9: Legacy `maxGuests` and `amenities[]` (M1 Hospitality 12-amenity) — fate?

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve at top level (Recommended) | Keeps M1 Phase 6 HOSP-05 read paths intact. SPEC silent on amenities for hotel/hostel. | ✓ |
| Move under `basics.hospitality:{maxGuests, amenities}` | Cleaner organization; breaks M1 Phase 6 HOSP-* read paths (Phase 1 client patch needed — rejected per D-01). | |
| Drop — not in SPEC | Regresses M1 HOSP-05; bad UX. | |

**User's choice:** Preserve top-level (D-09).

### Q10: Other orphan top-level fields (`instagramUrl`, `availableDate`, `agent`, `is3DTourAvailable`, `period`, `listingId`, `platformVerifications`, `verificationUpdatedAt/By`) — default policy?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep top-level by default, drop only stale ones (Recommended) | Keep: instagramUrl, availableDate, listingId, platformVerifications + verification* fields. Drop: period (deal-type implies it), is3DTourAvailable (derive from media.tourUrl), agent (dead field). | ✓ |
| Move all into `meta:{...}` sub-object | Tidier but breaks every read site. Premature. | |
| Keep ALL top-level untouched | Most conservative; dead fields accumulate. | |

**User's choice:** Selective preserve + drop (D-10).

### Q11: SPEC's `content.language:'ru'|'en'` backfill default for legacy rows?

| Option | Description | Selected |
|--------|-------------|----------|
| 'ru' default for all legacy rows (Recommended) | Bishkek launch is RU-primary; M1+M2 mock content mostly Russian. Owners edit via Phase 2. | ✓ |
| Heuristic detect from title/description | Cyrillic-vs-Latin script detector. +20 LOC. Mock data — over-engineering. | |
| Leave undefined; require Phase 2 client default | Underspecifies schema. | |

**User's choice:** 'ru' default (D-11).

---

## Media coalescing

### Q12: Current `tours[]` array → SPEC's single `media.tourUrl?:string`. Coalesce rule?

| Option | Description | Selected |
|--------|-------------|----------|
| First non-empty tour.url (Recommended) | `tours.find(t => t.url)?.url`. Loses multi-tour rendering for legacy listings. Tour metadata (id/title/thumbnailUrl) dropped. | ✓ |
| First non-empty: tours[0].url → matterportUrl → panoramicPhotosUrl | Priority chain. Conflates 3D-tour with panoramic-photo URLs. Bigger logic. | |
| Drop tours, keep matterportUrl as tourUrl | Simpler but loses tours[] metadata. | |

**User's choice:** First non-empty tour.url (D-12).

### Q13: `panoramicPhotosUrl` (Ricoh 360) — fate in nested shape?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop — not in SPEC; mod re-uploads in Phase 3 (Recommended) | SPEC has no panoramic slot. Phase 3 mod-curation owns media post-migration. Aligns with media-inversion direction. | ✓ |
| Coalesce into `media.tourUrl` if `tours[]` empty | Hacky — semantic mismatch (panoramic photo URL vs 3D-tour URL). | |
| Preserve at top level outside `media.*` | SPEC-deviating; conservative. | |

**User's choice:** Drop (D-13).

### Q14: Legacy `videoUrl:string` (single) → SPEC's `media.videos:string[]`?

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap into single-element array if non-empty (Recommended) | `media.videos = videoUrl ? [videoUrl] : []`. Preserves verbatim under array shape. | ✓ |
| Drop — mod re-uploads in Phase 3 | Loses any existing video URL. | |
| Preserve top-level videoUrl AND add empty media.videos[] | Both shapes coexist; contradicts atomic-break invariant. | |

**User's choice:** Wrap to array (D-14).

### Q15: Legacy `imageUrl` (primary) and `images:[String]` → SPEC's `media.photos:string[]`?

| Option | Description | Selected |
|--------|-------------|----------|
| `media.photos = images || []`; drop derived `imageUrl` (Recommended) | Caller computes from media.photos[0]. Satisfies SC #2 verbatim. | ✓ |
| `media.photos = images || []`; keep `imageUrl` top-level for legacy reads | Defensive; useful only if external systems read imageUrl. | |
| Drop both; mod re-uploads everything in Phase 3 | Most aggressive; contradicts SC #2. | |

**User's choice:** `media.photos = images`, drop `imageUrl` (D-15).

---

## Rollback

### Q16: Rollback path of choice for SC #5?

| Option | Description | Selected |
|--------|-------------|----------|
| Atlas snapshot only — restore-from-snapshot is the rollback (Recommended) | Snapshot timestamp captured pre-migration; rollback = restore via Atlas UI + git revert route cutover commit. Simple. | ✓ |
| Forward-only — no rollback, fix forward | Rejects SC #5's documented-rollback requirement. | |
| Per-doc `_legacyFlat:{...}` snapshot field + reverse script | Migration writes pre-migration backup on each doc; +95 LOC. | |
| Reverse migration script reading current nested shape | Lossy where mapping isn't 1:1 (e.g., 4+ rooms loses specificity). | |

**User's choice:** Atlas snapshot only (D-16).

### Q17: Where to document Atlas snapshot timestamp + rollback runbook?

| Option | Description | Selected |
|--------|-------------|----------|
| 01-CONTEXT.md §Rollback (Recommended) | Inline in phase context. Cross-referenced from PLAN.md. M2 precedent. | ✓ |
| Standalone `01-RUNBOOK.md` in phase dir | Easier to print during run. Slight overhead. | |
| Top-level `scripts/migrate-listings-m3.md` in backend repo | Most discoverable for operator at run-time but split source-of-truth concern. | |

**User's choice:** Inline in CONTEXT.md (D-17).

### Q18: How to verify pre-migration data integrity (besides Atlas snapshot)?

| Option | Description | Selected |
|--------|-------------|----------|
| `--dry-run` prints counts + sample doc preview (Recommended) | Counts per filter + 3 randomly-selected docs in before/after JSON shape. Operator visual inspection. | ✓ |
| Dry-run + checksum (count of `{location:{$exists:false}}` matches total) | Adds explicit pre-condition assertion. +5 LOC. Slightly more rigorous. | |
| Dry-run only, no sample preview | M2 Plan 02-02 verbatim — counts only. Fastest. | |

**User's choice:** Counts + sample preview (D-18).

---

## Test scope (deferred)

### Q19: Discuss Phase 1 backend test scope, or leave to Claude's discretion?

| Option | Description | Selected |
|--------|-------------|----------|
| Discuss test scope now | Decide (a) full update inside Phase 1, (b) migration test only + others deferred to Phase 5, (c) disable broken tests with TODO + add new tests now. | |
| Leave to Claude's discretion | Researcher/planner decides during plan-phase. CONTEXT.md notes as open implementation choice. Default: tests cut over with code (atomic-cutover principle). | ✓ |
| I'm ready for context | Skip the test discussion. | |

**User's choice:** Leave to Claude's discretion (Phase 1 backend test scope is Claude's discretion in plan-phase).

---

## Claude's Discretion

- Phase 1 backend test update scope (default: tests cut over with code; researcher/planner decides defer-to-Phase-5 case-by-case).
- Mongoose schema strict mode policy.
- `Property.ts` type stub shape on the RN client (full nested vs `LegacyFlat | Nested` union).
- Migration sample-preview doc selection (random vs propertyType-biased).
- Schema versioning marker (`schemaVersion: 'm3-nested-v1'` field optional).
- Mongoose virtual `specs` fate (delete vs rewrite to read from `basics.{rooms, areaSqm}`).
- `tour.thumbnailUrl` data fate (dropped along with rest of tour metadata under D-12).
- S3 URL format checks during migration (cheap pre-flight check; researcher discretion).

## Deferred Ideas

(See CONTEXT.md §Deferred for the full list — 25+ items captured.)

---

*Discussion captured: 2026-05-05*

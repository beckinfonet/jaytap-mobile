# Phase 3: Media Flow Inversion (Admin/Mod Curation) - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Invert the user-uploads-to-S3 workflow so users submit metadata only; admin/mod uploads photos / videos / 3D-tour URL via a new mod-queue media-curation surface after metadata review — and approval is BLOCKED until at least one photo exists. Existing M1+M2 listings retain their user-uploaded media verbatim through Phase 1's SCHEMA-02 migration.

**Phase 3 expanded scope (folded in via discussion):**

1. **New backend endpoints** — `POST /api/moderation/listings/:id/media` (multipart photos/videos + JSON tourUrl) and `DELETE /api/moderation/listings/:id/media/:assetIndex` (per-asset removal); both require mod/admin role; both write `ModerationLog action: 'media-upload'` (extends M2 enum from `['approve','reject','edit-on-behalf','archive','unarchive','hard-delete']`). The DELETE endpoint scope is folded in beyond the strict REQUIREMENTS.md MEDIA-04 wording — needed for the append + per-asset delete UX captured in D-06.
2. **MEDIA_REQUIRED invariant** — backend route-level gate at `POST /api/moderation/properties/:id/approve` AND at the edit-on-behalf flip-to-live path (M2 MOD-14). Returns HTTP 400 with `code: 'MEDIA_REQUIRED'` when `media.photos.length === 0`. Client UX disables the Approve button when photos are empty (defense-in-depth: server is trust boundary, button-disable is UX guidance).
3. **User-side write-path lockdown** — strip `upload.array('images', 40)` middleware from POST and PUT in `src/routes/propertyRoutes.js`; strip `media.{photos, videos, tourUrl}` from the destructured POST/PUT body so backend writes empty arrays + undefined tourUrl on user write paths regardless of what client sends. Atomic-break stance (matches Phase 1 D-01).
4. **MediaCurationScreen (RN client)** — new dedicated push-on-tap screen in App.tsx state machine (`isMediaCurationOpen` + `currentMediaCurationListingId` flags). Photo grid + add/remove + tour URL input + Save photos button + separate "Approve & publish" button. Mounts as overlay in App.tsx between `KeyboardProvider` and the existing screen tree (same pattern as Phase 2 ContextualListingFlow).
5. **ModerationQueueScreen extension** — filter chip row above the existing pending-listings tab (All pending / Needs media / Has media); default chip stays "All pending"; tab structure unchanged (Listings stays the default tab). Tap a queue row → push MediaCurationScreen.
6. **PropertyDetailsScreen mod banner** — when a mod views a pending listing with `media.photos.length === 0`, render a banner above the existing mod action footer: "Photos required before approval" + button "Add photos" → opens MediaCurationScreen.

**Touches both repos:**
- **Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — `src/routes/moderationRoutes.js` (new POST + DELETE media endpoints + MEDIA_REQUIRED gate at /approve + edit-on-behalf), `src/routes/propertyRoutes.js` (strip multer + strip media body fields), `src/models/ModerationLog.js` (extend action enum), backend test suites (supertest cases per D-15 default scope), new sentinel script `scripts/check-property-routes-media-stripped.sh`.
- **RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — new `src/screens/MediaCurationScreen.tsx`, updates to `src/screens/ModerationQueueScreen.tsx` (filter chip row + row-tap navigation), updates to `src/screens/PropertyDetailsScreen.tsx` (mod-only "needs media" banner), `App.tsx` (new state flags + overlay mounting), new `src/services/MediaCurationService.ts` (or extend `ModerationService.ts` — planner discretion), +20–30 EN+RU keys per MEDIA-09.

**Requirements covered:** MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07, MEDIA-08, MEDIA-09 (9 reqs).

**Note on MEDIA-01:** De-facto satisfied by Phase 2 Plan 02-09 (atomic deletion of CreateListingScreen.tsx + CreateListingForm/MediaSection). Phase 3 verifies the user-facing flow has zero media affordance via the existing atomic-deletion sentinel + the new propertyRoutes lockdown sentinel.

**Note on MEDIA-08:** Already validated in Phase 1 D-15 (legacy `images: [String]` → `media.photos: [String]` verbatim) and Phase 1 D-12 (`tours[]` → `media.tourUrl` first non-empty). Phase 3 verifies via supertest case that legacy listings with photos retain them post-Phase-3 deploy.

**Explicitly NOT in this phase (boundary anchors for downstream):**
- ROLE-11 frontend mid-action 403 popup-recovery — Phase 4 (CARRY-01).
- Phase 4.5 landlord-application uid-mismatch fix — Phase 4 (CARRY-02).
- v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission — Phase 5 (REL-01..REL-06). Manual QA for the 6-step flow happy path × property/deal type matrix + mod media curation walk + EN+RU + dark/light parity all live in Phase 5 REL-03.
- 2GIS native bridge migration — M4+ per `2GIS_BRIDGE_PLAN.md`.
- Panoramic-photos slot in `media.*` — DROPPED in Phase 1 D-13; if a legacy listing had panoramic photos, the mod re-attaches them via the new MediaCurationScreen photo grid in Phase 3 (treated as ordinary photos). No separate `media.panoramic[]` field re-introduced.
- Multi-tour preservation in `media.tourUrl[]` — REJECTED in Phase 1 D-12. Phase 3 honors the single-string `tourUrl` shape.
- Tour URL vendor allowlist (Matterport-only regex) — REJECTED in D-08 in favor of generic https:// validation; future tour vendors don't need a backend change.
- Video transcoding / thumbnail generation — out of scope for Phase 3. Mod uploads raw mp4/mov; client renders the first frame OR a placeholder. Re-evaluate in M4+ if video catalog grows.
- Push notifications for "needs media" / approval / rejection events — out of scope per REQUIREMENTS.md M3 Out of Scope.
- Bulk moderation actions (multi-select approve/reject/upload) — out of scope; M4+.

</domain>

<decisions>
## Implementation Decisions

### Mod media-curation surface (RN client)

- **D-01 (Dedicated MediaCurationScreen, push-on-tap from queue):** A new `src/screens/MediaCurationScreen.tsx` is pushed when a moderator taps a queue row (any listing tab) OR taps the "Add photos" button on the PropertyDetailsScreen banner (D-04). Mounts via App.tsx overlay state — new flags `isMediaCurationOpen: boolean` and `currentMediaCurationListingId: string | null` join the existing pattern (`isModerationQueueOpen`, `isContextualListingFlowOpen`, etc.). Estimated ~400-600 LOC including header + photo grid + tour URL input + action footer. REJECTED: new tab on ModerationQueueScreen (would push existing 824 LOC past the screen's natural cap); inline section on PropertyDetailsScreen (already 1680 LOC per CONCERNS.md, largest screen in the app).

- **D-02 (Filter chip row above the existing Listings tab):** ModerationQueueScreen's existing "Listings" tab gets a filter-chip row directly above the FlatList: `[All pending] [Needs media] [Has media]`. Default chip is `All pending` (preserves M2 behavior — mod sees the full queue first, then can drill in). Reuses the chip pattern Phase 2 established for Step 2 city/district selection (visual continuity). The Locations tab Phase 2 added is NOT touched. REJECTED: separate "Needs media" tab (fragments queue across tabs; ambiguous categorization for needs-media-AND-rejected listings); sort-only with badges (no isolation when queue is long).

- **D-03 (Default landing tab unchanged):** Mod opens ModerationQueueScreen → lands on the existing Listings tab same as M2 + Phase 2. Phase 3 does not shift the primary entry point. Filter chip default is `All pending` so the first-render experience is unchanged from M2.

- **D-04 (PropertyDetailsScreen mod banner — deep-link to MediaCurationScreen):** When `useRole()` resolves to moderator/admin AND viewing a `status: 'pending'` listing AND `media.photos?.length === 0`, PropertyDetailsScreen renders a banner above the existing mod action footer: i18n title (e.g., EN "Photos required before approval" / RU «Перед одобрением требуются фото»), body line (mod must add photos), button "Add photos" → triggers App.tsx state to open MediaCurationScreen with this listing's id. Banner uses `useTheme()` warning tokens (e.g., `colors.warningSubtle`) — dark/light parity required. Banner is a sibling of the existing M2 RejectionBanner (different surface; can co-render if both apply).

### Upload mechanics & flow (backend)

- **D-05 (Multipart-direct via backend multer-s3 — relocate the user pattern to the mod endpoint):** New `POST /api/moderation/listings/:id/media` accepts multipart form-data (`images[]` + `videos[]` + JSON `tourUrl` field). Reuses the existing `S3Client` + `multer-s3` setup from `propertyRoutes.js` (lines 17-43) — same `AWS_BUCKET_NAME` env var (default `'jaytap-properties'`), same `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars, same dedicated `jaytap-prod-s3` IAM user (memory `aws-iam-jaytap-prod-s3.md`). Researcher/planner decides whether to extract the S3 client + multer config into a shared module (`src/config/s3.js` or similar) reused by both moderationRoutes and the to-be-stripped propertyRoutes path before strip lands; recommend extract for cleanliness. REJECTED: presigned-URL pattern (overkill for a 1–2 person mod team; adds 2-trip dance + S3 CORS config + new presigning logic); pure URL paste (worse mod UX; requires external hosting tooling).

- **D-06 (Append + per-asset DELETE — incremental gallery curation):** Each `POST /api/moderation/listings/:id/media` request APPENDS new uploads to `media.photos[]` and `media.videos[]` (atomic `findOneAndUpdate` with `$push: { 'media.photos': { $each: newPhotoUrls } }`). A separate `DELETE /api/moderation/listings/:id/media/:assetIndex` (or by URL — planner picks; index is simpler but URL is more stable across concurrent edits — see Claude's Discretion below) removes one asset. `tourUrl` updates are replace-style (single string field). Race-safety: concurrent appends are commutative (unordered set semantics under $push); concurrent delete-by-index races are flagged via the M2 MOD-15 race-toast pattern (HTTP 409). REJECTED: replace-all on each save (bug-prone; mod must re-send existing URLs to keep them); append-only with no delete (mistakes accumulate; mod must use raw S3/DB to recover).

- **D-07 (Photos 40 / videos 5 cap per POST + MIME-type validation):** Carry over the existing `upload.array('images', 40)` photo limit verbatim onto the new endpoint. Add separate `upload.array('videos', 5)` cap (videos are large — backend memory + S3 cost guardrail). Multer fileFilter rejects mixed/wrong MIME types: photos must match `image/(jpeg|png|webp|heic|heif)`; videos must match `video/(mp4|quicktime|x-m4v)` (planner finalizes the regex based on what RN file pickers actually emit). Reject with HTTP 400 + `code: 'MEDIA_INVALID_TYPE'`. Total per-request payload size: planner picks (recommend 100MB cap to keep Railway request budgets sane).

- **D-08 (Tour URL — generic https:// validation, vendor-agnostic):** Backend validates `tourUrl` as a well-formed `https://*` URL only. NO Matterport-only allowlist regex. Reject non-https or malformed URLs with HTTP 400 + `code: 'MEDIA_INVALID_TOUR_URL'`. Reasoning: future-proof — a second tour vendor (e.g., Asteroom, Cupix) doesn't require a backend change. The Matterport mental default is preserved by client UX (placeholder text in the input + i18n hint), not by server-side allowlist. REJECTED: Matterport-only regex (vendor lock-in at the schema layer); no validation at all (typo'd URL ships broken to renters).

### MEDIA_REQUIRED enforcement & approval flow

- **D-09 (Route-level gate at /approve only — single enforcement point):** `moderationRoutes.js POST /properties/:id/approve` checks `media.photos.length === 0` BEFORE the atomic `findOneAndUpdate`. Returns HTTP 400 with body `{ code: 'MEDIA_REQUIRED', message: '...' }` if empty. Single, traceable enforcement point; matches M2's race-safety pattern (atomic findOneAndUpdate with status filter). NO Mongoose pre-save hook — atomic findOneAndUpdate doesn't run pre-save by default, and switching to fetch+save would lose the M2 race-safety. NO Mongoose schema-level required (empty photos is a valid state for `pending` listings — only the pending → live transition is gated). REJECTED: route + Mongoose hook defense-in-depth (Mongoose validation errors look different from route 400s, harder to test, complicates the atomic update flow); Mongoose-only (would force fetch+save, regressing race-safety).

- **D-10 (Edit-on-behalf path also enforces MEDIA_REQUIRED):** M2 MOD-14 edit-on-behalf currently flips status → live atomically ("mod fixed it = ready to publish"). Phase 3 adds the same `media.photos.length === 0` check before that flip. Same `code: 'MEDIA_REQUIRED'` HTTP 400. Keeps invariant consistent: NO listing reaches `live` without at least one photo, period — regardless of which mod-action path triggered the flip. The MEDIA_REQUIRED check lands BEFORE the atomic edit-and-flip operation in `moderationRoutes.js` (planner picks exact line; current edit-on-behalf handler starts ~line 413).

- **D-11 (Two-step Save photos + Approve & publish UX):** MediaCurationScreen renders a photo grid + tour URL input + two distinct buttons: `[Save photos]` (uploads — fires `POST /api/moderation/listings/:id/media`) and `[Approve & publish]` (fires the existing `POST /api/moderation/properties/:id/approve`). Mod can save photos, navigate away, come back, and approve later — matches M2 mod-action mental model + Phase 2's edit-on-behalf save-then-approve pattern. The two buttons are visually distinct (Approve uses primary/success token; Save uses secondary). REJECTED: auto-publish on first photo upload (no preview/review opportunity; conflicts with edit-on-behalf workflow); per-session "Publish after upload?" toggle (UI state easy to misuse).

- **D-12 (Client-side Approve button disabled when photos empty + inline reason):** Approve button on (a) MediaCurationScreen, (b) ModerationQueueScreen row action footer, and (c) PropertyDetailsScreen mod action footer is DISABLED (`disabled={true}` + visually muted) when the listing's `media.photos.length === 0`, with adjacent i18n hint text (e.g., EN "Add at least one photo to enable approval" / RU «Добавьте хотя бы одно фото, чтобы одобрить»). Server still returns 400 as the trust boundary if a stale client somehow taps and submits — both gates active (client UX + server invariant). REJECTED: client tap-and-fail with toast (every blocked approve costs a network call); button-disable only without server gate (single point of failure if client logic regresses).

### User-side write-path lockdown + S3 IAM rotation interpretation

- **D-13 (Strip multer entirely from POST and PUT /api/properties — atomic-break):** In `src/routes/propertyRoutes.js`:
  - Remove `upload.array('images', 40)` middleware from `router.post('/', ...)` (current line 111) AND from `router.put('/:id', ...)` (current line 344).
  - Strip `req.files` mapping (current lines ~156, "Map multer-uploaded files to S3 image URLs").
  - Strip `media.{photos, videos, tourUrl}` from the destructured POST/PUT body — backend writes `media: { photos: [], videos: [], tourUrl: undefined }` (or omits the key entirely so Mongoose schema defaults apply) on POST regardless of what client sends; on PUT, leave existing media intact (ignore client-sent media keys verbatim).
  - Backend rejects ANY multipart media on user write paths — request returns HTTP 400 if multer would have parsed files (or, with multer removed, the files simply never reach disk; client sees a normal JSON response, just with empty media).
  - The decision to STRIP rather than role-gate matches the Phase 1 D-01 atomic-break stance (no dual-shape/dual-flow window; testers wait for the next build).
  REJECTED: leave multer wired but role-gate (duplicates mod functionality across two endpoints; users with bad client builds get a 400 instead of silent ignore); leave multer + silently ignore output for non-mod actors (leaks backend storage on accidental uploads, worst of both worlds).

- **D-14 (S3 IAM rotation interpretation — API surface removal IS the rotation):** REQUIREMENTS.md MEDIA-05 wording "rotation symmetric to M2 HF-02 secret rotation discipline" is INTERPRETED as "remove the user-facing API surface that exposes S3 upload rights" — NOT as "rotate the `jaytap-prod-s3` access keys". Reasoning:
  - Per memory `aws-iam-jaytap-prod-s3.md`, JayTap users do not have personal S3 credentials. The backend uses the dedicated `jaytap-prod-s3` IAM user for ALL S3 ops (uploads + reads).
  - "Revoke user upload rights" therefore means: remove the multer middleware from `POST/PUT /api/properties` (D-13) — the API surface that was the user's only path to S3 PutObject.
  - The `jaytap-prod-s3` IAM key itself does NOT need rotating because it wasn't leaked. HF-02 rotated post-leak; this is attack-surface reduction, a different threat model.
  - Document this interpretation in CONTEXT.md so the Phase 5 REL-05 audit reads it correctly.
  REJECTED: literal access-key rotation at phase close (mirrors HF-02's mechanics but not its threat model; adds operator work without clear benefit); IAM policy split across user/mod prefixes (backend code is the single actor anyway; policy split changes audit cleanliness only, not runtime behavior). Re-open condition: if a future audit (Phase 5 REL-05 or beyond) finds evidence that the `jaytap-prod-s3` key was logged/leaked, do a literal HF-02-style rotation at that time.

- **D-15 (Anti-spoofing grep gate for the new endpoint — same pattern as M2 HF-03):** Phase 3 verification gate adds:
  ```
  grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js
  ```
  Must exit with no matches (exit 0 from grep means "found", so the gate is `! grep -nE ... && echo PASS` — planner picks the exact assertion mechanic). ModerationLog row's `actorUid` MUST be sourced exclusively from `req.firebaseUid` (the JWKS-verified token sub) — NEVER from request body / headers. Memory `phase45-landlord-application-uid-mismatch-bug.md` is the same threat class — the grep gate is cheap insurance against a regression. The new POST and DELETE media endpoints both write `actorUid: req.firebaseUid` to the ModerationLog row.

### Test scope

- **D-16 (Default test scope — new endpoint coverage + invariants + RN smoke):** Phase 3 ships:
  - **Backend supertest cases** (`src/__tests__/moderationRoutes.test.js` extended): `POST /api/moderation/listings/:id/media` happy path (photos + videos + tourUrl), unauthorized (no token → 401), wrong role (plain user → 403), invalid MIME type → 400 `MEDIA_INVALID_TYPE`, invalid tour URL → 400 `MEDIA_INVALID_TOUR_URL`, append semantics (second POST appends, doesn't replace); `DELETE /api/moderation/listings/:id/media/:assetIndex` happy path + race condition (concurrent delete → 409 per M2 MOD-15); `MEDIA_REQUIRED` block at `/approve` (empty photos → 400) + edit-on-behalf flip path (empty photos → 400); ModerationLog row written with `action: 'media-upload'` + `actorUid` from token sub; legacy listing with photos preserved post-deploy (regression test for MEDIA-08).
  - **Backend supertest cases** (`src/__tests__/propertyRoutes.test.js` updated): POST `/api/properties` with multipart files → files ignored (or 400 if multer's gone — planner picks); body `media.{photos, videos, tourUrl}` ignored / overwritten with empty.
  - **Anti-spoofing grep gate** (`scripts/check-no-actoruid-spoofing.sh` or equivalent) — new sentinel script run by `npm test` or as a CI gate.
  - **propertyRoutes media-stripped sentinel** — `scripts/check-property-routes-media-stripped.sh` (or equivalent grep gate) asserts `grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js` exits 1 (zero matches expected). Mirrors M1 Phase 4's `check-land-removed.sh` and Phase 2's `check-create-listing-screen-removed.sh` enforcement pattern.
  - **RN client tests:** RTL component smoke for MediaCurationScreen (renders photo grid, Save button enabled with photos selected, Approve button disabled when `media.photos.length === 0`, deep-link from PropertyDetailsScreen banner mounts the screen with correct listingId); ModerationQueueScreen filter chip row renders + filter logic ("Needs media" filters to listings with empty photos); existing ModerationQueueScreen tests preserved.
  Researcher/planner has discretion to defer specific suites to Phase 5 hardening if scope grows; if so, those suites are explicitly skipped (`describe.skip` or `it.skip`) with a TODO comment referencing this CONTEXT.md, and the new endpoint happy-path + MEDIA_REQUIRED gate tests are added regardless. Per memory `gsd-verifier-misses-regressions.md`, paired-gate verifier+code-review is mandatory after `gsd-execute-phase`.

### Claude's Discretion

- **`Property.media` schema strictness.** Current schema (Phase 1) has `media: { photos: { type: [String], default: [] }, videos: { type: [String], default: [] }, tourUrl: { type: String } }`. Researcher/planner decides whether to add Mongoose-level URL-format validation on `tourUrl` (e.g., `validate: { validator: v => /^https:\/\//.test(v), ... }`) as belt-and-suspenders alongside D-08's route-level check. Cheap to add; no functional behavior change.

- **DELETE endpoint addressing — index vs URL vs `_id`.** D-06 says the DELETE removes one asset. Researcher/planner picks the addressing scheme:
  - By array index (`/media/:assetIndex`) — simplest; race-prone (concurrent deletes shift indices).
  - By URL (`/media?url=https://...`) — stable across concurrent edits but requires URL exact-match (encoding sensitivity).
  - By per-asset Mongo subdocument `_id` (requires schema change to `media.photos: [{ url, _id, addedBy, addedAt }]`) — most robust but most invasive (schema change + adapter for existing string-array shape).
  Recommend by URL for Phase 3 ship; revisit subdoc shape in Phase 5 hardening if delete races become a real issue. Preserve race-safety with the M2 atomic `findOneAndUpdate` + `$pull: { 'media.photos': urlValue }` pattern.

- **S3 client + multer config sharing module.** Researcher/planner decides whether to extract `s3 = new S3Client({...})` + `upload = multer({...})` into a shared module (`src/config/s3.js` or `src/middleware/s3Upload.js`) reused by moderationRoutes (and any future S3-touching route). Recommend extract — improves testability and centralizes the bucket name / region env var reads.

- **RN file picker library choice.** RN client needs a multi-file image+video picker for the MediaCurationScreen photo grid. Existing project doesn't ship a picker (M1+M2 used multipart from `<TextInput>` URLs only — actually verify: legacy CreateListingForm/MediaSection probably had a picker; that code was deleted in Phase 2 Plan 02-09). Planner picks: `react-native-image-picker` (MIT, native) vs `expo-image-picker` (requires Expo modules; likely incompatible with the project's bare RN setup) vs `react-native-document-picker` (any file type, less polished UX). Recommend `react-native-image-picker` if not already in deps; verify peer compatibility with reanimated@4.3.0 + RN 0.84 + Fabric + Hermes. Adds a new install gate (memory category — mirrors M1 Phase 2 keyboard-controller install pattern).

- **Banner copy in PropertyDetailsScreen and MediaCurationScreen empty state.** D-04 + D-12 reference EN+RU copy for the "Photos required" banner and the empty-state message in MediaCurationScreen. Planner finalizes exact copy; the shape locked here is "title + body + button" for the banner and "icon + helper text" for the empty state. Planner adds 5-8 i18n keys for these strings (folded into the +20-30 keys MEDIA-09 anticipates).

- **MIME-type allowlist.** D-07 sketches `image/(jpeg|png|webp|heic|heif)` and `video/(mp4|quicktime|x-m4v)`. Planner finalizes based on what the chosen RN file picker actually emits and what the iOS Photos app + Android camera app produce by default. HEIC support for iOS photos is non-trivial (server-side conversion or rejection — pick rejection for Phase 3 ship; mod converts to JPEG client-side or via file picker's `mediaType` config).

- **Total per-request payload cap.** D-07 mentions 100MB recommend; planner finalizes based on Railway's actual ingress limits (free tier ~10MB? paid tier higher?). Document the chosen cap inline in PLAN.md so the supertest case can use a representative payload size.

- **`'media-upload'` ModerationLog `before`/`after` diff shape.** Existing ModerationLog `before`/`after` are changed-fields-only diffs (per ModerationLog.js line 8). Planner picks the diff shape for media-upload: `before: { 'media.photos.length': N, 'media.videos.length': M }` + `after: { 'media.photos.length': N+k, 'media.videos.length': M+j }` (count-only) vs full URL-list diff (verbose, useful for forensic). Recommend count-only for normal log compactness; researcher decides if forensic detail is needed.

- **MediaCurationScreen role gating.** D-01 says the screen mounts when a moderator taps a queue row. Planner adds `useRole()` guard in App.tsx (mirror of how ModerationQueueScreen mounts only when `role === 'moderator' || 'admin'`). Plain user accidentally hitting a deep-link should never see the screen.

- **DELETE endpoint also writes ModerationLog?** Symmetric with POST? Recommend yes — `action: 'media-upload'` (or extend to `'media-delete'` if planner picks a separate enum value). Planner picks; document in PLAN.md. Both write `actorUid: req.firebaseUid`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v3.0 M3 "Contextual Forms"; geographic scope (KG/KZ/UZ — not Bishkek-only); locked decisions (M1 9-type 3-category taxonomy preserved; M2 status enum unchanged; no `react-navigation`; no Firebase SDK in either repo; backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`); Out of Scope (push notifications, bulk moderation, document verification, KZT/UZS, 2GIS bridge, payment/booking).
- `.planning/REQUIREMENTS.md` — MEDIA-01..MEDIA-09 acceptance criteria for media inversion (REQUIREMENTS.md §"Media inversion (Phase 3) — admin/mod uploads post-submission"); REL-* (Phase 5 boundary); hard rules (no Firebase SDK; EN+RU CI parity gate; manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V).
- `.planning/ROADMAP.md` §"Phase 3: Media Flow Inversion (Admin/Mod Curation)" — Goal + Depends on (Phase 1 nested `media.*` shape + Phase 2 user-facing zero-media flow) + 5 Success Criteria + UI hint: yes.

### Anchor SPEC

- `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` Version 2 — anchor SPEC. Load-bearing sections for Phase 3:
  - §"High-Level Flow" — explicit "Admin / mod adds photos, videos, 3D tour" step in the mermaid flow chart between user submit and listing publish.
  - §"Step 5 — Title & Description" — explicit "Photos, videos, and 3D tours are not part of this step — they are uploaded by an admin or mod after submission" — Phase 3 owns the supply side.
  - §"Suggested Data Shape" §`media: { photos[], videos[], tourUrl? }` — the canonical media shape; Phase 1 D-12..D-15 already migrated to this shape; Phase 3 writes into it via the new mod endpoint.
  - §"Decisions Log" #6/#7 — "Removed from user flow — admin / mod uploads post-submission" for both photos and 3D tour.

### Prior phase references (carries forward as patterns)

- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` — Phase 1 implementation decisions:
  - §D-01 (atomic-break cutover) — Phase 3's user-side multer strip (D-13) follows the same atomic-break stance.
  - §D-09 (Hospitality `maxGuests` + `amenities[]` preserved top-level) — Phase 3 doesn't touch these; mod media curation is orthogonal.
  - §D-12 (`tours[]` → `media.tourUrl` first non-empty) — Phase 3's tour URL input writes into the same single-string field.
  - §D-13 (`panoramicPhotosUrl` DROPPED in migration) — if a legacy listing had panoramic photos, mod re-attaches them via the new MediaCurationScreen photo grid in Phase 3 (treated as ordinary photos).
  - §D-14 (`videoUrl` → `media.videos: [videoUrl]`) — Phase 3's video grid writes into `media.videos[]` array (multi-video supported).
  - §D-15 (`images` → `media.photos`) — Phase 3's photo grid writes into the same array.
- `.planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md` — Phase 2 implementation decisions:
  - §D-13 (silent in-flow Back, confirm only on exit) — MediaCurationScreen inherits a similar discard pattern (Hardware/Android back at root → exit confirm; otherwise navigate back to queue silently).
  - §D-15 (mode + initialListing discriminated union) — MediaCurationScreen accepts `listingId: string` + `onClose: () => void` + `onApproveSuccess: () => void` props; planner finalizes the prop shape (no mode discriminator needed — only mods use this screen).
  - Phase 2 atomic deletion of CreateListingScreen (Plan 02-09) — MEDIA-01 already de-facto satisfied; Phase 3 verifies via the existing atomic-deletion sentinel + new propertyRoutes lockdown sentinel.
- `.planning/milestones/v2.0-phases/03-moderation-queue-actions-edit-on-behalf/` — M2 Phase 3 (MOD-11 mod queue + approve/reject + race-safety pattern; ModerationLog audit pattern; race-toast on 409 per MOD-15). Phase 3 EXTENDS this surface.
- `.planning/milestones/v2.0-phases/01-backend-role-foundation-auth-migration-hotfix-bundle/` — M2 Phase 1 (HF-03 anti-spoofing grep-gate pattern `grep -nE "uid:\s*req\.(body|headers)"` — Phase 3 reuses as `actorUid` check for the new media endpoints).
- `.planning/milestones/v1.0.4-phases/04-listing-form-taxonomy-and-decomposition/` — M1 Phase 4 (atomic deletion sentinel pattern `scripts/check-land-removed.sh` — Phase 3 mirrors for `scripts/check-property-routes-media-stripped.sh`).

### Backend repo files (decision-shaping)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (764 LOC) — D-13 strips multer + media body fields. Current `upload.array('images', 40)` middleware at lines 111 (POST) and 344 (PUT). S3Client + multer-s3 config at lines 17-43 (planner extracts to shared module per Claude's Discretion).
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` (731 LOC) — D-05 + D-06 add new POST + DELETE media endpoints; D-09 + D-10 add MEDIA_REQUIRED gate at `POST /properties/:id/approve` (line 94) and at edit-on-behalf flip path (line ~413). D-15 anti-spoofing grep gate runs against this file.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js` — Extend `action` enum from `['approve','reject','edit-on-behalf','archive','unarchive','hard-delete']` to include `'media-upload'` (and possibly `'media-delete'` per Claude's Discretion). `actorUid` MUST be sourced from `req.firebaseUid` (D-15).
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — Phase 1 nested-shape schema. `media.{photos, videos, tourUrl}` already in place (lines 79-84). No schema change required for Phase 3 (planner discretion on Mongoose-level URL validator — see Claude's Discretion).
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` — JWKS-verified token sub populates `req.firebaseUid`. Reused verbatim by the new media endpoints; no changes.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` — D-16 default scope extends with new media endpoint cases.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js` — D-16 updates for the multer-strip behavior.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — `engines.node >= 22.12.0`; `nvm use 24` required for backend npm/node operations (memory `backend-node-version.md`).

### RN client repo files (decision-shaping)

- `src/screens/ModerationQueueScreen.tsx` (824 LOC) — D-02 adds filter chip row above the existing Listings tab FlatList; D-03 keeps default tab; row tap navigates to MediaCurationScreen via App.tsx state flag.
- `src/screens/PropertyDetailsScreen.tsx` (1680 LOC, largest screen) — D-04 adds mod-only "needs media" banner above the existing mod action footer; D-12 disables Approve button when `media.photos.length === 0`.
- `src/screens/MediaCurationScreen.tsx` (NEW) — D-01 estimates ~400-600 LOC. Photo grid + tour URL input + Save photos + Approve & publish buttons. Uses `useTheme()` semantic tokens; EN+RU parity per CONVENTIONS.md.
- `App.tsx` (1215 LOC) — D-01 adds `isMediaCurationOpen` + `currentMediaCurationListingId` state flags + overlay mounting between KeyboardProvider and the existing screen tree (mirrors Phase 2 ContextualListingFlow pattern).
- `src/services/ModerationService.ts` (or new `src/services/MediaCurationService.ts` — planner discretion) — wraps the new POST + DELETE endpoints with the existing apiClient (M2 ROLE-09 Bearer + 401/403 single-flight refresh).
- `src/screens/ContextualListingFlow/` (Phase 2) — NOT touched in Phase 3 (zero media affordance per Phase 2 D-15 already; MEDIA-01 de-facto satisfied).
- `src/locales/en.ts` + `src/locales/ru.ts` — +20–30 EN+RU keys per MEDIA-09.
- `scripts/check-i18n-parity.sh` — CI gate; Phase 3's new keys must pass.
- `scripts/check-create-listing-screen-removed.sh` (Phase 2 sentinel) — preserved; Phase 3 doesn't touch.
- `scripts/check-property-routes-media-stripped.sh` (NEW) — D-16 sentinel asserts `grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js` exits 1.

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity (`src/locales/en.ts` + `src/locales/ru.ts`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; co-located `__tests__/` for unit tests.
- `.planning/codebase/STRUCTURE.md` — `src/screens/PropertyDetailsScreen.tsx` (1680 LOC); `src/screens/ModerationQueueScreen.tsx` (824 LOC, M2 Phase 3 + Phase 2 Locations tab).
- `.planning/codebase/CONCERNS.md` — `App.tsx` 1215 LOC near soft-cap; tab persistence `display: none` keep-alive (preserved); PropertyDetailsScreen 1680 LOC concern (D-04 banner adds minimal LOC, D-12 disable-logic adds minimal LOC).
- `.planning/codebase/STACK.md` — React Native 0.84 New Architecture; Hermes + Fabric on both platforms; `react-native-keyboard-controller@1.21.6` + reanimated@4.3.0; AWS SDK v3 (`@aws-sdk/client-s3` + `multer-s3`) already in backend deps.
- `.planning/codebase/INTEGRATIONS.md` — backend axios `apiClient.ts` with Bearer + 401/403 single-flight refresh (M2 ROLE-09); Firebase Identity Toolkit REST.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in either repo. Phase 3 does not touch auth-adjacent code; rule preserved.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity-proof; MongoDB = role authority. Phase 3 media endpoints use `req.firebaseUid` (JWKS-verified) for `actorUid` per D-15.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer; no separate Railway-team coordination.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-node-version.md` — Backend Node ≥22.12 (`nvm use 24`); Phase 3 backend npm/node ops require this.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/aws-iam-jaytap-prod-s3.md` — `jaytap-prod-s3` IAM user owns JayTap S3 access; created 2026-04-29; replaces shared cross-project IAM user. D-14 interprets MEDIA-05 IAM rotation as API surface removal (no key rotation needed; user-side multer strip in D-13 is the rotation).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/m2-shipped-2026-05-05.md` — M2 baseline at backend SHA `2fb5639`; Phase 1 + Phase 2 cutover commits stack on top; Phase 3 stacks on Phase 2.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired-gate posture mandatory after Phase 3 execute (mod queue + propertyRoutes regression class).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase45-landlord-application-uid-mismatch-bug.md` + `phase45-landlord-application-shipped-state.md` — same threat class as D-15 anti-spoofing grep gate; Phase 4 owns the fix (CARRY-02).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/last-admin-lockout-semantics.md` — M2 Phase 5 admin role mgmt; not relevant to Phase 3 (mod queue surface, not admin role mgmt).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/option-rejects-need-user-constraint-justification.md` — Don't pre-reject options based on heuristics; check user's stated requirement first. Applied during this discuss session (e.g., generic https:// validation chosen over Matterport allowlist; API surface removal interpretation chosen over literal HF-02 rotation).
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geocoder-nominatim-hang-axios-network-error.md` — backend `geocodeAddress` hang; eliminated from create-listing flow in Phase 2 (memory mitigated). Phase 3 doesn't touch geocoder.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase06-m3-carry-forward.md` — race-cell test rig + Android reanimated build doc + AWS IAM cross-project residual all M4+; Phase 3 does not address.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/android-reanimated-clean-prefab-gotcha.md` — relevant only at Phase 5 release.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`S3Client` + `multer-s3` setup** (`JayTap-services/src/routes/propertyRoutes.js:17-43`) — full template for the new mod endpoint. Same `AWS_BUCKET_NAME` env var (default `'jaytap-properties'`), same `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars, same dedicated `jaytap-prod-s3` IAM user. Researcher/planner can extract to a shared `src/config/s3.js` or `src/middleware/s3Upload.js` module before strip lands (Claude's Discretion).
- **`verifyFirebaseToken` middleware** (`JayTap-services/src/middleware/verifyFirebaseToken.js`) — JWKS-verified token sub populates `req.firebaseUid`. Reused verbatim by new media endpoints. No changes.
- **`ModerationLog` model + actorUid pattern** (`JayTap-services/src/models/ModerationLog.js`) — append-only audit collection; `actorUid: req.firebaseUid` (NEVER from body/headers per existing comment); `before`/`after` are changed-fields-only diffs. Phase 3 extends action enum with `'media-upload'`.
- **Atomic `findOneAndUpdate` race-safety pattern** (`JayTap-services/src/routes/moderationRoutes.js:96-108` for /approve, lines 263+ for edit-on-behalf) — Phase 3 reuses for the MEDIA_REQUIRED gate AND for `$push: { 'media.photos': { $each: [...] } }` append + `$pull: { 'media.photos': urlValue }` delete patterns.
- **MOD-15 race-toast pattern** (M2 Phase 3 + ModerationQueueScreen) — 409 client surface for concurrent mod actions. Reused for concurrent media-delete races (D-06 race semantics).
- **`useRole()` / `<Gated>`** (M1 Phase 3 + M2 Phase 1 ROLE-07) — Phase 3 uses `useRole()` to guard MediaCurationScreen mount + PropertyDetailsScreen banner render + Approve button visibility on mod-action surfaces.
- **`apiClient.ts` Bearer + 401/403 single-flight refresh** (M2 ROLE-09) — Phase 3 backend media endpoints + RN service consume the existing apiClient; no auth code changes.
- **i18n pattern** (`src/locales/en.ts` + `src/locales/ru.ts` + `useLanguage().t()`) — adding 20–30 keys per MEDIA-09. Reuse `moderation.*` namespace keys where applicable.
- **`useTheme()` semantic tokens** — colors, spacing tokens already established. New banner + screen respect dark/light parity per CLAUDE.md.
- **M2 RejectionBanner + HomeRejectionBanner** (`src/components/RejectionBanner.tsx`, `src/components/HomeRejectionBanner.tsx`) — pattern source for the new "Photos required" banner shape (title + body + button + theme-aware styling).
- **Phase 2 ContextualListingFlow overlay pattern** — App.tsx state flag + overlay mount between KeyboardProvider and screen tree. MediaCurationScreen mirrors the same mounting pattern.

### Established Patterns

- **Atomic-break cutover** (M1 D-02 + M2 Phase 2 D-21 + Phase 1 D-01) — Phase 3's user-side multer strip (D-13) follows the same atomic-break posture (no dual-flow window for user-side media writes).
- **Anti-spoofing grep gate** (M2 Phase 1 HF-03) — Phase 3 reuses for `actorUid` in moderationRoutes.js media endpoints. Sentinel script in CI per D-15.
- **Atomic deletion sentinel** (M1 Phase 4 `scripts/check-land-removed.sh` + Phase 2 `scripts/check-create-listing-screen-removed.sh`) — Phase 3 adds `scripts/check-property-routes-media-stripped.sh` for D-13 enforcement.
- **Backend audit-field "additive only" schema discipline** (M2 Phase 1 D-04 + Phase 4 archive lifecycle) — ModerationLog action enum extension (D-05 + Claude's Discretion `'media-delete'` if planner picks) is additive only.
- **Operator-supervised one-shot scripts** (M2 Plan 02-02 + Phase 1 D-02 + Phase 2 Plan 02-01 seed-locations-m3.js) — Phase 3 does NOT add new operator-supervised scripts (no migration needed; existing media data preserved verbatim per Phase 1 D-15 + MEDIA-08).
- **Bilingual EN+RU CI parity gate** (`scripts/check-i18n-parity.sh`) — Phase 3's +20-30 keys must pass; researcher counts the exact delta during plan-phase.
- **Pure components / pure screens** (M2 Phase 3 + Phase 2 atomic deletion) — MediaCurationScreen is a pure component (props in, callbacks out, no side effects beyond service calls).

### Integration Points

- **Backend `propertyRoutes.js` POST + PUT** — D-13 strips multer + media body fields; downstream routes are unchanged (POST/PUT still validate nested-shape body per Phase 1 D-01 cutover).
- **Backend `moderationRoutes.js`** — D-05 + D-06 add new POST + DELETE media endpoints; D-09 + D-10 add MEDIA_REQUIRED gate at /approve + edit-on-behalf flip.
- **Backend `ModerationLog.js`** — D-05 extends action enum.
- **Backend new sentinel script** — `scripts/check-property-routes-media-stripped.sh` runs in CI / `npm test` (planner picks).
- **App.tsx** — D-01 adds `isMediaCurationOpen` + `currentMediaCurationListingId` flags + overlay mount.
- **ModerationQueueScreen.tsx** — D-02 adds filter chip row above existing Listings tab FlatList.
- **PropertyDetailsScreen.tsx** — D-04 adds mod-only "needs media" banner above mod action footer; D-12 disables Approve button when photos empty.
- **`scripts/check-i18n-parity.sh`** — CI gate; Phase 3's new keys must pass.

</code_context>

<specifics>
## Specific Ideas

- **Endpoint paths:** `POST /api/moderation/listings/:id/media` (REQUIREMENTS.md MEDIA-04 verbatim) and `DELETE /api/moderation/listings/:id/media/:assetIndex` (or by URL — see Claude's Discretion). The DELETE path is a Phase 3 addition beyond the strict REQUIREMENTS.md MEDIA-04 wording — needed for D-06 incremental gallery curation UX.
- **Error codes (REQUIREMENTS.md MEDIA-07 verbatim + new):** `MEDIA_REQUIRED` (HTTP 400 — approve attempted with empty photos), `MEDIA_INVALID_TYPE` (HTTP 400 — wrong MIME), `MEDIA_INVALID_TOUR_URL` (HTTP 400 — non-https or malformed). Existing `MOD_15_RACE` (HTTP 409 — concurrent mod action) reused for media-delete races.
- **ModerationLog action enum extension:** add `'media-upload'` (and possibly `'media-delete'` per Claude's Discretion). Existing enum: `['approve','reject','edit-on-behalf','archive','unarchive','hard-delete']`.
- **Mongoose atomic update operators:** append uses `$push: { 'media.photos': { $each: newPhotoUrls } }` + `$push: { 'media.videos': { $each: newVideoUrls } }`. Delete uses `$pull: { 'media.photos': urlValue }` (or `$pull: { 'media.videos': urlValue }`). tourUrl update is `$set: { 'media.tourUrl': value }`. All wrapped in `findOneAndUpdate` for race-safety.
- **`MEDIA_REQUIRED` check shape (route-level, D-09):** placed BEFORE the atomic findOneAndUpdate in `/approve` and edit-on-behalf handlers. Pseudocode: `if (!listing?.media?.photos?.length) return res.status(400).json({ code: 'MEDIA_REQUIRED', message: '...' });` — fetches the listing first (read-only) to check photo count, then proceeds with the existing atomic transition. The fetch+check+update is NOT race-safe with concurrent media uploads (a photo could land between fetch and update), but the worst case is a 400 returned to the mod (false negative) — a re-tap succeeds. Acceptable.
- **Anti-spoofing grep gate (D-15):** `grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js` must return zero matches. Sentinel script runs in CI / `npm test`. Mirror the M2 Phase 1 HF-03 pattern verbatim. The grep regex matches `actorUid:` followed by optional whitespace and `req.body` or `req.headers` — the spoofing pattern.
- **propertyRoutes media-stripped sentinel (D-16):** `scripts/check-property-routes-media-stripped.sh` → `grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js` exits 1 (zero matches expected). Mirrors M1 Phase 4's `check-land-removed.sh` enforcement pattern.
- **MediaCurationScreen prop shape (Phase 2 D-15 mirror):** `{ listingId: string; onClose: () => void; onApproveSuccess?: () => void }`. App.tsx wires `onApproveSuccess` to refresh ModerationQueueScreen + close MediaCurationScreen + return mod to queue.
- **Approve button enabled-state logic (D-12, three surfaces):** `isApproveEnabled = listing?.media?.photos?.length > 0`. Used in:
  - MediaCurationScreen action footer (Save photos + Approve & publish buttons)
  - ModerationQueueScreen row action footer (Approve / Reject / Edit-on-behalf 3-button row)
  - PropertyDetailsScreen mod action footer (Approve / Reject + the new "Add photos" CTA banner)
- **Filter chip i18n keys:** `moderation.filter.allPending`, `moderation.filter.needsMedia`, `moderation.filter.hasMedia`. Or sub-namespace under `moderation.queue.filter.*` — planner picks based on existing key structure.
- **Banner i18n keys (D-04):** `moderation.needsMediaBanner.title`, `moderation.needsMediaBanner.body`, `moderation.needsMediaBanner.action` (CTA button label). RU+EN translations required.
- **Screen i18n keys (MediaCurationScreen):** `moderation.mediaCuration.header.title`, `moderation.mediaCuration.empty.title` + `.body`, `moderation.mediaCuration.tourUrl.label` + `.placeholder`, `moderation.mediaCuration.save.button`, `moderation.mediaCuration.approve.button`, `moderation.mediaCuration.approve.disabled.hint`. Estimated 10-15 screen keys.
- **Atomic-break tester impact window:** Phase 3 user-side multer strip (D-13) breaks any in-flight client builds that POST/PUT with multipart bodies — but Phase 2 ContextualListingFlow already shipped without media affordance, so the only breaking case is M2-era clients (TestFlight build 27 / Play Internal versionCode 30) which are ALREADY broken since Phase 1's nested-shape cutover. Phase 3 strip is a no-op for existing tester impact.
- **Backend Node version gate:** `nvm use 24` MUST appear in operator runbook for Phase 3 backend npm/node ops (memory `backend-node-version.md`). No new operator-supervised scripts in Phase 3 (no migration needed; existing media preserved per Phase 1 D-15 + MEDIA-08).
- **Test command:** `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` runs the extended supertest suite. Pre-existing flaky test from Phase 2 (`mod-archive invalid reasonCode → 400` first-run flake per `02-deferred-items.md`) is M3 carry-forward — re-open if it becomes deterministic.
- **MIME-type config (D-07):** multer `fileFilter` callback validates `file.mimetype` against allowlist. Image allowlist: `['image/jpeg','image/png','image/webp','image/heic','image/heif']`. Video allowlist: `['video/mp4','video/quicktime','video/x-m4v']`. Reject by passing `cb(new Error('Invalid file type'), false)` which propagates as 400 + `code: 'MEDIA_INVALID_TYPE'`.
- **Total payload cap (D-07 + Claude's Discretion):** multer `limits.fileSize` ~25MB per file; `limits.files` total cap of 45 (40 photos + 5 videos). Researcher/planner finalizes based on Railway ingress limits.

</specifics>

<deferred>
## Deferred Ideas

- **Presigned-URL upload pattern** — REJECTED via D-05 (overkill for 1-2 person mod team; adds 2-trip dance + S3 CORS config + new presigning logic). Re-evaluate if mod team grows OR if backend bandwidth becomes a Railway cost issue.
- **Pure URL paste (no native upload)** — REJECTED via D-05 (worse mod UX; requires mods to use external hosting tooling).
- **Replace-all media on each save** — REJECTED via D-06 (bug-prone; mod must re-send existing URLs to keep them; doesn't fit incremental curation UX).
- **Append-only with no DELETE endpoint** — REJECTED via D-06 (mistakes accumulate; mod must use raw S3/DB to recover).
- **Matterport-only allowlist regex for tourUrl** — REJECTED via D-08 (vendor lock-in at the schema layer; future-proofing favors generic https://). Future-proof: a second tour vendor (Asteroom, Cupix) needs no backend change.
- **Mongoose pre-save hook for MEDIA_REQUIRED (defense-in-depth)** — REJECTED via D-09 (atomic findOneAndUpdate doesn't run pre-save by default; switching to fetch+save loses M2 race-safety; harder to test).
- **Mongoose-only schema validator for MEDIA_REQUIRED** — REJECTED via D-09 (forces fetch+save, regresses race-safety).
- **Auto-publish when first photo uploads** — REJECTED via D-11 (no preview/review opportunity; conflicts with edit-on-behalf workflow).
- **Per-session "Publish after upload?" toggle** — REJECTED via D-11 (UI state easy to misuse).
- **Client tap-and-fail with toast (no button-disable)** — REJECTED via D-12 (every blocked approve costs a network call).
- **Leave multer wired but role-gate user-side** — REJECTED via D-13 (duplicates mod functionality; users with bad clients get 400 instead of silent ignore).
- **Leave multer + silently ignore output for non-mod actors** — REJECTED via D-13 (leaks backend storage on accidental uploads; worst of both worlds).
- **Literal `jaytap-prod-s3` access-key rotation at phase close** — REJECTED via D-14 (mirrors HF-02 mechanics but not threat model; no leak evidence; adds operator work without benefit). Re-open: if Phase 5 REL-05 audit finds evidence of key leak.
- **IAM policy split across user/mod prefixes on `jaytap-prod-s3`** — REJECTED via D-14 (backend code is single actor; policy split changes audit cleanliness only, not runtime behavior).
- **Skip anti-spoofing grep gate on the new endpoint** — REJECTED via D-15 (Phase 4.5 bug is the same threat class; cheap insurance against regression).
- **Minimal test scope (happy path only; defer everything to Phase 5)** — REJECTED via D-16 (Phase 4.5 bug snuck through with thin coverage; default scope buys regression safety net).

### Cross-phase boundary anchors (NOT Phase 3 scope)

- **ROLE-11 frontend mid-action 403 popup-recovery** — Phase 4 owns this (CARRY-01).
- **Phase 4.5 landlord-application uid-mismatch fix** — Phase 4 owns this (CARRY-02). The same anti-spoofing grep-gate pattern (D-15) carries forward.
- **v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission** — Phase 5 owns this (REL-01..REL-06). Manual mod media-curation walk on iPhone 15 Pro Max + Moto G XT2513V lives in REL-03.
- **6-step ContextualListingFlow** — Phase 2 owns (FLOW-01..FLOW-16); already shipped 2026-05-06.
- **Schema reshape to nested shape** — Phase 1 owns (SCHEMA-01..05); already shipped 2026-05-06.
- **Backend Location dictionary** — Phase 2 owns (Plan 02-01 shipped 2026-05-06).

### Out-of-scope (M3 Out of Scope per REQUIREMENTS.md + PROJECT.md)

- **Push notifications for "needs media" / approval / rejection events** — out of scope; M4+.
- **Bulk moderation actions (multi-select approve/reject/upload)** — out of scope; M4+.
- **Real-estate document verification (Avito-style)** — multi-month compliance subproject; far-future.
- **Video transcoding / thumbnail generation** — out of scope for Phase 3 ship; raw video uploaded to S3, client renders first frame OR a placeholder. Re-evaluate in M4+ if video catalog grows.
- **Multi-tour preservation in `media.tourUrl[]`** — REJECTED in Phase 1 D-12 (single-string `tourUrl` shape; mod re-attaches secondary tours as photos OR via future schema change).
- **Panoramic-photos slot in `media.*`** — DROPPED in Phase 1 D-13; mod re-attaches panoramic photos as ordinary photos in the photo grid. No separate `media.panoramic[]` field.
- **Per-asset metadata (caption, alt-text, ordering pin)** — out of Phase 3 scope. `media.photos[]` remains string array of URLs. Re-evaluate in M4+ for accessibility / SEO if a public-web port lands.
- **AsyncStorage draft persistence for in-progress mod media curation** — out of Phase 3 scope (mirrors Phase 2 D-13 rejection of draft persistence). Mod curation is short-session — no draft resume needed.
- **2GIS native map bridge** — M4+; not Phase 3 scope.
- **Firebase SDK additions in either repo** — REPO RULE per memory; not Phase 3 scope.
- **`react-navigation` migration** — out of scope (CLAUDE.md hard rule).
- **KZT + UZS currency support** — M4+ market expansion.
- **M4+ carry-forward items inherited at M2 close** — race-cell test rig; Android `gradlew clean bundleRelease` reanimated build doc; AWS IAM cross-project residual.

</deferred>

---

*Phase: 03-media-flow-inversion-admin-mod-curation*
*Context gathered: 2026-05-06*

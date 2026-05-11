# Phase 3: Media Flow Inversion (Admin/Mod Curation) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 03-media-flow-inversion-admin-mod-curation
**Areas discussed:** Mod media-curation surface, Upload mechanics & flow, MEDIA_REQUIRED enforcement & approval flow, User-side lockdown + S3 IAM rotation

---

## Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Mod media-curation surface | Where in the mod UI does media curation live? Surface placement + filter UX + default tab + PropertyDetails CTA. | ✓ |
| Upload mechanics & flow | Multipart-direct vs presigned-URL; replace vs append; tour URL validation; photo/video caps. | ✓ |
| User-side lockdown + S3 IAM rotation | How aggressively close the user-side write path; MEDIA-05 IAM rotation interpretation. | ✓ |
| MEDIA_REQUIRED enforcement & approval flow | Where the photos-required gate lives; auto-publish vs explicit; client UX on block. | ✓ |

**User selected:** All four (multiSelect).

---

## Mod media-curation surface

### Q1: Where does the mod media-curation UI live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated screen (push on tap) | New MediaCurationScreen pushed via App.tsx state flag; ~400-600 LOC. | ✓ |
| New tab on ModerationQueueScreen | Add 3rd tab alongside Listings / Locations; pushes ModerationQueueScreen 824 → ~1200+ LOC. | |
| Inline in PropertyDetailsScreen | Mod-only section above action footer; pushes PropertyDetails 1680+ LOC. | |

**User's choice:** Dedicated screen (recommended).

### Q2: How is "needs media" surfaced in the queue?

| Option | Description | Selected |
|--------|-------------|----------|
| Filter chip on existing Listings tab | All pending / Needs media / Has media chip row above the FlatList. | ✓ |
| Separate dedicated tab | 4th tab; ambiguous categorization for needs-media-AND-rejected listings. | |
| Sort-only with badges | Needs-media listings sort to top with visual badge; can't isolate. | |

**User's choice:** Filter chip on existing Listings tab (recommended).

### Q3: Does the default landing tab change for mods at queue open?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep default = Listings | Mod opens queue → lands on Listings tab same as today (M2). | ✓ |
| Smart default by busiest queue | Picks highest-count queue; adds flicker risk. | |

**User's choice:** Keep default = Listings (recommended).

### Q4: Does PropertyDetailsScreen surface a mod CTA for "needs media" listings?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — banner with deep-link | Banner above mod action footer; "Add photos" button opens MediaCurationScreen. | ✓ |
| No — surface in queue only | Mod must use queue's filter/CTA path. | |

**User's choice:** Yes — banner with deep-link (recommended).

---

## Upload mechanics & flow

### Q1: How does the mod upload photos/videos to S3?

| Option | Description | Selected |
|--------|-------------|----------|
| Multipart-direct via backend multer-s3 | Reuse existing S3Client + multer-s3 setup; lowest migration cost. | ✓ |
| Presigned-URL pattern | Backend issues presigned PUT URLs; client uploads direct to S3; adds 2-trip dance + CORS config. | |
| Pure URL paste — no native upload | Mod pastes hosted URLs; simplest backend; worst UX. | |

**User's choice:** Multipart-direct via backend multer-s3 (recommended).

### Q2: How is the current photo/video set updated on each save?

| Option | Description | Selected |
|--------|-------------|----------|
| Append + per-asset DELETE | Each POST appends; separate DELETE removes one asset. | ✓ |
| Replace-all on each save | POST takes full intended set; bug-prone. | |
| Append-only (no DELETE in Phase 3) | No delete endpoint; mistakes accumulate. | |

**User's choice:** Append + per-asset DELETE (recommended).

### Q3: Tour URL validation — what's enforced server-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Matterport-only allowlist regex | Backend regex requires Matterport embed pattern. | |
| Generic https:// URL validation | Accept any well-formed https URL; vendor-agnostic. | ✓ |
| No validation — store as-is | Maximum flexibility; zero guardrails. | |

**User's choice:** Generic https:// URL validation (NOT the recommended Matterport-only option). Rationale captured: future-proof for second tour vendor; placeholder text + i18n hint preserve Matterport mental default.

### Q4: Photo/video upload limits per request?

| Option | Description | Selected |
|--------|-------------|----------|
| Photos 40 max, videos 5 max + MIME validation | Carry over current multer limit; cap videos separately. | ✓ |
| Photos unlimited, videos 5 max | Drop photo cap; mod's discretion. | |
| Photos 20, videos 3 (tighter caps) | Lower than current; might hurt hospitality listings. | |

**User's choice:** Photos 40 / videos 5 + MIME validation (recommended).

---

## MEDIA_REQUIRED enforcement & approval flow

### Q1: Where is the photos-required gate enforced server-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Route-level in /approve only | Single, traceable enforcement point; matches M2 race-safety pattern. | ✓ |
| Route-level + Mongoose pre-save hook | Belt-and-suspenders; harder to test; complicates atomic update. | |
| Mongoose-only schema validator | Forces fetch+save; loses race-safety. | |

**User's choice:** Route-level in /approve only (recommended).

### Q2: Approve flow on the MediaCurationScreen — one-shot or explicit?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit two-step | Save photos + separate Approve & publish buttons. | ✓ |
| Auto-publish when first photo uploads | First successful upload auto-fires /approve. | |
| Toggle: "Publish after upload?" checkbox | Per-session toggle; UI state easy to misuse. | |

**User's choice:** Explicit two-step (recommended).

### Q3: Does the edit-on-behalf path (M2 MOD-14) also enforce MEDIA_REQUIRED?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same 400 if flipping to live without photos | Keeps invariant consistent across all mod-action paths. | ✓ |
| No — edit-on-behalf preserves unconditional flip-to-live | Defeats the invariant. | |

**User's choice:** Yes — same 400 (recommended).

### Q4: Client-side UX when approval is blocked by MEDIA_REQUIRED?

| Option | Description | Selected |
|--------|-------------|----------|
| Disable Approve button + inline reason | Client gates the UX; server gates as trust boundary. | ✓ |
| Allow tap, show 400 toast | Every blocked approve costs a network call. | |
| Both — disable AND toast on stale state mismatch | Belt-and-suspenders. | |

**User's choice:** Disable Approve button + inline reason (recommended). Server still returns 400 as trust boundary.

---

## User-side lockdown + S3 IAM rotation

### Q1: How aggressively do we close the user-side media write path?

| Option | Description | Selected |
|--------|-------------|----------|
| Strip multer entirely from POST/PUT /api/properties | Atomic-break; tightest threat model. | ✓ |
| Leave multer wired but role-gate (mod/admin only) | Duplicates functionality across two endpoints. | |
| Leave multer + silently ignore for non-mod | Worst of both worlds. | |

**User's choice:** Strip multer entirely (recommended).

### Q2: S3 IAM rotation interpretation — what does "symmetric to HF-02" mean concretely?

| Option | Description | Selected |
|--------|-------------|----------|
| API surface removal IS the rotation | Per memory `aws-iam-jaytap-prod-s3.md`, users have no personal S3 creds; surface removal in propertyRoutes IS the user-rights revocation. | ✓ |
| Rotate jaytap-prod-s3 access keys at phase close | Mirrors HF-02 mechanics but not threat model; no leak evidence. | |
| Tighten IAM policy to mod-actor scope | Audit cleanliness only, not runtime behavior. | |

**User's choice:** API surface removal IS the rotation (recommended). Re-open condition documented: literal rotation if Phase 5 REL-05 finds key-leak evidence.

### Q3: Anti-spoofing grep gate for the new endpoint?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same gate pattern as M2 HF-03 | Memory `phase45-landlord-application-uid-mismatch-bug.md` is same threat class. | ✓ |
| Skip — trust verifyFirebaseToken middleware | The exact assumption that broke in Phase 4.5. | |

**User's choice:** Yes — same gate pattern (recommended).

### Q4: Test scope for Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Default expectation: cover the new endpoint + invariants | Supertest + RN smoke + sentinels. | ✓ |
| Minimal — happy path only; defer to Phase 5 | Phase 4.5 bug snuck through thin coverage. | |

**User's choice:** Default expectation (recommended).

---

## Claude's Discretion

Areas the user explicitly left to Claude / planner discretion (captured in CONTEXT.md `<decisions>` §"Claude's Discretion"):

- Property.media schema strictness (Mongoose-level URL validator on tourUrl).
- DELETE endpoint addressing — index vs URL vs Mongo subdocument _id (recommend by URL with `$pull`).
- S3 client + multer config sharing module (recommend extract to `src/config/s3.js`).
- RN file picker library choice (recommend `react-native-image-picker`; verify peer compat with reanimated@4.3.0 + Fabric).
- Banner copy + MediaCurationScreen empty-state copy (planner finalizes).
- MIME-type allowlist refinement (planner finalizes based on RN file picker output).
- Total per-request payload cap (planner finalizes vs Railway ingress limits).
- ModerationLog `before`/`after` diff shape for media-upload (recommend count-only).
- MediaCurationScreen role gating (mirror existing useRole guard pattern).
- DELETE endpoint also writes ModerationLog (recommend yes; planner picks `'media-upload'` reuse vs new `'media-delete'` enum value).

---

## Deferred Ideas

Cross-phase boundary anchors and out-of-scope items captured in CONTEXT.md `<deferred>` section:

- Cross-phase: ROLE-11 (Phase 4), CARRY-02 (Phase 4), v3.0.0 release (Phase 5), 6-step flow (Phase 2 — shipped), schema reshape (Phase 1 — shipped), Location dictionary (Phase 2 — shipped).
- Rejected alternatives: presigned-URL pattern, replace-all media, Matterport-only regex, Mongoose-only validator, auto-publish, role-gated multer, literal IAM key rotation, IAM policy split, minimal test scope.
- Out-of-scope: push notifications, bulk moderation, document verification, video transcoding, multi-tour, panoramic slot, per-asset metadata, AsyncStorage draft persistence, 2GIS bridge, Firebase SDK, react-navigation, KZT/UZS currencies.

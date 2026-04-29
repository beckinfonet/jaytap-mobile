# Pitfalls Research — M2 "Roles & Moderation"

**Domain:** Adding three-role permission system + listing moderation lifecycle + edit-on-behalf to an existing React Native 0.84 mobile app with a separate Railway/Express backend, MongoDB role authority, Firebase Identity Toolkit REST auth (no Firebase SDK in repo).
**Researched:** 2026-04-29
**Confidence:** HIGH (most pitfalls grounded in this codebase's CONCERNS.md, RETROSPECTIVE.md, and M1 D-22 Path B accepted-risk record; JWKS verification specifics verified against Firebase official docs + Auth0 jwks-rsa docs)

> **Scope note.** This document is M2-specific. Generic mobile-dev lore (e.g., "use HTTPS", "don't log passwords") is omitted. Each pitfall pairs with a concrete spec/plan line that prevents it. The 15 questions in the brief are answered in-line; cross-reference the index at the bottom.
>
> **Replaces:** the M1-era PITFALLS.md (2026-04-22) which targeted v1.0.4 polish issues. M1's pitfalls are now archived in `.planning/milestones/v1.0.4-*` if needed for reference.

---

## Critical Pitfalls

### Pitfall 1: Client-side gating treated as the security boundary (the GATE-05 D-22 trap, doubled)

**What goes wrong:**
M1 already has `useRole()` / `can(action)` / `<Gated>` on the client and a `canFromUser` service-layer guard, but D-22 Path B explicitly accepted that Railway does NOT independently verify roles for `PATCH /properties/:id/verifications` and the tour/panoramicPhotosUrl writes. In M2 the surface area explodes: every moderation endpoint (`approve`, `reject`, `flag`, `archive`, `edit-on-behalf`, `promote-user`, `add-admin`) is a new bypass vector if the same posture leaks forward. A motivated user with a valid Firebase uid + `curl` flips any listing to `live`, archives a competitor's listing, or promotes themselves to admin.

**Why it happens:**
1. The forward-compat `useRole()` shim is convenient — it's tempting to ship "the client knows the role" and call it done.
2. M1 explicitly carved D-22 Path B as **accepted risk**; the M2 plan can drift into "we already gate it on the client" if the Railway team is unresponsive (same backend coordination dependency that gated M1).
3. CONCERNS.md "Firebase uid used as sole auth" — every M2 endpoint inherits this baseline if no one adds an enforcement audit step.

**How to avoid:**
- **REQ ROLE-04 must list every mutating endpoint as a numbered acceptance criterion**, not "hardens the backend". Concrete enumeration:
  1. `POST /properties` (status defaults to `pending`, owner-only, body cannot set status directly)
  2. `PATCH /properties/:id` (owner-only for own listing; mod/admin can edit any but writes go through `edit-on-behalf` audit path)
  3. `PATCH /properties/:id/verifications` (admin-only — closes M1 GATE-05)
  4. `PUT /properties/:id` tours/panoramicPhotosUrl writes (admin-only — closes M1 GATE-05)
  5. `POST /properties/:id/approve` (mod+admin)
  6. `POST /properties/:id/reject` (mod+admin, body requires `reasonCode` + optional `reasonNote`)
  7. `POST /properties/:id/flag` (mod+admin)
  8. `POST /properties/:id/archive` (owner of listing OR mod+admin)
  9. `DELETE /properties/:id` (admin-only)
  10. `PATCH /users/:id/role` (admin-only; **explicitly cannot set self**)
  11. `PATCH /users/me` (user can edit profile fields, **role field MUST be filtered server-side from request body**)
  12. `GET /moderation/queue` (mod+admin)
- Server enforcement is the **success criterion**, not "client also gates". A test plan that calls each endpoint with three Firebase uid roles (user / moderator / admin) and asserts the 403/200 matrix.
- Pre-archive Wave-0 of any backend-touching M2 phase MUST confirm endpoint shape + Mongo schema with the Railway team (RETROSPECTIVE lesson 1 generalizes from version-codes to any backend dependency).

**Warning signs:**
- A plan body says "useRole() handles this" without a Railway endpoint audit.
- A reviewer cannot point to a curl-with-mismatched-role test that returns 403.
- The Railway team conversation is "in flight" at archive time — repeats the GATE-05 D-22 pattern.

**Phase to address:** ROLE-04 backend-enforcement phase (likely Phase 1 or 2 of M2 — must precede any UI that depends on it).

---

### Pitfall 2: JWT/JWKS verification bugs that ship dev-mode bypass to production

**What goes wrong:**
ROLE-04 implements Firebase ID token verification on Railway via standard JWT/JWKS (no firebase-admin SDK per the repo's hard rule — see PROJECT.md Key Context line 26). Common implementation defects that all silently say "verified" while accepting forged or stale tokens:

1. **No JWKS cache.** Every request hits Firebase's public x509 endpoint; Google's now-rate-limited unauthenticated JWKS endpoint will throttle, then auth fails open or thrashes.
2. **Indefinite JWKS cache.** Firebase rotates keys; cached forever means signatures stop validating after rotation, OR (worse, with permissive code) the fallback path bypasses verification entirely.
3. **Algorithm not pinned.** Library defaults that allow `none` or HS256 when token claims `alg: RS256`. Allows alg-confusion attacks.
4. **`kid` not used to select key.** Code tries every key in the set; fragile, slow, and may misvalidate against a stale key.
5. **Audience not pinned to project ID.** Tokens issued for a different Firebase project verify successfully.
6. **Issuer not pinned to `https://securetoken.google.com/<PROJECT_ID>`.** Custom-token routes accept tokens with arbitrary issuers.
7. **Clock skew zero or huge.** Zero rejects valid tokens at the 60-second boundary; huge (e.g., 5 min) opens replay window.
8. **Expired tokens accepted because the check uses `iat` instead of `exp`.** Or no check at all.
9. **`auth_time` < `disabled_at` not enforced.** A user disabled in Firebase still authenticates with their cached token.
10. **Dev-mode bypass shipped.** A `NODE_ENV !== 'production'` shortcut that accepts a fake header, left enabled because the env var didn't propagate to Railway.

**Why it happens:**
- Many tutorials (and Stack Overflow answers) demonstrate `firebase-admin.auth().verifyIdToken()` — a one-liner that does all of the above correctly. Replacing it with manual JWKS verification means re-implementing each check, and the official docs are split across multiple Firebase pages (REST verification vs. SDK verification vs. App Check).
- jwks-rsa has sensible defaults but they're not all on by default; cache + rate limiting must be explicitly configured.
- "It works in Postman" does not mean any of these checks ran — it means the happy-path token validated.

**How to avoid (concrete spec):**
- Library choice in spec: `jose` (preferred — modern, ESM, validates everything in one call) OR `jsonwebtoken` + `jwks-rsa` (legacy, more configuration). Spec must NOT say "use firebase-admin".
- Verification call asserts ALL of:
  - `algorithms: ['RS256']` — explicit allowlist, not "whatever the token says".
  - `issuer: 'https://securetoken.google.com/<FIREBASE_PROJECT_ID>'` — pinned.
  - `audience: '<FIREBASE_PROJECT_ID>'` — pinned.
  - `clockTolerance: 60` (seconds) — Firebase official recommendation.
  - `kid` lookup against JWKS, fail closed if `kid` not in set.
- JWKS client config: `cache: true`, `cacheMaxEntries: 5`, `cacheMaxAge: 6 * 60 * 60 * 1000` (6 hours — the [Firebase official docs](https://firebase.google.com/docs/auth/admin/verify-id-tokens) cap), `rateLimit: true`, `jwksRequestsPerMinute: 5`.
- After JWT verification: load Mongo user record by `uid`; if `disabled === true` OR `roleRevokedAt > token.iat`, return 401. **This is M2's TTL-on-revocation answer** (see Pitfall 4).
- **No dev bypass.** Every environment runs the same verifier. Local dev uses a real Firebase test project's tokens; mock auth lives in test fixtures (`jest.mock('../middleware/verifyToken')`), not in `if (process.env.NODE_ENV)` runtime branches.
- Acceptance test matrix on Railway side: 9 cases — `(valid|expired|tampered) × (admin|moderator|user)` — with golden tokens captured from a Firebase test project and stored in `__tests__/fixtures/`. Each case asserts response code.

**Warning signs:**
- Code review sees `process.env.NODE_ENV` near auth code — investigate.
- Verifier returns the decoded payload but doesn't log "verified" with `kid` and `iss` — silent success suspicious.
- Token rotation testing skipped because "we tested it once and it worked".

**Phase to address:** Phase 1 or 2 of M2 (backend foundation) — must land before any UI that calls a role-protected endpoint.

---

### Pitfall 3: Privilege escalation via permissive PATCH /users/me

**What goes wrong:**
The most common single bug in role systems: the existing "user updates their own profile" endpoint accepts `{ name, phone, userType: 'admin' }`, and the server merges it without filtering. The user promotes themselves to admin in one curl. Variations:
- Admin-only `/users/:id/role` exists, but `/users/me` still merges the role field because dev forgot.
- Moderator can hit `/users/:id/role` with their own ID and demote/promote (no "cannot self-modify" check).
- Moderator can promote themselves to admin via `/users/:id/role` because the endpoint only checks "is mod or admin", not "is admin".

**Why it happens:**
- Existing `PATCH /users/me` predates roles; the field allowlist was never reviewed.
- Mongoose's default `findByIdAndUpdate(id, body)` happily merges any field present on the schema.
- Splitting "edit profile" from "edit role" feels redundant during implementation — they end up sharing one endpoint with a role guard at the wrong level.

**How to avoid:**
- **`PATCH /users/me` MUST use an explicit field allowlist** at the controller level: `pick(body, ['name', 'phone', 'preferredLanguage', 'avatarUrl'])`. Anything else is silently dropped. Spec it as a numbered acceptance criterion.
- **`PATCH /users/:id/role` is admin-only** (not mod-or-admin) AND rejects when `req.user.uid === req.params.id` (no self-edits, including admin demoting themselves — last-admin lockout is a real failure mode).
- **`POST /users` (signup) cannot accept `userType`.** Default is `'user'`. Server-set, not client-set.
- Express test: hit each endpoint with `{ userType: 'admin' }` in the body as a regular user, assert role unchanged in DB.
- A separate "promote moderator to admin" path that exists only on the admin role-management screen and routes through `PATCH /users/:id/role` with `{ userType: 'admin' }` — same endpoint, but admin-gated.

**Warning signs:**
- A controller does `User.findByIdAndUpdate(id, req.body)` without `pick`/`omit` filtering.
- "Just trust the role guard" — guards on the WRONG endpoint don't filter the WRONG field.
- "Admin-or-moderator can manage roles" appears in any spec.

**Phase to address:** Same phase as backend role enforcement (Phase 1 or 2). Field allowlist is a 5-minute fix that prevents the worst-case M2 bug.

---

### Pitfall 4: Stale role cache — promoted user keeps showing as `user` for hours

**What goes wrong:**
Admin promotes a user to moderator in the role management screen. The new moderator's app still says "user" because:
- `AuthContext.user.backendProfile.userType` is loaded once at login and cached in AsyncStorage.
- `useRole()` reads from `AuthContext` — no refresh trigger on backend role change.
- Firebase ID token lifetime is 1 hour; even after token refresh, the Railway role lookup cache can be stale.
- Demoted moderator keeps moderator UI visible until they restart the app.

This is worse than just confusing UX — a demoted moderator who still has a valid token can keep approving/rejecting listings until their app restarts.

**Why it happens:**
- The repo doesn't have a push notification SDK (CONCERNS.md "No push notifications", line 305) — there's no out-of-band channel to invalidate the client cache.
- AsyncStorage is loaded once at app start.
- Firebase ID tokens auto-refresh every hour but the backend role lookup is independent and may have its own cache.

**How to avoid:**
- **Server-side: role TTL on every request, not just at login.** Railway middleware loads `userType` from Mongo on every authenticated request OR from a 60-second in-memory cache keyed by uid. Demotion takes effect within 60 seconds at the API.
- **Client-side: refresh role on focus + on auth-state events.**
  - `AuthContext.refreshProfile()` exists; M2 calls it from `App.tsx` on `AppState 'active'` transitions.
  - Pull-to-refresh on listing screens implicitly re-runs the API request, which re-runs auth middleware → fresh role.
- **Server-side: `roleRevokedAt` timestamp on user record.** When admin changes a role, set `roleRevokedAt = now`. JWT middleware rejects any token with `iat < roleRevokedAt`, forcing the client to re-auth. (App responds to 401 by clearing cache and routing to login.)
- **Force re-auth on demotion.** When admin demotes a user, server pushes a flag the next time the user's app pings; on next request, return 401 with `code: 'role-revoked'`; client logs out + shows toast in user's preferred language.
- Acceptance: with two devices logged in (admin + moderator), admin demotes moderator → within 60 seconds, moderator's next API call returns 401 OR re-fetches role and UI updates without restart.

**Warning signs:**
- Spec says "role is loaded at login" with no refresh path.
- No test for "promote, immediately use".
- Server-side role lookup happens at a non-middleware layer (e.g., inside a controller) and other endpoints skip it.

**Phase to address:** Backend-enforcement phase + AuthContext-refresh phase. The 60-second TTL is the spec'd answer.

---

### Pitfall 5: Race conditions in moderation queue (two mods act on same listing)

**What goes wrong:**
Two moderators open the queue. Both see listing X. Mod A taps Approve at 14:32:01.4. Mod B taps Reject at 14:32:01.7. Either:
- Last-write-wins: listing ends up rejected even though it was approved 0.3s earlier; mod A's UI says "approved"; the owner gets a rejection notification with no context.
- Both succeed and create two state transitions; the audit trail shows the listing went `pending → live → rejected` in 0.3s.
- Mod B's request fails with a confusing 500 because the controller doesn't handle "listing already in non-pending state".

**Why it happens:**
- Mongo's `findByIdAndUpdate` without a status precondition will overwrite.
- No "claimed by" indicator in the queue UI — moderators don't see each other.
- Optimistic UI shows "approved" instantly without server confirmation.

**How to avoid:**
- **Conditional update on the server.** All transition endpoints use `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status: 'live', moderatedBy, moderatedAt } })`. If `null` returned, the listing was no longer pending — return 409 Conflict with the current status.
- **Client handles 409 explicitly.** Toast: "This listing was already moderated by another reviewer." + refetch queue. Localized EN+RU.
- **Optimistic UI is opt-in, not default.** When a moderator taps Approve: button enters loading state, disables, server response triggers either success-and-remove-from-queue OR error-and-keep-with-warning. No "instant remove" before server ACK.
- **Optional: `claimedBy` field with 5-minute TTL** for explicit pessimistic locking when the queue grows large. Out of scope for M2 if the queue is small (< 50 pending at peak); revisit if multiple mods report collisions.
- Audit log entries are append-only; even a 409 attempt is logged so we can count race incidents.

**Warning signs:**
- Spec doesn't mention 409 / conflict handling.
- "We'll add it if it becomes a problem" — when there are 2 moderators, one collision is a daily occurrence.
- The reject endpoint takes a `reason` but the approve endpoint takes nothing — symmetric error handling missing.

**Phase to address:** Moderation actions phase + Moderation Queue UI phase (paired).

---

### Pitfall 6: Audit trail blind spots — moderator edits listing, no record

**What goes wrong:**
Moderator edits an owner's listing (typo fix, off-color photo removed, contact info corrected) via the `edit-on-behalf` flow. No audit record. Owner logs in next morning, sees changed data, has no way to know what changed or why. Support inquiry comes in. We have no answer. Owner accuses us of "tampering with their listing".

The full-fidelity solution is per-field versioning, which is out of scope for M2 (PROJECT.md doesn't list it). The minimum that prevents future grief:

**Why it happens:**
- "We're not building Wikipedia" → audit gets descoped.
- The existing `PATCH /properties/:id` endpoint just updates the doc; adding history is "next milestone".
- No one wants to design a versioning schema during M2 crunch.

**How to avoid (minimum-viable audit):**
- **Append-only `moderationLog` collection.** One document per moderation action with shape:
  ```
  { _id, listingId, actorUid, actorRole, action: 'approve'|'reject'|'flag'|'archive'|'edit-on-behalf'|'role-change',
    fromState, toState, reasonCode?, reasonNote?, fieldsChanged?: string[], at: Date }
  ```
- For `edit-on-behalf`: record `fieldsChanged` (just the keys, not before/after values — that's full versioning) so an owner can be told "the moderator edited title, description, and photos on 2026-05-03". Owner can request the actual diff via support.
- For `approve`/`reject`/`flag`/`archive`: record reasonCode (enum: e.g., `not-bishkek`, `incomplete-info`, `prohibited-content`, `duplicate`, `policy-violation`, `other`) + free-text `reasonNote` (user's preferred language at action time).
- For role changes: record actor + target + from/to role.
- **Immutability.** No update or delete on `moderationLog`. Mongo TTL: never. Backup retention: forever.
- Owner-facing UI: a "History" tab on the listing detail (visible to owner + mod + admin) renders moderationLog entries chronologically with localized labels. Stub for M2 if time-pressed; the data captures forward-fits the future UI.

**Warning signs:**
- Spec mentions "approve" but doesn't say "and append to moderationLog".
- `edit-on-behalf` reuses `PATCH /properties/:id` with no log hook.
- "We'll add audit later" — later never comes; first owner complaint is the wakeup call.

**Phase to address:** Moderation actions phase. The schema is 8 lines of TypeScript; no UI required for M2 ship (data-only is sufficient).

---

### Pitfall 7: Owner-side communication failure — listing rejected, owner has no idea why or in what language

**What goes wrong:**
Listing rejected. Possible failure modes, all observed in similar systems:
1. Owner sees `status: rejected` in their listing list with no explanation. Submits identical listing again. Cycle repeats.
2. Rejection reason exists but is shown only on Home screen banner; owner navigates straight to Listing Detail and never sees it.
3. Push notification fires but `App.tsx` deep-link handler is stubbed for the new `notification-property-rejected` URL — tapping the notification opens Home instead of the rejected listing.
4. Rejection reason is hardcoded English ("Incomplete information") for a Russian-locale user.
5. Reason is in the moderator's locale at action time, not the owner's locale at view time — moderator wrote in EN, owner is Russian-only.
6. Rejection note contains the moderator's name → privacy concern (do we expose moderator identity to owners?).

**Why it happens:**
- The reject endpoint exists; the owner-facing rendering is forgotten.
- "We'll just send a push" — but push notifications aren't even in M2 scope per PROJECT.md.
- Bilingual gotcha: which language is the rejection in? Author-time vs. view-time decision was never made.

**How to avoid:**
- **Reason is a structured `reasonCode` enum, not free text.** The 6-ish enum values (`not-bishkek`, `incomplete-info`, `prohibited-content`, `duplicate`, `policy-violation`, `other`) are translated to EN+RU in the locale tables. Owner sees the right language regardless of what the moderator's UI looked like.
- **Optional `reasonNote` (free text) is shown verbatim** with a UI hint that it may not be in the user's language. Moderator UI nudges them to write in the owner's language (visible from the listing data) or use the enum codes for clarity. M2 acceptance: 80% of rejections use enum-only.
- **Three surfaces for the rejection message** so owners can't miss it:
  1. Listing Detail screen — full reason banner at top, dismissible.
  2. Owner Listings screen — `pending`/`rejected`/`live`/`archived` chip on each card.
  3. Persistent notification banner on Home (until owner views the listing) — uses existing notification-banner pattern if it exists, else stubbed for M2.
- **Push notifications explicitly out of scope for M2** unless added (CONCERNS.md "No push notifications" — adding push is a separate effort with its own pitfalls). Spec records this as a deliberate descope; owners discover rejections at next app open.
- **Moderator identity NOT exposed to owners.** Audit log has `actorUid`, but owner-facing UI says "Reviewed by JayTap moderator" generically.

**Warning signs:**
- Spec has `reject(listingId, reason)` with `reason` typed as `string` — instant red flag.
- No locale parity check for reason codes.
- "Owner just sees status=rejected" in any wireframe.

**Phase to address:** Moderation actions phase (server side: enum + structured shape) + Owner UI phase (rendering on three surfaces).

---

### Pitfall 8: App.tsx state-machine pitfalls — adding 5+ new flags reintroduces M1 Phase 1 nav bugs

**What goes wrong:**
M2 adds at least these new boolean flags to `App.tsx`:
- `showModerationQueue`
- `showRoleManagement`
- `showRejectionReasonModal`
- `showArchiveConfirmModal`
- `showEditOnBehalfWarning`
- `selectedQueueItemId`
- `editOnBehalfMode` (boolean OR `'mod-edit' | 'owner-edit' | null`)

CONCERNS.md High-severity item "App.tsx god-file (941 lines)" already flags 27 useState declarations. Adding 5–7 more reintroduces:
- Stale boolean traps (the exact class M1 Phase 1 root-caused: `hideMainStackUnderOverlay` + keep-alive).
- Stacking-order ambiguity (moderation queue overlay + reject modal — which is on top? what about pointerEvents on the underlying queue?).
- Back-button handler dependency-array bloat (already 19+ deps per CONCERNS.md "Android back-handler useEffect with 19 dependencies").
- Tab keep-alive truth-table breakage (`showHome` depends on every other show* being false; one new flag missed = silent regression).

**Why it happens:**
- Path of least resistance: "add a useState, add a conditional render".
- M1 Phase 1's discipline (derive don't store; pointerEvents belt-and-suspenders) was applied locally to the bug fix but not as a permanent rule.
- M2 implementer might be a different session of Claude that doesn't see M1 Phase 1's lessons unless they're encoded in the spec.

**How to avoid (encode in spec, not aspiration):**
- **OVERLAY_FLAGS-style derivation.** Add ALL new overlays to the existing M1 `OVERLAY_FLAGS` derived constant rather than to ad-hoc isVisible checks. One source of truth for "is any overlay up".
- **Stable identity for moderation queue overlay.** Render with `key={selectedQueueItemId ?? 'queue'}` so transitions between queue items don't leak component state.
- **`pointerEvents` belt-and-suspenders on every new overlay** — `pointerEvents="auto"` on the active overlay's root, `pointerEvents="none"` on the underlying main stack when overlays are up. (This is M1 Phase 1's exact fix; carry the rule forward.)
- **Derive don't store.** `showMainStack = OVERLAY_FLAGS.every(f => !f)`. Don't add a `setShowMainStack(false)` setter.
- **Back-handler discipline.** Don't add 7 new dependencies to the existing 19-dep useEffect. Use a ref-based pattern (or a `useReducer` for navigation state) — refactor to ref-driven handler if dep array would exceed 25.
- **Discrete state, not booleans.** `moderationOverlay: 'closed' | 'queue' | 'detail' | 'rejecting' | 'editing'` as a single discriminated union beats 5 booleans. Sketch the state machine in 02-CONTEXT.md before writing code.
- **App.tsx LOC budget.** M1 ended at ~941 LOC. M2 spec sets a budget: M2 phases that touch App.tsx must end at ≤ 1100 LOC OR carve a `ModerationOverlayHost` sub-component. Hard ceiling = 1100; soft ceiling = 1050.

**Warning signs:**
- A plan adds 3+ new useState lines to App.tsx without touching `OVERLAY_FLAGS`.
- Back-handler dep array grows past 25.
- "It works on my device" — same words as the bottom-nav bug pre-M1.

**Phase to address:** Each M2 phase that touches App.tsx; the discipline is cross-cutting. Add as a CONVENTIONS.md amendment.

---

### Pitfall 9: Migration / backward-compat — existing listings without `status`, users without `userType`

**What goes wrong:**
Mongo currently has listings that predate the `status` field. After M2 deploys:
- Listings without status → invisible in Owner Listings (filter assumes the field exists)?
- Listings without status → all show as `pending` and clutter the moderation queue?
- Listings without status → treated as `live` and bypass moderation?

Same for users without `userType`:
- Existing users lack `userType` → `useRole()` returns `undefined`?
- `can('approve')` returns `false` correctly, OR throws because of optional-chain bug?
- Admin who was on the M1 hardcoded allowlist now has no `userType: 'admin'` in Mongo — they LOSE admin access at M2 cut.

PROJECT.md "Out of Scope" says **"Migration tooling for existing listings — No production listings exist (confirmed); all current data is mock. Clean slate."** This is great for listings but does NOT cover users — users do exist (M1 shipped to TestFlight + Play Console with the existing user base).

**Why it happens:**
- "Clean slate" gets generalized from listings to everything.
- Default-on-read behavior is implementation-dependent: `user.userType ?? 'user'` is one line nobody writes.
- The hardcoded admin email allowlist is an implicit migration that nobody plans because it "just works" until M2.

**How to avoid:**
- **Server defaults on read.** Mongoose schema defaults: `status: { type: String, default: 'live' }` for existing listings (clean slate is real for listings — accept M1's claim). For users: `userType: { type: String, enum: ['user','moderator','admin'], default: 'user' }`.
- **Listings: explicit clean-slate assertion in M2 Wave-0.** Run a query in pre-archive: `db.properties.countDocuments({ status: { $exists: false } })` should equal whatever count is in production (confirmed mock-only). If non-zero, decide: backfill to `live` (showcase intent) or `pending` (force moderator review).
- **Users: explicit migration plan, NOT clean slate.**
  - Wave-0 of ROLE-04: `db.users.find({ email: { $in: [<M1 hardcoded allowlist>] } })` — set `userType: 'admin'` on those documents BEFORE M2 ships. This single migration step is the bridge from M1 hardcoded allowlist to M2 server-verified roles. Missing it = the project owner can't promote anyone after launch (because they're not admin themselves).
  - All other users default to `userType: 'user'` via the schema default.
- **Client defaults on read.** `useRole()` already handles "no role" via the M1 forward-compat shim — verify with a test.
- **Server endpoint defaults.** Every list endpoint: filter `{ status: { $in: ['live'] } }` for renters, `{ status: { $in: ['live', 'pending', 'rejected', 'archived'] } }` for owners viewing own. Don't rely on the listing always having a status — make the query exhaustive.

**Warning signs:**
- Wave-0 migration list omits "ensure admins exist in Mongo".
- Tests use fresh users only — never a user record without `userType`.
- "Clean slate" is repeated without distinguishing listings vs. users.

**Phase to address:** Wave-0 of ROLE-04 backend phase. Single Mongo update script.

---

### Pitfall 10: Moderation queue UX traps — double-action, rage-tap, lost state on backgrounding

**What goes wrong:**
The Moderation Queue is a high-velocity screen — moderators may approve/reject 50+ listings in a sitting. Common UX failures:
1. **Double-tap Approve** because the first tap had no immediate feedback → two state transitions, two audit entries.
2. **Rage-tap reject** on the wrong listing because no confirmation dialog and the previous listing scrolled off-screen.
3. **App backgrounds mid-edit** (push notification, OS interrupt) → on resume, moderator's draft rejection note is lost.
4. **Endless scroll without "claimed by" indicator** — moderator scrolls past 30 already-handled-by-someone-else listings, frustrating.
5. **Stale queue list** — listing X was deleted/archived 30 seconds ago; moderator taps Approve; gets 404; doesn't understand.
6. **Moderator's filter state** (e.g., "show only Hospitality") lost on background → resume.

**Why it happens:**
- Moderation UX is built once with happy-path flow; edge cases discovered when moderators complain.
- Mobile-specific: app backgrounding is invisible to standard "submit form" testing.
- The queue is a list-screen; the existing patterns (pull-to-refresh, FlatList) don't natively communicate "this listing changed under you".

**How to avoid:**
- **Approve has no confirm; Reject ALWAYS confirms** with reason picker. Approve is reversible-via-revoke; Reject sends a notification to the owner — high cost of mistakes.
- **Action buttons disable while pending.** Loading spinner replaces button label. Re-enables on response (success → remove from queue with animation; error → re-enable + toast).
- **409 Conflict handling per Pitfall 5.** Moderator who lost the race sees a localized toast and the queue refetches.
- **Rejection reason draft persisted to AsyncStorage** keyed by `listingId` until the action succeeds OR the moderator explicitly cancels. App backgrounded → resumed → draft restored. AsyncStorage cleanup on success.
- **Pull-to-refresh on the queue.** Cheap hack for staleness; a poll every 30 seconds while screen is foregrounded is acceptable for M2 (battery cost minimal because mod-screens are short-lived). Spec notes it as v1 approach; socket-driven invalidation is M3.
- **No optimistic remove from queue.** Listing remains visible in `pending` state with a "submitting…" overlay until server confirms; on success, slides out with animation.
- **Filter state stored in component state, restored from AsyncStorage on mount.**
- **Moderator self-prevention: long-press to undo last action within 30 seconds** for approve actions. Spec stretch — descope if Wave-2 QA flags time pressure.

**Warning signs:**
- Spec says "Approve and Reject buttons" with no mention of loading state or confirmation.
- No mention of conflict (409) or 404 handling.
- No mention of background/foreground state preservation.

**Phase to address:** Moderation Queue UI phase. Double-tap prevention is a 5-line fix; reason draft persistence is 20 lines.

---

### Pitfall 11: Archive vs Delete confusion (owner picks wrong button, can't recover)

**What goes wrong:**
PROJECT.md scopes both archive (owner-driven + mod/admin-driven) AND delete (admin-only inferred from CONCERNS.md). UI scenarios:
- Owner sees "Archive" and "Delete" buttons next to each other → taps Delete → listing gone, no undo, owner contacts support.
- Owner archives, expecting it to be findable later, but the Archived listings tab/filter doesn't exist in M2 → owner thinks they deleted it.
- Mod-archive vs admin-delete confusion at the data layer: archive sets `status: 'archived'`; delete sets `deletedAt: <date>` AND `status: 'archived'`? Or delete actually removes the document? Schema choice matters for restore.
- Hard delete + foreign keys: chats, appointments, favorites referencing the deleted listing → broken UI ("Property not found" cards in users' chat history).

**Why it happens:**
- "Archive" and "Delete" sound similar to non-power users.
- Soft-delete vs hard-delete decision is made implicitly during implementation rather than explicitly during design.
- Existing chat/favorites/appointment tables have no orphan handling.

**How to avoid:**
- **Owner-side: Archive only. No Delete button on owner UI.** If owner wants their data gone, they go through Account Settings → Delete Account (existing flow, soft-deletes everything). Listing-level deletion is admin-only.
- **Visual distinction.** Archive is a secondary/grey action ("Hide from public — you can restore later"). Microcopy localized EN+RU. Confirmation dialog: "Archive this listing? It will be hidden from buyers/renters but you can restore it from your Owner Listings."
- **Archive is reversible via owner.** Owner Listings has an `Archived` filter chip; archived listings show "Restore" button → sets status back to `live` (or `pending` if M2 chooses to re-moderate; spec the choice).
- **Delete is hard-delete, admin-only, with a 30-day soft-deletion window first.** Set `deletedAt`, status `archived`, then a server cron or manual purge after 30 days. Reversible in those 30 days. Out of scope for M2 if the cron is too much; spec the soft-delete and skip the cron.
- **Orphan handling.** Chats and favorites referencing a deleted listing show "This listing is no longer available" gracefully (existing pattern from CONCERNS.md "Property data shape trusts backend" — make the failure mode explicit).
- **Archive on hospitality vs archive on residential is the same op** — no special-casing.

**Warning signs:**
- Owner UI mocks have both Archive and Delete buttons.
- Delete is implemented as hard-delete with no soft-delete window.
- No spec for what archived listings look like to owners.

**Phase to address:** Archive feature phase (probably one of the last M2 phases since it's lower-risk).

---

### Pitfall 12: Bilingual gotchas in moderation flows

**What goes wrong:**
EN+RU parity is a JayTap convention (CLAUDE.md "i18n: EN + RU parity required for every new UI string"). Moderation is the largest single addition of strings to the locale tables since M1. Failure modes:
1. **Moderator action labels in EN; owner-facing rejection in RU only** — moderator UI built EN-first, owner-facing notifications built RU-first; both ship without parity check.
2. **Rejection reason enum values translated** but moderator's free-text `reasonNote` is in moderator's UI language → owner can't read.
3. **Mismatched plurals.** "1 listing pending" / "5 listings pending" in EN vs. Russian's three plural forms (singular / few / many — `1 объявление` / `2 объявления` / `5 объявлений`).
4. **Date/time formatting differences.** Moderation timestamps shown as "2 hours ago" in EN, but Russian needs "2 часа назад" with proper case (`2 часа` not `2 час`).
5. **Status enum labels.** `pending`, `live`, `rejected`, `archived` need short Russian equivalents that fit in chip widths.
6. **Role labels.** `admin`, `moderator`, `user` → `администратор`, `модератор`, `пользователь` — first two are long in Russian; UI must accommodate.
7. **Modal copy that breaks.** Confirmation dialogs longer in Russian than EN (typical 1.2–1.5x expansion); buttons wrap; layout breaks.

**Why it happens:**
- Translation is treated as last-step polish rather than acceptance criterion.
- Plurals require ICU MessageFormat or equivalent; if the project uses simple key-value JSON locales, plurals are hand-rolled and wrong.
- M1's locale tables added 365 keys to en.json/ru.json (HOSP-09); M2 will add 50–100 more — the volume invites mistakes.

**How to avoid:**
- **Locale parity gate.** Existing M1 pattern probably has a CI check for key parity (count keys in en.json vs ru.json — if different, fail). If not, add it as part of M2 Wave-0.
- **Plural keys explicit.** Use a plural-aware i18n pattern: `pendingCount.zero`, `pendingCount.one`, `pendingCount.few`, `pendingCount.many`, `pendingCount.other`. Russian needs `one|few|many|other`; EN needs `one|other`.
- **`reasonNote` free-text language hint.** Moderator UI shows: "Owner's preferred language: RU. Write in Russian for clarity, or use the reason code only." Pulled from the listing owner's `preferredLanguage` field. M2 doesn't translate the note server-side; it just nudges.
- **Date/time via Intl.DateTimeFormat with the user's locale.** Ban hardcoded date strings.
- **Layout test in both languages.** Phase QA matrix runs through every M2 screen in EN AND RU on both physical devices. (Adds ~30 cells to the M2 final QA matrix.)
- **Moderator-facing labels and owner-facing labels share the same enum-to-locale mapping** — one reasonCode → one EN string, one RU string, period. Reduces drift.

**Warning signs:**
- A new key lands in en.json but not ru.json (CI catches if gate exists).
- Plural strings written as "1 thing(s)" or "2 things" hardcoded.
- A button wraps to two lines in RU but not EN — visual regression.

**Phase to address:** Cross-cutting; checklist in every M2 phase. Locale-parity CI gate in Wave-0 of first M2 phase.

---

### Pitfall 13: Testing pitfalls — physical-device QA bar but no easy mod-account simulation

**What goes wrong:**
M1's QA bar is manual physical-device testing on iPhone 15 Pro Max + Moto G XT2513V (PROJECT.md, RETROSPECTIVE.md). For M2 this requires:
- A user account
- A moderator account
- An admin account
- All three logged in simultaneously to test cross-role flows (admin demotes moderator → moderator sees demotion; owner submits → mod approves → owner sees live)

Failure modes:
1. **No test accounts seeded.** Dev creates accounts in Firebase one-off, forgets credentials, tester can't log in.
2. **Admin promotion requires admin** → chicken-and-egg. Who promotes the first admin?
3. **Single device, three roles** → constant logout/login, slow QA, mistakes.
4. **Test accounts reused for production data** → moderator sees real owner's listing in test queue; privacy violation.
5. **No way to reset queue state** — test approves a listing, can't re-test the approval flow without seeding new pending listings.

**Why it happens:**
- Dev environment was implicit in M1 ("just create users via signup"); M2's role hierarchy doesn't have a self-service way to set up test users.
- No fixture/seed pattern for the project.
- Production and test data live in the same Mongo unless explicitly separated.

**How to avoid:**
- **Documented seed users in `.planning/codebase/TESTING.md` (or M2 phase context).**
  - `qa-admin@jaytap.test` / known password / Mongo `userType: 'admin'`
  - `qa-mod@jaytap.test` / known password / `userType: 'moderator'`
  - `qa-user@jaytap.test` / known password / `userType: 'user'` (with several listings in various states)
  - These exist in Firebase test project AND Mongo from Wave-0.
- **Mongo seed script** that creates test listings in each state (`pending`, `live`, `rejected`, `archived`) attached to qa-user. Re-runnable to reset state.
- **Two physical devices** — iPhone for one role, Moto G for another, simulator (iOS Simulator on Mac) for third when needed. M1 already used both physical devices; M2 just adds the simulator as the third role host.
- **Test data segregation.** Test users on a different `tenantId` or with email pattern `*.test` — server filters them from production listing queries. Or accept that test data lives in production-equivalent Mongo and own the cleanup.
- **First-admin bootstrap.** Wave-0 of ROLE-04 includes a one-time script: `db.users.updateOne({ email: 'qa-admin@jaytap.test' }, { $set: { userType: 'admin' } })`. Same script also bumps the real product owner's email (the one in M1's hardcoded allowlist) to admin in Mongo (Pitfall 9).

**Warning signs:**
- Phase QA plan says "create users as needed" without naming them.
- "We'll figure out role testing later".
- No mention of seed/reset workflow.

**Phase to address:** Wave-0 of first backend phase + per-phase QA matrix.

---

### Pitfall 14: Crash/error recovery — moderator action timeout, stuck transient state

**What goes wrong:**
Moderator taps Approve. Server takes 20 seconds. Phone is on flaky Wi-Fi. Possibilities:
1. Request times out on client (default axios timeout is none; spec'd timeout might be 10s) → client thinks failure, server actually succeeded.
2. Server completes the Mongo update but the response is lost → client retries, but the conditional `findOneAndUpdate({ status: 'pending' })` returns 409 because status is already `live`. (This is a feature, not a bug — see Pitfall 5. But the moderator UI must communicate it correctly.)
3. Client retries blindly → duplicate moderationLog entries.
4. App crashes mid-action → on relaunch, moderator opens queue, listing X still says `pending`. Tries again. 409. Confused.
5. Network goes down between server-write and notification-send → owner doesn't get notified of approval/rejection.

**Why it happens:**
- Default React Native networking has no offline queue (CONCERNS.md "No offline mode / request queueing").
- Idempotency of moderation actions is implicit, not designed.
- Notifications (in-app banners, persistent badges) are a separate codepath from the action endpoint — failure of one doesn't fail the other.

**How to avoid:**
- **Idempotency by design.** All transition endpoints use the conditional `findOneAndUpdate({ _id, status: 'pending' }, ...)` — idempotent at the data layer. If the moderator's client retries, the second call returns 409 and client treats it as "already done" → silently refetches queue.
- **Explicit timeouts on client.** `axios.post(url, body, { timeout: 15000 })` for moderation actions. On timeout, show "Connection slow — checking…" then refetch listing status; if status is now non-pending, treat as success.
- **Single moderationLog write per successful state transition.** Use an upsert keyed on `(listingId, action, fromState, toState, dayBucket)` to dedupe accidental double-writes — or accept duplicates and document.
- **Owner notification fires from the same Mongo write transaction (or a queue triggered by the write).** If notification queue is async, accept eventual consistency — but the action itself must succeed atomically.
- **Crash recovery test.** Phase QA: in airplane mode, tap Approve → confirm error toast → restore network → confirm queue refetches and reflects current state.

**Warning signs:**
- "Show success toast on response" without "and refetch state".
- Notification emit is in a `try/catch` swallowing errors silently.
- No timeout on axios calls.

**Phase to address:** Moderation actions phase + QA matrix verification of recovery flows.

---

### Pitfall 15: The Firebase-SDK temptation — patterns that look obvious but the team CANNOT use

**What goes wrong:**
Documentation, Stack Overflow, blog posts, and Claude itself default to firebase-admin patterns. PROJECT.md states this REPO RULE explicitly: **"No Firebase SDK in this repo. Previous SDK addition attempt caused issues — REST-only is a hard rule."** Failure mode: M2 implementer follows a tutorial, adds `firebase-admin` to backend or `@react-native-firebase/auth` to mobile, hits the same issues, has to rip it out.

**Common SDK patterns and their REST-only / JWKS substitutes:**

| What docs/SO recommend | Why team can't use it (in this repo) | Concrete substitute |
|---|---|---|
| `admin.auth().verifyIdToken(token)` on Railway | Adds firebase-admin SDK | `jose.jwtVerify(token, JWKS, { issuer, audience, algorithms })` with JWKS endpoint `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` ([Firebase official guidance](https://firebase.google.com/docs/auth/admin/verify-id-tokens)) |
| `admin.auth().setCustomUserClaims(uid, { role: 'admin' })` for role assignment | Custom claims live in Firebase, requires admin SDK to set, propagate via token refresh | Mongo `userType` field is the role authority. Role changes touch Mongo only. Token still issued by Firebase REST signup/signin (uid only) |
| `admin.auth().revokeRefreshTokens(uid)` for forced re-auth on demotion | admin SDK only | Mongo `roleRevokedAt` timestamp. Server middleware rejects tokens with `iat < roleRevokedAt`. Client treats 401 as logout-and-prompt-re-login |
| `firebase.auth().onIdTokenChanged(callback)` for client-side role refresh | Requires `@react-native-firebase/auth` | `AppState 'active'` listener calls `AuthContext.refreshProfile()` which re-fetches role from Railway via REST; existing `axios` round-trip pattern |
| Firebase Cloud Messaging for push notifications on rejection | Requires Firebase SDK + APNs/FCM tokens | Out of scope for M2 (CONCERNS.md "No push notifications"). Owner sees rejection at next app open via in-app banner pattern |
| Firebase Security Rules for "only admin can write to /admins" | Not applicable — Mongo, not Firestore | Express route guards: `requireRole('admin')` middleware on `/users/:id/role` endpoint |
| `admin.auth().createUser({ email, password, customClaims })` for moderator provisioning | admin SDK | Two-step: (1) admin enters email of existing user in role mgmt screen → (2) Railway endpoint sets `userType: 'moderator'` in Mongo. User must already have signed up via the existing Firebase REST path. No ability to create users from the admin UI; users self-onboard, then admin promotes |
| `firebase.auth().currentUser.getIdToken(true)` to force refresh | Requires `@react-native-firebase/auth` | Existing AuthService stores the refresh token; manual `POST https://securetoken.googleapis.com/v1/token` call to refresh. Trigger: 401 with `code: 'token-expired'` from Railway, OR proactive 5-minute-before-expiry refresh in AuthContext |
| `admin.auth().listUsers()` for admin user list | admin SDK | Mongo `db.users.find()` with pagination. Profile is in Mongo, identity (email/uid) is mirrored from Firebase signup callback or AuthContext on first login |
| Firebase Auth UI for sign-in | UI library | Existing custom screens (M1 already shipped) — no change |

**Why it happens:**
- The Firebase docs default to admin SDK; REST verification has its own page but is less linked.
- Claude's training data is dominated by admin-SDK tutorials. Without the explicit rule pinned in PROJECT.md, suggestions drift.
- Custom claims (`setCustomUserClaims`) is the textbook role-system answer. Substituting Mongo as authority requires explicit framing.

**How to avoid:**
- **PROJECT.md "No Firebase SDK" rule is repeated as a Wave-0 invariant in the M2 backend phase CONTEXT.md.** First Wave assertion: `! grep -r 'firebase-admin' backend/` and `! grep -r '@react-native-firebase' src/` exit 0 — automated invariant.
- **The substitution table above is reproduced into the M2 phase research / spec** so reviewers don't have to re-derive each one.
- **`jose` over `jsonwebtoken`** in the spec (modern, single API call validates everything; smaller footprint than `jsonwebtoken + jwks-rsa`). Optional: `jsonwebtoken@^9` + `jwks-rsa@^3` if existing backend uses them.

**Warning signs:**
- Any plan body imports `firebase-admin` — STOP.
- Any plan body imports `@react-native-firebase/*` — STOP.
- StackOverflow answer pasted as solution without translation to REST/JWKS.

**Phase to address:** Wave-0 of every backend-touching M2 phase. Encode the substitution table in the first M2 backend CONTEXT.md.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip moderationLog audit; just update status | One less collection, faster ship | First owner complaint about a mod edit has no answer; recovering history requires manual Mongo forensics | NEVER — schema is 8 lines, it's the cheapest possible insurance |
| Free-text `reasonNote` only, no enum codes | Moderator can write anything | Owner can't read note in own language; analytics impossible | NEVER — pair enum + optional note is the minimum |
| Client cache role indefinitely (no refresh) | Simpler implementation | Demoted moderator keeps moderator UI for hours; promoted user has to logout/login | NEVER — `AppState 'active'` refresh is a 5-line fix |
| Re-use `PATCH /properties/:id` for edit-on-behalf | One endpoint instead of two | No way to distinguish owner edit from mod edit in audit; pitfall 6 doubles | NEVER — separate endpoint + log |
| Skip 409 conflict handling (just last-write-wins) | Simpler controller | Pitfall 5 race ships; double-rejection notifications to owner | NEVER for transition endpoints; acceptable for non-critical PATCH |
| Hardcoded English in moderator UI (mods are us, we read EN) | Faster ship | Locale-parity CI breaks; owners-of-moderators (admins) browse in RU | NEVER — moderator UI used by Russian-speaking moderators in Bishkek |
| Skip the M1-allowlist-to-Mongo migration | One less Wave-0 step | First M2 admin action requires emergency Mongo edit; project owner locked out | NEVER — single `db.users.updateOne` |
| Simple boolean overlay flags in App.tsx (one per overlay) | Familiar pattern | Pitfall 8 reintroduces M1 nav bugs | Only if added to OVERLAY_FLAGS derivation; never as standalone state |
| Push notifications "we'll add later" | M2 ships sooner | Owners don't know about rejections until next app open; rejection-resubmit cycle continues | Acceptable — explicitly out of scope per PROJECT.md; revisit M3 |
| Hard delete instead of soft-delete + 30-day window | One field, one DELETE call | Pitfall 11 — orphan handling and unrecoverable mistakes | Acceptable for M2 if delete is admin-only AND infrequent (< monthly); soft-delete recommended |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Firebase Identity Toolkit REST → Railway JWT verification | Adding firebase-admin SDK to "save time" | Pitfall 15 substitution table; `jose.jwtVerify` against Firebase JWKS endpoint |
| Mongo as role authority + Firebase as identity | Storing role in Firebase custom claims | Mongo is the authority; Firebase only proves uid; role lookup is one Mongo query in middleware |
| AsyncStorage cached role + server-side role | Client treats AsyncStorage as truth | Server is truth; client cache is performance optimization with TTL via refresh-on-active-app + 401-on-stale-token |
| AuthContext + new role management UI | Adding new context for role state | Reuse existing `AuthContext.user.backendProfile.userType`; M1 forward-compat shim (`useRole()`) already abstracts this |
| App.tsx state machine + new overlays | Adding 5+ new useState booleans | Add to existing `OVERLAY_FLAGS` derivation per Pitfall 8; consider `useReducer` if total flags > 25 |
| axios services + new moderation endpoints | Yet another `apiClient.ts` per service (CONCERNS.md "Duplicated service boilerplate") | Reuse the planned-but-not-implemented apiClient.ts; if not built yet, add `ModerationService.ts` with the same shape and refactor in M3 |
| i18n locale tables + 50–100 new keys | Add to en.json, forget ru.json | Locale-parity CI gate; new-key checklist in phase Wave-1 |
| Mongo schema migration + zero-downtime deploy | Use `findByIdAndUpdate` everywhere then add field later | Mongoose schema defaults handle missing fields on read; explicit Wave-0 user-record migration |
| Firebase token refresh + Railway 401 handling | Treat 401 as fatal logout | Distinguish `code: 'token-expired'` (refresh + retry once) from `code: 'role-revoked'` (logout) from `code: 'forbidden'` (show error) |
| Moderation queue + production listing list | Same endpoint with `?status=pending` filter | Separate `/moderation/queue` endpoint with mod-only auth; cleaner cache, cleaner audit, prevents privilege creep via filter parameter |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| JWKS fetch on every request | Auth latency 200–500ms; rate-limit errors from Google | jwks-rsa cache: 6h, rateLimit: true, 5/min — per Pitfall 2 | First moderate traffic hit (~10 req/s for non-cached); Google now rate-limits unauthenticated JWKS endpoint per 2026 docs |
| Mongo role lookup on every request, no cache | Backend latency adds 10–50ms to every authenticated call | 60-second in-memory LRU keyed by uid; invalidate on role-change endpoint | Visible at >100 concurrent users; not a M2 issue but spec the cache hook now |
| getAllProperties returning everything (CONCERNS.md existing) | Slows queue load when total listing count grows | Add `?status=pending&limit=20&cursor=<id>` to moderation queue endpoint specifically; non-blocking for M2 if total listings <500 | At 500+ pending listings (unlikely in M2 timeframe but spec the cursor anyway) |
| Listing list re-renders on role change | Moderator promoted/demoted causes flicker on home screen | Memoize role-dependent UI with `useMemo`; only the gated bits re-render | Annoying but not a hard break; prevent via discipline |
| Push-to-refresh on every queue tab change | Wasteful API calls | Cache queue locally for 30 seconds; pull-to-refresh forces refetch | Visible on slow networks; mitigate with cache TTL |
| Audit log writes block action response | Slower approve/reject under load | Write to moderationLog in same transaction (or fire-and-forget if eventual consistency acceptable); response doesn't wait for log write | At >10 actions/min/moderator (unlikely M2) |

---

## Security Mistakes (M2-Specific)

| Mistake | Risk | Prevention |
|---|---|---|
| `PATCH /users/me` accepts `userType` field | Self-promotion to admin in one request | Field allowlist (Pitfall 3) |
| Role guard on `PATCH /users/:id/role` is "mod or admin" | Moderator promotes themselves to admin | Admin-only + reject self-edit |
| Moderation endpoints accept role from request header | Client-set role; trivial spoof | Role from JWT-verified token + Mongo lookup, never from request |
| Test/dev mode bypass shipped to production | Fully unauthenticated admin access | No `if (NODE_ENV)` runtime branches; mock at test fixture layer |
| JWKS keys cached forever | After Firebase rotates keys, all valid tokens fail; or worse, fallback path bypasses verification | 6h cache TTL + on-unknown-kid refresh |
| Issuer/audience not pinned in JWT verification | Tokens from different Firebase project verify | Pin both to project ID literal |
| Algorithm allowlist not specified | alg=none or HS256 confusion attack | `algorithms: ['RS256']` explicit |
| Moderator action endpoint not gated by role | User can flip own listing to `live` | All transition endpoints check `requireRole(['moderator', 'admin'])` |
| Edit-on-behalf doesn't log moderator identity | No accountability for moderator misbehavior | moderationLog with `actorUid` (Pitfall 6) |
| Moderator can demote admin | Last-admin lockout | "Cannot self-edit" + "cannot demote last admin" checks; admin count is a Mongo aggregation before the role change |
| Listing detail exposes moderator's identity to owner | Doxing of moderators | Owner-facing UI generic ("JayTap moderator"); moderator identity only in audit log visible to admins |
| AsyncStorage role cache survives logout | New user logging in on shared device sees previous user's role briefly | `AuthContext.signOut()` MUST clear AsyncStorage role + token; verify in QA |
| Listing reject reason free-text shown verbatim | XSS if rendered as HTML; profanity / abuse vector | Render as plain text only (existing RN <Text> default); enum codes preferred |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Owner sees `status: rejected` with no reason | Confused; resubmits same listing | Structured reason on Listing Detail + Owner Listings (Pitfall 7) |
| Approve has confirm dialog; reject doesn't | Mods reject by mistake | Approve = direct (reversible), Reject = confirm + reason picker (irreversible from owner POV) |
| Both "Archive" and "Delete" visible on owner UI | Wrong-button regret | Archive only for owner; Delete admin-only (Pitfall 11) |
| Role badge missing on profile screen | Promoted user can't tell their role | Add role chip (`Moderator` / `Admin`) to profile and account screens with EN+RU labels |
| Moderation queue empty state looks like an error | Mods think the screen is broken | Empty state illustration + copy: "No listings pending review" / "Все объявления проверены" |
| Mod taps reject → reason picker appears → mod backgrounds app → comes back, reason picker gone, listing already removed from queue (optimistic) | Confused — did the action complete? | Pessimistic UI (Pitfall 5) + reason draft persistence (Pitfall 10) |
| Owner can't find their archived listings | Thinks they were deleted | Archived filter chip on Owner Listings; tested by user in EN+RU |
| Demoted moderator opens app, sees the queue full of listings, taps one → 403 | Confusing 403 | On role-revoke, show toast and route to Home; queue tab itself becomes hidden via `<Gated>` |
| Edit-on-behalf has no "Reverted by owner" path | Owner can't undo moderator's edits | Out of scope for M2 — but spec it as a known limitation visible to mods (UI hint: "Edit only critical issues; owner can override") |
| Push notification deep-link opens Home not the listing | Owner sees notification, opens app, can't find listing | Notifications out of scope for M2 entirely; revisit |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces. Run through this before declaring any M2 phase done.

- [ ] **Backend role enforcement:** Often missing the curl-test matrix — verify each mutating endpoint returns 403 for wrong role, 200 for correct role, with golden Firebase test tokens captured for each role.
- [ ] **JWT verification:** Often missing `clockTolerance: 60` and pinned audience/issuer — verify spec lists all 5 verification clauses (algorithms, issuer, audience, kid, clockTolerance).
- [ ] **Stale role cache:** Often missing the AppState 'active' refresh hook — verify a manual test where admin promotes user-on-device-A while user-on-device-A has app foregrounded → user sees role update within 60s.
- [ ] **Audit log:** Often missing for `edit-on-behalf` (only added to approve/reject) — verify every mutating moderator action writes to moderationLog.
- [ ] **Rejection reason:** Often missing the locale-parity check on enum values — verify reject() enum codes have EN+RU translations and the test renders one of each.
- [ ] **Privilege escalation:** Often missing the field allowlist on `PATCH /users/me` — verify a curl with `{ userType: 'admin' }` returns 200 but the role is unchanged.
- [ ] **Promote-self prevention:** Often missing — verify admin/mod cannot edit their own role; cannot demote the last admin.
- [ ] **Clean migration:** Often missing the M1-allowlist-to-Mongo migration — verify the project owner's email is `userType: 'admin'` in Mongo before M2 ships, otherwise they're locked out.
- [ ] **Test users:** Often missing seed users in TESTING.md — verify documented credentials exist in Firebase test project AND Mongo with correct roles.
- [ ] **App.tsx LOC budget:** Often blown silently — verify `wc -l App.tsx` ≤ 1100 at M2 close; ≤ 1050 at each phase close.
- [ ] **OVERLAY_FLAGS additions:** Often missed when adding new overlays — verify every M2 overlay is registered in `OVERLAY_FLAGS`.
- [ ] **Locale parity:** Often missing for new keys — verify `wc -l src/locales/en.json` matches `wc -l src/locales/ru.json` (or per-key parity script).
- [ ] **Race-condition (409) handling:** Often missing on client — verify two-moderator-on-same-listing manual test produces a localized toast on the loser, not a crash.
- [ ] **Action loading state:** Often missing — verify each Approve/Reject/Flag/Archive button disables for the duration of its request.
- [ ] **Dev-mode bypass:** Often present in dev branch, sometimes ships — verify no `process.env.NODE_ENV` near auth code; grep gate.
- [ ] **Owner sees archived listings somewhere:** Often missing — verify Owner Listings has an Archived filter and archived listings are restorable.
- [ ] **Moderator identity hidden from owner:** Often missing — verify rejection messaging uses "JayTap moderator" not "moderator-name@…".
- [ ] **Pull-to-refresh on queue:** Often missing — verify queue refetches and removes resolved listings.
- [ ] **AsyncStorage role cleared on logout:** Often missing — verify shared-device logout-then-login does not show previous user's role briefly.
- [ ] **403 distinguishable from 401:** Often conflated — verify client treats `token-expired` (refresh+retry), `role-revoked` (logout+toast), `forbidden` (show error) differently.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Backend unprotected endpoint exposed (Pitfall 1) | HIGH — production data integrity at risk | (1) Hotfix-deploy server-side guard; (2) audit Mongo for unauthorized state changes via moderationLog (or recent timestamps); (3) revert any unauthorized mutations; (4) rotate all admin JWT (force re-auth via roleRevokedAt bump); (5) post-mortem |
| JWT verification bug (Pitfall 2) | HIGH — auth bypass | (1) Hotfix-deploy fixed verifier; (2) invalidate all tokens via global `roleRevokedAt = now`; (3) audit logs for unexpected role-protected calls; (4) retroactively revert mutations from those calls |
| Privilege escalation via PATCH /users/me (Pitfall 3) | HIGH — same as above | (1) Hotfix field allowlist; (2) Mongo query: any user whose `userType` was set in last N days who isn't on the legitimate-promotions list → demote; (3) notify each demoted user |
| Stale role cache (Pitfall 4) | LOW — annoyance | Force re-auth via `roleRevokedAt` bump; user logs in again, gets fresh role |
| Race condition double-action (Pitfall 5) | LOW — confusing UX | If conditional update is in place, no recovery needed (server handled correctly); ship the 409-toast UI fix in next release |
| Missing audit (Pitfall 6) | MEDIUM — case-by-case forensics | If moderationLog wasn't shipped, retrofit it now; for past actions, accept that history is gone; case-by-case Mongo backups (if any) |
| Owner can't see rejection reason (Pitfall 7) | LOW — UI fix | Hotfix listing detail rendering; resend rejected status events for affected owners (banner reappears) |
| App.tsx nav bugs (Pitfall 8) | MEDIUM — same as M1 Phase 1 | Repro matrix + derivation refactor; don't add more flags; carve sub-component if needed |
| Clean-migration miss (Pitfall 9) | LOW if caught early — admin lockout | One-off Mongo write to set product owner as admin; downside is the discovery moment is "I can't promote anyone" |
| Race-tap / lost state (Pitfall 10) | LOW — UX polish | Add confirm dialogs + draft persistence in next release |
| Archive/delete confusion (Pitfall 11) | MEDIUM if hard-delete was used | If only archive shipped (no delete), no recovery needed; if hard delete, accept data loss; soft-delete prevents this prospectively |
| Bilingual gap (Pitfall 12) | LOW — translation backfill | Add missing keys to ru.json or en.json; rebuild and redeploy |
| Test-account chaos (Pitfall 13) | LOW — process | Document seed users; QA runs through all roles; redo the test pass |
| Crash-recovery missing (Pitfall 14) | MEDIUM — annoyed mods | Add idempotency + timeout handling; mods learn to refresh on confusion |
| Firebase SDK accidentally added (Pitfall 15) | MEDIUM — refactor | Rip out SDK, replace with REST/JWKS substitutes per the table; automated grep gate prevents recurrence |

---

## Pitfall-to-Phase Mapping

How M2 roadmap phases should address these pitfalls. Phase numbering hypothetical — gsd-roadmapper assigns final order.

| Pitfall | Prevention Phase (likely) | Verification |
|---|---|---|
| 1. Client-side gating as security | Phase 1: Backend Role Enforcement (ROLE-04) | curl matrix: 9 endpoints × 3 roles → 27 cases; all return expected 403/200 |
| 2. JWT/JWKS verification mistakes | Phase 1: Backend Role Enforcement (ROLE-04) | Golden token fixture tests: valid/expired/tampered × admin/mod/user; all 9 cases pass |
| 3. Privilege escalation PATCH /users/me | Phase 1: Backend Role Enforcement | curl with `{userType:'admin'}` body as user/mod → role unchanged in Mongo |
| 4. Stale role cache | Phase 1 (server) + Phase 2 (client AuthContext refresh) | Two-device manual test: promote on A → B sees role within 60s without restart |
| 5. Race conditions in queue | Phase 3: Moderation Actions + Phase 4: Queue UI (paired) | Two-moderator manual test: simultaneous approve/reject → one wins, other sees 409 toast |
| 6. Audit trail blind spots | Phase 3: Moderation Actions | moderationLog count increments per moderator action; spot-check on each action type |
| 7. Owner-side communication failure | Phase 5: Owner UI for moderation states | EN+RU rendering of all 4 statuses + reason codes on 3 surfaces |
| 8. App.tsx state-machine pitfalls | All phases that touch App.tsx (cross-cutting) | LOC budget assertion at each phase close; OVERLAY_FLAGS check; nav matrix walked |
| 9. Migration / backward-compat | Phase 1 Wave-0 (one-off Mongo update script) | Wave-0 verification: M1 hardcoded admins exist as `userType: 'admin'` in Mongo |
| 10. Moderation queue UX traps | Phase 4: Moderation Queue UI | QA matrix: double-tap, rage-tap, background-during-edit, 409 conflict |
| 11. Archive vs delete confusion | Phase 6: Archive feature (or last) | Owner UI walks: archive → restore → archive; admin delete is separate path |
| 12. Bilingual gotchas | Cross-cutting (locale-parity gate in Phase 1 Wave-0; per-phase QA in EN+RU) | Locale parity CI green; QA matrix in both languages |
| 13. Testing pitfalls (no mod-account simulation) | Phase 1 Wave-0 (seed script + TESTING.md doc) | Test users documented; QA can log in as each role on demand |
| 14. Crash/error recovery | Phase 3 (idempotent endpoints) + Phase 4 (client retry behavior) | Airplane-mode QA test: action fails gracefully, recovers on reconnect |
| 15. Firebase SDK temptation | Wave-0 of every backend phase (grep gate) + Phase 1 spec (substitution table in CONTEXT.md) | `! grep firebase-admin backend/` exit 0; `! grep @react-native-firebase src/` exit 0 |

---

## Backend-Coordination Schedule Risk (separate flag)

Independent of the technical pitfalls above, the Railway-team coordination from M1 GATE-05 D-22 Path B is the **single largest schedule risk for M2**.

- M1 shipped with backend enforcement deferred because the Railway-team conversation didn't close before archive cut.
- M2's first 1–2 phases are entirely backend-dependent (ROLE-04 + moderationLog schema + endpoints).
- If the Railway team is unresponsive during M2, the team faces three bad choices: (a) ship UI-only with mock backend (effectively re-runs the D-22 Path B accepted-risk pattern, but worse because M2 requires real enforcement), (b) wait — schedule slip, (c) take over the backend changes ourselves.

**Mitigation in spec:**
- M2 Wave-0 of Phase 1 includes a written endpoint-shape sign-off from the Railway team — same artifact M1 GATE-05 needed but couldn't get. Make it a hard gate.
- Spec the endpoint shapes ourselves first (in `.planning/research/ARCHITECTURE.md`-equivalent); send to Railway team for approval rather than asking them to author.
- **Decision tree if Railway is unresponsive at archive time** — spec it now, not at crisis time:
  - If <5 days late: continue waiting.
  - If 5–10 days late: ship UI complete, server bypass-with-warning (NOT silent — UI shows "Backend role enforcement pending — moderator role honor-system" banner). Better than M1 D-22's silent accepted risk.
  - If >10 days late: re-evaluate scope; descope `edit-on-behalf` and `flag` (highest backend complexity); ship `approve`/`reject`/`archive` only.

This is not a technical pitfall but a process pitfall, surfaced separately so it doesn't get absorbed into "Pitfall 1: client-side gating".

---

## Question-to-Pitfall Index

Cross-reference between the brief's 15 questions and the pitfalls in this document.

| Brief Question | Primary Pitfall(s) |
|---|---|
| 1. Client-side gating is UX not security | Pitfall 1; backend-coordination flag |
| 2. JWT/JWKS verification mistakes | Pitfall 2; Pitfall 15 (substitution table) |
| 3. Race conditions in moderation queues | Pitfall 5; Pitfall 10 |
| 4. Stale role caching | Pitfall 4 |
| 5. Audit trail blind spots | Pitfall 6 |
| 6. Owner-side communication failures | Pitfall 7 |
| 7. Bilingual gotchas | Pitfall 12 |
| 8. Permissions creep / privilege escalation | Pitfall 3 |
| 9. Moderation queue UX traps | Pitfall 10 |
| 10. App.tsx state-machine pitfalls | Pitfall 8 |
| 11. Archive vs delete confusion | Pitfall 11 |
| 12. Migration / backward compat | Pitfall 9 |
| 13. Testing pitfalls (no easy mod simulation) | Pitfall 13 |
| 14. Crash/error recovery | Pitfall 14 |
| 15. Firebase-SDK temptation | Pitfall 15 |

---

## Sources

**Repo / project artifacts (HIGH confidence):**
- `.planning/PROJECT.md` — Current Milestone, Out of Scope, Key Decisions D-22 backend-coordination accepted risk, REPO RULE "No Firebase SDK".
- `.planning/codebase/CONCERNS.md` — High: "Firebase uid used as sole auth"; High: "App.tsx god-file (941 lines)"; Medium: "Auth user type is `any`"; Medium: "No push notifications"; Medium: "No offline mode / request queueing"; Medium: "Duplicated service boilerplate"; "Effectively zero tests".
- `.planning/RETROSPECTIVE.md` — Lesson 1 ("Trust Play Console / live state, not local files") — generalized to "verify backend dependency state in Wave-0"; M1 Phase 1 nav-bug root-cause pattern (stale flags + keep-alive).
- `CLAUDE.md` — EN+RU parity rule; useTheme() tokens; manual physical-device QA bar.
- M1 v1.0.4 Phase 1 nav fix: derived overlay state, pointerEvents belt-and-suspenders, OVERLAY_FLAGS pattern.
- M1 v1.0.4 Phase 3 GATE-05 D-22 Path B accepted-risk record.

**External (MEDIUM–HIGH confidence; verified against official sources):**
- [Firebase official: Verify ID Tokens (REST/JWKS approach)](https://firebase.google.com/docs/auth/admin/verify-id-tokens) — issuer = `https://securetoken.google.com/<PROJECT_ID>`, audience = project ID, alg = RS256, JWKS endpoint, 6-hour cache. **HIGH confidence**.
- [Auth0 jwks-rsa](https://github.com/auth0/node-jwks-rsa) — cache + rateLimit defaults, kid-based key selection. **HIGH confidence**.
- [JWT Security Best Practices for 2026](https://www.devtoolkit.cloud/blog/jwt-security-best-practices-2026) — algorithm allowlist, issuer/audience pinning, cache TTL recommendations. **MEDIUM confidence** (third-party blog, but aligns with RFC 7519 + 8725 BCP).
- [WorkOS Developer's guide to JWKS](https://workos.com/blog/developers-guide-jwks) — kid resolution, cache rotation. **MEDIUM confidence**.
- [Firebase token verification without firebase-admin SDK](https://medium.com/@aditya_panther/verify-firebase-access-token-without-firebase-admin-sdk-dad973b545c5) — reference implementation pattern. **MEDIUM confidence** (Medium post; verified against Firebase official guidance).

**Domain knowledge (training data; HIGH confidence — well-established patterns):**
- Mongoose `findByIdAndUpdate` field-allowlist anti-pattern (Pitfall 3).
- Mongo conditional update via `findOneAndUpdate({ _id, status: 'pending' }, ...)` for race-free state transitions (Pitfall 5).
- Append-only audit log pattern (Pitfall 6).
- React Native `AppState 'active'` listener pattern for refresh-on-focus (Pitfall 4).
- ICU MessageFormat plural rules; Russian one/few/many/other categories (Pitfall 12).
- AsyncStorage cleanup on logout pattern (Pitfall 4 + Security Mistakes).

---

*Pitfalls research for: M2 "Roles & Moderation" — adding three-role permission system + listing moderation lifecycle + edit-on-behalf to JayTap React Native + Railway/Mongo + Firebase Identity Toolkit REST.*
*Researched: 2026-04-29*

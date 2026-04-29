# Feature Research — M2 "Roles & Moderation"

**Domain:** Mobile real-estate / classifieds app — adding three-role permission system + listing moderation lifecycle + Moderation Queue UI + admin role-management screens + listing archive to an existing brownfield React Native 0.84 app (JayTap, Bishkek). M1 v1.0.4 shipped 2026-04-28; M2 builds on the existing `useRole()` / `can(action)` / `<Gated>` shim and the Mongo-backed `userType` field.
**Researched:** 2026-04-29
**Confidence:** HIGH — moderation/RBAC/lifecycle patterns are mature across marketplaces (Drupal Workflow, Reddit modqueue, Rentec/Vrbo archive semantics, RBAC literature). Mobile-specific UX for moderation queues is less codified than web (LOW confidence on specific gesture choices); recommendations defer to existing JayTap conventions where ecosystem is silent.

---

## Feature Landscape

### Table Stakes (Must Have for M2)

Features that, if missing, make the moderation system feel broken or unsafe. All directly map to the user-locked M2 scope captured in `PROJECT.md` § "Current Milestone: v2.0 M2 Roles & Moderation".

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---------|--------------|------------|----------------------|
| **Server-resolved role per session** (admin / moderator / user) | M1 shipped a hardcoded email allowlist as accepted-risk under D-22 Path B; without server-resolved roles the entire admin/mod surface is bypassable via raw HTTP. Closes GATE-05. | MODERATE | Backend-gated (Railway + Mongo). Client side reuses `useRole()`/`<Gated>` API shape — ROLE-04 swaps the *source* (Mongo lookup keyed by Firebase uid via JWKS-verified ID token) without touching call sites. **No Firebase SDK** — REST-only, JWT verification with x509 endpoint. |
| **Role cached on AuthContext alongside user profile** | One source of truth; matches the existing `user.backendProfile` shape; avoids a parallel `RolesContext` that would diverge. Industry RBAC norm: role attaches to the session/user, not a separate provider. | TRIVIAL | Extends `AuthContext` value to include `role: 'admin' \| 'moderator' \| 'user'` (or null while loading). `useRole()` reads from `useAuth()`. |
| **Role re-fetched on app foreground + on every protected mutation's failure-with-403** | A demoted moderator must lose access without a manual app restart. RBAC literature treats stale role caches as a tier-1 security pitfall. | MODERATE | Hook into `AppState` change listener (already present in RN apps for socket reconnect patterns); on backend `403 forbidden_role`, force `AuthContext` to re-resolve role and surface a banner. **Pitfall:** if role-fetch fails, default to LOWEST-privilege role, not last-cached. |
| **Listing status field with 4 states** (`pending` / `live` / `rejected` / `archived`) | Replaces M1's "post = instantly live" model. All four states are user-locked (PROJECT.md L18). | MODERATE | `Property` type adds `status: 'pending' \| 'live' \| 'rejected' \| 'archived'`. Default new listings to `pending`. Existing v1.0.4 listings (mock data only — no production listings per PROJECT.md L137) migrate by setting all to `live` server-side; no client migration tool needed. |
| **Owner sees their listing's status on My Listings** | Without this, the owner doesn't know why their post isn't visible to renters. | LOW | OwnerListings + PropertyCard show a status pill (Pending / Live / Rejected / Archived). EN+RU strings for all 4. Use existing `useTheme()` semantic colors (warning for pending, success for live, error for rejected, neutral for archived). |
| **Rejected listings show the rejection reason to the owner** | Industry table stake — Drupal/Wcvendors/Logic.inc all flag "vendors should see review suggestions directly while editing" as the difference between a working moderation flow and a broken one. | LOW | `rejectionReason: string` on Property. Render on PropertyDetailsScreen + as banner on edit form. |
| **Owner can edit + re-submit a rejected listing** | Without re-submission, rejection becomes a dead end and owners create duplicates. Standard CMS workflow pattern. | LOW | Owner edit flow on a `rejected` listing transitions status back to `pending` on save. **Edge case:** edit-while-pending should NOT silently bump back to pending (it's already pending) — but DOES need to invalidate any in-flight moderator review (see "concurrent edit" pitfall). |
| **Moderator + admin see a Moderation Queue screen** | Every reviewed marketplace from Reddit modqueue → Drupal Moderated Content view → Higher Logic → Vanilla Forums offers a dedicated queue UI. Without it, mods would have to discover pending listings via search. | MODERATE | New screen `ModerationQueueScreen.tsx` listing all `pending` listings (default tab). Reuses `PropertyCard` with a moderation action drawer. Route via existing `App.tsx` boolean state machine (no react-navigation per CONVENTIONS). |
| **Per-listing approve / reject actions in queue** | Core verb of any moderation system. | LOW | Two buttons per row OR a sheet. Approve = single action; reject = action + free-form reason text input (required, min ~10 chars). EN+RU strings. |
| **Reject requires a reason; approve does not** | Asymmetry is industry standard — approval is the implicit no-comment outcome; rejection MUST be explainable so the owner can fix and re-submit. | LOW | Validate reason field; submit-disabled until non-empty. Persist as `rejectionReason` on the listing. |
| **Edit-on-behalf-of-owner from the queue** | User-locked M2 scope (PROJECT.md L19). Standard for newsroom + classifieds workflows where owners can't be reached but a fix is small (typo, wrong category). | MODERATE | Mod/admin can open the existing CreateListing edit form for any listing they don't own, gated via `can('editAnyListing')`. On save, listing transitions to `live` (the implicit "approve via edit" path). Audit fields: `lastEditedByModUid` / `lastEditedAt` server-side (client surfaces in M2.5+ if needed). |
| **Listing archive — owner-initiated** | User-locked M2 scope (promoted from backlog 999.1; PROJECT.md L21). Distinguishes "I sold it / pulled it from market" from "delete my data forever". | LOW | New `archive` action on owner's PropertyCard menu (next to existing Delete). Sets `status='archived'`. **Coexists with** existing hard-delete — does NOT replace it (per Roadmap backlog 999.1 open question 1; recommendation here is COEXIST). |
| **Listing archive — moderator/admin-initiated** | User-locked M2 scope. Real-estate marketplaces (Vrbo, Rentec, CommercialRealEstate.com.au) all give admins the ability to archive listings owners abandoned or that violate platform policy. | LOW | Same `status='archived'` transition, gated via `can('archiveAnyListing')`. Requires an `archiveReason` field for audit/owner-facing messaging. |
| **Owner can un-archive their own listing** | Without unarchive, archive is just delete-with-extra-steps. Vrbo, Rentec all support reactivation. | LOW | Owner action on archived PropertyCard transitions `archived → pending` (NOT directly to `live` — re-archived listings are not pre-approved; this prevents the "owner archived a rejection then unarchived to bypass review" exploit). |
| **Admin-only screen: promote user to moderator** | User-locked M2 scope (PROJECT.md L20). Without an in-app path, mods are still assigned via code edits. | MODERATE | `RoleManagementScreen.tsx` gated via `can('manageRoles')`. Search/select user by email → set `userType` in Mongo. Backend coordinates write. |
| **Admin-only screen: add another admin** | User-locked M2 scope. Same screen as above. | LOW | Same UI surface, different action. **Pitfall:** prevent the last admin from demoting themselves to non-admin (lockout) — server-side guard required. |
| **Hide admin-only / moderator-only nav from users without the role** | M1 D-08 already established "hide entirely, don't disable" pattern via `<Gated>`. Carries forward. | TRIVIAL | Bottom nav, profile actions, per-listing menus all use `<Gated action="...">` — already wired. |
| **EN + RU localization parity for every new string** | JayTap convention — bilingual Bishkek user base; M1 enforces 365-key tsc gate via `Record<TranslationKeys, string>`. | LOW (per-string), HIGH (cumulative) | Every status pill, queue button, error message, modal copy needs both locales. Estimate ~40-60 new keys for M2. |
| **Theme/dark-mode parity** | JayTap convention — `useTheme()` tokens, no hardcoded colors. M1 ALIGN-01/02 carries forward. | TRIVIAL | New status colors derived from existing semantic tokens (warning/success/error/neutral) in `colors.ts`. |

### Differentiators (Competitive Advantages — Worth Considering)

Features that elevate M2 above a baseline moderation system. **Not all of these need to ship in M2** — flag for the roadmapper to consider per phase.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Canned rejection reasons + free-form override** | A 4-6 chip preset list (e.g., "Photos unclear", "Wrong category", "Duplicate listing", "Suspected fake", "Missing required info", "Other → free-form") makes mods 3-5x faster than free-form-only. Logic.inc + WCVendors call this the single biggest queue throughput win. | LOW | Localization-friendly: chips render translation keys, free-form persists user text. Surface presets to owner verbatim (translated) so reasons stay consistent across the platform. **Recommendation: SHIP IN M2** — low cost, high mod-side UX win, no backend complexity (it's still a single string field server-side). |
| **Pending listings show "in review" placeholder to renters who somehow get the deep link** | Defense in depth — a rejected/pending listing's deep-link should not 404 silently. | LOW | PropertyDetailsScreen branches by status: `pending`/`rejected`/`archived` show a "this listing is unavailable" message instead of full content. Renter can navigate away. **Recommendation: SHIP IN M2** — trivial conditional render in PropertyDetailsScreen (already a 1680-line screen with category branches; one more is fine). |
| **Foreground role-refresh banner** ("Your role changed — tap to reload") | Smoother than silent re-fetch; user is told why a UI element they just used disappeared. Standard mobile pattern (Slack workspace switch, Discord server demote). | LOW | Banner via existing in-app notification slot OR a one-shot AlertModal. **Recommendation: SHIP IN M2** — small, defensive, prevents support tickets ("why did the admin button disappear?"). |
| **Tour-first hospitality preserved in queue** | Hospitality cards (M1 HOSP-03) are tour-first / no-price. Reusing `HospitalityCard` in the queue keeps the visual language consistent — mods see the same thing renters will see. | TRIVIAL | The queue should reuse the SAME `PropertyCard` / `HospitalityCard` branch by category — not a custom moderation card. Renders correctly because cards already handle their own category logic. **Recommendation: SHIP IN M2.** |
| **Owner-side rejection notification surfaced when they next open the app** | Industry table-stake-ish but bumped to differentiator because JayTap has no push infrastructure. In-app banner on app launch is sufficient and aligns with JayTap's "no notification SDK" posture. | LOW | When OwnerListings loads and finds `status=rejected` listings the user hasn't acknowledged, surface a one-time toast/banner: "1 listing was rejected — tap to see why". `acknowledgedRejection` flag on the listing OR a per-user "last seen rejection" timestamp in AsyncStorage. **Recommendation: SHIP IN M2** — push/email out of scope. |
| **Queue filter: pending / flagged / all** | Industry moderation queues (Drupal, Higher Logic, Vanilla) all surface filters. Useful even with only 4 states because flagged listings (if implemented) need a separate view from pending. | LOW | Tab strip or segmented control at queue top. **Recommendation: SHIP IN M2 only if "flag" action is implemented** (see anti-features below). Otherwise the only filter that matters is `status=pending`, which is the default. |
| **Sort queue by oldest-first (FIFO)** | Reddit modqueue research (arxiv 2509.07314) — moderators self-organize around "work the oldest" or "work from the middle" to avoid collisions. Default-FIFO is the lowest-friction baseline. | TRIVIAL | Server returns queue ordered by `createdAt ASC`. **Recommendation: SHIP IN M2** — trivial, helps with concurrent-mod collisions naturally. |
| **Optimistic claim flow** ("This listing is being reviewed by another moderator") | Reddit modqueue research surfaces concurrent-mod collisions as the dominant failure mode in shared queues. With 1-3 active mods/admins (JayTap scale), optimistic concurrency (server returns 409 if listing status already changed) is sufficient — no need for a hard lock. | MODERATE | Backend pattern: `PATCH /properties/:id/status` includes `If-Match: <currentStatus>` semantics; 409 on mismatch. Client surfaces "Another moderator already approved this — refresh queue". **Recommendation: SHIP IN M2 (server-side)** but UI can be a simple toast on 409. **Skip lease-based locking** — overkill for ≤5 mods. |
| **Owner-side "View rejection" CTA on rejected listing** | Reduces support load — owner sees the reason inline on the listing detail rather than discovering it through trial-and-error. | TRIVIAL | Banner on PropertyDetailsScreen when `status=rejected` AND `currentUser.uid === ownerUid`: "Rejected: {reason} — Tap to edit". **Recommendation: SHIP IN M2.** |
| **Last-admin lockout protection** | Server-side guard preventing the only remaining admin from demoting themselves. Marketplace tier-1 safety pitfall. | LOW | Backend rule: if `userType=admin` count would drop below 1, reject the demote. Client surfaces a clear error. **Recommendation: SHIP IN M2** — backend-gated, tiny client surface. |

### Anti-Features (Deliberately NOT in M2 — Document in REQUIREMENTS.md "Out of Scope")

Every M1 phase had a clear out-of-scope list and that discipline was load-bearing for shipping fast. M2 needs the same.

| Feature | Why Tempting | Why NOT in M2 | Defer To |
|---------|--------------|---------------|----------|
| **Automated moderation (image/text classifiers, ML)** | Logic.inc/Lasso/Besedo all push automation as "the future of moderation"; tempting to wire OpenAI moderation API or vision classifier. | M2 scale is tiny (Bishkek-only, single market, mock data still). Manual mod review by 1-3 humans is sufficient and cheaper. ML adds dependency surface, vendor lock-in, false-positive support burden, and PII concerns. **Constraint:** No new SDKs without explicit research phase — adding a Firebase SDK was already disallowed by D-22 hard rule. | M3+ once production volume exists. |
| **Full audit log UI (who-did-what-when across all moderation actions)** | Useful for accountability; standard in enterprise CMS (Drupal Workbench Moderation logs every transition). | Useful but not user-locked for M2. Server should still PERSIST the audit fields (`lastEditedByModUid`, `rejectedByModUid`, `archivedByModUid`, timestamps) so the data exists when an audit screen ships later — but **no client-side audit log screen in M2**. | M3 admin tooling. |
| **Moderator metrics / leaderboard dashboard** ("approvals per day", "average response time") | Marketplace operations teams love these; some platforms (Discourse, Sift) ship them out of the box. | Premature optimization at JayTap's scale. Distracts from the core "is the queue empty?" question. Adds a second admin screen with no moderation user-task value. | M3+ admin analytics. |
| **Formal appeal flow** (owner contests rejection → re-review by a different mod → escalation to admin) | Big-platform pattern (Facebook, eBay) — owners feel heard, mods feel checked. | M2 has no appeal infrastructure and the simple "edit + resubmit" loop covers 95% of legitimate cases. A formal appeal adds a state, a notification path, and a queue tab — all non-trivial. **Out-of-scope for M2.** | M3+ if owner complaints surface. |
| **Bulk moderation actions** (select 20 listings → approve all) | Faster mod throughput at scale. Drupal/Reddit/Higher Logic all support bulk. | At Bishkek scale + 1-3 mods, listings come in slowly enough that single-action review is fine. Bulk-approve has a real foot-gun risk (one accidental bulk-approve of spam). Bulk-reject without per-item reasons creates terrible owner UX. **Out-of-scope for M2.** | M3+ once daily queue depth >50. |
| **Flag/report action** (mod marks a listing as "needs second look", non-blocking) | Common in larger-team moderation queues — partial-confidence rejections without committing. | M2 has 1-3 mods; the implicit Slack/group-chat coordination is faster than flag-and-revisit. Adds a 5th lifecycle state (or a parallel boolean) and a queue tab. **Out-of-scope for M2** — implicit communication suffices. **Note:** PROJECT.md L19 originally listed "approve/reject/flag/edit-on-behalf" — recommendation is to **drop "flag" from M2 scope** unless user explicitly wants it. Flag is the lowest-value of those 4 actions and most dependent on team scale. |
| **Email/push notifications on rejection or approval** | Industry standard for SaaS marketplaces; every reviewed competitor sends email. | JayTap has no push infrastructure (no FCM, no APNs, no email service wired). Adding any of those is a multi-day phase on its own (privacy review, OS-level permission prompts, capability provisioning). In-app banner on next launch is sufficient for M2. | M3+ alongside push notifications milestone. |
| **In-app inbox / message thread for moderation conversations** | Lets mod and owner have a back-and-forth on rejection reason. | Existing chat infrastructure could be reused (`ChatService`), but mixing user-to-user chat with mod-to-user official messaging causes UX confusion (different visual treatment, different rules). The single-string `rejectionReason` covers M2 needs. | M3+. |
| **Automated re-categorization suggestions** ("This looks like a Hospitality listing — switch category?") | M1 Phase 4-5 added category branching; mod could see ML-suggested category. | Ties to automated moderation (above) — same defer reason. Mods can manually edit-on-behalf-of-owner to fix category. | M3+. |
| **Migration tooling for existing listings to default-status** | If there were production listings, they'd need to be assigned a status on M2 deploy. | PROJECT.md L137 confirms "no production listings; all content remains mock data". Server-side data is wiped on M2 schema deploy; clean slate. **Note this assumption explicitly in REQUIREMENTS.md** so it's flagged if production seeds appear before M2 ships. | N/A — assumption-locked. |
| **Per-listing visibility tiers (verified-only / public)** | Some marketplaces gate visibility behind verification level. | Out of scope; M1's verification badges are display-only, not access-control. Don't introduce a 5th lifecycle dimension. | M3+ if needed. |
| **Lease-based pessimistic locking on queue items** | Strong guarantee no two mods act on same listing. | Overkill for ≤5 mods; optimistic concurrency (409 If-Match) is the right tradeoff for M2 scale. | Never (unlikely needed at JayTap scale). |
| **Dedicated `RolesContext` separate from `AuthContext`** | Separation of concerns; some teams prefer it. | Diverges from existing JayTap pattern. Role IS user state — colocating it on `AuthContext` matches the established convention (`user.backendProfile` already lives there). | Never — convention-locked. |
| **Hierarchical permission inheritance** (admin inherits-from moderator inherits-from user) | RBAC literature loves it. | M1 GATE-04 already shipped flat `can(action)` predicates. Adding inheritance now would force a refactor of existing call sites for zero user-visible benefit. Keep it flat. | Never — deliberately flat. |
| **Self-promotion path** (user requests moderator role → admin approves) | "Apply to be a moderator" UI like Reddit/Discord. | Adds queue + notification + screen. M2 admin-driven promotion (admin picks user) is sufficient for a 1-3 mod team. | M3+ if mod team grows. |
| **Chat moderation tooling** | M1 OOS list explicitly carries this forward; chat is its own beast. | Out of scope per PROJECT.md L106 (M1 carry-forward). M2 moderator scope = listings ONLY. | M3+. |

---

## Feature Dependencies

```
ROLE-01 (Mongo userType field as authority — backend)
    └──requires──> Backend coordination on Railway side (D-22 Path B follow-up)
    └──requires──> JWKS-based ID-token verification on backend (NOT firebase-admin SDK)
        └──unlocks──> ROLE-02 (Server-resolved role on AuthContext)
            └──unlocks──> ROLE-03 (Re-fetch on app foreground + 403 retry)
            └──unlocks──> MOD-01 (Listing status field with 4 states)
                ├──unlocks──> MOD-02 (Owner sees status pill + rejection reason)
                ├──unlocks──> MOD-03 (Pending/rejected/archived deep-link guard)
                ├──unlocks──> MOD-04 (Moderation Queue screen)
                │   └──unlocks──> MOD-05 (Approve / Reject actions + canned reasons)
                │   └──unlocks──> MOD-06 (Edit-on-behalf-of-owner)
                │   └──unlocks──> MOD-09 (Optimistic claim — 409 If-Match)
                └──unlocks──> ARCH-01 (Owner-initiated archive)
                    └──unlocks──> ARCH-02 (Mod/admin-initiated archive)
                    └──unlocks──> ARCH-03 (Owner unarchive → pending, not live)

ROLE-02 (Server-resolved role)
    └──unlocks──> ADMIN-01 (Role Management screen — promote / demote)
        └──unlocks──> ADMIN-02 (Add admin)
        └──unlocks──> ADMIN-03 (Last-admin lockout server guard)
```

### Dependency Notes

- **MOD-01 is the load-bearing dependency** — every moderation feature requires the listing `status` field. Phase ordering MUST land MOD-01 before anything that reads or writes status.
- **ROLE-01/02 are the load-bearing dependencies for admin/mod surfaces** — without server-resolved roles, the M1 hardcoded-allowlist remains the gate, and moderator role doesn't exist at all (M1 only knows admin vs not-admin).
- **ROLE-01 + MOD-01 can be parallelized as backend work** — they're independent schema/endpoint additions on the Railway side. Client-side, they're sequenced because most client features need both.
- **ARCH-03 (unarchive → pending) prevents a security hole** — if unarchive went straight to `live`, an owner could archive a rejection then unarchive to bypass moderation. Treat unarchive as a re-submission, not a restore-to-prior-state.
- **MOD-06 (edit-on-behalf) reuses the existing CreateListing edit flow** — does NOT need a new screen, just gating tweaks (`can('editAnyListing')` allows opening edit for non-owned listings). Saves substantial effort vs. building a separate mod-edit screen.

---

## Edge-Case Inventory (State-Transition Pitfalls)

Specific transitions to design for explicitly in MOD-01 / state machine plan:

1. **Owner edits a `pending` listing** → stays `pending`. Backend should invalidate any in-flight moderator review (e.g., increment a `revisionId`; mod's queue refresh shows updated content). **Without this**, mod approves stale version that owner already changed.
2. **Owner edits a `rejected` listing** → transitions to `pending`. Clears (or archives) `rejectionReason`. Re-enters queue.
3. **Owner edits a `live` listing** → user choice — recommendation: **stays `live` for trivial edits** (price update, photo swap), **transitions to `pending` for material edits** (category change, type change, address change). **Simpler M2 alternative:** all edits to a `live` listing keep it `live`; trust the original approval. Document the chosen rule explicitly.
4. **Mod approves a listing the owner just edited** → 409 If-Match prevents stale approval; mod sees "listing was updated — refresh".
5. **Two mods both click approve simultaneously** → first wins (200), second gets 409. Toast: "Already approved by another moderator".
6. **Mod rejects → owner edits → re-submits → SAME mod re-reviews** → fine, no special handling. Different mod re-reviewing is also fine (no formal appeal flow in M2).
7. **Admin demotes an active moderator while that mod has the queue open** → next queue action returns 403; client re-fetches role (now `user`); UI re-renders without queue access. Banner: "Your role changed".
8. **Owner archives a `pending` listing before mod reviews** → status becomes `archived`. Listing leaves the queue (filter: `status=pending`). No issue; mod doesn't need to act on archived items.
9. **Owner archives a `live` listing** → standard flow; listing disappears from public results. Owner sees it under "Archived" filter on My Listings.
10. **Mod archives an owner's `live` listing without consent** → owner is told via a banner on next app open ("1 listing was archived by a moderator: {reason}"). Owner CAN unarchive (transitions to `pending` for re-review) — this is intentional; archive isn't permanent.
11. **Owner deletes a `pending` listing** → hard delete (existing flow). Removes from queue. Mod doesn't see ghost entries.
12. **Concurrent mod edits same listing** → optimistic; second save returns 409. Same toast pattern.
13. **Owner unarchives a previously-rejected listing** → goes to `pending` (NOT back to `rejected`). Mod re-reviews from scratch. Owner could have edited fixes during archive period.
14. **Admin promotes a user with active rejected listings** → no special handling; the rejected listings remain rejected. New mod role doesn't auto-approve self-listings (separation of concerns — mods can't moderate their own listings; **add as backend rule**).
15. **Mod tries to moderate their own listing** → backend returns 403 / 409 with reason "cannot self-moderate". Surface clearly. Their listing stays in queue for OTHER mods.

---

## MVP Definition

### Launch With (M2 v2.0)

The full table-stakes set above. Roadmapper will sequence into phases (sketch from ROADMAP.md L25-32 maps cleanly):

- [x] **Phase M2.1: Formal Role System** — ROLE-01/02/03 + last-admin lockout (ADMIN-03 server-side)
- [x] **Phase M2.2: Listing Moderation Lifecycle** — MOD-01/02/03 (backend status field + owner-side display + deep-link guard)
- [x] **Phase M2.3: Moderation Queue & Edit-on-Behalf** — MOD-04/05/06 + MOD-09 (optimistic 409) + canned reasons
- [x] **Phase M2.4: Admin UIs** — ADMIN-01/02 (Role Management screen)
- [x] **Phase M2.5: Owner-Side Moderation UX** — ARCH-01/02/03 (archive flows) + owner-side rejection banner

### Add After Validation (M2.x patches)

If user feedback surfaces specific gaps:

- [ ] Owner-side rejection notification via push (requires push milestone first)
- [ ] Queue oldest-first sort indicator + "claim" badge
- [ ] Per-mod throughput stat on admin dashboard (lightweight — count of approvals last 7 days)

### Future Consideration (M3+)

- [ ] Automated moderation (text classifier for common rejection reasons)
- [ ] Full audit log UI (data already persisted; just needs a view)
- [ ] Formal appeal flow
- [ ] Bulk actions
- [ ] Flag action
- [ ] Email/push notifications
- [ ] In-app moderation messaging thread
- [ ] Chat moderation tooling

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| ROLE-01/02 server-resolved role | HIGH (closes GATE-05) | MEDIUM (backend gated) | P1 | Foundation for everything else |
| ROLE-03 foreground re-fetch + 403 retry | MEDIUM (security hardening) | LOW | P1 | Tier-1 RBAC pitfall to skip |
| MOD-01 listing status field | HIGH (core M2 value) | MEDIUM (schema + backend) | P1 | Foundation for Phase M2.2-M2.5 |
| MOD-02 owner sees status + rejection reason | HIGH (loop closes for owner) | LOW | P1 | Makes M2 visible to owners |
| MOD-03 deep-link guard for non-live | MEDIUM (defense-in-depth) | LOW | P1 | One-conditional render in details screen |
| MOD-04 Moderation Queue screen | HIGH (core mod tool) | MEDIUM (new screen + queue endpoint) | P1 | |
| MOD-05 approve/reject + canned reasons | HIGH (queue is empty without it) | LOW (after MOD-04) | P1 | Canned reasons add MEDIUM throughput value at LOW cost |
| MOD-06 edit-on-behalf | MEDIUM (covers edge cases) | MEDIUM (gating tweaks on edit screen) | P1 | User-locked scope |
| MOD-09 optimistic 409 + claim toast | MEDIUM (concurrency safety) | LOW (server-driven) | P1 | Prevents support tickets |
| ADMIN-01/02 role management screen | HIGH (closes "still hardcoded" loop) | MEDIUM (new screen) | P1 | User-locked scope |
| ADMIN-03 last-admin lockout guard | HIGH (safety) | LOW (server-side rule) | P1 | |
| ARCH-01 owner archive | MEDIUM (lifecycle completion) | LOW | P1 | User-locked scope (backlog 999.1 promoted) |
| ARCH-02 mod/admin archive | MEDIUM | LOW | P1 | User-locked scope |
| ARCH-03 unarchive → pending | MEDIUM (closes archive loop safely) | LOW | P1 | |
| Foreground role-refresh banner | MEDIUM (better UX on demotion) | LOW | P2 | |
| Owner-side rejection banner on app open | MEDIUM (reduces support load) | LOW | P2 | |
| Tour-first hospitality preserved in queue | LOW (cosmetic continuity) | TRIVIAL | P2 | Free if MOD-04 reuses existing cards |
| Queue FIFO sort | MEDIUM (collision reduction) | TRIVIAL | P2 | |
| Queue filters (pending/all) | LOW (only matters at scale) | LOW | P3 | |
| Self-moderation prevention (server) | HIGH (safety) | LOW (backend rule) | P1 | Backend-only, but P1 because security |

---

## Competitor Feature Analysis

| Feature | Vrbo / Airbnb-style | Reddit modqueue | Drupal Workflow | JayTap M2 Approach |
|---------|---------------------|-----------------|-----------------|--------------------|
| Lifecycle states | draft, pending, live, archived, removed | reported, approved, removed, spam | draft, needs review, published, archived | **pending, live, rejected, archived** (4 states; no draft — owner posts directly into pending) |
| Approve/reject UI | inline on card | separate queue page with bulk + per-item | "Moderated content" view | **Per-item only on dedicated queue screen — no bulk** |
| Rejection reasons | canned + free-form | free-form | canned | **Canned chips + free-form override** |
| Edit-on-behalf | mod can edit any listing | full mod edit | role-gated edit | **Reuse existing edit screen, gate via `can('editAnyListing')`** |
| Concurrency | locking + presence indicators | implicit, manual coordination | optimistic | **Optimistic 409 — no UI lock** |
| Archive vs delete | distinct (archive preserves, delete removes) | N/A (remove is reversible only by admin) | distinct | **Distinct — archive preserves data + can unarchive; delete remains hard-delete** |
| Owner notification | email + in-app | DM | email | **In-app banner on next app open — no push/email in M2** |
| Audit log | full | full | full | **Server-side fields persisted; no UI in M2 (deferred)** |
| Bulk actions | yes | yes | yes | **NO — explicit anti-feature for M2** |
| Automated moderation | yes (image, text classifiers) | yes (AutoMod, Crowd Control) | optional | **NO — explicit anti-feature for M2** |
| Appeal flow | formal | inbox-based | informal | **NO formal appeal — edit + resubmit suffices** |

**Synthesis:** JayTap's M2 sits closest to **Drupal Workflow's role-based moderation** in shape (states + role-gated transitions + canned reasons + edit-on-behalf) but with **mobile-first single-action UX** rather than admin-dashboard bulk patterns. The deliberate omissions (no bulk, no automation, no formal appeal, no email/push) are scope-cuts appropriate to the JayTap scale (Bishkek-only, ≤3 mods, single-language Russian/English, no production listings yet).

---

## Constraint-Compatibility Check

Cross-referenced with `CLAUDE.md` + `PROJECT.md` constraints — every M2 table-stakes feature is compatible:

- ✓ **No Firebase SDK in repo** — all roles flow Mongo → Railway → REST → client. JWKS verification on backend uses standard JWT libraries, NOT firebase-admin.
- ✓ **No react-navigation migration** — `ModerationQueueScreen` and `RoleManagementScreen` route via existing `App.tsx` boolean state machine.
- ✓ **EN+RU parity** — every new string adds to both locale files; tsc gate enforces.
- ✓ **`useTheme()` tokens** — status pills use existing semantic tokens; no hardcoded colors.
- ✓ **Existing `useRole()` / `<Gated>` API shape** — M2 swaps source (Mongo lookup) without changing call sites; new actions like `editAnyListing`, `archiveAnyListing`, `manageRoles`, `approveListing`, `rejectListing` slot into existing `can(action)` predicate.
- ✓ **Bilingual user base** — canned rejection reasons render translation keys; mod selects key, owner sees their own locale.
- ✓ **Manual physical-device QA bar** — M2 phases will need iOS + Android device walks for any new screen, same as M1.

---

## Sources

- [Marketplace Content Moderation Guide (getstream.io)](https://getstream.io/blog/marketplace-content-moderation/) — pre-moderation vs post-moderation tradeoffs (HIGH)
- [Automating Marketplace Content Moderation With LLMs (Logic.inc)](https://logic.inc/resources/automate-marketplace-content-moderation) — feedback-to-vendor patterns; queue audit logs (MEDIUM)
- [WCVendors AI Content Moderation & Review System](https://www.wcvendors.com/ai-content-moderation/) — vendor-facing review suggestions inline on edit (MEDIUM)
- [Best Practices for Managing Users, Roles, and Permissions (DEV)](https://dev.to/anna_p_s/best-practices-for-managing-users-roles-and-permissions-5140) — three-tier admin/moderator/user pattern (MEDIUM)
- [Role-Based Access Control: Five Common Authorization Patterns (The New Stack)](https://thenewstack.io/role-based-access-control-five-common-authorization-patterns/) — RBAC literature on flat vs hierarchical permissions (HIGH)
- [User Role Management Guide for Marketplaces 2024 (Fleexy)](https://fleexy.dev/blog/user-role-management-guide-for-marketplaces-2024/) — marketplace-specific RBAC patterns (MEDIUM)
- [In the Queue: Understanding How Reddit Moderators Use the Modqueue (arxiv 2509.07314)](https://arxiv.org/html/2509.07314v1) — concurrent-mod collision behavior; FIFO/middle/reverse-order self-organization; lack of formal claim mechanisms across mainstream platforms (HIGH)
- [Moderation Queue (Reddit Help)](https://support.reddithelp.com/hc/en-us/articles/15484440494356-Moderation-Queue) — card-view simultaneous mod work, real-time updates (MEDIUM)
- [Drupal Content Moderation Overview](https://www.drupal.org/docs/8/core/modules/content-moderation/overview) — workflow states + transitions + per-transition permissions (HIGH)
- [Workbench Moderation: Archived state issue (#2651154)](https://www.drupal.org/project/workbench_moderation/issues/2651154) — archived → published edge case in CMS workflows (MEDIUM)
- [Display content moderation form on published revisions (#2875843)](https://www.drupal.org/project/drupal/issues/2875843) — concurrent revision/edit edge cases (MEDIUM)
- [Booking Lifecycle (cal.com via DeepWiki)](https://deepwiki.com/calcom/cal.com/3-api-architecture) — strictly validated state transitions with permission + business rule enforcement (MEDIUM)
- [Deleting vs Archiving: Properties & Units (Pen.do)](https://pen.do/support/difference-between-deleting-and-archiving/) — archive preserves records, delete removes permanently (HIGH)
- [Archive a listing (Vrbo)](https://help.vrbo.com/articles/archiving-a-listing) — real-world property-listing archive UX (HIGH)
- [Archive, Reactivate, or Delete a Property (Rentec Direct)](https://help.rentecdirect.com/article/731-archive-reactivate-or-delete-a-property) — reactivation flow; archive vs delete distinction (HIGH)
- [Archive and delete listings (CommercialRealEstate.com.au)](https://help.commercialrealestate.com.au/hc/en-au/articles/900005849006-Archive-and-delete-listings) — withdrawn-state notification semantics (MEDIUM)
- [What Good Marketplace UX Design Looks Like (Rigby)](https://www.rigbyjs.com/blog/marketplace-ux) — marketplace UX feature checklist (LOW — confirmation only)

## RU-Market Reference Anchor (Avito, Cian)

The above analysis grounded primarily in Western platforms (Vrbo, Rentec, Drupal, Reddit, cal.com). For a Bishkek user base reading Russian, the load-bearing reference platforms are **Avito** and **Cian** — RU-market state names + flow patterns should anchor JayTap's terminology choices for direct user mental-model match.

### State-name parity

| JayTap M2 | Avito | Cian | RU label JayTap should use |
|-----------|-------|------|---------------------------|
| `pending` | На проверке / На модерации | На проверке | **«На модерации»** |
| `live` | Активно / Опубликовано | Активно | **«Активно»** |
| `rejected` | Отклонено (+ Ожидает действия) | Отклонено | **«Отклонено»** |
| `archived` | Снято с публикации / В архиве | Архив | **«Снято с публикации»** (preferred — matches Avito's archive-vs-delete distinction) |

**Why this matters:** Bishkek users almost certainly have prior Avito/Cian exposure. Using established Russian terminology eliminates a translation-friction class of bugs where the moderator UI says one thing and the owner banner says another. EN labels can be more flexible since the EN-speaking landlord/agent segment doesn't have a fixed lexicon.

### Avito patterns worth borrowing

1. **`Ожидает действия` (Awaiting action) badge on rejected listings** — Avito puts rejected listings in a sub-state with an action affordance ("Исправить"/"Fix"). This is the same UX as the Drupal-Workflow-grounded "Edit & resubmit" CTA already proposed in the Lifecycle section above — citing Avito anchors it for RU users.
2. **7-day fix-and-resubmit window** — Avito gives owners 7 days to address rejection before the listing auto-archives. JayTap doesn't need the auto-archive (M2 scope), but the 7-day expectation frames owner urgency.
3. **`Снять с публикации` (archive, restorable for ~30 days) vs `Удалить` (delete, irreversible)** — Avito makes the distinction explicit. JayTap's planned archive vs hard-delete already mirrors this; UI labels should match (archive button = «Снять с публикации», delete button = «Удалить»).
4. **Cian: republishing unchanged rejected listing = ignoring moderator** — strong argument for keeping `rejected` non-terminal but tracking re-submission count if abuse appears. Confirms the existing "rejected is NOT terminal" decision in the Lifecycle table.
5. **Moderation timing communicated publicly** — Avito tells owners "usually under 30 minutes, sometimes up to 2 days." If JayTap can give a similar SLA in copy ("Обычно в течение 24 часов"), owner patience grows.

### Avito gaps JayTap can win on

1. **Canonical rejection reason taxonomy exposed to owner** — Avito does NOT publish its rejection-reason taxonomy; owners frequently complain about not knowing why they were rejected ([vc.ru complaint thread](https://vc.ru/claim/2336867-problemy-s-podachej-ob-yavlenij-na-avito)). JayTap's planned canned reasons + free-form override is a concrete differentiator if owners can see the canonical reason verbatim.
2. **Bilingual moderation transparency** — Avito and Cian operate Russian-only. JayTap's EN+RU parity rule means the rejection-reason taxonomy can serve both Russian-speaking landlords and the EN-speaking agent segment without two separate flows.

### Anti-features (RU-market reinforcement)

- **Real-estate document verification (Avito-style ownership proof)** — Avito requires Rosreestr-level docs for some real-estate categories. Multi-month compliance subproject. **Explicitly NOT in M2.**
- **Automated/AI moderation** — Avito reports 600M moderation decisions/day per AI bot ([vc.ru](https://vc.ru/avito/71145-moderation)). M2 scale (Bishkek-only, ≤3 moderators, no production listings yet) does not justify the dependency surface or false-positive support burden. Confirmed anti-feature. (M3+ once production volume exists.)

### Sources (RU-market)

- [Avito moderation rules and process — elama.ru](https://elama.ru/blog/kak-avito-proveryaet-obyavleniya/) (HIGH)
- [Avito rejection 7-day fix-and-resubmit flow — ppc.world](https://ppc.world/articles/proverka-obyavleniy-na-avito-skolko-dlitsya-i-chto-delat-esli-obyavlenie-otklonili/) (HIGH)
- [Avito hide-vs-delete (`снять с публикации` vs `удалить`) — likestats.io](https://likestats.io/blog/kak-skryt-ili-udalit-obyavlenie-na-avito) (HIGH)
- [Cian quality requirements — support.cian.ru](https://support.cian.ru/ru/knowledge_base/art/204/cat/66/) (HIGH)
- [Cian "rejection = requirement to fix" moderator forum](https://www.cian.ru/forum-rieltorov-objavlenie-otkloneno-moderatorom-273941/) (MEDIUM)
- [Avito 600M moderation decisions/day — vc.ru](https://vc.ru/avito/71145-moderation) (HIGH)
- [Avito complaint thread (owners can't tell why rejected) — vc.ru](https://vc.ru/claim/2336867-problemy-s-podachej-ob-yavlenij-na-avito) (MEDIUM)
- [AIM Group: Cian ramps up moderation in fraud hotspots 2025](https://aimgroup.com/2025/07/27/cian-ramps-up-ads-moderation-in-real-estate-hotspots/) (HIGH)

---
*Feature research for: M2 "Roles & Moderation" — JayTap (RN 0.84 brownfield)*
*Researched: 2026-04-29; RU-market section appended same day*

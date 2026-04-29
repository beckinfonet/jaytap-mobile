# Phase 3: Role Gating Precursor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 03-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 03-role-gating-precursor
**Areas discussed:** Matterport/panoramic gating semantics, Call-site migration scope, Service-layer defense-in-depth (+ backend enforcement default + allowlist contents)

---

## Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Matterport/panoramic gating semantics | Behavior change: hide admin-only URL inputs from non-admin listers today | ✓ |
| Call-site migration scope | Which `isAdmin` / `userType === 'admin'` sites migrate to `useRole()` | ✓ |
| Backend enforcement strategy | Block / accept-known-risk / coordinate-in-parallel for GATE-05 | — (default accepted below) |
| Service-layer defense-in-depth | Wrap PropertyService admin methods with client-side `can()` throw-if-false | ✓ |

**User's choice:** Matterport/panoramic gating semantics + Call-site migration scope + Service-layer defense-in-depth (3 of 4).
**Notes:** Backend-enforcement area deferred to a short default-confirmation at end of discussion.

---

## Area 1 — Matterport / panoramic gating semantics

### Q1.1: Visibility for non-admins on CreateListingScreen

| Option | Description | Selected |
|--------|-------------|----------|
| Hide entirely (Recommended) | Non-admins don't see the section at all. `<Gated action='editMatterportUrl'>` wrap. Aligns with PITFALLS §Pitfall 5 anti-pattern ("shown-but-disabled"). | ✓ |
| Keep visible but read-only / disabled | Gray the fields with a hint. Violates PITFALLS anti-pattern (field existence = info leak; taps with no response = perceived bug). | |
| Keep visible, gate only the save payload | Users can type but values stripped on submit. Silent gate — worst UX. | |

**User's choice:** Hide entirely.
**Notes:** Becomes D-08 in CONTEXT.md.

### Q1.2: Non-admin editing existing listing with pre-populated URLs

| Option | Description | Selected |
|--------|-------------|----------|
| Non-admin sees nothing, URLs preserved on save (Recommended) | Gated section hidden; existing `tours` + `panoramicPhotosUrl` preserved verbatim in submit payload. Requires hidden state population. | ✓ |
| Non-admin sees a read-only summary | "This listing has 3D tours curated by JayTap" disabled note. Adds a new UI surface. | |
| Preserve on save is Claude's Discretion | Hide UI, let planner handle payload preservation. | |

**User's choice:** Non-admin sees nothing, URLs preserved on save.
**Notes:** Becomes D-09. Protects admin-curated URLs from accidental destruction by owners.

### Q1.3: Submit payload branch migration at CreateListingScreen.tsx:396

| Option | Description | Selected |
|--------|-------------|----------|
| Replace isAdmin with can('editMatterportUrl') (Recommended) | Single gate covers both tour and panoramic fields. Minimal diff, forward-compat. | ✓ |
| Split into two can() checks | Granular (editMatterportUrl + editPanoramicUrl). Both admin-only today; no current value. | |
| Let the planner decide | Claude's Discretion. | |

**User's choice:** Single `can('editMatterportUrl')` for both.
**Notes:** Becomes D-10. Planner can split later if actions diverge.

### Q1.4: Verification switches branch (CreateListingScreen.tsx:933)

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to <Gated action='editVerifications'> (Recommended) | Unify all admin gates. Required by GATE-03's "no inline userType === admin" invariant. | ✓ |
| Leave as-is — out of GATE-02 scope | Narrow GATE-02 read. Violates GATE-03. | |

**User's choice:** Migrate to `<Gated action="editVerifications">`.
**Notes:** Part of D-11.

---

## Area 2 — Call-site migration scope

### Q2.1: CreateListingScreen.tsx — 4 isAdmin sites

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate all four (Recommended) | Sites 110, 319, 396, 933 — all read same fact. One file, one grep. | ✓ |
| Only the Phase-3-requirement sites | Migrate 396 + 933, leave 110 + 319 on isAdmin. Inconsistent pattern, grep invariant fails. | |

**User's choice:** Migrate all four.
**Notes:** Becomes D-11.

### Q2.2: ProfileScreen.tsx:33 canManageListings (renter || admin)

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate, extend Action union with 'manageListings' (Recommended) | New action returns true for renter or admin. Keeps grep invariant clean. Forward-compat for M2 moderators. | ✓ |
| Leave as-is — out of Phase 3 scope | Narrow phase to admin-only sites. Creates documented-vs-actual drift with ARCHITECTURE.md. | |
| Migrate but keep action shape minimal | Half-step: use hook but still read userType at call site. Violates spirit of grep invariant. | |

**User's choice:** Migrate + add `manageListings` action.
**Notes:** Becomes D-11 / D-12. Action union grows by one.

### Q2.3: ProfileScreen.tsx:70 — display-only userType reads

| Option | Description | Selected |
|--------|-------------|----------|
| Leave alone — display only (Recommended) | Grep invariant is about GATING, not display. Hook API stays focused. | ✓ |
| Migrate everything that reads userType | Broader scope, low payoff, API bloat. | |

**User's choice:** Leave alone.
**Notes:** Becomes D-13.

### Q2.4: Migration verification bar

| Option | Description | Selected |
|--------|-------------|----------|
| Grep invariant + manual run (Recommended) | `grep -rn 'userType === .admin.' src/` returns zero. Manual device run with admin + non-admin emails. | |
| Grep + unit test for useRole() | Add a lightweight Jest test covering priority ladder. More up-front effort. | ✓ |
| Grep only | Grep + manual smoke. Weakest. | |

**User's choice:** Grep + unit test for `useRole()`.
**Notes:** Becomes D-14 (grep invariant) + D-19 (unit tests). Raises M1 bar slightly (unit tests otherwise rare).

---

## Area 3 — Service-layer defense-in-depth

### Q3.1: Scope of PropertyService methods to guard

| Option | Description | Selected |
|--------|-------------|----------|
| Only patchPlatformVerifications (Recommended) | One method, exclusively admin-called. createProperty/updateProperty are all-user; admin-only fields handled by UI payload gate (D-10). | ✓ |
| Patch verifications + pre-submit payload guard | Add screen-side assertion. ~5 LOC defensive. | |
| All admin-adjacent methods | Wrap createProperty/updateProperty too with admin-field audit. Couples services to React. | |
| No service-layer gate (UI gate only) | Defer entirely to M2. Matches STACK.md §3 minimalism. | |

**User's choice:** Only `patchPlatformVerifications`.
**Notes:** Becomes D-15.

### Q3.2: How to get can() into service-layer code

| Option | Description | Selected |
|--------|-------------|----------|
| Pure helper from AuthService current user (Recommended) | Extract `canFromUser(user, action)` pure function; `useRole()` wraps it. Services call pure helper. | ✓ |
| Move the switch to a plain function, hook is a thin wrapper | Same structure, more refactor. | |
| Service imports useRole() via runtime hack | Breaks "services are React-free" convention. | |

**User's choice:** Pure helper `canFromUser(user, action)`.
**Notes:** Becomes D-16.

### Q3.3: Error UX when service-layer guard fires

| Option | Description | Selected |
|--------|-------------|----------|
| Throw with a translated message + log (Recommended) | `new Error(t('errors.permissionDenied'))` + console.error. i18n key in EN+RU. | ✓ |
| Throw untranslated English error | Defensive-only — skip i18n. Ships English-only to Russian users if race condition triggers. | |
| Silently no-op + return last response | Hides the bug. | |

**User's choice:** Translated message + log.
**Notes:** Becomes D-17 / D-18. Implementation detail flagged: services can't call `t()` directly — services throw an error code (`E_PERMISSION_DENIED`), UI callers translate.

### Q3.4: Verifying the service-layer guard

| Option | Description | Selected |
|--------|-------------|----------|
| Unit test with mock non-admin user (Recommended) | Jest: canFromUser returns false for non-admin; patchPlatformVerifications throws for non-admin. | ✓ |
| Manual — rely on the UI gate catching it first | Defense-in-depth without test = wishful thinking. | |
| Skip the whole service-layer gate then | Consistency signal: if not testing, don't add. | |

**User's choice:** Unit test.
**Notes:** Becomes D-19. Test-framework-check caveat added as D-20.

---

## Area 4 — Backend enforcement (default confirmation, not deep-dived)

### Q4.1: GATE-05 strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Coordinate in parallel, accept as known risk if unconfirmed by M1 ship (Recommended) | Open coordination task at kickoff; if no answer by ship day, add row to PROJECT.md Key Decisions. Matches PITFALLS §Pitfall 5 remediation. | ✓ |
| Block M1 until backend confirms | Safer posture, risks timeline. | |
| Ship M1 without coordinating | Violates GATE-05. | |

**User's choice:** Coordinate in parallel + accept as known risk if unconfirmed.
**Notes:** Becomes D-21 / D-22 / D-23.

### Q4.2: Initial allowlist contents

| Option | Description | Selected |
|--------|-------------|----------|
| Just beckprograms@gmail.com (Recommended) | Project owner only. Adding admin = code edit + store release (explicit M1 friction). | ✓ |
| Owner + one or two ops emails | 2-3 emails if known ops partner exists. | |
| Empty array + add-via-discussion-later | No admin until allowlist-update commit. Safest-by-default but freezes Matterport/panoramic editing. | |

**User's choice:** Just `beckprograms@gmail.com`.
**Notes:** Becomes D-24.

---

## Claude's Discretion

- Exact wave structure (recommended: hook/file creation before migration commits so diffs stay small)
- Co-location vs. file-separation for `PermissionDeniedError` (hook file vs. `src/hooks/errors.ts`)
- Istanbul/coverage ignores on M2-unreachable branches
- Placement of `<Gated>` boundary inside the Matterport tours section (outer View vs. inner content)
- Exact EN/RU wording for `errors.permissionDenied` (key existence + semantic intent locked; phrasing not)
- Visual device-smoke-test cell vs. informal device run (gating is deterministic; no formal matrix)
- `customClaims?: { role?: Role }` type augmentation timing (planner: add now if TS errors, else defer)
- `ProfileScreen` display-copy that reads `userType` for UI labels — Phase 3 owns gating migration only

## Deferred Ideas

- Axios interceptor-based service gating → M2 (PropertyService pattern composes poorly with interceptors)
- In-app admin-promotion UI → M2 ADMIN-01..03
- Moderator role implementations → M2 (actions defined in union for forward-compat, unused in M1)
- Firebase custom-claims integration → M2 ROLE-01
- Backend `Authorization: Bearer <idToken>` middleware → M2 ROLE-04
- Chat moderation tooling → M2 MOD-*
- Listing status lifecycle → M2 MOD-01/02
- Rate-limit allowlist changes via CLI → M2 (current M1 friction is intentional)

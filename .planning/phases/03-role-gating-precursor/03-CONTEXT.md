# Phase 3: Role Gating Precursor - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a single `useRole()` / `can(action)` / `<Gated>` surface over a hardcoded email allowlist, migrate existing admin checks to it, and land the backend-enforcement checkpoint (confirmed OR accepted as a documented risk). The hook/component shape must be forward-compatible with M2 real roles — no call-site changes when the allowlist is replaced by custom-claims-backed roles.

Requirements: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05.

Out of boundary (scope creep redirected): role-promotion UI, moderator flows, formal three-role system, backend token-verification middleware, service-layer axios interceptor (all M2).

</domain>

<decisions>
## Implementation Decisions

### Library, files, and API shape (already locked by REQUIREMENTS.md GATE-01, ARCHITECTURE.md §4, STACK.md §3 — not re-discussed)

- **D-01:** Library-free. Implement as pure hook + pure helper + one-file allowlist constant. No new Context/Provider — `useRole()` is a pure selector over `useAuth()`, matching ARCHITECTURE.md §4 anti-pattern #1 ("Do NOT create a RoleProvider").
- **D-02:** File layout:
  - `src/hooks/useRole.ts` — NEW (first file under `src/hooks/`; create the directory).
  - `src/components/Gated.tsx` — NEW declarative UI guard.
  - `src/constants/adminAllowlist.ts` — NEW. Creates a new `src/constants/` directory; pre-existing `src/constants.ts` FILE continues to live alongside (no path conflict, different paths).
- **D-03:** `useRole()` return shape (verbatim from ARCHITECTURE.md §4): `{ role, isAdmin, isModerator, isAuthenticated, can }`. `role` union `'admin' | 'moderator' | 'user' | 'guest'`. Priority ladder for deriving role: `user.backendProfile.customClaims?.role` (M2, returns undefined today) → `user.backendProfile.userType === 'admin' ? 'admin'` (existing) → `isAllowlistedAdmin(user.email) ? 'admin'` (M1 override) → `user ? 'user' : 'guest'`.
- **D-04:** `Action` union (seeded per ARCHITECTURE.md §4, extended by this phase's Area 2 — see D-11):
  ```
  'editVerifications'      // admin only — maps to <Gated> around verification switches + patchPlatformVerifications gate
  'editMatterportUrl'      // admin only — maps to Matterport tours section visibility AND submit-payload branch
  'editPanoramicUrl'       // admin only — maps to panoramic URL input visibility
  'manageListings'         // renter OR admin — NEW, added by Phase 3 Area 2; maps to ProfileScreen canManageListings
  'editAnyListing'         // M2 future: moderator + admin; defined for forward-compat, unused in M1
  'approveListings'        // M2 future: moderator + admin; defined for forward-compat, unused in M1
  'promoteToModerator'     // M2 future: admin only; defined for forward-compat, unused in M1
  ```
- **D-05:** `can(action)` is the ONLY gating primitive at call sites. No `isAdmin` branching for gating logic; `isAdmin` stays exposed for informational UI only (e.g., a future "Admin" badge). No inline `userType === 'admin'` comparisons remain anywhere in UI or service code after migration (see D-14 grep invariant).
- **D-06:** Email comparison is lowercase-trimmed. `isAllowlistedAdmin(email)` returns `false` for nullish/empty email (guards the unauthenticated path).
- **D-07:** A `// TODO(M2): replace allowlist with role-based implementation` comment MUST exist at the allowlist definition in `adminAllowlist.ts`. A second `// TODO(M2): remove M1 allowlist branch from useRole role-priority ladder` comment MUST sit above the `isAllowlistedAdmin(user.email)` branch in `useRole.ts`. These are the grep-able M2 migration checklist.

### Matterport / panoramic URL field gating (Area 1 — discussed)

- **D-08:** **Hide entirely for non-admins.** The Matterport tours section (`CreateListingScreen.tsx:781-830`, inclusive of section title + hint + tourTitle input + URL input + Add button + tours list) is wrapped in `<Gated action="editMatterportUrl">`. The panoramic URL `TextInput` (`CreateListingScreen.tsx:843-852`) is wrapped in `<Gated action="editPanoramicUrl">`. Rationale: PITFALLS.md §Pitfall 5 explicitly flags shown-but-disabled as an anti-pattern ("users tap, get no response, assume bug; the field's existence is itself info leak"). This IS a behavior change — today all authenticated listers can paste their own tour URLs; after Phase 3 they cannot. Captured intentionally: curated 3D tours are the platform differentiator and the hospitality-showcase promise.
- **D-09:** **Non-admin edit of an existing listing preserves URLs verbatim on save.** When a non-admin opens `CreateListingScreen` in edit mode on a listing that has existing `tours[]` and/or `panoramicPhotosUrl`, the gated sections render nothing. On submit, the existing `tours` and `panoramicPhotosUrl` values MUST be included in the payload unchanged — they do not get blanked out by the gating. Implementation invariant: read existing values into `useState` during `useEffect` initialization even when the user can't see or edit them, then spread them into the submit payload unconditionally (not inside the admin branch). This protects admin-curated URLs from accidental destruction by owners editing their own listings.
- **D-10:** **Single `can('editMatterportUrl')` gate on the submit payload branch** at `CreateListingScreen.tsx:396` (currently `...(isAdmin ? {...} : {})`). Covers both `tours` and `panoramicPhotosUrl` together — they're paired in the M1 action semantics (both admin-only). If M2 ever decouples them, splitting to `can('editMatterportUrl')` vs `can('editPanoramicUrl')` is a one-line change, still no call-site restructure. NOTE: per D-09 this branch only governs the admin-UI-editable writes; existing values from edit-mode initialization flow through outside this branch.

### Call-site migration scope (Area 2 — discussed)

- **D-11:** **Migrate all four `isAdmin` sites in `CreateListingScreen.tsx`** (lines 110, 319, 396, 933), plus `PropertyDetailsScreen.tsx:178`, plus `ProfileScreen.tsx:33`. Concrete per-site migration:
  - `CreateListingScreen.tsx:110` `const isAdmin = user?.backendProfile?.userType === 'admin';` → `const { can, isAdmin } = useRole();` (keep `isAdmin` destructure for any remaining conditional-logic uses that aren't <Gated>-shaped; swap semantic gating uses to `can()`).
  - `CreateListingScreen.tsx:319` `if (!propertyToEdit?.id || !isAdmin) return;` (in `fetchExistingVerifications` callback) → `if (!propertyToEdit?.id || !can('editVerifications')) return;`.
  - `CreateListingScreen.tsx:396` payload spread → `...(can('editMatterportUrl') ? { /* admin-editable URL fields */ } : {})` per D-10.
  - `CreateListingScreen.tsx:933` `{isAdmin && (…verification switches…)}` → `<Gated action="editVerifications">…verification switches…</Gated>`.
  - `PropertyDetailsScreen.tsx:178` `const isAdmin = user?.backendProfile?.userType === 'admin';` → `const { can } = useRole();`; line 401 `{isAdmin && onAdminVerifyDocuments && (...)}` → `<Gated action="editVerifications">{onAdminVerifyDocuments && (...)}</Gated>` (keep the inner `onAdminVerifyDocuments &&` nil-check since that's a prop presence, not a gate).
  - `ProfileScreen.tsx:33` `const canManageListings = userType === 'renter' || userType === 'admin';` → `const { can } = useRole(); const canManageListings = can('manageListings');`.
- **D-12:** **New `manageListings` action semantics.** `can('manageListings')` returns `true` when `role === 'admin'` OR `user?.backendProfile?.userType === 'renter'`. Defined inside the `can()` switch — reads `user` from the hook's closure, so no new parameters. Keeps the 'no direct userType reads in UI' invariant (D-14) intact because the comparison is now encapsulated inside the hook. Forward-compat: M2 may let moderators also manage any listing by extending this case; call site doesn't change.
- **D-13:** **Display-only `userType` reads stay as-is.** `ProfileScreen.tsx:70` (`setUserType(profile.userType || '')` and the local `userType` state used for UI copy/conditionals that aren't gating) are NOT migrated. `useRole()` exposes role for gating, not arbitrary user-type display. Forcing every `userType` read through the hook would bloat its API with app-specific user states for no gain.
- **D-14:** **Grep invariant (exit bar for migration correctness):**
  1. `grep -rn 'userType === .admin.' src/` returns zero matches.
  2. `grep -rn 'backendProfile.userType' src/` returns only the `useRole.ts` hook internals.
  3. `grep -rn 'ADMIN_EMAIL\|adminAllowlist' src/` returns only `useRole.ts` + `adminAllowlist.ts` (no call-site imports of the allowlist or raw email arrays).
  4. `grep -rn 'isAllowlistedAdmin' src/` returns only `adminAllowlist.ts` definition + `useRole.ts` consumer.

### Service-layer defense-in-depth (Area 3 — discussed)

- **D-15:** **Guard `PropertyService.patchPlatformVerifications` only.** Other PropertyService methods (`createProperty`, `updateProperty`) are called by all users; admin-only fields flow through the UI-payload gate from D-10. `patchPlatformVerifications` is the ONE method that's exclusively admin-called, so guarding it is the highest-leverage lowest-coupling defense-in-depth.
- **D-16:** **Extract pure helper `canFromUser(user, action)`.** Located in `src/hooks/useRole.ts` alongside the hook. Signature: `canFromUser(user: BackendUser | null | undefined, action: Action): boolean`. `useRole()` becomes a thin wrapper: derives `user` from `useAuth()` and returns `{ ..., can: (action) => canFromUser(user, action) }`. Services import `canFromUser` directly (no React dependency). This preserves the "services don't depend on React" convention while sharing the switch statement.
- **D-17:** **Guard implementation at the service.** At the top of `patchPlatformVerifications` (after the existing `getUserData()` call at `PropertyService.ts:198`): if `!canFromUser(userData, 'editVerifications')` then `throw new PermissionDeniedError('E_PERMISSION_DENIED')` + `console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId })`. Define a tiny `PermissionDeniedError extends Error` class co-located with `canFromUser` in `useRole.ts` (or a minimal `src/hooks/errors.ts` if the planner prefers separation).
- **D-18:** **Translation boundary.** Services throw with an error code (`E_PERMISSION_DENIED`), NOT a translated string — services don't have access to `t()`. Callers catch the error and translate via `t('errors.permissionDenied')`. New i18n key `errors.permissionDenied` added to both `src/locales/en.json` (per REQUIREMENTS.md — check; locale files are actually `en.ts`/`ru.ts` per codebase scout) and `src/locales/ru.json`. Suggested EN: "You don't have permission to perform this action." Suggested RU: "У вас нет прав для выполнения этого действия." (Planner/translator may refine wording — locked: the key exists in both locales with sensible text.)
- **D-19:** **Unit tests (only tests in M1 — NOT a bar-raise on manual QA).** Two Jest tests under `src/hooks/__tests__/useRole.test.ts` (or nearest project convention — planner picks):
  1. `canFromUser` priority ladder: with `{backendProfile: {customClaims: {role: 'moderator'}}}` → moderator; with `{backendProfile: {userType: 'admin'}}` → admin; with `{email: 'beckprograms@gmail.com'}` → admin; with `{email: 'random@example.com'}` → user; with `null` → guest. Assert `can('editVerifications')` results match.
  2. Service-guard throws: mock `AuthService.getUserData()` to return a non-admin user; `PropertyService.patchPlatformVerifications(...)` rejects with an error whose message is `E_PERMISSION_DENIED`. Admin user case: does NOT throw (mock axios to return success).
- **D-20:** **Test framework check during planning.** If Jest isn't already configured in the repo (codebase scout didn't surface a `jest.config.js` or test scripts in `package.json`), the planner MUST surface this as a Wave 0 gate: either add minimal Jest config (~15 min for this hook test alone) or downgrade this decision to a TypeScript-compile-time assertion test and manual device verification. Does NOT silently skip D-19 without raising it.

### Backend enforcement checkpoint (GATE-05 — default discussed, not deep-dived)

- **D-21:** **Coordinate in parallel; accept as known risk if unconfirmed at M1 ship.** At Phase 3 kickoff (Wave 0 or Wave 1, planner's call), open a coordination task/message to the Railway backend owner asking the concrete question: do these endpoints verify the authenticated user is an admin server-side?
  - `PATCH /properties/:id/verifications` (current: `src/services/PropertyService.ts:190-213`, sends `x-firebase-uid` header)
  - Tour URL writes (currently flow through `PUT /properties/:id/update-property` — `src/services/PropertyService.ts:157`-ish) — confirm whether the backend rejects non-admin PATCH with `tours` or `matterportUrl` in the payload.
- **D-22:** **Two exit paths for GATE-05:**
  - **Confirmed path:** Railway backend team answers "yes, enforced" before M1 submission → phase closes with the answer recorded in `03-CONTEXT.md` supplement or `03-VERIFICATION.md`. No PROJECT.md change needed.
  - **Unconfirmed-at-ship path:** If no answer by M1 submission day, add a row to PROJECT.md Key Decisions: "Accepted risk: client-only gating on admin URL edits in v1.0.4; backend enforcement lands in M2 custom-claims work (ROLE-04)." Cite CONCERNS.md "Firebase uid used as sole auth" as the independent pre-existing risk this rolls into (not a new risk Phase 3 introduces).
- **D-23:** **Phase does NOT block on backend response.** Coordination is a parallel task, not a serial dependency. The phase implementation (hook + migration + guard + tests) ships whether or not backend enforcement is confirmed. What changes is the PROJECT.md Key Decisions row, not the code.

### Allowlist contents + maintenance

- **D-24:** Initial `ALLOWLIST` array: `['beckprograms@gmail.com']`. Just the project owner at M1 ship. Adding a second admin requires a code edit + store release (documented friction, accepted for M1). M2 roles work replaces this with an in-app admin-promotion UI.
- **D-25:** `ALLOWLIST` is declared `as const` and typed-tight so autocomplete doesn't exposure additional emails to future maintainers. Per PITFALLS.md §Pitfall 5 the emails are in the bundle regardless — this is a readability convention, not a security claim.

### Claude's Discretion

- Exact wave structure (e.g., Wave 0 hook + allowlist + Gated; Wave 1 CreateListingScreen migration; Wave 2 PropertyDetailsScreen + ProfileScreen; Wave 3 service guard + tests; Wave 4 backend coordination + exit) — the planner picks. Recommended: hook/file creation as a standalone commit before any call-site migration, so migration commits are small diffs.
- Whether to co-locate `PermissionDeniedError` with `canFromUser` in `useRole.ts` or hive it off to `src/hooks/errors.ts` or similar. Structural preference only; planner's call.
- Whether to add a `/* istanbul ignore next */` or equivalent coverage exclusion on the M2-unreachable branches in `useRole()` (customClaims read, moderator/approveListings action cases) to keep future coverage reports clean.
- Placement of the `<Gated>` boundary inside the Matterport tours section — wrapping the whole `<View style={styles.section}>` at `CreateListingScreen.tsx:781` is clean; wrapping only the inner content (title + inputs + tours list) is also fine. Either works.
- Exact EN/RU wording for the `errors.permissionDenied` i18n key (the user's answers locked the key's existence and semantic intent, not the phrasing).
- Whether to include a one-off visual device-smoke-test cell ("admin vs non-admin CreateListingScreen render") in a matrix doc, or rely on the unit tests + informal device run from D-19. Gating is deterministic, not timing-sensitive — no formal matrix needed; Phase 2's 22-cell matrix is the wrong precedent.
- Whether the `backendProfile.customClaims?.role` read in the priority ladder needs a type augmentation in `src/types/` (today `customClaims` may not exist on `BackendUser`). Planner: if TypeScript errors on the optional chain, add `customClaims?: { role?: Role }` to the backend-user type definition.
- Whether to migrate `RenterApplication`-style text/copy in `ProfileScreen` that currently reads `userType` for display. Phase 3 owns the GATING migration only; display copy is free to keep reading `userType` directly (see D-13).

### Folded Todos

- **Coordinate with Railway backend team in Phase 3 to confirm admin-endpoint enforcement** (from STATE.md "Todos carried forward") — D-21/D-22 codify this as Phase 3 work. Closes the todo regardless of which of the two exit paths is taken.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` lines 73–84 — Phase 3 definition, goal, dependencies (Phase 1), requirements (GATE-01..05), 5 success criteria
- `.planning/REQUIREMENTS.md` lines 53–59 — GATE-01 (hook + component + allowlist exist), GATE-02 (Matterport + panoramic URL fields gated), GATE-03 (existing admin checks migrated, no inline email/userType comparisons), GATE-04 (forward-compat shape), GATE-05 (backend enforcement confirmed OR documented)
- `.planning/STATE.md` lines 52–58 — Phase 3 research flag: "Backend enforcement is the real security boundary; client-side gating is UX only." Todos-carried-forward: backend coordination

### Role-gating architecture (load-bearing — implementation blueprint)
- `.planning/research/ARCHITECTURE.md` §4 "Role Gating Architecture" (lines 261–405) — `useRole()` shape, `can(action)` API rationale, M1 allowlist file, `<Gated>` component, call-site migration BEFORE/AFTER, three-layer defense table, forward-compat checklist, anti-patterns. ALL implementation shape decisions in this phase derive from this section.
- `.planning/research/STACK.md` §3 "Role Gating" (lines 167–230) — "no library needed" rationale; `useRole()` shape (minor naming difference: STACK uses `useIsAdmin()`, ARCHITECTURE uses `useRole()` — ARCHITECTURE wins since it's the more general hook; both agree on allowlist file + hardcoded array). Trust-boundary pitfalls at lines 215–220.
- `.planning/research/STACK.md` §4 "Firebase Identity Toolkit + Role Trustworthiness" (lines 231–280) — M1 vs M2 decision: allowlist in M1 is fine because backend enforcement is the actual security; custom-claims work is M2. Explains WHY D-23 is acceptable.

### Backend-enforcement + security pitfalls
- `.planning/research/PITFALLS.md` §Pitfall 5 "Hardcoded admin email allowlist leaks into VCS, screenshots, logs, and M2 technical debt" (lines 112–140) — the full set of failure modes this phase must avoid: VCS leak is accepted (bundle-visible); dual-gate inconsistency is avoided by D-11 migration; M2-orphaning is avoided by D-07 TODO comments; backend-enforcement pairing is D-21/D-22.
- `.planning/research/PITFALLS.md` §"Security & compliance" table rows (lines 220–245) — "Trusting client-side userType === admin without backend verification" (CRITICAL), "Sending x-firebase-uid header instead of Authorization: Bearer" (informs D-21's specific coordination ask), "Admin-only fields shown-but-disabled to non-admins" (informs D-08 "hide entirely").
- `.planning/research/PITFALLS.md` §Pre-flight checklist (lines 250–270) — "Admin allowlist: lowercased comparison; single source of truth file; consumed via useRole() everywhere; backend endpoint independently verifies; test with curl as non-admin" — all codified in D-05/D-06/D-14/D-21.
- `.planning/codebase/CONCERNS.md` "Firebase uid used as sole auth" (referenced from PITFALLS) — the pre-existing security risk D-22 rolls into when taking the unconfirmed-at-ship path. Cites the exact auth header pattern that backend coordination will address.

### Codebase anchors (source files — call sites to migrate)
- `src/screens/CreateListingScreen.tsx:110` — `isAdmin` declaration, migrates to `useRole()` destructure per D-11.
- `src/screens/CreateListingScreen.tsx:319` — `if (!propertyToEdit?.id || !isAdmin) return;` in `fetchExistingVerifications` callback, migrates to `can('editVerifications')` per D-11.
- `src/screens/CreateListingScreen.tsx:396` — `...(isAdmin ? {...} : {})` submit-payload branch, migrates to `can('editMatterportUrl')` per D-10.
- `src/screens/CreateListingScreen.tsx:781-830` — Matterport tours section (title + hint + tourTitle input + URL input + Add button + tours list), wrapped in `<Gated action="editMatterportUrl">` per D-08.
- `src/screens/CreateListingScreen.tsx:843-852` — panoramic URL `TextInput`, wrapped in `<Gated action="editPanoramicUrl">` per D-08.
- `src/screens/CreateListingScreen.tsx:933` — `{isAdmin && (...verification switches...)}`, wrapped in `<Gated action="editVerifications">` per D-11.
- `src/screens/PropertyDetailsScreen.tsx:178` — `isAdmin` declaration. Line 401 `{isAdmin && onAdminVerifyDocuments && (...)}` wraps in `<Gated action="editVerifications">` per D-11.
- `src/screens/ProfileScreen.tsx:33` — `canManageListings = userType === 'renter' || userType === 'admin'`, migrates to `can('manageListings')` per D-11/D-12.
- `src/screens/ProfileScreen.tsx:70` — `setUserType(profile.userType || '')` for display state, NOT migrated per D-13.
- `src/services/PropertyService.ts:190-213` — `patchPlatformVerifications` method. Service-layer guard added at method top per D-17.
- `src/context/AuthContext.tsx` — `user.backendProfile` shape (`email`, `backendProfile.userType`). Consumed by `useRole()` read-only.
- `src/types/Property.ts:43-48` — `tours`, `matterportUrl`, `panoramicPhotosUrl` property fields. Referenced by D-09 for preserve-on-save invariant.
- `src/locales/en.ts`, `src/locales/ru.ts` — i18n files (note: `.ts` format with exported objects, not `.json` as some research docs mention). New `errors.permissionDenied` key added to both per D-18.

### New files to create (this phase)
- `src/hooks/useRole.ts` — NEW. Hook + `canFromUser` helper + `Action` union + `PermissionDeniedError` (D-16, D-17).
- `src/components/Gated.tsx` — NEW. Declarative UI guard.
- `src/constants/adminAllowlist.ts` — NEW. `ALLOWLIST` array + `isAllowlistedAdmin(email)` + M2 TODO comment (D-06, D-07, D-24).
- `src/hooks/__tests__/useRole.test.ts` (path subject to planner convention) — NEW. Priority-ladder + service-guard tests per D-19/D-20.

### Project-level constraints
- `CLAUDE.md` "Stack Decisions" — `useRole()` library-free hook + hardcoded email allowlist; explicit M1 decision.
- `CLAUDE.md` "Key Conventions" — i18n: EN + RU parity required for every new UI string (D-18).
- `.planning/PROJECT.md` "Key Decisions" table, row "Hardcoded admin email allowlist in M1" — the PROJECT-level rationale this phase delivers against. Also the row where D-22's unconfirmed-at-ship fallback writes its entry.
- `.planning/PROJECT.md` "Out of Scope" — "In-app role promotion UI in M1" (deferred to M2 per D-24); "New authentication providers (OAuth, magic link, 2FA)" (unrelated, not a Phase 3 consideration).
- `.planning/phases/01-nav-reliability/01-CONTEXT.md` D-03 — physical-device QA convention; Phase 3 interprets narrowly (gating is deterministic, one-device-per-platform smoke is sufficient; no matrix needed).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useAuth()` from `src/context/AuthContext.tsx`** — source of truth for `user` and `user.backendProfile.userType`. `useRole()` consumes this read-only; no changes needed to `AuthContext`.
- **`AuthService.getUserData()` (used at `PropertyService.ts:198`)** — already fetches current user's backend profile async. Service-layer guard (D-17) reuses this exact call — no new async dance.
- **Existing i18n pattern (`src/locales/en.ts` / `ru.ts`)** — EN + RU are `.ts` files exporting translation-key objects, not `.json`. Add `errors.permissionDenied` keys in both per D-18, matching existing key-naming convention.
- **Existing `<Gated>`-style conditional patterns** — the codebase already uses inline `{condition && <Component />}` JSX patterns (e.g., `PropertyDetailsScreen.tsx:401`). `<Gated>` is a structured wrapper over the same idiom — drop-in replacement.
- **Phase 2's KeyboardAwareScrollView wrapping of `CreateListingScreen`** — affects line numbering slightly compared to pre-Phase-2 snapshots but does not touch the `isAdmin` sites. Planner should re-grep line numbers before drafting task specs (current CreateListingScreen line numbers were captured post-Phase-2 at 2026-04-23).

### Established Patterns
- **`src/constants.ts` file (NOT directory)** — pre-existing. Phase 3 creates `src/constants/adminAllowlist.ts` which implicitly creates an `src/constants/` directory beside the file. Both coexist per POSIX. Minor readability note — the planner may consider (low-pri, Claude's Discretion) whether to migrate `src/constants.ts` into `src/constants/index.ts` for consistency. NOT Phase 3 scope unless trivially incidental.
- **No `src/hooks/` directory today** — `src/utils/` exists for pure functions; hooks live ad-hoc. Phase 3 establishes `src/hooks/` as the canonical location for React hooks. Add a one-line `.planning/codebase/CONVENTIONS.md` entry documenting this (planner can bundle into a hook-scaffolding commit).
- **Services are React-free** — `src/services/*` import from `axios`, `AuthService`, and types; no React imports. D-16's `canFromUser` pure helper preserves this. Adding a React hook import to any service is the anti-pattern to avoid.
- **Functional components + hooks only** — no class components. `<Gated>` is a functional component with `useRole()` as its only hook.
- **Phase 2's `47a52b7` gap-closure precedent** — "library requires explicit prop" gap surfaced at device walk and landed as atomic follow-up commit. If Phase 3 surfaces a similar discovery (e.g., `useAuth()` return shape differs from ARCHITECTURE.md assumption), precedent is: adjust the hook, annotate research, keep scope contained.

### Integration Points
- **`useRole()` is consumed by**: `CreateListingScreen` (4 sites), `PropertyDetailsScreen` (1 site), `ProfileScreen` (1 site), `Gated` component (1 site), `canFromUser` helper (reused by `PropertyService.patchPlatformVerifications`). Six consumers total in M1; scales to include M2 admin/moderator UIs without API changes.
- **`<Gated>` is used in**: CreateListingScreen (3 wrappers: Matterport section, panoramic input, verification-switches section) + PropertyDetailsScreen (1 wrapper: admin-verify icon button). Four M1 call sites.
- **`canFromUser` pure helper is consumed by**: `PropertyService.patchPlatformVerifications` (service-layer guard). One M1 service consumer; future M2 service-layer migrations use the same primitive.
- **`BackendUser` / `AuthUser` type in `src/context/AuthContext.tsx`** — the `canFromUser` signature takes this type. May need to widen to include `backendProfile.customClaims?: { role?: Role }` for M2 forward-compat; planner decides whether to add the type now (recommended — cheap, avoids M2 surprise) or defer.

</code_context>

<specifics>
## Specific Ideas

- "Admin" semantics in JayTap M1 = project owner + any emails manually added to the allowlist before a store release. Per-admin friction (code edit + re-submission) is intentional, not a bug — M2 ships the in-app promotion UI.
- "Curated 3D tours are the platform differentiator" — this is the product framing that justifies the behavior change in D-08 (non-admin listers can no longer self-serve Matterport URLs). Hospitality showcase hinges on tour quality; letting any user paste any URL dilutes the promise.
- The `PermissionDeniedError` pattern should read like existing `PropertyService` throws — use a recognizable error message token (`E_PERMISSION_DENIED`) that UI catch sites can string-match, not a structural `.code` field. Matches existing service-layer error conventions.
- The M1 `ALLOWLIST = ['beckprograms@gmail.com']` contains a real email — treat it like the bundle-visible secret it is (per PITFALLS §Pitfall 5 remediation: "accept that obfuscation ≠ security"). Do NOT add linting rules that attempt to hide or obfuscate — the correct posture is "backend enforcement is the real security; client list is a UX layer."

</specifics>

<deferred>
## Deferred Ideas

- **Axios interceptor-based service gating** — ARCHITECTURE.md §4 explicitly punts to M2 because the current PropertyService pattern (object-literal methods) doesn't compose cleanly with shared interceptors. D-15 keeps service gating scoped to `patchPlatformVerifications` only for M1.
- **In-app admin-promotion UI** — M2 ADMIN-01, ADMIN-02, ADMIN-03. Requires backend + custom claims (ROLE-01..04).
- **Moderator role implementations** — `editAnyListing`, `approveListings`, `promoteToModerator` actions are DEFINED in the union for forward-compat (D-04) but unused in M1. M2 phases populate the backing logic.
- **Firebase custom-claims integration** — the M2 branch of the role priority ladder (D-03 step 1) will activate when M2 ships ROLE-01. `useRole()` shape unchanged; only the hook internals will populate that branch.
- **Backend `Authorization: Bearer <idToken>` middleware** — M2 ROLE-04 prerequisite. Phase 3's D-21 coordination is about confirming admin enforcement with the current auth pattern; replacing the auth pattern is M2.
- **Chat moderation tooling** — M2 MOD-* scope, unrelated to Phase 3 admin gating.
- **Listing status lifecycle (pending/live/rejected)** — M2 MOD-01, MOD-02. Requires moderator role to exist first.
- **Rate-limit allowlist changes** — the current M1 friction (code edit + store release per admin add) is a feature, not a bug. Any "admin-add CLI" idea belongs in M2 with real roles.

### Reviewed Todos (not folded)

None — the only todo matched to Phase 3 scope ("Coordinate with Railway backend team in Phase 3 to confirm admin-endpoint enforcement") IS folded via D-21/D-22, not reviewed-but-deferred.

</deferred>

---

*Phase: 03-role-gating-precursor*
*Context gathered: 2026-04-23*

---
phase: 03-role-gating-precursor
reviewer: gsd-verifier
reviewed_at: 2026-04-23T00:00:00Z
status: passed
must_haves_verified: 5/5
req_ids_passed: [GATE-01, GATE-02, GATE-03, GATE-04, GATE-05]
req_ids_failed: []
human_verification:
  - "Admin account (iOS): CreateListingScreen — Matterport tours section visible, panoramic URL input visible, verification switches visible"
  - "Admin account (Android): same cells as iOS above"
  - "Non-admin account (iOS): CreateListingScreen new-listing mode — Matterport section absent, panoramic input absent, videoUrl + instagramUrl inputs present, verification switches absent"
  - "Non-admin account (Android): same cells as iOS above"
  - "D-09 preserve-on-save (both platforms): non-admin edits admin-curated listing with tours[] + panoramicPhotosUrl set — save — reload — confirm values unchanged on persisted listing"
  - "PropertyDetailsScreen admin-verify icon (both platforms): admin sees ShieldCheck icon button, non-admin does not"
  - "ProfileScreen canManageListings section (both platforms): admin sees it, renter sees it, plain user does not"
  - "Translation parity: switch to RU, confirm errors.permissionDenied key present (grep -c already confirms key in ru.ts:402; runtime path verification optional)"
---

# Phase 3: Role Gating Precursor — Verifier Verdict

**Phase Goal:** Ship `useRole()` / `can(action)` / `<Gated>` over a hardcoded email allowlist, migrate all existing admin checks to it, and record the backend-enforcement checkpoint (confirmed OR documented as accepted risk). Hook/component shape must be forward-compatible with M2 — no call-site changes when the allowlist is replaced.

**Verified:** 2026-04-23
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Verdict

All five GATE-IDs are verifiably implemented in the codebase: the three new files exist with substantive, correct implementations; all seven call-site migrations are complete; 15/15 Jest tests are GREEN; all four D-14 grep invariants pass on the live tree; and the GATE-05 backend-enforcement checkpoint is correctly documented as accepted risk (D-22 Path B) in `PROJECT.md` Key Decisions. Phase 3 goal is achieved. Physical-device QA items (listed below) are deferred to Phase 8 per the M1 testing bar.

---

## Requirement-by-Requirement Evidence

### GATE-01: `src/hooks/useRole.ts` + `src/components/Gated.tsx` + `src/constants/adminAllowlist.ts` implemented with M1 hardcoded email allowlist

**All three files exist and are substantive.**

**`src/hooks/useRole.ts`**
- Exports `Role` union (`'admin' | 'moderator' | 'user' | 'guest'`), `Action` union (7 actions: 4 M1-active + 3 M2-forward-compat), `PermissionDeniedError`, `canFromUser(user, action)` pure helper, `UseRoleResult` interface, and `useRole()` hook.
- Priority ladder at lines 43-71 implements D-03 order: customClaims (branch 1, M2-inert) → `backendProfile.userType === 'admin'` (branch 2) → `isAllowlistedAdmin(user.email)` (branch 3, M1 allowlist) → `'user'` / `'guest'` (branch 4).
- `useRole()` returns `{ role, isAdmin, isModerator, isAuthenticated, can }` — exact shape from ARCHITECTURE.md §4.
- `canFromUser` switch covers all 7 `Action` literals; no `default` branch (advisory L-02 from REVIEW.md, non-blocking).

**`src/components/Gated.tsx`**
- Functional component accepting `{ action: Action; children: ReactNode; fallback?: ReactNode }`.
- Renders `children` when `can(action)` is true; renders `fallback` (default `null`) otherwise — correct D-08 "hide entirely" posture.
- Uses `useRole()` internally; no direct `isAdmin` reads.

**`src/constants/adminAllowlist.ts`**
- `ALLOWLIST = ['beckprograms@gmail.com'] as const`.
- `isAllowlistedAdmin(email)` normalizes via `trim().toLowerCase()` and returns `false` for nullish/empty input (D-06).
- `TODO(M2): replace allowlist with role-based implementation` comment present at line 4 (D-07, grep confirmed).

**Test evidence:**
- `src/hooks/__tests__/useRole.test.ts` — 8/8 tests GREEN: branches 2/3/4, case-insensitive, whitespace-trim, `manageListings` semantics, `editMatterportUrl`/`editPanoramicUrl` admin-only.
- `src/components/__tests__/Gated.test.tsx` — 3/3 tests GREEN: renders children when allowed, hides when denied, renders explicit fallback.
- `npx jest --runInBand` output: `Test Suites: 4 passed, 4 total` / `Tests: 15 passed, 15 total`.

**GATE-01: PASS**

---

### GATE-02: Matterport + panoramic URL fields in `CreateListingScreen` gated; other fields remain editable

**Three `<Gated>` wrappers verified in `CreateListingScreen.tsx`:**

| Site | Action | Lines | Scope |
|------|--------|-------|-------|
| Matterport tours section | `editMatterportUrl` | 784-834 | Full `<View style={styles.section}>` including title, hint, tourTitle input, URL input, Add button, tours list |
| Panoramic URL `<TextInput>` | `editPanoramicUrl` | 848-857 | TextInput only — `videoUrl` (lines 839-846) and `instagramUrl` (lines 858-866) are sibling elements OUTSIDE the `<Gated>` wrapper, visible to all authenticated users |
| Verification switches | `editVerifications` | 940-950 | Full verification section |

**Panoramic wrap scope confirmed correct:** `videoUrl` TextInput at lines 839-846 is above `<Gated action="editPanoramicUrl">` (line 848); `instagramUrl` TextInput at lines 858-866 is below the closing `</Gated>` (line 857). Non-admins see both video and instagram URL fields. D-08 and REVIEW.md "Nothing to Flag" panoramic-wrap-scope item confirmed.

**D-09 preserve-on-save invariant confirmed:**
- `panoramicPhotosUrl` loaded unconditionally at line 187: `setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '')`
- `tours` loaded unconditionally at lines 204-211 from `propertyToEdit.tours`
- Both spread into submit payload unconditionally at lines 392 and 396 (outside the `can('editVerifications')` branch at line 398)
- Non-admin save does not blank admin-curated URLs

**D-10 Q1 anti-pattern gate confirmed:**
- Submit payload branch at `CreateListingScreen.tsx:398` uses `can('editVerifications')` — not `can('editMatterportUrl')`. This gates only `platformVerifications` writes; `panoramicPhotosUrl` and `tours` flow through unconditionally per D-09. REVIEW.md "Nothing to Flag" D-10 item confirmed.

**GATE-02: PASS**

---

### GATE-03: Existing `userType === 'admin'` check at `PropertyDetailsScreen.tsx:178` (and scattered sites) migrated to `useRole()`; no new call site hardcodes email strings or `userType` literals

**All seven D-11 migration sites verified:**

| File | Old pattern | New pattern | Verification |
|------|------------|-------------|--------------|
| `CreateListingScreen.tsx:112` | `isAdmin = user?.backendProfile?.userType === 'admin'` | `const { can } = useRole()` | grep line 22: `import { useRole }`, line 112: `const { can } = useRole()` |
| `CreateListingScreen.tsx:321` | `if (!propertyToEdit?.id \|\| !isAdmin) return` | `if (!propertyToEdit?.id \|\| !can('editVerifications')) return` | grep line 321 confirmed |
| `CreateListingScreen.tsx:398` | `...(isAdmin ? {...} : {})` | `...(can('editVerifications') ? {...} : {})` | read lines 398-406 confirmed |
| `CreateListingScreen.tsx:940` | `{isAdmin && (<verification switches>)}` | `<Gated action="editVerifications">` | read lines 940-950 confirmed |
| `PropertyDetailsScreen.tsx:180` | `isAdmin = user?.backendProfile?.userType === 'admin'` | `const { can } = useRole()` | grep line 180 confirmed |
| `PropertyDetailsScreen.tsx:403` | `{isAdmin && onAdminVerifyDocuments && (...)}` | `<Gated action="editVerifications">{onAdminVerifyDocuments && (...)}` | read lines 403-413 confirmed |
| `ProfileScreen.tsx:35` | `canManageListings = userType === 'renter' \|\| userType === 'admin'` | `const canManageListings = can('manageListings')` | grep lines 25/35 confirmed |

**D-14 grep invariants — all 4 PASS (live run `./scripts/check-role-grep.sh` 2026-04-23):**

```
OK   #1: no inline userType === 'admin' comparisons outside useRole.ts
OK   #2: backendProfile.userType read only inside useRole.ts
OK   #3: allowlist identifiers confined to useRole.ts + adminAllowlist.ts
OK   #4: isAllowlistedAdmin symbol confined to its definition + hook consumer
PASS: all 4 D-14 grep invariants hold
```

**D-13 display-only reads preserved:** `ProfileScreen.tsx` lines 28/72 use `const [userType, setUserType] = useState<string>('')` and `setUserType(profile.userType || '')` for display copy only — not a gating comparison, not migrated, correct per D-13.

**`backendProfile.userType` location check:**
- `grep -rn "backendProfile\.userType" src/` returns only `src/hooks/useRole.ts:39` (JSDoc comment) and `src/hooks/useRole.ts:56` (branch 2 comparison) — no other files.

**GATE-03: PASS**

---

### GATE-04: Hook + component shape forward-compatible with M2 — no call-site changes needed when allowlist is replaced by role-based implementation

**Forward-compat evidence verified in `src/hooks/useRole.ts`:**

- `Action` union includes 3 M2-forward-compat actions unused in M1: `editAnyListing`, `approveListings`, `promoteToModerator` (lines 20-22). M2 phases extend `canFromUser` switch cases for these without changing call sites.
- `Role` union includes `'moderator'` (line 9), M2-dead-code today, ready for activation.
- Branch 1 of `deriveRole` (lines 50-53) reads `user?.backendProfile?.customClaims?.role` — currently `undefined` in production; activates silently when M2 ROLE-01 populates custom claims via `firebase-admin`. Call sites require zero changes.
- Two `TODO(M2)` grep-able checkpoints exist per D-07:
  - `adminAllowlist.ts:4`: `TODO(M2): replace allowlist with role-based implementation`
  - `useRole.ts:49`: `TODO(M2): activate once ROLE-01 ships`
  - `useRole.ts:64`: `TODO(M2): remove M1 allowlist branch from useRole role-priority ladder`
- `can(action)` API accepts action strings, not role names — M2 swap of priority-ladder internals requires no call-site restructure anywhere (verified: all 7 migrated sites call `can('editVerifications')`, `can('manageListings')`, etc.).

**GATE-04: PASS**

---

### GATE-05: Backend enforcement checkpoint — confirmed OR documented as accepted known risk

**D-22 Path B taken. No response from Railway backend team by M1 ship deadline.**

**Checkpoint recorded in three locations (all verified):**

1. `.planning/PROJECT.md` line 124 — Key Decisions row: "Accepted as known risk — not confirmed by Railway team by release cut. Release proceeds per D-22. Client-side gating (useRole + Gated + D-08 hide-entirely + Plan 04 service-layer canFromUser guard) reduces in-app blast radius but does NOT close raw-HTTP / non-admin-with-valid-Firebase-uid bypass. ... M2 ROLE-04 ships firebase-admin SDK + signed-ID-token verification to close the gap."

2. `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` — Status: `UNCONFIRMED-AT-SHIP`. Exact coordination question preserved verbatim for project owner to route post-ship.

3. `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` GATE-05 section — full rationale, both endpoints disposition.

**Service-layer defense-in-depth confirmed present (not a GATE-05 substitute, but reduces in-app blast radius):**
- `src/services/PropertyService.ts:203-205`: `if (!canFromUser(userData, 'editVerifications')) { console.error(...); throw new PermissionDeniedError(); }` — fires before `axios.patch`.
- `src/services/__tests__/PropertyService.test.ts` — 3/3 tests GREEN: non-admin throws `E_PERMISSION_DENIED` + axios not called; admin does not throw; allowlisted-email user does not throw.

**GATE-05: PASS (passed-with-accepted-risk — D-22 Path B). This requirement is conditionally closed: the checkpoint was recorded, the risk was accepted, and the work is fully traceable. Raw-HTTP bypass remains open until M2 ROLE-04.**

---

## Gaps

None. All five GATE-IDs verified in the codebase. The four advisories from `03-REVIEW.md` (M-01 i18n catch-block, L-01 cd guard, L-02 missing default case, L-03 Branch 1 test coverage) are advisory-level only — none are goal-blocking, and none affect GATE-01 through GATE-05 achievement.

---

## Human Verification Items

Per CLAUDE.md M1 testing bar: manual physical-device QA on iOS and Android physical devices. These items are not preconditions for this verification record — they are the Phase 8 release-prep checklist.

### 1. Admin gating — CreateListingScreen (iOS)

**Test:** Sign in with `beckprograms@gmail.com` (or any allowlisted email), open Create Listing.
**Expected:** Matterport tours section visible; panoramic URL input visible; verification switches (ownership, identity, state-issued) visible. Video URL and Instagram URL inputs also visible (non-gated siblings).
**Why human:** UI conditional rendering depends on live `useAuth()` session; cannot verify rendered state from static grep.

### 2. Admin gating — CreateListingScreen (Android)

**Test:** Same as item 1 on Android physical device.
**Expected:** Same as item 1.
**Why human:** New Architecture (Fabric) rendering behavior may differ from iOS; platform-specific confirm required.

### 3. Non-admin gating — CreateListingScreen (iOS)

**Test:** Sign in with a non-allowlisted account (not `beckprograms@gmail.com`, `userType !== 'admin'`), open Create Listing.
**Expected:** Matterport tours section absent; panoramic URL input absent; verification switches absent. Video URL and Instagram URL inputs still present (D-08 correct scope).
**Why human:** Gating is session-dependent; static analysis confirms the conditional path exists but cannot verify it fires correctly for a real non-admin session.

### 4. Non-admin gating — CreateListingScreen (Android)

**Test:** Same as item 3 on Android physical device.
**Expected:** Same as item 3.
**Why human:** Platform-specific confirm.

### 5. D-09 preserve-on-save — non-admin edit of admin-curated listing (both platforms)

**Test:** With admin account, create a listing with a Matterport URL and panoramic URL set. Switch to non-admin account, open that listing in edit mode, make a text change (e.g., description), and save. Reload the listing.
**Expected:** `tours[]` and `panoramicPhotosUrl` on the persisted listing are unchanged after the non-admin save.
**Why human:** Requires a real backend round-trip to verify the payload was not blanked; static analysis confirms the state initialization and payload spread are correct, but end-to-end persistence must be confirmed on a live backend.

### 6. PropertyDetailsScreen admin-verify icon (both platforms)

**Test:** View any listing's detail screen as admin, then as non-admin.
**Expected:** Admin sees the ShieldCheck icon button in the header right actions; non-admin does not see it.
**Why human:** Rendered output is session-dependent.

### 7. ProfileScreen canManageListings section (both platforms)

**Test:** View Profile screen as admin, as a user with `userType === 'renter'`, and as a plain user.
**Expected:** Admin sees the listing management section; renter sees it; plain user (`userType !== 'renter'`, not admin) does not.
**Why human:** Requires three distinct authenticated sessions to verify the `can('manageListings')` D-12 semantics at runtime.

### 8. Translation parity — errors.permissionDenied (RU)

**Test:** Switch app language to Russian. If any runtime path surfaces a `PermissionDeniedError` catch alert (e.g., by forcing a non-admin call to `patchPlatformVerifications` via developer tooling), confirm the alert body shows the Russian localized string.
**Expected:** Alert shows "У вас нет прав для выполнения этого действия." (not the raw `E_PERMISSION_DENIED` token).
**Note:** The key is confirmed present in `src/locales/ru.ts:402` via grep. Runtime verification applies only if the path is reachable in the test build. The advisory M-01 from `03-REVIEW.md` documents that the catch block does not yet translate the token — the key exists but may display raw in the current build. Acceptable for M1 since the path is defense-in-depth only (unreachable for non-admins via normal UI flow).

---

_Verified: 2026-04-23_
_Verifier: Claude (gsd-verifier)_

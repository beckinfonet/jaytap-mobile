---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 11
subsystem: rn-client/services
type: execute
wave: 8
status: complete
tags: [role-05, hf-04, apiclient-migration, services-collapse, socket-auth]
requirements_completed: [ROLE-05, HF-04]
threat_refs: [T-1-05]
dependency_graph:
  requires:
    - "Plan 10 src/services/apiClient.ts (shared axios instance + interceptors)"
    - "Plan 10 src/services/AuthService.ts.refreshIdToken (used by interceptor)"
    - "Plan 06 backend role middleware (dual-accept Bearer + x-firebase-uid until D-05)"
    - "Plan 07 backend io.use() socket handshake (dual-accept auth.token + auth.firebaseUid until D-05)"
  provides:
    - "PropertyService: all backend HTTP via apiClient; FormData multipart preserved"
    - "FavoritesService: all backend HTTP via apiClient; soft-auth GET shortcut preserved"
    - "ChatService: HTTP via apiClient; HF-04 socket handshake switched to auth: { token } (Firebase ID token)"
    - "AppointmentService: all backend HTTP via apiClient"
    - "5-service consolidation symmetry complete on the client side (CONCERNS.md 'Duplicated service boilerplate' closed)"
  affects:
    - "src/screens/ChatThreadScreen.tsx (call site update for new async connectSocket signature)"
tech_stack:
  added: []
  patterns:
    - "Shared apiClient + Bearer auto-attach via request interceptor (no per-service getHeaders())"
    - "FormData multipart upload via apiClient (no manual Content-Type — axios sets boundary)"
    - "Socket.io auth-token handshake (HF-04) — Firebase ID token verified server-side via JWKS"
    - "Async-IIFE inside useEffect with cancelled flag (handles race between teardown and async connect)"
key_files:
  created: []
  modified:
    - "src/services/PropertyService.ts (-44/+18; 250→208 LOC; 7 axios.* calls -> apiClient.*; FormData Content-Type header dropped on 2 calls)"
    - "src/services/FavoritesService.ts (-39/+13; 152→126 LOC; 5 axios.* calls -> apiClient.*; soft-auth GET shortcut preserved)"
    - "src/services/ChatService.ts (-31/+47; 105→107 LOC; 8 axios.* calls -> apiClient.*; getHeaders helper deleted; connectSocket now async with `auth: { token }`)"
    - "src/services/AppointmentService.ts (-37/+11; 105→81 LOC; 8 axios.* calls -> apiClient.*; getHeaders helper deleted)"
    - "src/screens/ChatThreadScreen.tsx (+22/-7; 1 connectSocket call site updated; socketRef typed as Socket)"
decisions:
  - "Kept `firebaseUid` body fields in PropertyService FormData/JSON bodies — backend (Plan 06) now derives uid from JWKS-verified Bearer (req.user.uid) but the dual-accept body field stays inside the D-04 window until backend cutover in Phase 6 (D-05)."
  - "Soft-auth GET shortcut preserved on FavoritesService.getFavorites and FavoritesService.checkFavorite — anonymous (`!userData?.localId`) returns []/false locally without round-trip. Plan 11 explicitly allowed either path; chose the round-trip-skip path to avoid an unnecessary network call when the user is logged out."
  - "Used an async-IIFE + `cancelled` flag in ChatThreadScreen useEffect to keep the cleanup function synchronous while still awaiting the now-async connectSocket. If teardown races the awaiting connect, the resolved socket is disconnected immediately."
  - "Marked unused LOCAL_WS with `void LOCAL_WS;` rather than deleting it — keeps the dev-mode shape on file for future re-enablement and avoids a `noUnusedLocals` error."
metrics:
  duration_seconds: 245
  duration_human: "4m 5s"
  tasks: 2
  task_commits: 2
  files_modified: 5
  loc_delta: "-43 (139 inserted / 182 deleted)"
  tsc_error_count: 2
  tsc_baseline_match: true
  completed_date: "2026-04-30"
---

# Phase 01 Plan 11: RN Client Service Migration to apiClient (5-Service Collapse + HF-04) Summary

**One-liner:** Migrated 4 RN client services (Property, Favorites, Chat, Appointment) from direct `axios` + duplicated `getHeaders()`/`PRODUCTION_URL` boilerplate to the shared `apiClient` from Plan 10, and switched `ChatService.connectSocket` to send `auth: { token }` (HF-04) — closing the 5-service consolidation symmetry on the client side.

## What Was Built

Two atomic refactor commits eliminated 5 duplicated patterns across 4 service files (≈140 LOC of boilerplate replaced with 12 import lines + a shared client). Net effect: every backend HTTP call from the RN client now flows through ONE configured axios instance (`apiClient`) that handles `Authorization: Bearer` injection, 401 silent-refresh, and 403 role-revoked retry from a single place. AuthService remains intentionally on direct `axios` because it talks to Firebase Identity Toolkit (`identitytoolkit.googleapis.com` / `securetoken.googleapis.com`), not the JayTap backend.

The HF-04 client-side switch (socket.io `auth: { token }`) closes the second half of the dual-accept handshake started in Plan 07 — backend already JWKS-verifies tokens and only auto-joins `user:<verified_sub>`, so even a malicious build sending a fake token cannot subscribe to another user's room (T-1-05 mitigation).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Migrate PropertyService + FavoritesService to apiClient | `9890258` | `src/services/PropertyService.ts`, `src/services/FavoritesService.ts` |
| 2 | Migrate ChatService (HTTP + HF-04 socket auth switch) + AppointmentService; update ChatThreadScreen call site | `0ec1a84` | `src/services/ChatService.ts`, `src/services/AppointmentService.ts`, `src/screens/ChatThreadScreen.tsx` |

## Per-File Edits

### `src/services/PropertyService.ts` (250 → 208 LOC)

- `import axios from 'axios'` → `import { apiClient } from './apiClient'` (kept `AuthService` import for `getUserData()`; removed `Platform` import — no longer needed since URL constants gone)
- Deleted `PRODUCTION_URL` / `LOCAL_URL` / `API_URL` constants (apiClient owns the baseURL)
- Converted 7 `axios.get/post/put/patch/delete(${API_URL}/...)` → `apiClient.*('/...')`
- Removed every `headers: { 'x-firebase-uid': userData.localId }` block
- Removed manual `Content-Type: 'multipart/form-data'` header on the 2 FormData uploads (`createProperty` / `updateProperty`) — axios auto-detects FormData and sets the boundary correctly; setting it manually strips the boundary and breaks uploads
- Kept `firebaseUid` as a FormData/JSON body field on writes — D-04 dual-accept window. Backend (Plan 06) now derives uid from `req.user.uid`, so this is redundant on the server but harmless until the Phase 6 cutover (D-05).

### `src/services/FavoritesService.ts` (152 → 126 LOC)

- Same import swap + URL-constant cleanup
- Converted 5 `axios.*` calls → `apiClient.*`; removed all `x-firebase-uid` headers
- **Soft-auth GET preserved**: `getFavorites` and `checkFavorite` keep the early-return when `!userData?.localId` (return `[]` / `false` locally without a round-trip). The plan explicitly allowed either path; we chose the no-round-trip path because it avoids an unnecessary network call for anonymous browsing. The backend GET route is still soft-auth (Plan 06), so logged-in users now send Bearer (auto-attached) and the backend resolves favorites by verified uid.

### `src/services/ChatService.ts` (105 → 107 LOC)

- Replaced `import axios from 'axios'` with `import { apiClient } from './apiClient'`
- Added `import AsyncStorage from '@react-native-async-storage/async-storage'` (needed for the new socket auth payload)
- Deleted PRODUCTION_URL / LOCAL_URL / API_URL HTTP constants and the `getHeaders()` helper
- Kept WS_URL (PRODUCTION_WS) — apiClient is HTTP-only, so socket.io still needs an explicit websocket origin
- Converted 8 `axios.*` calls → `apiClient.*` (drop `${API_URL}/` prefix and the `headers` arg)
- **HF-04 socket switch**: `connectSocket` signature changed
  - Before: `(firebaseUid: string, onNewMessage: ...) => Socket` with `auth: { firebaseUid }`
  - After: `(onNewMessage: ...) => Promise<Socket>` (now async; reads `userToken` from AsyncStorage and sends `auth: { token }`)

### `src/services/AppointmentService.ts` (105 → 81 LOC)

- Same boilerplate cleanup pattern: `axios` → `apiClient`, URL constants deleted, `getHeaders()` helper deleted
- Converted 8 `axios.*` calls → `apiClient.*`

### `src/screens/ChatThreadScreen.tsx` (call site update — 1 of 1)

The single call site of `ChatService.connectSocket` (grep across `src/` and `App.tsx` returned exactly one hit) was updated to:

1. Import the `Socket` type from `socket.io-client` for the `socketRef` typing.
2. Type `socketRef` as `useRef<Socket | null>(null)` instead of `ReturnType<typeof ChatService.connectSocket>` (which is now `Promise<Socket>`).
3. Wrap the `connectSocket` call in an async-IIFE inside the existing `useEffect` so the cleanup function remains synchronous. Added a `cancelled` flag so a teardown that races the in-flight awaited connect still disconnects the resolved socket cleanly.
4. Dropped the `firebaseUid` arg.

## AuthService — Intentionally Unchanged

`AuthService.ts` was NOT touched. Its `signIn`, `signUp`, `refreshIdToken`, `sendPasswordResetEmail`, `verifyEmail`, etc. all hit Firebase Identity Toolkit (`https://identitytoolkit.googleapis.com/v1/...`) and `https://securetoken.googleapis.com/v1/token`, NOT the JayTap backend. Routing them through `apiClient` (which has `baseURL: '.../api'`) would break them. Its `createBackendUser` / `getBackendUser` / `deleteAccount` calls do hit the backend but are out of plan scope (Plan 11 explicitly excluded AuthService per the executor prompt; future cleanup could fold them in but is not in the must_haves).

## Verification

### Static (acceptance criteria)

| Criterion | Result |
|---|---|
| `import { apiClient } from './apiClient'` present in 4 files | PASS |
| ZERO `import axios` in 4 modified service files | PASS |
| ZERO `x-firebase-uid` in `src/services/` | PASS |
| ZERO `PRODUCTION_URL` in 4 modified service files (apiClient.ts retains it) | PASS |
| `auth: { token }` present in ChatService.ts | PASS |
| ZERO literal `auth: { firebaseUid }` in ChatService.ts (initial draft had it in a comment; re-worded to "legacy uid-based handshake" before commit) | PASS |
| ZERO `const getHeaders` in ChatService.ts and AppointmentService.ts | PASS |
| All `connectSocket(` call sites updated (no remaining `connectSocket(uid, ...)`) | PASS — 1/1 |
| `npx tsc --noEmit` exits with baseline error count (2 ThemeContext deferred items) | PASS — exactly 2 errors, both `src/theme/ThemeContext.tsx:27` and `:36` (pre-existing per `deferred-items.md`) |
| Commit messages tagged `[ROLE-05]` and `[HF-04]` | PASS — both commits include the tags |

### Dynamic / manual smoke

Per the plan's verify section, manual physical-device smoke (sign-in → browse → favorite → chat thread + socket → schedule a viewing) is required to record in `01-VALIDATION.md`. **Not executed in this autonomous run** (no device available to the executor). Recommended next step: run the 5-surface smoke against TestFlight or a debug build before merging Plan 12 work and append results to `01-VALIDATION.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed manual `Content-Type: multipart/form-data` header from PropertyService FormData uploads**
- **Found during:** Task 1
- **Issue:** `createProperty` and `updateProperty` were setting `'Content-Type': 'multipart/form-data'` manually. This strips the multipart boundary that axios would otherwise generate, causing the multer parser on the server to reject the body with "Multipart: Boundary not found". The plan's per-file gotchas (PATTERNS.md) explicitly flag this — "If the existing code has an explicit `'Content-Type': 'multipart/form-data'` line, DELETE it — it forces a missing-boundary header that breaks the upload."
- **Fix:** Removed both Content-Type assignments; let axios auto-detect FormData and set Content-Type with the correct boundary.
- **Files modified:** `src/services/PropertyService.ts`
- **Commit:** `9890258`

**2. [Rule 1 — Bug] Drop the `Platform` import from PropertyService**
- **Found during:** Task 1 (post-edit tsc)
- **Issue:** With URL constants removed, `Platform` was no longer referenced. Left in place it would bloat the import surface and (under stricter `noUnusedLocals`) could fail the build.
- **Fix:** Dropped the `import { Platform } from 'react-native'` line.
- **Files modified:** `src/services/PropertyService.ts`
- **Commit:** `9890258`

**3. [Rule 3 — Blocking] Marked `LOCAL_WS` as referenced via `void LOCAL_WS;` in ChatService**
- **Found during:** Task 2
- **Issue:** With the WS_URL constant kept (apiClient is HTTP-only, socket.io needs its own origin), `LOCAL_WS` became unused. Deleting it would lose the dev-mode shape; leaving it would risk a `noUnusedLocals` error.
- **Fix:** Used `void LOCAL_WS;` to silence the warning while keeping the constant on file for future dev re-enablement.
- **Files modified:** `src/services/ChatService.ts`
- **Commit:** `0ec1a84`

**4. [Rule 3 — Blocking] Re-worded ChatService comment containing literal `auth: { firebaseUid }`**
- **Found during:** Task 2 (post-edit grep verification)
- **Issue:** The first draft's documentation comment included the exact string `auth: { firebaseUid }` to describe what was being replaced. The plan's automated verify clause `! grep -q "auth: { firebaseUid }" src/services/ChatService.ts` would fail on a comment match.
- **Fix:** Re-worded the comment to "switched from the legacy uid-based handshake".
- **Files modified:** `src/services/ChatService.ts`
- **Commit:** `0ec1a84`

### Architectural Decisions Made (no checkpoint needed)

- **Kept `firebaseUid` in PropertyService FormData/JSON write bodies** rather than removing them. Plan only mandated removing **headers**. Body fields are dual-accepted by the backend during the D-04 window. Removal can land with the Phase 6 cutover (D-05).
- **Soft-auth GET path on FavoritesService kept the local short-circuit** rather than letting all GETs fly with no token. Plan explicitly allowed either path.

## Authentication Gates Encountered

None.

## Known Stubs

None — every modification wires real data flow through `apiClient`. No empty arrays, placeholder strings, or unwired props were introduced.

## TDD Gate Compliance

N/A — `type: execute` plan (not `type: tdd`). No test commits required by the plan; the `apiClient` interceptor pair from Plan 10 is what the new code exercises in production.

## Threat Flags

None — the migration only re-routes existing HTTP/socket calls through a centrally-configured client. No new endpoints, auth paths, file access patterns, or trust boundaries introduced. T-1-05 (mitigate) is the only threat referenced; the HF-04 socket-token switch is part of its mitigation and was applied as planned.

## Self-Check: PASSED

- File: `src/services/PropertyService.ts` — FOUND, modified
- File: `src/services/FavoritesService.ts` — FOUND, modified
- File: `src/services/ChatService.ts` — FOUND, modified
- File: `src/services/AppointmentService.ts` — FOUND, modified
- File: `src/screens/ChatThreadScreen.tsx` — FOUND, modified
- Commit: `9890258` — FOUND in `git log` (Task 1)
- Commit: `0ec1a84` — FOUND in `git log` (Task 2)
- AuthService.ts — UNCHANGED (verified via `git diff HEAD~2..HEAD -- src/services/AuthService.ts` returns empty)
- apiClient.ts — UNCHANGED (verified — Plan 10 owns it)
- tsc baseline — 2 errors, both ThemeContext, identical to Plan 10 deferred-items.md baseline

# Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 01-backend-role-foundation-auth-migration-hotfix-bundle
**Areas discussed:** Hotfix sequencing & deploy order, Migration mechanics (ROLE-02 + M1 admin seed), Token refresh + role-revocation UX
**Areas not selected:** apiClient.ts consolidation scope (defaulted to Claude's Discretion in CONTEXT.md)

---

## Hotfix sequencing & deploy order

### Q1: When does HF-02 secret rotation happen relative to the rest of Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Wave-0 hotfix | Rotate Atlas + AWS, git rm --cached .env, switch Railway to env-vars-only — all BEFORE any Phase 1 code lands | ✓ |
| Bundled with Phase 1 deploy | Rotation lands in the same release as JWKS middleware + auth migration | |
| Pre-Phase 1 but not Wave-0 | Rotate after Phase 1 plans are written but before any code merges | |

**User's choice:** Wave-0 hotfix (Recommended).

### Q2: How does HF-01 (Property schema patch for rooms / maxGuests / amenities) ship?

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone hotfix shipped immediately | One-line schema patch + Railway redeploy ASAP, independent of Phase 1 | ✓ |
| Bundled with Phase 1 deploy | Patch lands in the Phase 1 release; bug persists for the duration | |

**User's choice:** Standalone hotfix shipped immediately (Recommended).

### Q3: How does the backend roll out the Authorization: Bearer header switch?

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-accept window then remove legacy | Backend accepts EITHER Bearer OR x-firebase-uid for one release cycle, with structured logging on legacy use | ✓ |
| Atomic switch | Backend deploy flips to Bearer-only; client must be deployed simultaneously | |
| Accept both indefinitely | Lowest friction but doesn't actually close the security gap | |

**User's choice:** Dual-accept window then remove legacy (Recommended).

### Q4: How does HF-04 (socket.io auth verification) roll out?

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-accept window then remove legacy | Socket handshake accepts EITHER auth.token (verified) OR legacy auth.firebaseUid for one release cycle | ✓ |
| Atomic switch | Server requires auth.token immediately; clients sending auth.firebaseUid get disconnected | |
| Couple to Bearer rollout | Whatever pattern HF-04 follows, mirror Bearer (Q3) | |

**User's choice:** Dual-accept window then remove legacy (Recommended). (Note: outcome aligns with "Couple to Bearer rollout" since both Q3 and Q4 picked the same pattern, but the explicit choice was the dual-accept option.)

### Q5: What triggers removal of the legacy x-firebase-uid header + socket auth.firebaseUid support?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 6 release (M2 v2.0.0) | Removal lands as part of Phase 6 hardening + manual physical-device QA + dual-store submission | ✓ |
| Telemetry-driven | Backend logs every legacy-header request; remove when count drops below a threshold | |
| Phase 1 follow-up release | Aggressive cutoff ~1–2 weeks after Phase 1 | |
| Move to next area | Skip; document as Claude's Discretion / TBD at Phase 6 time | |

**User's choice:** Phase 6 release (M2 v2.0.0) (Recommended).

---

## Migration mechanics (ROLE-02 + M1 admin seed)

### Q1: How should existing 'agent' userType records be migrated?

| Option | Description | Selected |
|--------|-------------|----------|
| All 'agent' → 'user' (no exceptions) | Treat data as clean-slate per PROJECT.md; 'agent' was a legacy holdover | ✓ |
| Pre-migration audit script + per-record decision | Read-only Atlas query, manual review, per-record promotion if appropriate | |
| All 'agent' → 'moderator' | Treat 'agent' as the closest M1 analog to a moderator | |

**User's choice:** All 'agent' → 'user' (no exceptions) (Recommended).

### Q2: Where does the migration script live and how does it run?

| Option | Description | Selected |
|--------|-------------|----------|
| Backend repo /src/scripts + manual npm script invocation | src/scripts/migrate-roles-m2.js alongside seed.js, invoked manually as a pre-deploy step | ✓ |
| Railway pre-deploy hook | Runs automatically on next push; risk if script fails partway | |
| Atlas Data Explorer one-off update | Run Mongo updates directly in the Atlas console UI; no version-controlled record | |

**User's choice:** Backend repo /src/scripts + manual npm script invocation (Recommended).

### Q3: What's the idempotency + safety strategy for the migration?

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional updates + dry-run mode | --dry-run flag prints filters + counts; conditional filters exclude already-migrated records | ✓ |
| Plain updateMany without dry-run | Trust conditional filters prevent double-application; skips dry-run preview | |
| Wrap in a transaction with rollback | Mongo session + transaction for atomicity; not strictly needed for one-shot | |

**User's choice:** Conditional updates + dry-run mode (Recommended).

### Q4: How does the M1 admin email seed (beckprograms@gmail.com) get into Mongo as userType: 'admin'?

| Option | Description | Selected |
|--------|-------------|----------|
| Embed in the same migration script as a hardcoded list | migrate-roles-m2.js includes M1_ADMIN_EMAILS const; single migration covers enum flip + admin seed | ✓ |
| Separate script (seed-m1-admins.js) | Two scripts run sequentially; cleaner separation | |
| Manual Atlas update for the admin seed only | Run db.users.updateOne(...) by hand in Atlas Data Explorer | |

**User's choice:** Embed in the same migration script as a hardcoded list (Recommended).

---

## Token refresh + role-revocation UX

### Q1: When idToken expires mid-session and the refresh-token flow succeeds silently, what does the user see?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — fully transparent | 401 → axios interceptor refreshes idToken → retries → returns response. No toast, no spinner | ✓ |
| Brief 'Refreshing session…' toast | Surface a 1–2 second toast during refresh | |
| Loading overlay during refresh | Block UI with a spinner during refresh | |

**User's choice:** Nothing — fully transparent (Recommended).

### Q2: When the refresh token itself is expired/revoked (hard logout case), where does the user land?

| Option | Description | Selected |
|--------|-------------|----------|
| Login screen + EN+RU 'Session expired, please sign in again' toast | AuthContext.logout() runs, clears AsyncStorage, App.tsx returns to login flow naturally | ✓ |
| Splash + auto-redirect to login | Brief splash screen first, then route to login. No toast | |
| Modal blocking current screen with login button | Don't unmount; overlay a modal that says 'Session expired' | |

**User's choice:** Login screen + EN+RU 'Session expired, please sign in again' toast (Recommended).

### Q3: What does 'tap to reload' actually do when the user taps the role-changed banner?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft re-fetch | Tap calls AuthContext.refreshRole() → re-fetches GET /api/auth/me → bumps user reference. No JS reload, no nav reset | ✓ |
| Soft re-fetch + nav reset to Home | Same as above PLUS resets App.tsx state to Home tab | |
| DevSettings.reload() — cold restart of JS bundle | Hard reload of the JS bundle | |

**User's choice:** Soft re-fetch (Recommended).

### Q4: How does the role-changed banner behave (copy + persistence + upgrade vs downgrade)?

| Option | Description | Selected |
|--------|-------------|----------|
| Same banner both directions, sticky until tapped or role re-syncs | Single copy for promotion + demotion; persists across screens; no dismiss button | ✓ |
| Different copy per direction + dismissable | Promotion vs demotion-tailored copy; dismissable with X button | |
| Auto-reload on detection — no banner, no tap required | Silent re-render with new role | |

**User's choice:** Same banner both directions, sticky until tapped or role re-syncs (Recommended).

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` § "Claude's Discretion":

- apiClient.ts consolidation scope (NOT selected by user; default: fold into Phase 1)
- JWKS middleware error contract specifics (planner discretion within REQUIREMENTS.md ROLE-09 constraints)
- AppState 'active' role-refresh hook placement (stays in Phase 2 per REQUIREMENTS.md)
- Verification bar (curl matrix + manual app QA; jest/supertest for JWKS middleware allowed but not required)
- Foreground role-refresh banner visual design (use useTheme() semantic palette)

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:

- apiClient.ts consolidation as a possible follow-up phase if planner decides scope is too large
- Crash reporting (Sentry/Crashlytics)
- react-native-config / .env loader for the RN client
- Backend test infrastructure buildout

No scope-creep ideas were surfaced during the discussion.
